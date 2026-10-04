import type { MetadataRoute } from "next";

import { listIndexableUrls } from "@/lib/fondeks/urls";

/**
 * Served at /sitemap.xml. The URL set lives in `urls`, which the submission
 * job pings, so the two cannot drift apart.
 *
 * Regenerated once a day so every entry's `lastModified` rolls over to the
 * current date each day, rather than freezing at build time.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return listIndexableUrls();
}
