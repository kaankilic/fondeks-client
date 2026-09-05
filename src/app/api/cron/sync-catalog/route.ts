import { revalidateTag } from "next/cache";

import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { CATALOGUE_TAG } from "@/lib/fondeks/queries";
import { syncFundCatalog } from "@/lib/ingest/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly catalogue refresh: new funds, renames, retired funds. */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const result = await syncFundCatalog();

    // The screens read a cached snapshot; this is what makes a sync
    // visible on them at once rather than at the end of its window.
    revalidateTag(CATALOGUE_TAG, "max");

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
