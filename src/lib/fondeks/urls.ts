import "server-only";

import type { MetadataRoute } from "next";

import { getGuides, getSitemapFunds } from "./queries";
import { absoluteUrl } from "./site";

/**
 * Every URL the site asks a search engine to index, in one place.
 *
 * The sitemap serves this and the submission job pings it, so a page cannot be
 * listed in one and missing from the other. A sitemap entry is a statement
 * that a page is canonical and worth crawling, so placeholders, account
 * screens and internal search results are left out rather than filed under a
 * low priority.
 *
 * Funds and guides together stay far below the 50,000-URL limit, so
 * `generateSitemaps` is not needed yet.
 */

type Entry = MetadataRoute.Sitemap[number];

/** Pages that exist independently of the data, newest-changing first. */
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

export async function listIndexableUrls(): Promise<MetadataRoute.Sitemap> {
  const [funds, guides] = await Promise.all([getSitemapFunds(), getGuides()]);

  // Every entry is stamped with the current day. The sitemap route revalidates
  // daily (see app/sitemap.ts), so each day's sitemap reports today's date and
  // invites crawlers to re-check the prices, which change every session.
  const today = new Date();

  return [
    ...STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      lastModified: today,
      changeFrequency,
      priority,
    })),

    ...funds.map((fund) => ({
      url: absoluteUrl(`/fon/${fund.slug}`),
      lastModified: today,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),

    ...guides.map((guide) => ({
      url: absoluteUrl(`/rehber/${guide.slug}`),
      lastModified: today,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
