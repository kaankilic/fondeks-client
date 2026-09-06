import type { MetadataRoute } from "next";

import { listIndexableUrls } from "@/lib/fondeks/urls";

/**
 * Served at /sitemap.xml. The URL set lives in `urls`, which the submission
 * job pings, so the two cannot drift apart.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return listIndexableUrls();
}
