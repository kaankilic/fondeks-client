import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

/**
 * Client-side session handshake.
 *
 * The site's public pages (home, fund detail, category, rehber, piyasa) must
 * be edge-cachable so Googlebot does not force a cold render every crawl.
 * Reading the session in the server render path marks the route dynamic and
 * defeats that cache — so the auth state is resolved here instead, after
 * hydration, and `TopNav` / `IdentifyUser` swap in once the response lands.
 *
 * The response carries `Cache-Control: private, no-store` so it is never
 * promoted to a shared cache. Only the signed-in user themselves should ever
 * see their name and email.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
