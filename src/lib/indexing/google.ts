import "server-only";

import { createSign } from "node:crypto";

import {
  ConcurrencyLimiter,
  RateLimiter,
  requestJson,
  UpstreamError,
} from "@/lib/market/http";

/**
 * Google's Indexing API.
 *
 * Read the scope before wiring this to anything: Google documents the API as
 * covering pages that carry `JobPosting` or `BroadcastEvent` markup, and says
 * plainly that it does not crawl other URLs from it. A fund page submitted
 * here is accepted — the call returns 200 with a notify time — and then
 * ignored. Google discovers the rest of the site from the sitemap, which is
 * the supported path and needs nothing from this module.
 *
 * It is here because it costs one request per URL and reports what Google
 * received, which is worth having for the pages it does cover and for proving
 * a URL was announced. The quotas below are Google's published defaults, and
 * they are what makes this a rotation rather than a full pass: 200 URLs a day
 * against a catalogue of a few thousand covers the catalogue over a couple of
 * weeks, oldest submission first.
 */

const TOKEN_ENDPOINT =
  process.env.GOOGLE_TOKEN_ENDPOINT?.trim() ||
  "https://oauth2.googleapis.com/token";

const PUBLISH_ENDPOINT =
  process.env.GOOGLE_INDEXING_ENDPOINT?.trim() ||
  "https://indexing.googleapis.com/v3/urlNotifications/publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";

/** Google's published default: 200 URLs a day, 600 requests a minute. */
export const GOOGLE_DAILY_QUOTA = Number(
  process.env.GOOGLE_INDEXING_DAILY_QUOTA ?? 200,
);

const rateLimiter = new RateLimiter(
  Number(process.env.GOOGLE_INDEXING_RATE_LIMIT ?? 600),
  60_000,
);

const limiter = new ConcurrencyLimiter(
  Number(process.env.GOOGLE_INDEXING_CONCURRENCY ?? 4),
);

type Credentials = { clientEmail: string; privateKey: string };

/**
 * The private key arrives from a JSON key file, where its newlines are
 * escaped; an env var may carry it either way.
 */
function readCredentials(): Credentials | null {
  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim();

  if (!clientEmail || !privateKey) return null;

  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

export function isGoogleIndexingEnabled(): boolean {
  return readCredentials() !== null;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * A service account authenticates by signing its own assertion, so this is the
 * whole of it — no SDK, and no secret in flight beyond the signature.
 */
function assertion({ clientEmail, privateKey }: Credentials): string {
  const issuedAt = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);

  return `${header}.${claims}.${base64Url(signer.sign(privateKey))}`;
}

let token: { value: string; expiresAt: number } | null = null;

/** Access tokens last an hour; this keeps one until a minute before it lapses. */
async function accessToken(credentials: Credentials): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion(credentials),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new UpstreamError(
      `Google refused the service account assertion: ${response.status}`,
      response.status,
      detail,
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new UpstreamError("Google returned no access token");
  }

  token = {
    value: payload.access_token,
    expiresAt: Date.now() + ((payload.expires_in ?? 3600) - 60) * 1000,
  };

  return token.value;
}

export type PublishResult = { url: string; notifiedAt: string | null };

/**
 * Announces one URL. `URL_UPDATED` covers both a new page and a changed one;
 * `URL_DELETED` is for a page that now 404s, which nothing here produces.
 */
async function publish(url: string, bearer: string): Promise<PublishResult> {
  const payload = await requestJson<{
    urlNotificationMetadata?: { latestUpdate?: { notifyTime?: string } };
  }>(PUBLISH_ENDPOINT, {
    body: { url, type: "URL_UPDATED" },
    headers: { authorization: `Bearer ${bearer}` },
    rateLimiter,
    timeoutMs: Number(process.env.GOOGLE_INDEXING_TIMEOUT_MS ?? 20_000),
  });

  return {
    url,
    notifiedAt:
      payload.urlNotificationMetadata?.latestUpdate?.notifyTime ?? null,
  };
}

export type SubmitOutcome = {
  submitted: string[];
  failed: { url: string; error: string }[];
};

/**
 * Announces a batch, one request per URL, inside the published rate limit.
 *
 * A URL that fails is reported rather than retried past the HTTP client's own
 * retries: the next run picks it up again, and a quota rejection means the day
 * is spent and the rest of the batch would fail the same way.
 */
export async function submitToGoogle(urls: string[]): Promise<SubmitOutcome> {
  const credentials = readCredentials();
  if (!credentials) return { submitted: [], failed: [] };

  const bearer = await accessToken(credentials);

  const submitted: string[] = [];
  const failed: { url: string; error: string }[] = [];

  await Promise.all(
    urls.map((url) =>
      limiter.run(async () => {
        try {
          await publish(url, bearer);
          submitted.push(url);
        } catch (error) {
          failed.push({
            url,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    ),
  );

  return { submitted, failed };
}
