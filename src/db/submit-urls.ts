import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Announces the site's URLs from a terminal — the same job the cron route
 * runs, so a local run and a scheduled one spend the same quota and leave the
 * same trail in `ingest_runs`.
 *
 *   yarn submit-urls                      both providers, Google's daily quota
 *   yarn submit-urls --only=indexnow      one provider
 *   yarn submit-urls --quota=25           a smaller bite of Google's quota
 *   yarn submit-urls --list               print the URLs and submit nothing
 *
 * Imports are deferred until after the env files are read, because the
 * database module builds its pool the moment it is loaded.
 */

function flag(name: string): string | undefined {
  const match = process.argv.slice(2).find((arg) => arg.startsWith(`--${name}`));
  if (!match) return undefined;

  const [, value] = match.split("=");
  return value ?? "";
}

async function main() {
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

  console.log(`${summary.urls} indexable URLs\n`);

  for (const provider of summary.providers) {
    const state = provider.enabled ? "" : " (disabled)";
    const note = provider.note ? ` — ${provider.note}` : "";
    console.log(
      `  ${provider.provider}${state}: ${provider.submitted} submitted, ` +
        `${provider.failed} failed${note}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
