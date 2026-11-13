import path from "node:path";
import type { NextConfig } from "next";

/**
 * Cache-Control value for the public, crawl-facing surface.
 *
 * Every page reads `getCurrentUser()` from the root layout, which marks each
 * route dynamic — so Next's renderer sets `private, no-cache, no-store`. On
 * Vercel that header reaches the CDN and refuses every edge cache, and
 * Googlebot hits a cold server render every crawl.
 *
 * `headers()` here runs at the Vercel platform layer, where it overrides the
 * origin response's Cache-Control. Five minutes at the edge, serve stale for
 * another ten while revalidating; the browser cache is intentionally short
 * (`max-age=0`) so a user who returns after a price roll always sees the
 * latest HTML.
 *
 * `Vary: Cookie` keys the cache per-session cookie, so a logged-in response
 * (which still runs dynamic) never gets served to a logged-out visitor.
 *
 * The proxy at `src/proxy.ts` short-circuits authed requests with its own
 * no-store header; this `headers()` runs on every matched path but the
 * proxy's header wins for session-bearing requests because it is set on the
 * terminal response.
 */
const PUBLIC_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

const CACHE_HEADERS = [
  { key: "Cache-Control", value: PUBLIC_CACHE },
  { key: "Vary", value: "Cookie" },
];

/**
 * Paths that must never carry the shared cache header. Everything else is
 * matched by the catch-all pattern below.
 */
const UNCACHED_SOURCES = [
  "/api/:path*",
  "/arama",
  "/arama/:path*",
  "/hesap",
  "/hesap/:path*",
  "/izleme",
  "/izleme/:path*",
  "/karsilastir",
  "/karsilastir/:path*",
  "/giris",
  "/kayit",
];

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile above this folder is ignored.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/piyasa", destination: "/piyasa-ozeti", permanent: true },
      { source: "/tarama", destination: "/arama", permanent: true },
    ];
  },
  async headers() {
    return [
      // The public surface: fund detail, category, rehber article, home, and
      // the section pages. Listed explicitly rather than catch-all so personal
      // or auth routes never pick up `public, s-maxage=300` by accident.
      {
        source: "/",
        headers: CACHE_HEADERS,
      },
      {
        source: "/fon/:slug",
        headers: CACHE_HEADERS,
      },
      {
        source: "/kategori/:slug",
        headers: CACHE_HEADERS,
      },
      {
        source: "/rehber",
        headers: CACHE_HEADERS,
      },
      {
        source: "/rehber/:slug",
        headers: CACHE_HEADERS,
      },
      {
        source: "/piyasa-ozeti",
        headers: CACHE_HEADERS,
      },
      {
        source: "/borsa-yatirim-fonlari",
        headers: CACHE_HEADERS,
      },
      {
        source: "/emeklilik-fonlari",
        headers: CACHE_HEADERS,
      },
      // Legal pages change rarely but still benefit from a warm edge.
      {
        source: "/kvkk",
        headers: CACHE_HEADERS,
      },
      {
        source: "/gizlilik",
        headers: CACHE_HEADERS,
      },
      {
        source: "/kullanim-sartlari",
        headers: CACHE_HEADERS,
      },
      // Explicit no-store on the account / auth / search surface, so a stray
      // cache layer somewhere else cannot promote a per-user response.
      ...UNCACHED_SOURCES.map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      })),
    ];
  },
  sassOptions: {
    // Lets any .scss file do `@use "abstracts" as *;` regardless of its depth.
    loadPaths: [path.join(process.cwd(), "src/styles")],
    includePaths: [path.join(process.cwd(), "src/styles")],
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default nextConfig;
