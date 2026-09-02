import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { syncFundCatalog } from "@/lib/ingest/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly catalogue refresh: new funds, renames, retired funds. */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const result = await syncFundCatalog();
    return Response.json(
      { ok: true, ...result.run },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-catalog failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
