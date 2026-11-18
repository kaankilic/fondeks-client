import { NextResponse, type NextRequest } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
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
 *   3. POST the raw ID token to `api.fondeks.com/auth/google`. The backend
 *      resolves the account:
 *        - existing user     → 200 with { token, is_new_user: false }
 *        - never-seen user   → 400 because the required consents are
 *                              missing. Stash the ID token in a signed
 *                              pending-signup cookie and send the user to
 *                              `/kayit/onay` to capture consent before the
 *                              account is created.
 */
function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "https://api.fondeks.com").replace(
    /\/$/,
    "",
  );
}

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

  let exchange;
  try {
    exchange = await exchangeCodeForIdentity({
      code,
      codeVerifier: verifier,
      redirectUri: googleRedirectUri(request.nextUrl.origin),
    });
  } catch (err) {
    console.error("[google-oauth] exchange failed", err);
    return redirectWithError(request, "google_exchange_failed");
  }

  // Probe the backend with just the ID token. Existing accounts get a
  // session; new accounts come back as 400 because consent flags are
  // required for first sign-in. The consent form resends the ID token
  // alongside the three required consent flags.
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id_token: exchange.idToken,
        device_name: "web",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[google-oauth] POST /auth/google failed", err);
    return redirectWithError(request, "google_exchange_failed");
  }

  if (response.ok) {
    const data = (await response.json()) as {
      token: string;
      is_new_user: boolean;
    };
    await setSessionCookie(data.token);
    return cleanRedirect(request, next);
  }

  if (response.status !== 400) {
    console.error(
      `[google-oauth] POST /auth/google returned ${response.status}`,
      await response.text().catch(() => ""),
    );
    return redirectWithError(request, "google_exchange_failed");
  }

  // First sign-in: hand control to the consent step before the account is
  // created. The pending-signup cookie is HMAC-signed so the user cannot
  // edit their own email / sub / id_token between here and the next POST.
  const pending = signPendingSignup({
    sub: exchange.identity.sub,
    email: exchange.identity.email,
    name: exchange.identity.name,
    idToken: exchange.idToken,
    iat: Math.floor(Date.now() / 1000),
    next,
  });

  const redirectResponse = NextResponse.redirect(
    new URL("/kayit/onay", request.nextUrl.origin),
  );
  clearFlowCookies(redirectResponse);
  redirectResponse.cookies.set(PENDING_SIGNUP_COOKIE, pending, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_SIGNUP_MAX_AGE,
  });
  return redirectResponse;
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
