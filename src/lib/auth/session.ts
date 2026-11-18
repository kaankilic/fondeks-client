import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

export { SESSION_COOKIE } from "./cookie";
import { SESSION_COOKIE } from "./cookie";

const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "https://api.fondeks.com").replace(
    /\/$/,
    "",
  );
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * Writes the Sanctum bearer token from a /login, /register or /auth/google
 * response as our HttpOnly session cookie. The cookie carries the token
 * verbatim — getCurrentUser hands it straight to `Authorization: Bearer`
 * when it calls GET /user.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/**
 * Revokes the token server-side via POST /logout, then deletes the cookie.
 * The POST is best-effort — if it fails we still drop the cookie so the
 * user is signed out locally.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await fetch(`${apiBase()}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (err) {
      console.error("[auth] POST /logout failed", err);
    }
  }

  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user for this request by calling GET /user with
 * the stored bearer token. Cached per request so several components can
 * call it without repeating the round-trip.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${apiBase()}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { user?: SessionUser };
    if (!data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? null,
    };
  } catch {
    return null;
  }
});
