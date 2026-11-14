import { NextResponse, type NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { createSession } from "@/lib/auth/session";
import {
  exchangeCodeForIdentity,
  googleRedirectUri,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  PENDING_SIGNUP_COOKIE,
  PENDING_SIGNUP_MAX_AGE,
  signPendingSignup,
} from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/**
 * Google OAuth callback.
 *
 *   1. Verify state and PKCE verifier against the cookies the `/start` route
 *      set — this is what prevents cross-site request forgery here.
 *   2. Exchange the authorization code for an ID token and verify the
 *      token's claims (issuer, audience, expiry, email_verified).
 *   3. Look up the Fondeks user by googleId, and fall back to matching an
 *      existing password account by email.
 *
 * Found by googleId  → open a session and go.
 * Found by email     → stitch the googleId onto that account (verified
 *                      email means Google can prove ownership) and open a
 *                      session.
 * Not found          → drop a signed pending-signup cookie carrying the
 *                      verified identity, redirect to /kayit/onay where the
 *                      KVKK / terms / age consents get captured before the
 *                      user row is inserted.
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const error = search.get("error");
  if (error) {
    return redirectWithError(request, "google_cancelled");
  }

  const code = search.get("code");
  const state = search.get("state");
  if (!code || !state) {
    return redirectWithError(request, "google_invalid_response");
  }

  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(GOOGLE_VERIFIER_COOKIE)?.value;
  if (!stateCookie || stateCookie !== state || !verifier) {
    return redirectWithError(request, "google_state_mismatch");
  }

  const nextCookie = request.cookies.get(GOOGLE_NEXT_COOKIE)?.value;
  const next =
    nextCookie && nextCookie.startsWith("/") && !nextCookie.startsWith("//")
      ? nextCookie
      : "/";

  let identity;
  try {
    identity = await exchangeCodeForIdentity({
      code,
      codeVerifier: verifier,
      redirectUri: googleRedirectUri(request.nextUrl.origin),
    });
  } catch {
    return redirectWithError(request, "google_exchange_failed");
  }

  try {
    // One round-trip looks up both possible hits; the application decides
    // which wins (googleId before email).
    const matches = await db
      .select({
        id: users.id,
        email: users.email,
        googleId: users.googleId,
      })
      .from(users)
      .where(or(eq(users.googleId, identity.sub), eq(users.email, identity.email)))
      .limit(2);

    const byGoogle = matches.find((row) => row.googleId === identity.sub);
    const byEmail = matches.find((row) => row.email === identity.email);
    const existing = byGoogle ?? byEmail;

    if (existing) {
      // Stitch googleId onto an email-matched password account the first
      // time that user comes in through Google. Email verification by
      // Google is what justifies linking without a second confirmation.
      if (!existing.googleId && byEmail) {
        await db
          .update(users)
          .set({ googleId: identity.sub })
          .where(eq(users.id, existing.id));
      }
      await createSession(existing.id);
      return cleanRedirect(request, next);
    }
  } catch {
    return redirectWithError(request, "google_lookup_failed");
  }

  // Brand-new account: hand control to the consent step before anything is
  // written. The pending-signup cookie is HMAC-signed so the user cannot
  // edit their own email or sub between here and the next POST.
  const pending = signPendingSignup({
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    iat: Math.floor(Date.now() / 1000),
    next,
  });

  const response = NextResponse.redirect(new URL("/kayit/onay", request.nextUrl.origin));
  clearFlowCookies(response);
  response.cookies.set(PENDING_SIGNUP_COOKIE, pending, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_SIGNUP_MAX_AGE,
  });
  return response;
}

function redirectWithError(request: NextRequest, reason: string) {
  const url = new URL("/giris", request.nextUrl.origin);
  url.searchParams.set("hata", reason);
  const response = NextResponse.redirect(url);
  clearFlowCookies(response);
  return response;
}

function cleanRedirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  clearFlowCookies(response);
  return response;
}

function clearFlowCookies(response: NextResponse) {
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.delete(GOOGLE_VERIFIER_COOKIE);
  response.cookies.delete(GOOGLE_NEXT_COOKIE);
}
