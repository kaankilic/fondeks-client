import { NextResponse } from "next/server";

import { searchFunds } from "@/lib/fondeks/queries";

export const dynamic = "force-dynamic";

/**
 * Quick-search proxy for the nav's search box. The box is a client component
 * and cannot reach the external Fondeks API directly (CORS, and the base URL
 * stays server-side), so it calls this route, which forwards to the API's
 * `/funds/search` and returns its `{ results }` unchanged.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchFunds(query) });
}
