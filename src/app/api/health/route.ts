import { sql } from "drizzle-orm";

import { db } from "@/db";
import { getLastRun } from "@/lib/ingest/runs";
import { providerName } from "@/lib/market/provider";

export const dynamic = "force-dynamic";

/** Data older than this means the scheduler or the source is in trouble. */
const STALE_AFTER_DAYS = 4;

/**
 * Liveness and data-freshness probe. Returns 503 when the database is
 * unreachable, the last import failed, or prices have gone stale — so an
 * uptime check catches a silently broken feed, not just a down server.
 */
export async function GET() {
  const checks: Record<string, unknown> = { provider: providerName() };
  let healthy = true;

  try {
    const result = await db.execute<{
      funds: number;
      rows: number;
      latest: string | null;
    }>(sql`
      select
        (select count(*) from funds where is_active)      as funds,
        (select count(*) from fund_daily_stats)           as rows,
        (select max(date)::text from fund_daily_stats)    as latest
    `);

    const [row] = result.rows;
    const latest = row?.latest ?? null;
    const ageDays = latest
      ? Math.floor((Date.now() - Date.parse(latest)) / 86_400_000)
      : null;

    checks.database = "ok";
    checks.funds = Number(row?.funds ?? 0);
    checks.dailyRows = Number(row?.rows ?? 0);
    checks.latestDate = latest;
    checks.ageDays = ageDays;

    if (!latest || (ageDays !== null && ageDays > STALE_AFTER_DAYS)) {
      healthy = false;
      checks.stale = true;
    }
  } catch (error) {
    healthy = false;
    checks.database = "unreachable";
    checks.error = error instanceof Error ? error.message : String(error);
  }

  try {
    const lastRun = await getLastRun("daily-stats");
    checks.lastRun = lastRun
      ? {
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
          rowsWritten: lastRun.rowsWritten,
          error: lastRun.error,
        }
      : null;

    if (lastRun?.status === "failed") healthy = false;
  } catch {
    // The database check above already covers this.
  }

  return Response.json(
    { status: healthy ? "ok" : "degraded", checks },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
