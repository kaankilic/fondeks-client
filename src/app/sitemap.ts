import type { MetadataRoute } from "next";

import { listIndexableUrls } from "@/lib/fondeks/urls";

/**
 * Served at /sitemap.xml. The URL set lives in `urls`, which the submission
 * job pings, so the sitemap and the pinger cannot drift apart.
 *
 * Earlier this was split into buckets via `generateSitemaps`, which emits
 * `/sitemap/<id>.xml` routes but does NOT auto-generate a `/sitemap.xml`
 * index pointing at them — so the root path 404'd and GSC lost its entry
 * point. Under 50,000 URLs a single file is fine and GSC can read it. If
 * we revisit bucketing later it needs its own hand-written index route at
 * `/sitemap.xml`.
 *
 * Regenerated once a day so every entry's `lastModified` rolls over with
 * the TEFAS price sessions rather than freezing at build time.
 */

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return listIndexableUrls();
}
