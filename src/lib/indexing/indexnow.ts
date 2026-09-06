import "server-only";

import { absoluteUrl, siteUrl } from "@/lib/fondeks/site";
import { RateLimiter, requestText } from "@/lib/market/http";

/**
 * IndexNow — one submission, every participating engine.
 *
 * Bing, Yandex, Seznam and Naver share submissions with each other, so a
 * single POST reaches all of them; Google does not participate, and takes the
 * sitemap instead. Unlike Google's Indexing API this accepts any URL, which
 * makes it the one that actually moves fund pages.
 *
 * Ownership is proved by serving the key back from the host — `/indexnow.txt`
 * here, named in `keyLocation` — so nothing needs to be registered first: the
 * first submission with a reachable key file is the registration.
 *
 * The protocol asks for changed URLs rather than the whole site on a schedule,
 * which is what the caller sends. 10,000 URLs is the documented ceiling for
 * one submission.
 */

/** Any participating engine accepts a submission and shares it on. */
const ENDPOINT = (
  process.env.INDEXNOW_ENDPOINT?.trim() || "https://api.indexnow.org/indexnow"
).replace(/\/$/, "");

/** The protocol's documented ceiling for a single submission. */
export const INDEXNOW_BATCH_LIMIT = 10_000;

/** Where the key file is served, and what `keyLocation` points at. */
export const INDEXNOW_KEY_PATH = "/indexnow.txt";

/**
 * A submission is only as slow as the engines want it to be; this is a
 * courtesy ceiling rather than a published limit.
 */
const rateLimiter = new RateLimiter(
  Number(process.env.INDEXNOW_RATE_LIMIT ?? 6),
  60_000,
);

/**
 * The key is any 8–128 hex characters, chosen once and served from the host.
 * Generate one with `openssl rand -hex 16`.
 */
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;

  return /^[0-9a-fA-F]{8,128}$/.test(key) ? key : null;
}

export function isIndexNowEnabled(): boolean {
  return indexNowKey() !== null;
}

function chunk(urls: string[], size = INDEXNOW_BATCH_LIMIT): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += size) {
    batches.push(urls.slice(i, i + size));
  }
  return batches;
}

export type SubmitOutcome = {
  submitted: string[];
  failed: { url: string; error: string }[];
};

/**
 * Submits a batch. A success is an empty 200 or 202 — read as text, since
 * there is no JSON to parse — and a failure is reported against every URL in
 * the batch, since the protocol judges a submission as a whole.
 */
export async function submitToIndexNow(urls: string[]): Promise<SubmitOutcome> {
  const key = indexNowKey();
  if (!key || urls.length === 0) return { submitted: [], failed: [] };

  const host = new URL(siteUrl()).host;
  const submitted: string[] = [];
  const failed: { url: string; error: string }[] = [];

  for (const batch of chunk(urls)) {
    try {
      await requestText(ENDPOINT, {
        body: {
          host,
          key,
          keyLocation: absoluteUrl(INDEXNOW_KEY_PATH),
          urlList: batch,
        },
        headers: { accept: "application/json" },
        rateLimiter,
        timeoutMs: Number(process.env.INDEXNOW_TIMEOUT_MS ?? 20_000),
      });

      submitted.push(...batch);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const url of batch) failed.push({ url, error: message });
    }
  }

  return { submitted, failed };
}
