import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Ingestion CLI.
 *
 *   yarn ingest catalog
 *   yarn ingest daily [--days 3]
 *   yarn ingest range --from 2026-01-01 --to 2026-03-31
 *   yarn ingest indices [--days 60]
 *   yarn ingest positions [--period yyyy-mm-01]
 *   yarn ingest backfill [--days 400]
 *   yarn ingest status
 *
 * The provider comes from MARKET_DATA_PROVIDER (fixture by default).
 */

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const command = process.argv[2] ?? "help";
  const { providerName } = await import("@/lib/market/provider");
  const jobs = await import("@/lib/ingest/jobs");
  const indices = await import("@/lib/ingest/indices");
  const holdings = await import("@/lib/ingest/holdings");
  const { getRecentRuns } = await import("@/lib/ingest/runs");
  const { pool } = await import("./index");

  console.log(`provider: ${providerName()}`);

  try {
    switch (command) {
      case "catalog": {
        const result = await jobs.syncFundCatalog();
        console.log(
          `catalog: read ${result.run.rowsRead}, wrote ${result.run.rowsWritten} in ${result.run.durationMs}ms`,
        );
        break;
      }

      case "daily": {
        const days = Number(flag("days") ?? 3);
        const result = await jobs.syncRecentDays(days);
        console.log(
          `daily: read ${result.run.rowsRead}, wrote ${result.run.rowsWritten} in ${result.run.durationMs}ms`,
        );
        break;
      }

      case "range": {
        const from = flag("from");
        const to = flag("to") ?? jobs.today();
        if (!from) throw new Error("range needs --from yyyy-mm-dd");

        const result = await jobs.syncDailyStats({ from, to });
        console.log(
          `range ${from}..${to}: read ${result.run.rowsRead}, wrote ${result.run.rowsWritten}`,
        );
        break;
      }

      case "backfill": {
        const days = Number(flag("days") ?? 400);
        const catalog = await jobs.syncFundCatalog();
        const stats = await jobs.backfillDailyStats(days);
        const quotes = await indices.syncMarketIndices({
          from: jobs.isoDaysAgo(Math.min(days, 120)),
          to: jobs.today(),
        });
        const movers = await holdings.syncPositions();
        console.log(
          `backfill: ${catalog.run.rowsWritten} funds, ${stats.run.rowsWritten} daily rows, ` +
            `${quotes.run.rowsWritten} index quotes, ${movers.positions.rowsWritten} movers`,
        );
        break;
      }

      case "indices": {
        const days = Number(flag("days") ?? 60);
        const result = await indices.syncMarketIndices({
          from: jobs.isoDaysAgo(days),
          to: jobs.today(),
        });
        console.log(
          `indices: read ${result.run.rowsRead}, wrote ${result.run.rowsWritten}`,
        );
        break;
      }

      case "positions": {
        const period = flag("period") ?? holdings.periodOf();
        const result = await holdings.syncPositions(period);
        console.log(
          `positions ${period}: ${result.holdings.rowsWritten} holdings, ` +
            `${result.positions.rowsWritten} movers`,
        );
        break;
      }

      case "status": {
        const runs = await getRecentRuns(10);
        for (const run of runs) {
          console.log(
            [
              run.startedAt.toISOString(),
              run.job.padEnd(14),
              run.status.padEnd(8),
              `read=${run.rowsRead}`,
              `wrote=${run.rowsWritten}`,
              run.error ? `error=${run.error}` : "",
            ].join(" "),
          );
        }
        break;
      }

      default:
        console.log(
          "usage: yarn ingest <catalog|daily|range|indices|positions|backfill|status> " +
            "[--days n] [--from d] [--to d] [--period yyyy-mm-01]",
        );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
