import "server-only";

import { cache } from "react";
import { asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categoryPerformance,
  founders,
  fundAllocations,
  fundDailyStats,
  fundSimilarities,
  funds,
  guides,
  indexQuotes,
  marketIndices,
  news,
} from "@/db/schema/funds";
import { formatPercent, formatPercentPrefixed } from "./format";
import { allocationColor, FALLBACK_LOGO } from "./palette";
import { fundSlug } from "./slug";
import type {
  Allocation,
  Guide,
  GuideDetail,
  NewsItem,
  NewsSource,
  CategoryPerformance,
  CompareRow,
  Fund,
  FundDetail,
  HoldingChange,
  MarketIndex,
  MonthlyStat,
  PricePoint,
  RiskLevel,
  SimilarFund,
} from "./types";

/**
 * The data access layer. Prices, returns and fund size are derived from the
 * daily and monthly series rather than stored on the fund row, so everything a
 * screen shows can be traced back to a dated observation.
 */

const TRADING_DAYS_PER_YEAR = 252;

/** Points drawn in an index card's sparkline. */
const SPARK_POINTS = 16;

/** Maps a value series onto the 120×42 sparkline viewBox. */
function sparkPath(values: number[]): string | null {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 118 + 1;
      const y = 38 - ((value - min) / span) * 34;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type SnapshotRow = {
  code: string;
  name: string;
  founder: string;
  initials: string | null;
  color: string | null;
  category: Fund["category"];
  isin: string | null;
  management_fee: string;
  withholding_tax: string;
  risk: number;
  buy_value_days: number;
  sell_value_days: number;
  on_tefas: boolean;
  inception_date: string | null;
  price: string;
  prev_price: string | null;
  w1_price: string | null;
  m1_price: string | null;
  m3_price: string | null;
  y1_price: string | null;
  total_value: string | null;
  investor_count: number | null;
};

/** Percentage change between two prices, or 0 when there is no history yet. */
function changePct(current: number, past: string | null): number {
  if (!past) return 0;
  const previous = Number(past);
  if (!previous) return 0;
  return Number((((current / previous) - 1) * 100).toFixed(2));
}

function toFund(row: SnapshotRow): Fund {
  const price = Number(row.price);

  return {
    code: row.code,
    slug: fundSlug(row.code, row.name),
    name: row.name,
    founder: row.founder,
    founderInitials: row.initials ?? FALLBACK_LOGO.initials,
    founderColor: row.color ?? FALLBACK_LOGO.background,
    category: row.category,
    isin: row.isin,
    managementFee: Number(row.management_fee),
    withholdingTax: Number(row.withholding_tax),
    buyValueDays: row.buy_value_days,
    sellValueDays: row.sell_value_days,
    onTefas: row.on_tefas,
    price,
    daily: changePct(price, row.prev_price),
    w1: changePct(price, row.w1_price),
    m1: changePct(price, row.m1_price),
    m3: changePct(price, row.m3_price),
    y1: changePct(price, row.y1_price),
    inceptionDate: row.inception_date,
    aum: Number(row.total_value ?? 0),
    investors: row.investor_count ?? 0,
    risk: row.risk as RiskLevel,
  };
}

/**
 * A one-day price move this large is a restatement, not a return.
 *
 * Funds are relaunched: the unit price is re-based and the share count steps
 * with it, so the series either side of that day measures a different thing.
 * Dividing across one produces figures like NMG's +11.492% year — which TEFAS
 * publishes too, because it divides the same two prices.
 *
 * 1.0 means "the price at least doubled or halved overnight". Of 489k daily
 * observations, 485,854 move less than 10% and only 52 clear this bar, every
 * one of them in a fund with between 1 and 72 investors.
 */
const SERIES_BREAK_RATIO = 1;

/**
 * One row per fund with its latest price, the reference prices the returns are
 * measured against, and the most recent monthly size and investor count.
 *
 * An anchor older than the fund's most recent restatement is dropped rather
 * than divided against, so that window reports no return instead of a
 * fabricated one. Each window is judged separately: a break last week spoils
 * the daily figure and the yearly one, a break ten months ago only the yearly.
 */
const snapshotQuery = sql`
  select
    f.code, f.name, f.founder, fo.initials, fo.color, f.category, f.isin,
    f.management_fee, f.withholding_tax, f.risk,
    f.buy_value_days, f.sell_value_days, f.on_tefas, f.inception_date,
    lp.price,
    case when brk.at is null or brk.at <= prev.date then prev.price end as prev_price,
    case when brk.at is null or brk.at <= w1.date   then w1.price   end as w1_price,
    case when brk.at is null or brk.at <= m1.date   then m1.price   end as m1_price,
    case when brk.at is null or brk.at <= m3.date   then m3.price   end as m3_price,
    case when brk.at is null or brk.at <= y1.date   then y1.price   end as y1_price,
    lp.total_value,
    lp.investor_count
  from ${funds} f
  join ${founders} fo on fo.name = f.founder
  join lateral (
    select p.price, p.date, p.total_value, p.investor_count
    from ${fundDailyStats} p
    where p.fund_code = f.code order by p.date desc limit 1
  ) lp on true
  left join lateral (
    select p.price, p.date from ${fundDailyStats} p
    where p.fund_code = f.code and p.date < lp.date
    order by p.date desc limit 1
  ) prev on true
  left join lateral (
    select p.price, p.date from ${fundDailyStats} p
    where p.fund_code = f.code and p.date <= lp.date - interval '7 days'
    order by p.date desc limit 1
  ) w1 on true
  left join lateral (
    select p.price, p.date from ${fundDailyStats} p
    where p.fund_code = f.code and p.date <= lp.date - interval '1 month'
    order by p.date desc limit 1
  ) m1 on true
  left join lateral (
    select p.price, p.date from ${fundDailyStats} p
    where p.fund_code = f.code and p.date <= lp.date - interval '3 months'
    order by p.date desc limit 1
  ) m3 on true
  left join lateral (
    select p.price, p.date from ${fundDailyStats} p
    where p.fund_code = f.code and p.date <= lp.date - interval '1 year'
    order by p.date desc limit 1
  ) y1 on true
  left join lateral (
    select max(step.date) as at from (
      select p.date, p.price,
             lag(p.price) over (order by p.date) as before
      from ${fundDailyStats} p
      where p.fund_code = f.code and p.date > lp.date - interval '1 year'
    ) step
    where step.before > 0
      and abs(step.price / step.before - 1) > ${SERIES_BREAK_RATIO}
  ) brk on true
`;

/** How many funds the product actually covers. */
export const getFundCount = cache(async (): Promise<number> => {
  const [row] = await db.select({ total: count() }).from(funds);
  return row?.total ?? 0;
});

/** All funds, best one-year return first — the product's default order. */
export const getFunds = cache(async (): Promise<Fund[]> => {
  const result = await db.execute<SnapshotRow>(snapshotQuery);
  return result.rows
    .map(toFund)
    .sort((a, b) => b.y1 - a.y1);
});

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

export const getFund = cache(async (code: string): Promise<Fund | null> => {
  const result = await db.execute<SnapshotRow>(
    sql`${snapshotQuery} where upper(f.code) = ${code.toUpperCase()}`,
  );
  const [row] = result.rows;
  return row ? toFund(row) : null;
});

/** Daily price series, oldest first, limited to the last `days` sessions. */
export const getFundPrices = cache(
  async (code: string, days = 260): Promise<PricePoint[]> => {
    const rows = await db
      .select({ date: fundDailyStats.date, price: fundDailyStats.price })
      .from(fundDailyStats)
      .where(eq(fundDailyStats.fundCode, code))
      .orderBy(desc(fundDailyStats.date))
      .limit(days);

    return rows.reverse();
  },
);

/**
 * Month-end size and investor count, rolled up from the daily rows, with net
 * flow derived as the part of the change in size the fund's own return does
 * not explain.
 */
export const getFundMonthly = cache(
  async (code: string, months = 24): Promise<MonthlyStat[]> => {
    const result = await db.execute<{
      month: string;
      total_value: string | null;
      investor_count: number | null;
      price: string;
    }>(sql`
      select to_char(date_trunc('month', date), 'YYYY-MM-DD') as month,
             (array_agg(total_value order by date desc))[1]    as total_value,
             (array_agg(investor_count order by date desc))[1] as investor_count,
             (array_agg(price order by date desc))[1]          as price
      from ${fundDailyStats}
      where fund_code = ${code}
      group by date_trunc('month', date)
      order by date_trunc('month', date) desc
      limit ${months}
    `);

    const rows = result.rows.reverse();

    return rows.map((row, index) => {
      const value = Number(row.total_value ?? 0);
      const previous = rows[index - 1];
      const previousValue = Number(previous?.total_value ?? 0);
      const priceReturn = previous
        ? Number(row.price) / Number(previous.price) - 1
        : 0;

      return {
        month: row.month,
        totalValue: value,
        investorCount: row.investor_count ?? 0,
        netFlow: previous
          ? Number((value - previousValue * (1 + priceReturn)).toFixed(2))
          : 0,
      };
    });
  },
);

/** Annualised volatility of daily returns over the last year, in percent. */
async function getVolatilities(
  codes: string[],
): Promise<Map<string, number | null>> {
  const result = await db.execute<{ fund_code: string; vol: string | null }>(sql`
    select fund_code,
           stddev_samp(r) * sqrt(${TRADING_DAYS_PER_YEAR}) * 100 as vol
    from (
      select fund_code,
             price / lag(price) over (partition by fund_code order by date) - 1 as r
      from ${fundDailyStats}
      where fund_code = any(${sql.param(codes)})
        and date >= current_date - interval '1 year'
    ) daily
    where r is not null
    group by fund_code
  `);

  return new Map(
    result.rows.map((row) => [
      row.fund_code,
      row.vol === null ? null : Number(Number(row.vol).toFixed(1)),
    ]),
  );
}

/** Latest market news or KAP filings, newest first. */
export const getNews = cache(
  async (source: NewsSource, limit = 6): Promise<NewsItem[]> => {
    return db
      .select({
        id: news.id,
        source: news.source,
        title: news.title,
        summary: news.summary,
        symbol: news.symbol,
        publisher: news.publisher,
        url: news.url,
        publishedAt: news.publishedAt,
      })
      .from(news)
      .where(eq(news.source, source))
      .orderBy(desc(news.publishedAt))
      .limit(limit);
  },
);

/**
 * Index cards: the latest quote, its change against the previous one and a
 * sparkline — all read from `index_quotes`, so the three always agree.
 */
export const getMarketIndices = cache(async (): Promise<MarketIndex[]> => {
  const rows = await db
    .select({
      name: marketIndices.name,
      symbol: marketIndices.symbol,
      color: marketIndices.color,
      unit: marketIndices.unit,
      decimals: marketIndices.decimals,
      displayPattern: marketIndices.displayPattern,
      position: marketIndices.position,
    })
    .from(marketIndices)
    .where(eq(marketIndices.isActive, true))
    .orderBy(asc(marketIndices.position));

  if (rows.length === 0) return [];

  // Last 16 sessions per index, newest first: enough for the card's sparkline.
  const series = await db.execute<{
    index_name: string;
    value: string;
    rn: number;
  }>(sql`
    select index_name, value, rn from (
      select index_name, value,
             row_number() over (partition by index_name order by date desc) as rn
      from ${indexQuotes}
    ) recent
    where rn <= ${SPARK_POINTS}
    order by index_name, rn desc
  `);

  const byIndex = new Map<string, number[]>();
  for (const row of series.rows) {
    const values = byIndex.get(row.index_name) ?? [];
    values.push(Number(row.value));
    byIndex.set(row.index_name, values);
  }

  return rows.map((row) => {
    const values = byIndex.get(row.name) ?? [];
    const value = values.at(-1) ?? 0;
    const previous = values.at(-2);

    return {
      name: row.name,
      symbol: row.symbol,
      color: row.color,
      unit: row.unit,
      decimals: row.decimals,
      displayPattern: row.displayPattern,
      value,
      change:
        previous && previous !== 0
          ? Number((((value - previous) / previous) * 100).toFixed(2))
          : 0,
      spark: sparkPath(values),
    };
  });
});

export const getCategoryPerformance = cache(
  async (): Promise<CategoryPerformance[]> => {
    return db
      .select({
        category: categoryPerformance.category,
        y1: categoryPerformance.y1,
      })
      .from(categoryPerformance)
      .orderBy(desc(categoryPerformance.y1));
  },
);

/** How many peers the head-to-head table compares against. */
const COMPARE_PEERS = 2;

/** How many movers each of the two position panels lists. */
const MOVERS_PER_PANEL = 5;

/**
 * Smallest move worth a row. The panel prints one decimal, so anything under
 * this renders as "0,0 puan" — a row that says nothing happened.
 */
const MIN_MOVE_POINTS = 0.05;

/**
 * Asset-class movements: a fund's newest breakdown against the most recent one
 * at least a month older.
 *
 * Deliberately not security level. TEFAS publishes no holdings endpoint — its
 * gateway exposes nineteen paths and none returns securities — and KAP serves
 * its site through Server Actions with no public API, so the only composition
 * anyone publishes is by asset class.
 */
async function getAllocationMoves(code: string) {
  const result = await db.execute<{
    label: string;
    weight: string;
    change: string;
  }>(sql`
    with latest as (
      select max(date) as at from ${fundAllocations} where fund_code = ${code}
    ),
    baseline as (
      select max(date) as at from ${fundAllocations}
      where fund_code = ${code}
        and date <= (select at from latest) - interval '1 month'
    ),
    current_slices as (
      select label, pct from ${fundAllocations}
      where fund_code = ${code} and date = (select at from latest)
    ),
    earlier_slices as (
      select label, pct from ${fundAllocations}
      where fund_code = ${code} and date = (select at from baseline)
    )
    select
      coalesce(c.label, e.label)              as label,
      coalesce(c.pct, 0)                      as weight,
      coalesce(c.pct, 0) - coalesce(e.pct, 0) as change
    from current_slices c
    full outer join earlier_slices e on e.label = c.label
    -- With no baseline every slice would read as newly opened.
    where (select at from baseline) is not null
      and abs(coalesce(c.pct, 0) - coalesce(e.pct, 0)) >= ${MIN_MOVE_POINTS}
    order by change desc
  `);

  return result.rows;
}

export const getFundDetail = cache(
  async (code: string): Promise<FundDetail | null> => {
    const fund = await getFund(code);
    if (!fund) return null;

    const [moves, allocation, peerRows, prices, monthly] = await Promise.all([
      getAllocationMoves(fund.code),

      // The breakdown is a history now, so only the newest day is the picture.
      db
        .select({ label: fundAllocations.label, pct: fundAllocations.pct })
        .from(fundAllocations)
        .where(
          sql`${fundAllocations.fundCode} = ${fund.code} and ${fundAllocations.date} = (
            select max(date) from ${fundAllocations} where fund_code = ${fund.code}
          )`,
        )
        .orderBy(asc(fundAllocations.position)),

      db
        .select({
          code: fundSimilarities.peerCode,
          label: fundSimilarities.peerLabel,
          name: funds.name,
          initials: founders.initials,
          color: founders.color,
          similarity: fundSimilarities.similarity,
          risk: funds.risk,
        })
        .from(fundSimilarities)
        .innerJoin(funds, eq(fundSimilarities.peerCode, funds.code))
        .leftJoin(founders, eq(funds.founder, founders.name))
        .where(eq(fundSimilarities.fundCode, fund.code))
        .orderBy(desc(fundSimilarities.similarity)),

      getFundPrices(fund.code),
      getFundMonthly(fund.code),
    ]);

    const everyFund = await getFunds();
    const returnsByCode = new Map(everyFund.map((row) => [row.code, row]));

    const similar: SimilarFund[] = peerRows.map((peer) => ({
      code: peer.code,
      slug: fundSlug(peer.code, peer.name),
      label: peer.label ?? peer.name,
      initials: peer.initials ?? FALLBACK_LOGO.initials,
      color: peer.color ?? FALLBACK_LOGO.background,
      similarity: peer.similarity,
      y1: returnsByCode.get(peer.code)?.y1 ?? 0,
      risk: peer.risk as RiskLevel,
    }));

    const compareCodes = [
      fund.code,
      ...similar.slice(0, COMPARE_PEERS).map((peer) => peer.code),
    ];
    const volatilities = await getVolatilities(compareCodes);

    // Every comparison row reads a real column or a series-derived figure.
    const compared = compareCodes.map((peerCode) =>
      peerCode === fund.code ? fund : returnsByCode.get(peerCode),
    );

    const rows: CompareRow[] = [
      {
        label: "1 Yıl Getiri",
        values: compared.map((row) =>
          row ? formatPercent(row.y1, 1) : "—",
        ),
      },
      {
        label: "Risk Değeri",
        values: compared.map((row) => (row ? `${row.risk} / 7` : "—")),
      },
      {
        label: "Yıllık Yönetim Ücreti",
        values: compared.map((row) =>
          row ? formatPercentPrefixed(row.managementFee, 2) : "—",
        ),
      },
      {
        label: "Stopaj Oranı",
        values: compared.map((row) => (row ? formatPercentPrefixed(row.withholdingTax, 0) : "—")),
      },
      {
        label: "Volatilite (1Y)",
        values: compareCodes.map((peerCode) => {
          const vol = volatilities.get(peerCode);
          return vol === null || vol === undefined ? "—" : formatPercentPrefixed(vol, 1);
        }),
      },
      {
        label: "Yatırımcı Sayısı",
        values: compared.map((row) =>
          row ? row.investors.toLocaleString("tr-TR") : "—",
        ),
      },
    ];

    const toHolding = (
      row: (typeof moves)[number],
      index: number,
    ): HoldingChange => ({
      label: row.label,
      color: allocationColor(index),
      weight: Number(row.weight),
      change: Number(row.change),
    });

    // The query orders by change descending, so gains lead and the sharpest
    // cuts are at the far end — reversed, they lead their own panel.
    const gained = moves.filter((row) => Number(row.change) > 0);
    const shed = moves.filter((row) => Number(row.change) < 0).reverse();

    return {
      fund,
      volatility: volatilities.get(fund.code) ?? null,
      prices,
      monthly,
      increased: gained.slice(0, MOVERS_PER_PANEL).map(toHolding),
      decreased: shed.slice(0, MOVERS_PER_PANEL).map(toHolding),
      allocation: allocation as Allocation[],
      similar,
      compare: { codes: compareCodes, rows },
    };
  },
);

/**
 * Sparkline paths for the featured cards, drawn from the real price series and
 * downsampled to the shape the 120×42 viewBox expects.
 */
export const getSparklines = cache(
  async (codes: string[], sessions = 60, points = 16): Promise<Record<string, string>> => {
    if (codes.length === 0) return {};

    const result = await db.execute<{ fund_code: string; price: string }>(sql`
      select fund_code, price from (
        select fund_code, date, price,
               row_number() over (partition by fund_code order by date desc) as rn
        from ${fundDailyStats}
        where fund_code = any(${sql.param(codes)})
      ) recent
      where rn <= ${sessions}
      order by fund_code, date
    `);

    const byFund = new Map<string, number[]>();
    for (const row of result.rows) {
      const series = byFund.get(row.fund_code) ?? [];
      series.push(Number(row.price));
      byFund.set(row.fund_code, series);
    }

    const paths: Record<string, string> = {};

    for (const [code, series] of byFund) {
      if (series.length < 2) continue;

      const sampled = Array.from({ length: points }, (_, i) => {
        const index = Math.round((i / (points - 1)) * (series.length - 1));
        return series[index];
      });

      const min = Math.min(...sampled);
      const max = Math.max(...sampled);
      const span = max - min || 1;

      paths[code] = sampled
        .map((value, i) => {
          const x = (i / (points - 1)) * 118 + 1;
          const y = 38 - ((value - min) / span) * 34;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    }

    return paths;
  },
);

/** Fund search over code, name and issuer — powers the nav's quick search. */
export async function searchFunds(query: string, limit = 6): Promise<Fund[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];

  const all = await getFunds();
  const folded = needle.toLocaleLowerCase("tr");

  return all
    .filter((fund) =>
      `${fund.code} ${fund.name} ${fund.founder}`
        .toLocaleLowerCase("tr")
        .includes(folded),
    )
    .slice(0, limit);
}

// ── Discovery widgets ───────────────────────────────────────────────────────

/** Best one-year performers. */
export const getTopGainers = cache(async (limit = 5): Promise<Fund[]> => {
  return (await getFunds()).slice(0, limit);
});

/**
 * "En Az Kazandıran Fonlar" — the thinnest gains, closest to zero first.
 *
 * A fund that lost money did not earn least, it lost, so the panel is bounded
 * below by zero rather than being the return ranking read backwards. Funds
 * with no measurable year — a history shorter than the window, which `changePct`
 * reports as a flat 0 — are excluded too, as an absent figure is not a gain.
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
 * Funds whose yatırımcı sayısı grew most between the last two reported months.
 */
/**
 * Funds whose yatırımcı sayısı grew most over the last month, comparing the
 * latest reading with the closest one about 30 days earlier.
 */
export const getInvestorGrowth = cache(
  async (limit = 5): Promise<InvestorGrowth[]> => {
    const result = await db.execute<{
      fund_code: string;
      investor_count: number;
      growth: string | null;
    }>(sql`
      with latest as (
        select distinct on (fund_code) fund_code, date, investor_count
        from ${fundDailyStats}
        where investor_count is not null
        order by fund_code, date desc
      )
      select l.fund_code, l.investor_count,
             (l.investor_count::numeric / nullif(p.investor_count, 0) - 1) * 100
               as growth
      from latest l
      join lateral (
        select investor_count from ${fundDailyStats} d
        where d.fund_code = l.fund_code
          and d.investor_count is not null
          and d.date <= l.date - interval '1 month'
        order by d.date desc
        limit 1
      ) p on true
      order by growth desc nulls last
      limit ${limit}
    `);

    const byCode = new Map((await getFunds()).map((fund) => [fund.code, fund]));

    return result.rows.flatMap((row) => {
      const fund = byCode.get(row.fund_code);
      if (!fund) return [];
      return [
        {
          fund,
          growth: Number(row.growth ?? 0),
          investors: row.investor_count,
        },
      ];
    });
  },
);

// ── Rehber ──────────────────────────────────────────────────────────────────

const guideColumns = {
  slug: guides.slug,
  title: guides.title,
  summary: guides.summary,
  category: guides.category,
  readingMinutes: guides.readingMinutes,
  publishedAt: guides.publishedAt,
};

/** Guide list, newest first. */
export const getGuides = cache(async (limit?: number): Promise<Guide[]> => {
  const query = db
    .select(guideColumns)
    .from(guides)
    .orderBy(desc(guides.publishedAt));

  return limit ? query.limit(limit) : query;
});

export const getGuide = cache(
  async (slug: string): Promise<GuideDetail | null> => {
    const [row] = await db
      .select({ ...guideColumns, body: guides.body })
      .from(guides)
      .where(eq(guides.slug, slug))
      .limit(1);

    if (!row) return null;

    const { body, ...guide } = row;
    return {
      ...guide,
      paragraphs: body.split(/\n\s*\n/).map((part) => part.trim()),
    };
  },
);

/** One indexable fund URL: the canonical slug and when its data last moved. */
export type SitemapFund = { slug: string; lastModified: Date };

/**
 * Funds for the sitemap. Deliberately not `getFunds()`: that builds a return
 * snapshot for every row and sorts it, none of which a URL list needs. Only
 * listed funds with a price are included, so every URL answers 200 rather than
 * redirecting or 404ing.
 */
export const getSitemapFunds = cache(async (): Promise<SitemapFund[]> => {
  const rows = await db
    .select({
      code: funds.code,
      name: funds.name,
      lastModified: sql<string>`max(${fundDailyStats.date})`,
    })
    .from(funds)
    .innerJoin(fundDailyStats, eq(fundDailyStats.fundCode, funds.code))
    .where(eq(funds.isActive, true))
    .groupBy(funds.code, funds.name);

  return rows.map((row) => ({
    slug: fundSlug(row.code, row.name),
    lastModified: new Date(row.lastModified),
  }));
});
