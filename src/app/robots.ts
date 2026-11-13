import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/fondeks/site";

/**
 * Served at /robots.txt. Previously missing, so crawlers fetching the path hit
 * the App Router 404 fallback (HTML 200 with a 404 body) — read by Google as
 * "no robots.txt" and a soft-404 signal all at once.
 *
 * Disallowed sections match what the sitemap deliberately leaves out: internal
 * search, the authed account surfaces and the signup/login screens.
 */
export default function robots(): MetadataRoute.Robots {
  const host = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/arama",
          "/izleme",
          "/karsilastir",
          "/hesap",
          "/giris",
          "/kayit",
          "/api/",
        ],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
