import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

import {
  AFT_ALLOCATION,
  AFT_SIMILARITY,
  ALLOCATION_TEMPLATES,
  CATEGORY_PERFORMANCE_FIXTURES,
  FUND_FIXTURES,
  INDEX_FIXTURES,
  NEWS_FIXTURES,
  PEER_LABELS,
  STOCK_POOL,
} from "@/lib/fondeks/fixtures";
import { GUIDE_FIXTURES } from "@/lib/fondeks/guides";

/** Local-only demo account so the sign-in screen can be tried immediately. */
const DEMO_USER = {
  name: "Demo Kullanıcı",
  email: "demo@fondeks.local",
  password: "fondeks123",
};

/** Roughly 18 months of history for the offline provider. */
const HISTORY_DAYS = 550;

/**
 * Loads the design-canvas fixtures into Postgres. Safe to re-run: market data
 * is replaced wholesale, accounts are left alone.
 */
async function main() {
  const { db, pool } = await import("./index");
  const schema = await import("./schema/funds");
  const { users } = await import("./schema/auth");
  const { hashPassword } = await import("@/lib/auth/password");
  const { syncFundCatalog, syncDailyStats, isoDaysAgo, today: todayIso } =
    await import("@/lib/ingest/jobs");
  const { syncMarketIndices } = await import("@/lib/ingest/indices");
  const {
    computeFundPositions,
    periodOf,
    previousPeriod,
    seedPreviousHoldings,
    syncFundHoldings,
  } = await import("@/lib/ingest/holdings");

  const {
    categoryPerformance,
    fundAllocations,
    fundDailyStats,
    fundHoldingSnapshots,
    fundPositions,
    fundSimilarities,
    guides,
    marketIndices,
    news,
    symbols,
  } = schema;

  const today = new Date();

  // Market data comes through the same ingest path production uses, with the
  // fixture provider standing in for TEFAS.
  await db.delete(fundDailyStats);
  await db.delete(fundPositions);
  await db.delete(fundAllocations);
  await db.delete(fundSimilarities);

  const catalog = await syncFundCatalog();
  const daily = await syncDailyStats({
    from: isoDaysAgo(HISTORY_DAYS),
    to: todayIso(),
  });

  // Reference data the price feed does not carry.
  await db.transaction(async (tx) => {
    await tx.delete(symbols);
    await tx.delete(marketIndices);
    await tx.delete(categoryPerformance);
    await tx.delete(news);
    await tx.delete(guides);

    await tx.insert(symbols).values(STOCK_POOL);

    await tx.insert(marketIndices).values(
      INDEX_FIXTURES.map((index, position) => ({
        name: index.name,
        symbol: index.symbol,
        color: index.color,
        unit: index.unit,
        decimals: index.decimals,
        displayPattern: index.displayPattern ?? null,
        source: index.source,
        sourceSymbol: index.sourceSymbol ?? null,
        position,
      })),
    );

    await tx.insert(categoryPerformance).values(CATEGORY_PERFORMANCE_FIXTURES);

    await tx.insert(guides).values(
      GUIDE_FIXTURES.map((guide) => ({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        category: guide.category,
        readingMinutes: guide.readingMinutes,
        body: guide.body,
        publishedAt: new Date(today.getTime() - guide.daysAgo * 86400 * 1000),
      })),
    );

    await tx.insert(news).values(
      NEWS_FIXTURES.map((item) => ({
        source: item.source,
        title: item.title,
        summary: item.summary ?? null,
        symbol: item.symbol ?? null,
        publisher: item.publisher,
        publishedAt: new Date(today.getTime() - item.hoursAgo * 3600 * 1000),
      })),
    );

    for (const fund of FUND_FIXTURES) {
      const isDesignFund = fund.code === "AFT";

      const allocation = isDesignFund
        ? AFT_ALLOCATION
        : ALLOCATION_TEMPLATES[fund.category];

      await tx.insert(fundAllocations).values(
        allocation.map((slice, position) => ({
          fundCode: fund.code,
          label: slice.label,
          pct: slice.pct,
          position,
        })),
      );

      const peers = isDesignFund
        ? Object.entries(AFT_SIMILARITY).map(([code, similarity]) => ({
            code,
            similarity,
          }))
        : FUND_FIXTURES.filter((peer) => peer.code !== fund.code)
            .map((peer) => {
              const gap = Math.abs(peer.y1 - fund.y1);
              const sameCategory = peer.category === fund.category ? 8 : 0;
              return {
                code: peer.code,
                similarity: Math.max(
                  35,
                  Math.min(94, Math.round(95 - gap * 1.6 + sameCategory)),
                ),
              };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 4);

      await tx.insert(fundSimilarities).values(
        peers.map((peer) => ({
          fundCode: fund.code,
          peerCode: peer.code,
          peerLabel: PEER_LABELS[peer.code] ?? null,
          similarity: peer.similarity,
        })),
      );
    }
  });

  // Index quotes, then the holdings pipeline: last period's snapshot gives the
  // diff a baseline, so the movers on the detail page are computed, not typed.
  const indices = await syncMarketIndices({
    from: isoDaysAgo(60),
    to: todayIso(),
  });

  await db.delete(fundHoldingSnapshots);
  await seedPreviousHoldings(previousPeriod(periodOf()));
  const holdings = await syncFundHoldings();
  const positions = await computeFundPositions();

  // Accounts are never wiped by the seed; the demo user is only added once.
  await db
    .insert(users)
    .values({
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash: await hashPassword(DEMO_USER.password),
    })
    .onConflictDoNothing({ target: users.email });

  console.log(
    `Seed complete. ${catalog.rowsWritten} funds, ${daily.rowsWritten} daily rows, ` +
      `${indices.rowsWritten} index quotes, ${holdings.rowsWritten} holdings, ` +
      `${positions.rowsWritten} positions, ${NEWS_FIXTURES.length} news, ` +
      `${GUIDE_FIXTURES.length} guides.`,
  );
  console.log(`Demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
