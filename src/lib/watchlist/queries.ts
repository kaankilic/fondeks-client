import "server-only";

import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { watchlist } from "@/db/schema";
import type { Fund } from "@/lib/fondeks/types";

import { getFund } from "@/lib/fondeks/queries";

/** The fund codes a user follows, newest first. */
export const getWatchedCodes = cache(
  async (userId: string): Promise<string[]> => {
    const rows = await db
      .select({ code: watchlist.fundCode })
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
    return rows.map((row) => row.code);
  },
);

/** Whether a single fund is on the user's list — used to set the button state. */
export const isWatched = cache(
  async (userId: string, code: string): Promise<boolean> => {
    const [row] = await db
      .select({ id: watchlist.id })
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.fundCode, code)))
      .limit(1);
    return Boolean(row);
  },
);

/**
 * The full funds a user follows. The codes live in the DB but the fund data
 * comes from the external API, so each code is resolved through {@link getFund}
 * (itself cached); codes the API can no longer serve are dropped.
 */
export const getWatchlistFunds = cache(
  async (userId: string): Promise<Fund[]> => {
    const codes = await getWatchedCodes(userId);
    const funds = await Promise.all(codes.map((code) => getFund(code)));
    return funds.filter((fund): fund is Fund => fund !== null);
  },
);
