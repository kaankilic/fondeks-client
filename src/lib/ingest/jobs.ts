import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import {
  fundAllocations,
  fundDailyStats,
  founders,
  funds,
} from "@/db/schema/funds";
import { getProvider, type DateRange } from "@/lib/market/provider";
import { FALLBACK_LOGO } from "@/lib/fondeks/palette";

import { withRun } from "./runs";

/**
 * Ingestion jobs. Every write is an idempotent upsert keyed on the natural
 * key, so re-running a range repairs it instead of duplicating rows — which is
 * what makes retries and overlapping schedules safe.
 */

/** Rows per INSERT. Postgres caps parameters at 65535 per statement. */
const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function isoDaysAgo(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Deterministic mark for issuers the source gives us no branding for. */
function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return (letters.join("") || FALLBACK_LOGO.initials)
    .toLocaleUpperCase("tr")
    .slice(0, 4);
}

const FOUNDER_COLORS = [
  "#E30613", "#1F5FA6", "#12386B", "#0A7A3D", "#0B4DA2",
  "#7A2E8E", "#C4122F", "#8A1538", "#B01030", "#0A6E8A",
];

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FOUNDER_COLORS[hash % FOUNDER_COLORS.length];
}

/**
 * Imports the fund catalogue: issuers first (funds reference them), then the
 * funds themselves. Funds the source no longer lists are marked inactive
 * rather than deleted, so their history survives.
 */
export async function syncFundCatalog() {
  const provider = await getProvider();

  return withRun("fund-catalog", { provider: provider.name }, async () => {
    const entries = await provider.listFunds();
    if (entries.length === 0) {
      throw new Error(`${provider.name} returned an empty fund catalogue`);
    }

    // Issuer branding: the source's own values when it has them, a stable
    // derivation otherwise, so every mark is filled and consistent per name.
    const issuers = new Map<string, { initials: string; color: string }>();
    for (const entry of entries) {
      if (issuers.has(entry.founder)) continue;
      issuers.set(entry.founder, {
        initials: entry.founderInitials ?? initialsFor(entry.founder),
        color: entry.founderColor ?? colorFor(entry.founder),
      });
    }

    await db
      .insert(founders)
      .values(
        [...issuers].map(([name, brand]) => ({
          name,
          initials: brand.initials,
          color: brand.color,
        })),
      )
      .onConflictDoUpdate({
        target: founders.name,
        set: {
          initials: sql`excluded.initials`,
          color: sql`excluded.color`,
        },
      });

    let written = 0;

    for (const batch of chunk(entries)) {
      const rows = batch.map((entry) => ({
        code: entry.code,
        name: entry.name,
        founder: entry.founder,
        category: entry.category,
        isin: entry.isin ?? null,
        inceptionDate: entry.inceptionDate ?? null,
        managementFee: entry.managementFee ?? 0,
        withholdingTax: entry.withholdingTax ?? 0,
        risk: entry.risk ?? 4,
        buyValueDays: entry.buyValueDays ?? 1,
        sellValueDays: entry.sellValueDays ?? 2,
        onTefas: entry.onTefas ?? true,
        tefasTypeCode: entry.typeCode ?? null,
        isActive: true,
        source: provider.name,
        updatedAt: new Date(),
      }));

      const result = await db
        .insert(funds)
        .values(rows)
        .onConflictDoUpdate({
          target: funds.code,
          set: {
            name: sql`excluded.name`,
            founder: sql`excluded.founder`,
            category: sql`excluded.category`,
            isin: sql`coalesce(excluded.isin, ${funds.isin})`,
            inceptionDate: sql`coalesce(excluded.inception_date, ${funds.inceptionDate})`,
            managementFee: sql`excluded.management_fee`,
            withholdingTax: sql`excluded.withholding_tax`,
            risk: sql`excluded.risk`,
            buyValueDays: sql`excluded.buy_value_days`,
            sellValueDays: sql`excluded.sell_value_days`,
            onTefas: sql`excluded.on_tefas`,
            tefasTypeCode: sql`excluded.tefas_type_code`,
            isActive: sql`true`,
            source: sql`excluded.source`,
            updatedAt: sql`now()`,
          },
        });

      written += result.rowCount ?? rows.length;
    }

    // Anything the source stopped listing is retired, not removed.
    const codes = entries.map((entry) => entry.code);
    await db
      .update(funds)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        sql`${funds.source} = ${provider.name} and ${funds.code} <> all(${sql.param(codes)})`,
      );

    return { rowsRead: entries.length, rowsWritten: written };
  });
}

/**
 * Imports daily price, size and investor counts for a date range. Rows for
 * funds that are not in the catalogue are skipped rather than failing the run.
 */
export async function syncDailyStats(range: DateRange) {
  const provider = await getProvider();

  return withRun("daily-stats", { provider: provider.name, ...range }, async () => {
    const stats = await provider.fetchDailyStats(range);

    const known = new Set(
      (await db.select({ code: funds.code }).from(funds)).map((row) => row.code),
    );

    const rows = stats
      .filter((stat) => known.has(stat.code))
      .map((stat) => ({
        fundCode: stat.code,
        date: stat.date,
        price: stat.price,
        totalValue: stat.totalValue ?? null,
        investorCount: stat.investorCount ?? null,
        shareCount: stat.shareCount ?? null,
      }));

    let written = 0;

    for (const batch of chunk(rows)) {
      const result = await db
        .insert(fundDailyStats)
        .values(batch)
        .onConflictDoUpdate({
          target: [fundDailyStats.fundCode, fundDailyStats.date],
          set: {
            price: sql`excluded.price`,
            totalValue: sql`coalesce(excluded.total_value, ${fundDailyStats.totalValue})`,
            investorCount: sql`coalesce(excluded.investor_count, ${fundDailyStats.investorCount})`,
            shareCount: sql`coalesce(excluded.share_count, ${fundDailyStats.shareCount})`,
            ingestedAt: sql`now()`,
          },
        });

      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: stats.length, rowsWritten: written, skipped: stats.length - rows.length };
  });
}

/** Yesterday and today, so a late publish is picked up by the next run. */
export async function syncRecentDays(days = 3) {
  return syncDailyStats({ from: isoDaysAgo(days), to: today() });
}

/** First-run history load. */
export async function backfillDailyStats(days = 400) {
  return syncDailyStats({ from: isoDaysAgo(days), to: today() });
}

/**
 * How far back to look for a breakdown. `fund_allocations` keeps one current
 * picture per fund rather than a history, so this is not a backfill window —
 * it is slack for funds that did not report yesterday, plus weekends and
 * holidays.
 */
const ALLOCATION_WINDOW_DAYS = 10;

/**
 * Imports the portfolio breakdown behind "Varlık Dağılımı".
 *
 * Each fund's newest published day wins and replaces what it had. Replacement
 * is per fund rather than an upsert: the key is (fund, label), so a slice the
 * fund has since exited would never be overwritten and would linger forever.
 */
export async function syncAllocations(range?: DateRange) {
  const provider = await getProvider();
  const fetchAllocations = provider.fetchAllocations?.bind(provider);

  if (!fetchAllocations) {
    throw new Error(`${provider.name} does not publish portfolio breakdowns`);
  }

  const window = range ?? {
    from: isoDaysAgo(ALLOCATION_WINDOW_DAYS),
    to: today(),
  };

  return withRun(
    "fund-allocations",
    { provider: provider.name, ...window },
    async () => {
      const slices = await fetchAllocations(window);

      const known = new Set(
        (await db.select({ code: funds.code }).from(funds)).map((row) => row.code),
      );

      // The newest day a fund reported; anything older is a stale picture.
      const latest = new Map<string, string>();
      for (const slice of slices) {
        if (!known.has(slice.code)) continue;
        const seen = latest.get(slice.code);
        if (seen === undefined || slice.date > seen) {
          latest.set(slice.code, slice.date);
        }
      }

      // Keyed by label, so a repeated asset class cannot break the primary key.
      const byFund = new Map<string, Map<string, number>>();
      for (const slice of slices) {
        if (latest.get(slice.code) !== slice.date) continue;
        const fund = byFund.get(slice.code) ?? new Map<string, number>();
        fund.set(slice.label, slice.pct);
        byFund.set(slice.code, fund);
      }

      const rows: (typeof fundAllocations.$inferInsert)[] = [];
      for (const [fundCode, labels] of byFund) {
        // Biggest slice first — the widget renders in `position` order.
        [...labels.entries()]
          .sort(([, a], [, b]) => b - a)
          .forEach(([label, pct], position) =>
            rows.push({ fundCode, label, pct, position }),
          );
      }

      const codes = [...byFund.keys()];

      // One transaction, or a failure between the delete and the inserts would
      // leave funds with no breakdown at all.
      const written = await db.transaction(async (tx) => {
        if (codes.length > 0) {
          await tx
            .delete(fundAllocations)
            .where(sql`${fundAllocations.fundCode} = any(${sql.param(codes)})`);
        }

        let count = 0;
        for (const batch of chunk(rows)) {
          const result = await tx.insert(fundAllocations).values(batch);
          count += result.rowCount ?? batch.length;
        }
        return count;
      });

      return {
        rowsRead: slices.length,
        rowsWritten: written,
        funds: byFund.size,
        skipped: slices.length - rows.length,
      };
    },
  );
}
