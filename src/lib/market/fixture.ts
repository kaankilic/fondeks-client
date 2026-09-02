import "server-only";

import { FOUNDER_FIXTURES, FUND_FIXTURES } from "@/lib/fondeks/fixtures";

import type {
  DailyStat,
  DateRange,
  FundCatalogEntry,
  MarketDataProvider,
} from "./provider";

/**
 * Offline provider. It generates the same shapes the TEFAS adapter returns, so
 * seeding and local development exercise the real ingest path — the only
 * difference is where the rows come from.
 *
 * Each fund's series is a Brownian bridge anchored to its quoted price and its
 * 1-day / 1-month / 1-year returns, so figures read back out of the database
 * exactly as the fixtures state them.
 */

const TRADING_DAYS_PER_YEAR = 252;

function seedFrom(text: string): number {
  let hash = 7;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  return hash;
}

function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** Box–Muller, so the walk has normal rather than uniform increments. */
function normal(next: () => number): number {
  const u = Math.max(next(), 1e-9);
  const v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Weekdays between two ISO dates, inclusive. Holidays are not modelled. */
function tradingDays({ from, to }: DateRange): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days.push(iso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export class FixtureProvider implements MarketDataProvider {
  readonly name = "fixture";

  async listFunds(): Promise<FundCatalogEntry[]> {
    const branding = new Map(
      FOUNDER_FIXTURES.map((issuer) => [issuer.name, issuer]),
    );

    return FUND_FIXTURES.map((fund) => ({
      code: fund.code,
      name: fund.name,
      founder: fund.founder,
      founderInitials: branding.get(fund.founder)?.initials ?? null,
      founderColor: branding.get(fund.founder)?.color ?? null,
      category: fund.category,
      isin: fund.isin,
      inceptionDate: fund.inception,
      managementFee: fund.managementFee,
      withholdingTax: fund.withholdingTax,
      risk: fund.risk,
      buyValueDays: fund.buyValueDays,
      sellValueDays: fund.sellValueDays,
      onTefas: fund.onTefas,
    }));
  }

  async fetchDailyStats(range: DateRange): Promise<DailyStat[]> {
    const days = tradingDays(range);
    if (days.length < 2) return [];

    return FUND_FIXTURES.flatMap((fund) => {
      const last = days.length - 1;

      const indexOnOrBefore = (target: string) => {
        for (let i = last; i >= 0; i--) if (days[i] <= target) return i;
        return 0;
      };

      const shift = (isoDate: string, months = 0, years = 0) => {
        const date = new Date(`${isoDate}T00:00:00Z`);
        date.setUTCMonth(date.getUTCMonth() - months);
        date.setUTCFullYear(date.getUTCFullYear() - years);
        return iso(date);
      };

      const ln = Math.log;
      const anchors = new Map<number, number>([
        [last, ln(fund.price)],
        [last - 1, ln(fund.price / (1 + fund.daily / 100))],
        [
          indexOnOrBefore(shift(days[last], 1)),
          ln(fund.price / (1 + fund.m1 / 100)),
        ],
        [
          indexOnOrBefore(shift(days[last], 0, 1)),
          ln(fund.price / (1 + fund.y1 / 100)),
        ],
      ]);

      if (!anchors.has(0)) {
        const yearIndex = indexOnOrBefore(shift(days[last], 0, 1));
        anchors.set(0, anchors.get(yearIndex)! - ln(1 + fund.y1 / 100) * 0.35);
      }

      const points = [...anchors.keys()].sort((a, b) => a - b);
      const sigma = fund.volatility / 100 / Math.sqrt(TRADING_DAYS_PER_YEAR);
      const next = rng(seedFrom(fund.code));

      const walk: number[] = [0];
      for (let i = 1; i <= last; i++) {
        walk.push(walk[i - 1] + normal(next) * sigma);
      }

      const prices = new Array<number>(days.length);
      for (let segment = 0; segment < points.length - 1; segment++) {
        const a = points[segment];
        const b = points[segment + 1];
        const la = anchors.get(a)!;
        const lb = anchors.get(b)!;

        for (let i = a; i < b; i++) {
          const t = (i - a) / (b - a);
          // Bridged to zero at each anchor, so the anchors stay exact.
          const bridge = walk[i] - (walk[a] + (walk[b] - walk[a]) * t);
          prices[i] = Number(Math.exp(la + (lb - la) * t + bridge).toFixed(6));
        }
      }
      prices[last] = fund.price;

      // Size and investors grow toward today's figures, with the fund's own
      // price move folded in so net flow reads sensibly.
      const flow = rng(seedFrom(`${fund.code}-flow`));
      const growth = Array.from({ length: days.length }, () => 0.9 + flow() * 0.2);

      return days.map((date, index) => {
        const progress = index / last;
        const ramp = 0.55 + 0.45 * progress;
        const totalValue = Number(
          (fund.aum * ramp * growth[index] * (prices[index] / fund.price)).toFixed(2),
        );
        const investorCount = Math.round(
          fund.investors * (0.6 + 0.4 * progress) * growth[index],
        );

        return {
          code: fund.code,
          date,
          price: prices[index],
          totalValue,
          investorCount,
          shareCount: Number((totalValue / prices[index]).toFixed(2)),
        };
      });
    });
  }
}
