import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Ingestion CLI.
 *
 *   yarn ingest catalog
 *   yarn ingest daily [--days 3]
 *   yarn ingest range --from 2026-01-01 --to 2026-03-31
 *   yarn ingest allocations [--days 45]
 *   yarn ingest indices [--days 60]
 *   yarn ingest positions [--period yyyy-mm-01]
 *   yarn ingest collect
 *   yarn ingest documents [--period yyyy-mm-01] [--limit n]
 *   yarn ingest reextract [--period yyyy-mm-01] [--codes AFT,BHE] [--limit n]
 *   yarn ingest reports [--period yyyy-mm-01]
 *   yarn ingest backfill [--days 400]
 *   yarn ingest status
 *
 * The provider comes from MARKET_DATA_PROVIDER (fixture by default).
 */

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

type PositionsResult = Awaited<
  ReturnType<typeof import("@/lib/ingest/holdings").syncPositions>
>;

/**
 * The two providers do different amounts of work in a submit pass: offline it
 * finishes, against KAP it hands off to a batch that lands later.
 */
function describePositions(result: PositionsResult): string {
  if (result.mode === "locked") {
    return "skipped — another run holds the job lock";
  }

  if (result.mode === "queued") {
    return (
      `discovered ${result.discovery.rowsWritten} filings in ` +
      `${result.window.from}..${result.window.to}, recorded ` +
      `${result.documents.rowsWritten} report document(s), submitted ` +
      `${result.submission.rowsWritten} for extraction across ` +
      `${result.batches.length} batch(es)`
    );
  }

  return `${result.holdings.rowsWritten} holdings, ${result.positions.rowsWritten} movers`;
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

      case "allocations": {
        const days = flag("days");
        const result = await jobs.syncAllocations(
          days === undefined
            ? undefined
            : { from: jobs.isoDaysAgo(Number(days)), to: jobs.today() },
        );
        console.log(
          `allocations: read ${result.run.rowsRead}, wrote ${result.run.rowsWritten} ` +
            `across ${result.days} days in ${result.run.durationMs}ms`,
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
        const breakdown = await jobs.syncAllocations({
          from: jobs.isoDaysAgo(jobs.ALLOCATION_BACKFILL_DAYS),
          to: jobs.today(),
        });
        const movers = await holdings.syncPositions();
        console.log(
          `backfill: ${catalog.run.rowsWritten} funds, ${stats.run.rowsWritten} daily rows, ` +
            `${breakdown.run.rowsWritten} allocation slices, ` +
            `${quotes.run.rowsWritten} index quotes`,
        );
        console.log(`  positions: ${describePositions(movers)}`);
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
        console.log(`positions ${period}: ${describePositions(result)}`);

        if (result.mode === "queued") {
          console.log(
            "  extraction runs asynchronously — `yarn ingest collect` applies it once the batches end",
          );
        }
        break;
      }

      case "collect": {
        const result = await holdings.collectPositions();

        if (result.locked) {
          console.log("collect: skipped — another run holds the job lock");
          break;
        }

        const applied = result.positions
          .map((entry) => `${entry.period}: ${entry.rowsWritten} movers`)
          .join(", ");

        console.log(
          `collect: read ${result.collection.rowsRead} results, wrote ` +
            `${result.collection.rowsWritten} holdings` +
            (result.pendingBatches
              ? `, ${result.pendingBatches} batch(es) still running`
              : ""),
        );
        if (applied) console.log(`  rebuilt ${applied}`);
        break;
      }

      case "documents": {
        const period = flag("period") ?? holdings.periodOf();
        const limit = flag("limit");
        const result = await holdings.recordReportDocuments(
          period,
          limit === undefined ? undefined : Number(limit),
        );

        console.log(
          `documents ${period}: located ${result.run.rowsWritten} of ` +
            `${result.run.rowsRead} report(s)` +
            (result.missing ? `, ${result.missing} not published yet` : ""),
        );
        break;
      }

      case "reextract": {
        const period = flag("period") ?? holdings.periodOf();
        const codes = flag("codes")?.split(",").filter(Boolean);
        const limit = flag("limit");

        const result = await holdings.reextractPositions({
          period,
          codes,
          limit: limit === undefined ? undefined : Number(limit),
        });

        if (!result) {
          console.log("reextract: skipped — another run holds the job lock");
          break;
        }

        console.log(
          `reextract ${period}${codes ? ` (${codes.join(", ")})` : ""}: ` +
            `resubmitted ${result.submission.rowsWritten} report(s) across ` +
            `${result.batches.length} batch(es)`,
        );
        console.log(
          "  `yarn ingest collect` applies the new extraction once the batches end",
        );
        break;
      }

      case "reports": {
        const period = flag("period") ?? holdings.periodOf();
        const progress = await holdings.periodProgress(period);
        const counts = Object.entries(progress);

        console.log(
          counts.length
            ? `reports ${period}: ${counts.map(([status, count]) => `${status}=${count}`).join(" ")}`
            : `reports ${period}: none discovered yet`,
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
          "usage: yarn ingest " +
            "<catalog|daily|range|allocations|indices|positions|collect|" +
            "documents|reextract|reports|backfill|status> " +
            "[--days n] [--from d] [--to d] [--period yyyy-mm-01] " +
            "[--codes AFT,BHE] [--limit n]",
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
