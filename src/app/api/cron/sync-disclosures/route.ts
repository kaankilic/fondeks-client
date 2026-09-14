import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { syncDisclosures } from "@/lib/ingest/disclosures";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Fund disclosure archive. Discovers the window's KAP filings for funds we
 * track, then resolves the PDF link for anything still missing one.
 *
 * Both passes are idempotent and bounded, so overlap and re-runs are safe. The
 * link pass is capped by `limit` — a busy backfill converges over a few runs
 * rather than timing out.
 *
 *   POST /api/cron/sync-disclosures
 *   POST /api/cron/sync-disclosures?days=90&limit=800
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const params = new URL(request.url).searchParams;
  const days = Number(params.get("days"));
  const limit = Number(params.get("limit"));

  try {
    const result = await syncDisclosures({
      days: Number.isFinite(days) && days > 0 ? days : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });

    return Response.json(
      {
        ok: true,
        discovery: result.discovery.run,
        links: { ...result.links.run, missing: result.links.missing },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-disclosures failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
/** Vercel Cron issues GET requests. */
export const GET = handle;
