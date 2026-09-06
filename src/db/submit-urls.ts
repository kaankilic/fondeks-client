import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Announces the site's URLs from a terminal.
 *
 *   yarn submit-urls --remote             ask production to run it
 *   yarn submit-urls                      run it here, against this database
 *   yarn submit-urls --only=indexnow      one provider
 *   yarn submit-urls --quota=25           a smaller bite of Google's quota
 *   yarn submit-urls --list               print the URLs and submit nothing
 *
 * `--remote` is the one to reach for. A deployment has the database, the
 * credentials and the quota history; this machine has a copy of the code and a
 * development database, so running it here submits production URLs while
 * counting the spend against local history — the two drift apart, and Google's
 * quota is spent either way. Remote mode calls the same route a scheduler
 * calls, so a hand-run and a scheduled run are the same run.
 *
 * It takes the deployment from `--remote=<origin>`, else NEXT_PUBLIC_SITE_URL,
 * and authenticates with CRON_SECRET, both of which .env.local already holds.
 *
 * Imports are deferred until after the env files are read, because the
 * database module builds its pool the moment it is loaded.
 */

function flag(name: string): string | undefined {
  const match = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}`));
  if (!match) return undefined;

  const [, value] = match.split("=");
  return value ?? "";
}

/** Asks a deployment to run the job, and prints what it reports back. */
async function remote(origin: string) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "CRON_SECRET is not set — it is what the route authenticates with.",
    );
  }

  const url = new URL("/api/cron/submit-urls", origin);
  const only = flag("only");
  const quota = flag("quota");
  if (only) url.searchParams.set("only", only);
  if (quota) url.searchParams.set("quota", quota);

  console.log(`asking ${url.origin} to submit its URLs…\n`);

  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `${response.status} from ${url.origin}: ${body.slice(0, 300)}`,
    );
  }

  report(JSON.parse(body) as Summary);
}

type Summary = {
  urls: number;
  providers: {
    provider: string;
    enabled?: boolean;
    submitted: number;
    failed: number;
    note?: string;
  }[];
};

function report(summary: Summary) {
  console.log(`${summary.urls} indexable URLs\n`);

  for (const provider of summary.providers) {
    const state = provider.enabled === false ? " (disabled)" : "";
    const note = provider.note ? ` — ${provider.note}` : "";
    console.log(
      `  ${provider.provider}${state}: ${provider.submitted} submitted, ` +
        `${provider.failed} failed${note}`,
    );
  }
}

async function main() {
  const target = flag("remote");
  if (target !== undefined) {
    const origin =
      target ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://fondeks.com";
    return remote(origin);
  }

  if (flag("list") !== undefined) {
    const { listIndexableUrls } = await import("@/lib/fondeks/urls");
    const urls = await listIndexableUrls();
    for (const entry of urls) console.log(entry.url);
    console.error(`\n${urls.length} URLs`);
    return;
  }

  const { submitUrls } = await import("@/lib/indexing/submit");

  const only = flag("only");
  const quota = Number(flag("quota"));

  const summary = await submitUrls({
    only: only === "google" || only === "indexnow" ? only : undefined,
    googleQuota: Number.isFinite(quota) && quota > 0 ? quota : undefined,
  });

  report(summary);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
