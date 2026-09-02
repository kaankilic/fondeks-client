import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { fundHoldingSnapshots, fundPositions, funds, symbols } from "@/db/schema/funds";
import {
  FixturePreviousHoldingsProvider,
  getHoldingsProvider,
  type HoldingSnapshot,
} from "@/lib/market/kap";

import { withRun } from "./runs";

/**
 * Portfolio holdings pipeline.
 *
 *   snapshots (what a fund held, per period)
 *        │  diff consecutive periods
 *        ▼
 *   fund_positions (artırılan / azaltılan pozisyonlar)
 *
 * Keeping the raw snapshots means the movers can be recomputed for any pair of
 * periods, and a corrected filing repairs the derived table on the next run.
 */

const CHUNK_SIZE = 500;
/** How many movers each side of the widget shows. */
const TOP_N = 4;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** First day of the month, the grain filings are published at. */
export function periodOf(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function previousPeriod(period: string): string {
  const date = new Date(`${period}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

async function writeSnapshots(rows: HoldingSnapshot[], source: string) {
  const known = new Set(
    (await db.select({ code: funds.code }).from(funds)).map((row) => row.code),
  );

  const values = rows
    .filter((row) => known.has(row.code))
    .map((row) => ({
      fundCode: row.code,
      period: row.period,
      ticker: row.ticker,
      weight: row.weight,
      source,
    }));

  let written = 0;

  for (const batch of chunk(values)) {
    const result = await db
      .insert(fundHoldingSnapshots)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          fundHoldingSnapshots.fundCode,
          fundHoldingSnapshots.period,
          fundHoldingSnapshots.ticker,
        ],
        set: {
          weight: sql`excluded.weight`,
          source: sql`excluded.source`,
          ingestedAt: sql`now()`,
        },
      });

    written += result.rowCount ?? batch.length;
  }

  return written;
}

/** Imports one reporting period's holdings. */
export async function syncFundHoldings(period = periodOf()) {
  const provider = getHoldingsProvider();

  return withRun("fund-holdings", { provider: provider.name, period }, async () => {
    const rows = await provider.fetchHoldings(period);
    const written = await writeSnapshots(rows, provider.name);
    return { rowsRead: rows.length, rowsWritten: written };
  });
}

/** Seeds the previous period offline, so the first diff has a baseline. */
export async function seedPreviousHoldings(period = previousPeriod(periodOf())) {
  const provider = new FixturePreviousHoldingsProvider();
  const rows = await provider.fetchHoldings(period);
  return writeSnapshots(rows, provider.name);
}

/**
 * Rebuilds `fund_positions` by diffing two snapshots: the biggest weight
 * increases and decreases per fund, which is exactly what the detail page
 * shows as artırılan / azaltılan pozisyonlar.
 */
export async function computeFundPositions(period = periodOf()) {
  const previous = previousPeriod(period);

  return withRun("fund-positions", { period, previous }, async () => {
    const current = await db
      .select({
        fundCode: fundHoldingSnapshots.fundCode,
        ticker: fundHoldingSnapshots.ticker,
        weight: fundHoldingSnapshots.weight,
      })
      .from(fundHoldingSnapshots)
      .where(eq(fundHoldingSnapshots.period, period));

    const before = await db
      .select({
        fundCode: fundHoldingSnapshots.fundCode,
        ticker: fundHoldingSnapshots.ticker,
        weight: fundHoldingSnapshots.weight,
      })
      .from(fundHoldingSnapshots)
      .where(eq(fundHoldingSnapshots.period, previous));

    const baseline = new Map(
      before.map((row) => [`${row.fundCode}:${row.ticker}`, row.weight]),
    );

    // Only tickers we can name are shown; the widget renders the company.
    const known = new Set(
      (await db.select({ ticker: symbols.ticker }).from(symbols)).map(
        (row) => row.ticker,
      ),
    );

    const byFund = new Map<
      string,
      { ticker: string; weight: number; change: number }[]
    >();

    for (const row of current) {
      if (!known.has(row.ticker)) continue;

      const previousWeight = baseline.get(`${row.fundCode}:${row.ticker}`) ?? 0;
      const change = Number((row.weight - previousWeight).toFixed(2));
      if (change === 0) continue;

      const list = byFund.get(row.fundCode) ?? [];
      list.push({ ticker: row.ticker, weight: row.weight, change });
      byFund.set(row.fundCode, list);
    }

    const rows: (typeof fundPositions.$inferInsert)[] = [];

    for (const [fundCode, movers] of byFund) {
      const increased = movers
        .filter((mover) => mover.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, TOP_N);

      const decreased = movers
        .filter((mover) => mover.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, TOP_N);

      increased.forEach((mover, rank) =>
        rows.push({
          fundCode,
          ticker: mover.ticker,
          period,
          direction: "increased",
          weight: mover.weight,
          changePoints: mover.change,
          rank,
        }),
      );

      decreased.forEach((mover, rank) =>
        rows.push({
          fundCode,
          ticker: mover.ticker,
          period,
          direction: "decreased",
          weight: mover.weight,
          changePoints: mover.change,
          rank,
        }),
      );
    }

    // The period is recomputed wholesale, so removed movers disappear.
    await db.delete(fundPositions).where(eq(fundPositions.period, period));

    let written = 0;
    for (const batch of chunk(rows)) {
      const result = await db.insert(fundPositions).values(batch);
      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: current.length, rowsWritten: written };
  });
}

/** Convenience for the scheduler: import the period, then rebuild the movers. */
export async function syncPositions(period = periodOf()) {
  const holdings = await syncFundHoldings(period);
  const positions = await computeFundPositions(period);

  return { holdings: holdings.run, positions: positions.run };
}
