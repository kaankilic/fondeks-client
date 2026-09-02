import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { indexQuotes, marketIndices } from "@/db/schema/funds";
import { EvdsProvider, TcmbProvider, type IndexQuote } from "@/lib/market/indices";
import { providerName } from "@/lib/market/provider";

import { withRun } from "./runs";

/**
 * Fills `index_quotes` for every active index, using whichever source the row
 * declares. Sources that are not configured (EVDS without a key) are skipped
 * with a warning rather than failing the run — one missing series should not
 * stop the exchange rates from updating.
 */

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Deterministic stand-in series, so local development shows every card. */
function fixtureQuotes(
  name: string,
  seed: number,
  range: { from: string; to: string },
): IndexQuote[] {
  const days: string[] = [];
  const cursor = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);

  while (cursor <= end) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  let state = seed * 9301;
  let value = seed * 137.5;

  return days.map((date) => {
    state = (state * 9301 + 49297) % 233280;
    const drift = state / 233280 - 0.48;
    value = Math.max(1, value * (1 + drift * 0.012));
    return { name, date, value: Number(value.toFixed(4)) };
  });
}

export async function syncMarketIndices(range: { from: string; to: string }) {
  return withRun("market-indices", { ...range }, async () => {
    const indices = await db
      .select()
      .from(marketIndices)
      .where(eq(marketIndices.isActive, true));

    const offline = providerName() === "fixture";
    const tcmb = new TcmbProvider();
    const evds = new EvdsProvider();

    const quotes: { indexName: string; date: string; value: number }[] = [];
    let read = 0;

    // TCMB publishes one bulletin per day covering every currency, so the
    // rates are fetched once and fanned out to the rows that want them.
    const tcmbRows = indices.filter(
      (row) => !offline && row.source === "tcmb" && row.sourceSymbol,
    );

    if (tcmbRows.length > 0) {
      const series = await tcmb.fetchQuotes(range);
      read += series.length;

      for (const quote of series) {
        for (const row of tcmbRows) {
          if (row.sourceSymbol === quote.name) {
            quotes.push({
              indexName: row.name,
              date: quote.date,
              value: quote.value,
            });
          }
        }
      }
    }

    for (const row of indices) {
      const source = offline ? "fixture" : row.source;

      if (source === "tcmb") continue;

      if (source === "evds") {
        if (!evds.isConfigured()) {
          console.warn(
            `[indices] skipping ${row.name}: TCMB_EVDS_API_KEY is not set`,
          );
          continue;
        }
        if (!row.sourceSymbol) continue;

        try {
          const series = await evds.fetchSeries(row.sourceSymbol, range);
          read += series.length;
          quotes.push(
            ...series.map((quote) => ({
              indexName: row.name,
              date: quote.date,
              value: quote.value,
            })),
          );
        } catch (error) {
          console.warn(
            `[indices] ${row.name} failed:`,
            error instanceof Error ? error.message : error,
          );
        }
        continue;
      }

      const series = fixtureQuotes(row.name, row.position + 3, range);
      read += series.length;
      quotes.push(
        ...series.map((quote) => ({
          indexName: row.name,
          date: quote.date,
          value: quote.value,
        })),
      );
    }

    let written = 0;

    for (const batch of chunk(quotes)) {
      const result = await db
        .insert(indexQuotes)
        .values(batch)
        .onConflictDoUpdate({
          target: [indexQuotes.indexName, indexQuotes.date],
          set: { value: sql`excluded.value`, ingestedAt: sql`now()` },
        });

      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: read, rowsWritten: written };
  });
}
