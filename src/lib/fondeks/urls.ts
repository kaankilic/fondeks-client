import "server-only";

import type { MetadataRoute } from "next";

import { GOALS } from "./goals";
import { getGuides, getSitemapFunds } from "./queries";
import { absoluteUrl } from "./site";

/**
 * Every URL the site asks a search engine to index, grouped by bucket.
 *
 * The sitemap serves these and the submission job pings them, so a page
 * cannot be listed in one and missing from the other. A sitemap entry is a
 * statement that a page is canonical and worth crawling, so placeholders,
 * account screens and internal search results are left out.
 *
 * The buckets are listed through `generateSitemaps` so each one ships as its
 * own XML file — `static`, `funds`, `categories`, `guides`. Search Console's
 * "Pages — not indexed" report breaks down per sitemap, so a regression lands
 * in one bucket rather than hiding inside a 2,500-URL blob.
 */

type Entry = MetadataRoute.Sitemap[number];

export type SitemapBucket = "static" | "funds" | "categories" | "guides";

/** Pages that exist independently of the data. */
const STATIC_PAGES: {
  path: string;
  changeFrequency: Entry["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/emeklilik-fonlari", changeFrequency: "daily", priority: 0.8 },
  { path: "/borsa-yatirim-fonlari", changeFrequency: "daily", priority: 0.8 },
  { path: "/piyasa-ozeti", changeFrequency: "daily", priority: 0.8 },
  { path: "/rehber", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kvkk", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kullanim-sartlari", changeFrequency: "yearly", priority: 0.3 },
];

// Deliberately absent:
//   /arama            internal search results — Google asks not to index these
//   /karsilastir      a ComingSoon placeholder, no content to rank
//   /izleme           account-scoped, and a placeholder behind the signup wall
//   /giris, /kayit    authentication screens

/** Produces the entries for a single bucket. */
export async function listBucketUrls(
  bucket: SitemapBucket,
): Promise<MetadataRoute.Sitemap> {
  // Every entry is stamped with the current day so the sitemap carries today's
  // date and invites crawlers to re-check the prices.
  const today = new Date();

  switch (bucket) {
    case "static":
      return STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
        url: absoluteUrl(path),
        lastModified: today,
        changeFrequency,
        priority,
      }));

    case "funds": {
      const funds = await getSitemapFunds();
      return funds.map((fund) => ({
        url: absoluteUrl(`/fon/${fund.slug}`),
        lastModified: today,
        changeFrequency: "daily" as const,
        priority: 0.9,
      }));
    }

    case "categories":
      return GOALS.map((goal) => ({
        url: absoluteUrl(`/kategori/${goal.slug}`),
        lastModified: today,
        changeFrequency: "daily" as const,
        priority: 0.85,
      }));

    case "guides": {
      const guides = await getGuides();
      return guides.map((guide) => ({
        url: absoluteUrl(`/rehber/${guide.slug}`),
        lastModified: today,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
    }
  }
}

/**
 * The full flat list — kept for the URL submission job, which pings every
 * canonical URL after a data sync rather than reading the bucketed sitemaps
 * one at a time.
 */
export async function listIndexableUrls(): Promise<MetadataRoute.Sitemap> {
  const [staticUrls, fundUrls, categoryUrls, guideUrls] = await Promise.all([
    listBucketUrls("static"),
    listBucketUrls("funds"),
    listBucketUrls("categories"),
    listBucketUrls("guides"),
  ]);

  return [...staticUrls, ...fundUrls, ...categoryUrls, ...guideUrls];
}

export const SITEMAP_BUCKETS: SitemapBucket[] = [
  "static",
  "funds",
  "categories",
  "guides",
];
