import { z } from "zod";

import { badRequest, json } from "@/lib/api/response";
import { FUND_CATEGORIES, RISK_MAX, RISK_MIN } from "@/lib/fondeks/constants";
import { getFunds } from "@/lib/fondeks/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(FUND_CATEGORIES).optional(),
  minRisk: z.coerce.number().int().min(RISK_MIN).max(RISK_MAX).optional(),
  maxRisk: z.coerce.number().int().min(RISK_MIN).max(RISK_MAX).optional(),
  minReturn: z.coerce.number().min(-100).max(1000).optional(),
  sort: z.enum(["y1", "m3", "m1", "daily", "price", "aum", "investors"]).default("y1"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Fund list with filtering, sorting and paging.
 * GET /api/funds?category=Hisse%20Senedi&minReturn=30&sort=y1&limit=10
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "invalid query");
  }

  const { q, category, minRisk, maxRisk, minReturn, sort, dir, limit, offset } =
    parsed.data;

  const needle = q?.toLocaleLowerCase("tr");

  const filtered = (await getFunds()).filter((fund) => {
    if (category && fund.category !== category) return false;
    if (minRisk !== undefined && fund.risk < minRisk) return false;
    if (maxRisk !== undefined && fund.risk > maxRisk) return false;
    if (minReturn !== undefined && fund.y1 < minReturn) return false;
    if (
      needle &&
      !`${fund.code} ${fund.name} ${fund.founder}`
        .toLocaleLowerCase("tr")
        .includes(needle)
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const delta = a[sort] - b[sort];
    return dir === "asc" ? delta : -delta;
  });

  return json({
    items: sorted.slice(offset, offset + limit),
    total: sorted.length,
    limit,
    offset,
  });
}
