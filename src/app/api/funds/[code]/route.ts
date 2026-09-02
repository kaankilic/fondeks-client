import { json, notFound } from "@/lib/api/response";
import {
  getFund,
  getFundDetail,
  getFundMonthly,
  getFundPrices,
} from "@/lib/fondeks/queries";
import { codeFromSlug } from "@/lib/fondeks/slug";

export const dynamic = "force-dynamic";

/**
 * One fund. Accepts a code or a full slug.
 * GET /api/funds/AFT?include=prices,monthly,detail
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await params;
  const code = codeFromSlug(raw);

  const fund = await getFund(code);
  if (!fund) return notFound(`fund ${code} not found`);

  const include = new Set(
    (new URL(request.url).searchParams.get("include") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );

  const [prices, monthly, detail] = await Promise.all([
    include.has("prices") ? getFundPrices(fund.code) : Promise.resolve(null),
    include.has("monthly") ? getFundMonthly(fund.code) : Promise.resolve(null),
    include.has("detail") ? getFundDetail(fund.code) : Promise.resolve(null),
  ]);

  return json({
    fund,
    ...(prices ? { prices } : {}),
    ...(monthly ? { monthly } : {}),
    ...(detail
      ? {
          volatility: detail.volatility,
          allocation: detail.allocation,
          similar: detail.similar,
          increased: detail.increased,
          decreased: detail.decreased,
          compare: detail.compare,
        }
      : {}),
  });
}
