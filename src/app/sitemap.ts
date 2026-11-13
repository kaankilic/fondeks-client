import type { MetadataRoute } from "next";

import {
  listBucketUrls,
  SITEMAP_BUCKETS,
  type SitemapBucket,
} from "@/lib/fondeks/urls";

/**
 * Served through Next's `generateSitemaps` API: a `/sitemap.xml` index file
 * lists each bucket as its own URL, and each bucket's entries ship as
 * `/sitemap/<id>.xml`. Split from a single 2,500-URL file so Search
 * Console's "Pages — not indexed" report attributes problems to a bucket
 * rather than hiding them inside one monolithic feed.
 *
 * Regenerated once a day, so every entry's `lastModified` rolls over with
 * the TEFAS price sessions rather than freezing at build time.
 */

export const revalidate = 86400;

export async function generateSitemaps(): Promise<{ id: SitemapBucket }[]> {
  return SITEMAP_BUCKETS.map((id) => ({ id }));
}

/**
 * Next 16 passes `id` as a Promise<string> rather than a bare value; see
 * `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-sitemaps.md`.
 */
export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapBucket;
  return listBucketUrls(id);
}
