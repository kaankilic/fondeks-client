import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { submitUrls } from "@/lib/indexing/submit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Announces the site's URLs to the engines that take submissions.
 *
 *   POST /api/cron/submit-urls
 *   POST /api/cron/submit-urls?only=indexnow&quota=50
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const params = new URL(request.url).searchParams;
  const only = params.get("only");
  const quota = Number(params.get("quota"));

  try {
    const summary = await submitUrls({
      only: only === "google" || only === "indexnow" ? only : undefined,
      googleQuota: Number.isFinite(quota) && quota > 0 ? quota : undefined,
    });

    return Response.json(
      { ok: true, ...summary },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] submit-urls failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
