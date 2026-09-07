import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { collectPositions } from "@/lib/ingest/holdings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Portfolio disclosures, collect pass.
 *
 * Applies whatever extraction batches have finished and rebuilds artırılan /
 * azaltılan pozisyonlar for the periods they touched. Batches still running are
 * left alone and reported back as `pendingBatches`, so running this on a
 * schedule is how a submitted period eventually lands — most batches finish
 * within the hour, and the API allows up to a day.
 *
 * Safe to call at any time: with nothing outstanding it does nothing.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const result = await collectPositions();

    // A skipped run is a success: another runner has the job.
    return Response.json(
      { ok: true, skipped: result.locked, ...result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] collect-positions failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
