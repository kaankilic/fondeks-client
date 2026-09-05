import { revalidateTag } from "next/cache";

import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { CATALOGUE_TAG } from "@/lib/fondeks/queries";
import { syncDailyStats, isoDaysAgo, today } from "@/lib/ingest/jobs";

export const dynamic = "force-dynamic";
/** Backfills can take a while; give the platform a generous ceiling. */
export const maxDuration = 300;

/**
 * Scheduled daily import. Re-reads the last few days by default so a late or
 * corrected publish is picked up — writes are upserts, so overlap is safe.
 *
 *   POST /api/cron/sync-daily?days=3
 *   POST /api/cron/sync-daily?from=2026-01-01&to=2026-03-31
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const params = new URL(request.url).searchParams;
  const days = Number(params.get("days") ?? 3);
  const from = params.get("from") ?? isoDaysAgo(Number.isFinite(days) ? days : 3);
  const to = params.get("to") ?? today();

  try {
    const result = await syncDailyStats({ from, to });

    // The screens read a cached snapshot; this is what makes a sync
    // visible on them at once rather than at the end of its window.
    revalidateTag(CATALOGUE_TAG, "max");

    return Response.json(
      { ok: true, range: { from, to }, ...result.run, skipped: result.skipped },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-daily failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
/** Vercel Cron issues GET requests. */
export const GET = handle;
