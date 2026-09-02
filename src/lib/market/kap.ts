import "server-only";

import { requestJson } from "./http";
import { pick, toIsoDate, toNumber, type RawRow } from "./parse";

/**
 * Fund portfolio disclosures.
 *
 * Turkish funds publish their holdings on KAP (Kamuyu Aydınlatma Platformu) as
 * periodic "Fon Portföy Raporu" filings. KAP was rebuilt on Next.js in 2026 and
 * its data endpoints are no longer discoverable from outside the app, so the
 * paths below are the documented ones and the parsing is defensive: field names
 * are read by candidate, exactly as in the TEFAS adapter.
 *
 * Run once with INGEST_LOG_SAMPLES=true to capture a real row, then correct
 * MAPPING / ENDPOINTS here — nothing else needs to change.
 */

export type HoldingSnapshot = {
  code: string;
  /** First day of the reporting period. */
  period: string;
  ticker: string;
  /** Share of the portfolio, in percent. */
  weight: number;
};

export interface HoldingsProvider {
  readonly name: string;
  fetchHoldings(period: string): Promise<HoldingSnapshot[]>;
}

const MAPPING = {
  code: ["fonKodu", "FONKODU", "fon", "code"],
  ticker: ["menkulKiymetKodu", "hisseKodu", "SERMAYEPIYASAARACIKODU", "ticker"],
  weight: ["oran", "portfoyOrani", "ORAN", "weight", "pct"],
  period: ["donem", "raporDonemi", "DONEM", "period"],
} as const;

const ENDPOINTS = {
  portfolioReports: "/api/fund/portfolio",
} as const;

function unwrap(payload: unknown): RawRow[] {
  if (Array.isArray(payload)) return payload as RawRow[];

  if (payload && typeof payload === "object") {
    for (const key of ["data", "result", "items", "list", "content"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as RawRow[];
      if (value && typeof value === "object") {
        const nested = unwrap(value);
        if (nested.length) return nested;
      }
    }
  }

  return [];
}

export class KapProvider implements HoldingsProvider {
  readonly name = "kap";

  private readonly base = (
    process.env.KAP_BASE_URL?.trim() || "https://www.kap.org.tr"
  ).replace(/\/$/, "");

  async fetchHoldings(period: string): Promise<HoldingSnapshot[]> {
    const payload = await requestJson<unknown>(
      `${this.base}${ENDPOINTS.portfolioReports}`,
      {
        body: { period },
        timeoutMs: Number(process.env.KAP_TIMEOUT_MS ?? 25_000),
        headers: {
          referer: `${this.base}/tr`,
          "accept-language": "tr-TR,tr;q=0.9",
          "user-agent":
            process.env.KAP_USER_AGENT?.trim() ||
            "FondeksBot/1.0 (+https://fondeks.com; portfolio disclosures)",
        },
      },
    );

    const rows = unwrap(payload);

    if (process.env.INGEST_LOG_SAMPLES === "true" && rows[0]) {
      console.info("[kap] sample row:", JSON.stringify(rows[0]));
    }

    return rows.flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const ticker = pick(row, [...MAPPING.ticker]);
      const weight = toNumber(pick(row, [...MAPPING.weight]));

      if (typeof code !== "string" || typeof ticker !== "string" || weight === null) {
        return [];
      }

      return [
        {
          code: code.trim().toUpperCase(),
          period: toIsoDate(pick(row, [...MAPPING.period])) ?? period,
          ticker: ticker.trim().toUpperCase(),
          weight,
        },
      ];
    });
  }
}

/**
 * Offline holdings. Produces two consecutive periods per fund so the diff job
 * has something real to compare, reproducing the design's AFT movers.
 */
export class FixtureHoldingsProvider implements HoldingsProvider {
  readonly name = "fixture";

  async fetchHoldings(period: string): Promise<HoldingSnapshot[]> {
    const { AFT_HOLDINGS, FUND_FIXTURES, STOCK_POOL } = await import(
      "@/lib/fondeks/fixtures"
    );

    return FUND_FIXTURES.flatMap((fund, fundIndex) => {
      if (fund.code === "AFT") {
        // Weights that reproduce the design's stated changes when diffed.
        return [
          ...AFT_HOLDINGS.increased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: holding.weight,
          })),
          ...AFT_HOLDINGS.decreased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: holding.weight,
          })),
        ];
      }

      return Array.from({ length: 8 }, (_, slot) => {
        const stock = STOCK_POOL[(fundIndex * 3 + slot) % STOCK_POOL.length];
        const rank = slot % 4;
        return {
          code: fund.code,
          period,
          ticker: stock.ticker,
          weight: Number((8.6 - rank * 1.4 - fundIndex * 0.2).toFixed(2)),
        };
      });
    });
  }
}

/** Previous period's weights, so the diff has a baseline to compare against. */
export class FixturePreviousHoldingsProvider implements HoldingsProvider {
  readonly name = "fixture-previous";

  async fetchHoldings(period: string): Promise<HoldingSnapshot[]> {
    const { AFT_HOLDINGS, FUND_FIXTURES, STOCK_POOL } = await import(
      "@/lib/fondeks/fixtures"
    );

    return FUND_FIXTURES.flatMap((fund, fundIndex) => {
      if (fund.code === "AFT") {
        return [
          ...AFT_HOLDINGS.increased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            // Last period's weight is today's minus the reported change.
            weight: Number((holding.weight - holding.change).toFixed(2)),
          })),
          ...AFT_HOLDINGS.decreased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: Number((holding.weight - holding.change).toFixed(2)),
          })),
        ];
      }

      return Array.from({ length: 8 }, (_, slot) => {
        const stock = STOCK_POOL[(fundIndex * 3 + slot) % STOCK_POOL.length];
        const increased = slot < 4;
        const rank = slot % 4;
        const change = (increased ? 1 : -1) * (1.7 - rank * 0.35);
        return {
          code: fund.code,
          period,
          ticker: stock.ticker,
          weight: Number((8.6 - rank * 1.4 - fundIndex * 0.2 - change).toFixed(2)),
        };
      });
    });
  }
}

export function getHoldingsProvider(): HoldingsProvider {
  const name = process.env.HOLDINGS_PROVIDER?.trim() || "fixture";
  return name === "kap" ? new KapProvider() : new FixtureHoldingsProvider();
}
