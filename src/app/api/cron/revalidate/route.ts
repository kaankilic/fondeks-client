import { revalidateTag } from "next/cache";

import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { CATALOGUE_TAG } from "@/lib/fondeks/queries";

export const dynamic = "force-dynamic";

/**
 * Drops the catalogue cache without syncing anything.
 *
 * The ingest runs outside Vercel, so it writes to the database from a machine
 * that has no way to reach `revalidateTag` — that call only means something
 * inside the running app. Until the cache window expires the site keeps
 * serving the snapshot from before the run, which reads as "the ingest did
 * nothing". Ending an out-of-Vercel run with a call here closes that gap.
 *
 * The sync routes revalidate on their own, so this is only for runs that
 * happened elsewhere.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  revalidateTag(CATALOGUE_TAG, "max");

  return Response.json(
    { ok: true, revalidated: CATALOGUE_TAG, at: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}

export const POST = handle;
export const GET = handle;
