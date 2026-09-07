import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { periodOf, previousPeriod, syncPositions } from "@/lib/ingest/holdings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Portfolio disclosures, submit pass.
 *
 * Against KAP this discovers the period's "Portföy Dağılım Raporu" filings and
 * queues them for extraction; the movers are rebuilt later by
 * `/api/cron/collect-positions`, once the batches end. Offline it finishes in
 * one call.
 *
 * The default period is the month that just closed — on the 3rd, filings for
 * the previous month are landing, and the current month has no report at all.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const period =
    new URL(request.url).searchParams.get("period") ??
    previousPeriod(periodOf());

  try {
    const result = await syncPositions(period);

    // A skipped run is a success: another runner has the job. Saying so plainly
    // keeps an external scheduler from alerting on healthy overlap.
    return Response.json(
      { ok: true, skipped: result.mode === "locked", period, ...result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-positions failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
