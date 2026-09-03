import type { MetadataRoute } from "next";

import { getGuides, getSitemapFunds } from "@/lib/fondeks/queries";
import { absoluteUrl } from "@/lib/fondeks/site";

/**
 * Served at /sitemap.xml.
 *
 * Only URLs worth indexing are listed: a sitemap is a statement that a page is
 * canonical and worth crawling, so placeholders, account screens and internal
 * search results are left out rather than filed under a low priority.
 *
 * Everything here is one page — funds and guides together stay far below the
 * 50,000-URL limit, so `generateSitemaps` is not needed yet.
 */

type Entry = MetadataRoute.Sitemap[number];

/** Pages that exist independently of the data, newest-changing first. */
const STATIC_PAGES: {
  path: string;
  changeFrequency: Entry["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [funds, guides] = await Promise.all([getSitemapFunds(), getGuides()]);

  // The freshest fund price is the best available proxy for "the site changed".
  const latestFundUpdate = funds.reduce<Date | null>(
    (latest, fund) =>
      latest === null || fund.lastModified > latest ? fund.lastModified : latest,
    null,
  );
  const siteModified = latestFundUpdate ?? new Date();

  return [
    ...STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      lastModified: siteModified,
      changeFrequency,
      priority,
    })),

    ...funds.map((fund) => ({
      url: absoluteUrl(`/fon/${fund.slug}`),
      lastModified: fund.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),

    ...guides.map((guide) => ({
      url: absoluteUrl(`/rehber/${guide.slug}`),
      lastModified: guide.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
