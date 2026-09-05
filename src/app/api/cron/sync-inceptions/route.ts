import { revalidateTag } from "next/cache";

import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { CATALOGUE_TAG } from "@/lib/fondeks/queries";
import { syncFundInceptions } from "@/lib/ingest/inceptions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Backfills fund launch dates from KAP. Runs through the catalogue a slice at
 * a time and then idles, since a launch date is read once and never changes.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const result = await syncFundInceptions();

    // The screens read a cached snapshot; this is what makes a sync
    // visible on them at once rather than at the end of its window.
    revalidateTag(CATALOGUE_TAG, "max");

    return Response.json(
      { ok: true, ...result.run, missing: result.missing },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-inceptions failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
