import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { periodOf, syncPositions } from "@/lib/ingest/holdings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Portfolio disclosures: imports the period's holdings, then rebuilds the
 * artırılan / azaltılan movers by diffing against the previous period.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const period = new URL(request.url).searchParams.get("period") ?? periodOf();

  try {
    const result = await syncPositions(period);

    return Response.json(
      { ok: true, period, ...result },
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
