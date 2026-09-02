import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Stored lower-cased; the unique index enforces one account per address. */
    email: text().notNull(),
    name: text(),
    /** scrypt digest — never the password itself. See lib/auth/password.ts. */
    passwordHash: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_key").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token, so a database leak cannot replay sessions. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
