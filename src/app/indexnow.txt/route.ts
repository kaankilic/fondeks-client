import { indexNowKey } from "@/lib/indexing/indexnow";

export const dynamic = "force-dynamic";

/**
 * Proves to the IndexNow engines that whoever submits URLs for this host also
 * controls it: the key in a submission has to be readable back from the host,
 * and `keyLocation` points here. Without a key configured there is nothing to
 * prove, so the file is absent rather than empty.
 */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
