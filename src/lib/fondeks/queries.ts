import "server-only";

import { cache } from "react";

import { apiFetch, apiFetchOrNull } from "./api-client";
import type {
  CategoryPerformance,
  Fund,
  FundDetail,
  Guide,
  GuideDetail,
  MarketIndex,
  MonthlyStat,
  NewsItem,
  NewsSource,
  PricePoint,
  SearchResult,
  SitemapFund,
} from "./types";

/**
 * The data access layer. The app no longer owns a database — every reader the
 * external Fondeks API can serve reads from it over HTTP through
 * {@link apiFetch}. Readers the API does not yet expose (market indices, news,
 * category performance, guides, the pension and ETF universes) are stubbed to
 * an empty result so their screens render an empty state rather than an error,
 * until the API grows those endpoints.
 */

/**
 * Kept only so the `revalidateTag` calls in the cron routes still resolve to a
 * symbol. Nothing is tagged for them to drop now that the readers fetch live
 * from the API, so those calls are harmless no-ops.
 */
export const CATALOGUE_TAG = "fund-catalogue";

// ── Response shapes the API returns ─────────────────────────────────────────

type FundListResponse = {
  items: Fund[];
  total: number;
  limit: number;
  offset: number;
};

type SearchResponse = { results: SearchResult[] };

type FundDetailResponse = {
  fund: Fund;
  prices?: PricePoint[];
  monthly?: MonthlyStat[];
  volatility?: number | null;
  allocation?: FundDetail["allocation"];
  similar?: FundDetail["similar"];
  increased?: FundDetail["increased"];
  decreased?: FundDetail["decreased"];
  compare?: FundDetail["compare"];
};

type InvestorLeader = { fund: Fund; growthPct: number; investors: number };
type LeadersResponse<T> = { type: string; items: T[] };

/** The API caps a page at 100 rows; walked in full where a screen needs it. */
const MAX_PAGE = 100;

// ── Fund catalogue ──────────────────────────────────────────────────────────

/** One page of funds, straight from the API with the given query. */
async function listFunds(
  params: Record<string, string | number | undefined>,
): Promise<FundListResponse> {
  return apiFetch<FundListResponse>("/funds", params);
}

/**
 * The whole catalogue, best one-year return first — the product's default
 * order and the shape the discovery screens filter and slice client-side.
 *
 * The list endpoint pages at 100, so this walks every page. `cache` dedupes it
 * within a request, so a screen that reads it from several components pays the
 * walk once per render.
 */
export const getFunds = cache(async (): Promise<Fund[]> => {
  const first = await listFunds({ sort: "y1", dir: "desc", limit: MAX_PAGE });
  const funds = [...first.items];

  for (let offset = MAX_PAGE; offset < first.total; offset += MAX_PAGE) {
    const page = await listFunds({
      sort: "y1",
      dir: "desc",
      limit: MAX_PAGE,
      offset,
    });
    funds.push(...page.items);
    if (page.items.length === 0) break;
  }

  return funds;
});

/** How many funds the product covers — read off the list endpoint's total. */
export const getFundCount = cache(async (): Promise<number> => {
  const { total } = await listFunds({ limit: 1 });
  return total;
});

/**
 * Emeklilik yatırım fonları. The list endpoint has no fund-type parameter, so
 * this universe is unavailable until the API exposes one — stubbed empty.
 */
export const getPensionFunds = cache(async (): Promise<Fund[]> => []);

/** Borsa yatırım fonları — likewise unavailable through the API for now. */
export const getEtfFunds = cache(async (): Promise<Fund[]> => []);

/** "Öne Çıkanlar" — the week's strongest movers, biggest gain first. */
export const getFeaturedFunds = cache(async (limit = 3): Promise<Fund[]> => {
  return [...(await getFunds())]
    .sort((a, b) => b.w1 - a.w1)
    .slice(0, limit);
});

/** Placeholder for a per-user list: the strongest funds until accounts own one. */
export const getWatchlist = cache(async (): Promise<Fund[]> => {
  return (await getFunds()).slice(0, 5);
});

/** One fund, by TEFAS code or full slug. Null when the API answers 404. */
export const getFund = cache(async (code: string): Promise<Fund | null> => {
  return apiFetchOrNull<Fund>(`/funds/${encodeURIComponent(code)}`);
});

/** Daily price series, oldest first, limited to the last `days` sessions. */
export const getFundPrices = cache(
  async (code: string, days: number = 260): Promise<PricePoint[]> => {
    const detail = await apiFetchOrNull<FundDetailResponse>(
      `/funds/${encodeURIComponent(code)}`,
      { include: "prices" },
    );
    const prices = detail?.prices ?? [];
    return days < prices.length ? prices.slice(prices.length - days) : prices;
  },
);

/** Month-end size, investor count and net flow for the fund. */
export const getFundMonthly = cache(
  async (code: string, months = 24): Promise<MonthlyStat[]> => {
    const detail = await apiFetchOrNull<FundDetailResponse>(
      `/funds/${encodeURIComponent(code)}`,
      { include: "monthly" },
    );
    const monthly = detail?.monthly ?? [];
    return months < monthly.length
      ? monthly.slice(monthly.length - months)
      : monthly;
  },
);

/**
 * The full fund detail bundle: the fund, its series, volatility, allocation,
 * similar funds, the mover panels and the compare table — one request with
 * every section attached.
 */
export const getFundDetail = cache(
  async (code: string): Promise<FundDetail | null> => {
    const detail = await apiFetchOrNull<FundDetailResponse>(
      `/funds/${encodeURIComponent(code)}`,
      { include: "prices,monthly,detail" },
    );
    if (!detail) return null;

    return {
      fund: detail.fund,
      volatility: detail.volatility ?? null,
      prices: detail.prices ?? [],
      monthly: detail.monthly ?? [],
      increased: detail.increased ?? [],
      decreased: detail.decreased ?? [],
      allocation: detail.allocation ?? [],
      similar: detail.similar ?? [],
      compare: detail.compare ?? { codes: [], rows: [] },
    };
  },
);

// ── Search ───────────────────────────────────────────────────────────────────

/** Quick-search over code, name and issuer — powers the nav's search box. */
export async function searchFunds(query: string): Promise<SearchResult[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];

  const { results } = await apiFetch<SearchResponse>("/funds/search", {
    q: needle,
  });
  return results;
}

// ── Discovery widgets ───────────────────────────────────────────────────────
//
// Derived from the full catalogue rather than the `/leaders` endpoint: the
// discovery screen already loads `getFunds()` once, so these are free client
// transforms over it and stay exactly consistent with the table beside them.

/** Best one-year performers. */
export const getTopGainers = cache(async (limit = 5): Promise<Fund[]> => {
  return (await getFunds()).slice(0, limit);
});

/**
 * "En Az Kazandıran Fonlar" — the thinnest gains, closest to zero first. A fund
 * that lost money did not earn least, so the panel is bounded below by zero.
 */
export const getSmallestGainers = cache(async (limit = 5): Promise<Fund[]> => {
  return (await getFunds())
    .filter((fund) => fund.y1 > 0)
    .sort((a, b) => a.y1 - b.y1)
    .slice(0, limit);
});

/** Newest funds by kuruluş tarihi. */
export const getNewestFunds = cache(async (limit = 5): Promise<Fund[]> => {
  return (await getFunds())
    .filter((fund) => fund.inceptionDate)
    .sort((a, b) => (a.inceptionDate! < b.inceptionDate! ? 1 : -1))
    .slice(0, limit);
});

export type InvestorGrowth = { fund: Fund; growth: number; investors: number };

/**
 * Funds whose yatırımcı sayısı grew most over the last month. Month-over-month
 * growth is not in the fund snapshot, so this reads the API's leader board.
 */
export const getInvestorGrowth = cache(
  async (limit: number = 5): Promise<InvestorGrowth[]> => {
    const { items } = await apiFetch<LeadersResponse<InvestorLeader>>(
      "/leaders",
      { type: "investors", limit },
    );
    return items.map((item) => ({
      fund: item.fund,
      growth: item.growthPct,
      investors: item.investors,
    }));
  },
);

// ── Sitemap ───────────────────────────────────────────────────────────────────

/**
 * Every indexable fund URL, walked from the list endpoint. Uses each fund's
 * canonical slug and its price date as the last-modified stamp.
 */
export const getSitemapFunds = cache(async (): Promise<SitemapFund[]> => {
  const funds = await getFunds();
  return funds.map((fund) => ({
    slug: fund.slug,
    lastModified: new Date(fund.priceDate),
  }));
});

// ── Not yet served by the API — stubbed empty ────────────────────────────────
//
// These keep their call signatures so their screens compile unchanged; the
// arguments are ignored until the API grows the matching endpoints.
/* eslint-disable @typescript-eslint/no-unused-vars -- stubs keep their signatures */

/** Market index cards (BIST, gold, FX). Not exposed by the API yet. */
export const getMarketIndices = cache(async (): Promise<MarketIndex[]> => []);

/** Category performance heatmap. Not exposed by the API yet. */
export const getCategoryPerformance = cache(
  async (): Promise<CategoryPerformance[]> => [],
);

/** KAP / haber news. Not exposed by the API yet. */
export const getNews = cache(
  async (_source: NewsSource, _limit: number = 6): Promise<NewsItem[]> => [],
);

/** Live market headlines. Not exposed by the API yet. */
export const getForeksNews = cache(
  async (_limit: number = 6): Promise<NewsItem[]> => [],
);

/** Rehber list. Not exposed by the API yet. */
export const getGuides = cache(async (_limit?: number): Promise<Guide[]> => []);

/** One rehber article. Not exposed by the API yet. */
export const getGuide = cache(
  async (_slug: string): Promise<GuideDetail | null> => null,
);

/** Featured-card sparklines. Per-fund price series are not batched by the API. */
export const getSparklines = cache(
  async (
    _codes: string[],
    _sessions: number = 60,
    _points: number = 16,
  ): Promise<Record<string, string>> => ({}),
);
/* eslint-enable @typescript-eslint/no-unused-vars */
