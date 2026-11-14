import { sql } from "drizzle-orm";
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
    /**
     * scrypt digest — never the password itself. See lib/auth/password.ts.
     * Nullable: an account created through Google OAuth has no password
     * until the user chooses to add one.
     */
    passwordHash: text(),
    /**
     * Google account id (`sub` claim from the ID token). Set when the user
     * authenticates through Google OAuth; stays null for password-only
     * accounts. One Google account per Fondeks user, enforced by the
     * `users_google_id_key` partial unique index.
     */
    googleId: text(),
    /** Kullanıcı Kullanım Şartları onayı — denetim kaydı. */
    termsAcceptedAt: timestamp({ withTimezone: true }),
    /** KVKK Aydınlatma onayı. */
    kvkkAcknowledgedAt: timestamp({ withTimezone: true }),
    /** 18 yaş beyanı. */
    ageConfirmedAt: timestamp({ withTimezone: true }),
    /** 6563 m. 6 — pazarlama iletişimi onayı. Null ise izin yok. */
    marketingConsentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_key").on(table.email),
    uniqueIndex("users_google_id_key")
      .on(table.googleId)
      .where(sql`${table.googleId} is not null`),
  ],
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
