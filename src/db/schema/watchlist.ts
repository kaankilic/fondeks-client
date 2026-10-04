import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/**
 * A user's tracking ("İzleme") list. Each row is one fund the user follows,
 * keyed by its TEFAS code — the fund itself is read from the external API, so
 * there is no foreign key to a funds table, only the code.
 */
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fundCode: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One entry per fund per user; the toggle action relies on this.
    uniqueIndex("watchlist_user_fund_key").on(table.userId, table.fundCode),
    index("watchlist_user_id_idx").on(table.userId),
  ],
);

export type Watchlist = typeof watchlist.$inferSelect;
export type NewWatchlist = typeof watchlist.$inferInsert;
