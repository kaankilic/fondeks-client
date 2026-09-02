import { NextResponse } from "next/server";

import { searchFunds } from "@/lib/fondeks/queries";

/** Quick-search endpoint for the top navigation. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const funds = await searchFunds(query);

  return NextResponse.json({
    results: funds.map((fund) => ({
      code: fund.code,
      slug: fund.slug,
      name: fund.name,
      founder: fund.founder,
      initials: fund.founderInitials,
      color: fund.founderColor,
      category: fund.category,
      y1: fund.y1,
    })),
  });
}
