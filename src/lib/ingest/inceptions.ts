import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { funds } from "@/db/schema/funds";
import { fetchFundDirectory, fetchFundInception } from "@/lib/market/kap-funds";

import { withRun } from "./runs";

/**
 * Fills in each fund's launch date from KAP.
 *
 * TEFAS publishes no such date, so a catalogue synced from it leaves
 * `inception_date` null for every fund and "Son Çıkan Fonlar" — which ranks on
 * exactly that column — renders empty. KAP states it on the fund's own record
 * page; `kap-funds` reads it from there.
 *
 * Only funds still missing a date are read, so this converges: the first runs
 * work through the catalogue a slice at a time and every run after that makes
 * one request for the directory and stops. That also keeps an offline setup
 * offline — fixture funds arrive with their dates already set, so there is
 * nothing for this to look up.
 */

/** Funds one pass will read. Sized to fit inside a cron invocation. */
const DEFAULT_LIMIT = Number(process.env.KAP_INCEPTION_LIMIT ?? 200);

export async function syncFundInceptions(limit = DEFAULT_LIMIT) {
  return withRun("fund-inceptions", { limit }, async () => {
    const pending = await db
      .select({ code: funds.code })
      .from(funds)
      .where(and(isNull(funds.inceptionDate), eq(funds.isActive, true)))
      .orderBy(asc(funds.code))
      .limit(limit);

    if (pending.length === 0) return { rowsRead: 0, rowsWritten: 0, missing: 0 };

    const directory = await fetchFundDirectory();

    // Sequential by design: the shared limiter caps concurrency, and a
    // disclosure site does not owe us a crawl budget.
    let written = 0;
    let missing = 0;

    for (const { code } of pending) {
      const oid = directory.get(code);
      if (!oid) {
        // A fund TEFAS lists and KAP does not — a feeder or a foreign fund.
        missing += 1;
        continue;
      }

      let inceptionDate: string | null = null;
      try {
        inceptionDate = await fetchFundInception(oid);
      } catch (error) {
        // One unreadable record must not cost the rest of the pass; the fund
        // stays null and the next run picks it up again.
        console.warn(
          `[kap] ${code}: could not read its record — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      if (!inceptionDate) {
        missing += 1;
        continue;
      }

      await db
        .update(funds)
        .set({ inceptionDate, updatedAt: sql`now()` })
        .where(eq(funds.code, code));

      written += 1;
    }

    return { rowsRead: pending.length, rowsWritten: written, missing };
  });
}
