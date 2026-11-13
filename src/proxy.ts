import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Edge-cache header injection for the public surface.
 *
 * Every page reads `getCurrentUser()` to decide whether to show the authed
 * variant, which makes the route dynamic by default. Next then responds with
 * `Cache-Control: private, no-store` and Vercel's edge cache refuses to hold
 * anything — so every Googlebot hit is a cold render, crawl budget bleeds,
 * and TTFB/LCP both regress.
 *
 * This proxy sits in front of the request and does two things:
 *
 *   1. Logged-out traffic on a public route: overwrite the cache header with
 *      `public, s-maxage=300, stale-while-revalidate=600`. Vercel serves the
 *      hot response from its edge for 5 minutes and keeps revalidating in the
 *      background for another 10. Googlebot and anonymous visitors land on
 *      warm pages.
 *
 *   2. Logged-in traffic (session cookie present): leave Next's default
 *      alone. The response stays per-user and uncached.
 *
 * Routes that should never cache (account surfaces, auth screens, internal
 * search, every API route) are matched out by `config.matcher`.
 *
 * Next 16 replaced the `middleware` file convention with `proxy`; the
 * mechanics are the same — only the file name and exported function name
 * changed. See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 */

/**
 * Prefixes the proxy skips entirely. Account surfaces, auth screens and
 * internal search are personal or stateful; API routes handle their own
 * cache semantics; Next's own asset routes are already immutable.
 */
const UNCACHED = [
  "/api/",
  "/_next/",
  "/arama",
  "/hesap",
  "/izleme",
  "/karsilastir",
  "/giris",
  "/kayit",
];

export function proxy(request: NextRequest) {
  // Only GET is cacheable in the HTTP sense; a POST or a form submission is
  // always per-request, so there is nothing to override on it.
  if (request.method !== "GET") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (UNCACHED.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Logged-in requests stay dynamic — private user state is in the page and
  // must not reach the edge cache.
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // 5 min at the edge, serve stale for another 10 while revalidating. Fund
  // prices update intraday so this stays well inside the data freshness
  // window. `public` lets Vercel's edge hold the response; the browser cache
  // is intentionally short (`max-age=0`) so a user navigating after a
  // publish-time data roll always sees the latest HTML.
  response.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  );

  return response;
}

export const config = {
  // Everything except the opt-outs listed above and the static asset routes
  // Next already serves with its own headers.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|indexnow.txt).*)",
  ],
};
