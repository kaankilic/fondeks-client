import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema/auth";

export const SESSION_COOKIE = "fondeks_session";

const SESSION_DAYS = 30;
/** Sessions inside this window are extended on use. */
const REFRESH_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The cookie carries the raw token; the database only ever sees its hash. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = Pick<User, "id" | "email" | "name">;

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }

  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user for this request. Cached per request so several
 * components can call it without repeating the query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);

  try {
    const [row] = await db
      .select({
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id))
      .limit(1);

    if (!row) return null;

    if (row.expiresAt.getTime() <= Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }

    // Sliding expiry: extend long-lived sessions that are still in use.
    if (row.expiresAt.getTime() - Date.now() < REFRESH_DAYS * DAY_MS) {
      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) })
        .where(eq(sessions.id, id));
    }

    return { id: row.id, email: row.email, name: row.name };
  } catch {
    // A missing or unreachable database must not break public pages.
    return null;
  }
});
