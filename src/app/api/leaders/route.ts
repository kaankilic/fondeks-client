import { z } from "zod";

import { badRequest, json } from "@/lib/api/response";
import {
  getFunds,
  getInvestorGrowth,
  getNewestFunds,
  getTopGainers,
  getTopLosers,
} from "@/lib/fondeks/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  type: z
    .enum(["returns", "gainers", "losers", "investors", "new"])
    .default("returns"),
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

/**
 * The discovery lists the product is built around.
 * GET /api/leaders?type=investors&limit=5
 *
 * returns   — Getiri Liderleri
 * gainers   — En Çok Kazandıran Fonlar
 * losers    — En Az Kazandıran Fonlar
 * investors — Yatırımcısı En Çok Artan Fonlar
 * new       — Son Çıkan Fonlar
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "invalid query");
  }

  const { type, limit } = parsed.data;

  switch (type) {
    case "returns":
      return json({ type, items: (await getFunds()).slice(0, limit) });
    case "gainers":
      return json({ type, items: await getTopGainers(limit) });
    case "losers":
      return json({ type, items: await getTopLosers(limit) });
    case "new":
      return json({ type, items: await getNewestFunds(limit) });
    case "investors": {
      const rows = await getInvestorGrowth(limit);
      return json({
        type,
        items: rows.map((row) => ({
          fund: row.fund,
          growthPct: row.growth,
          investors: row.investors,
        })),
      });
    }
  }
}
