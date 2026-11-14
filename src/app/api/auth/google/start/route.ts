import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildAuthUrl,
  googleRedirectUri,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  pkceChallenge,
  randomToken,
} from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/**
 * Entry point for Google sign-in. Generates a fresh state token and PKCE
 * verifier, drops them in short-lived HttpOnly cookies, and redirects the
 * browser to Google's consent screen. The callback reads the cookies back
 * out, so an attacker who intercepts the redirect URL without the cookies
 * cannot complete the flow.
 */
export async function GET(request: NextRequest) {
  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = pkceChallenge(verifier);

  // Only honour in-app relative paths for `next` — a crafted absolute URL
  // would turn the sign-in into an open redirect once the flow completes.
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  const url = buildAuthUrl({
    state,
    codeChallenge: challenge,
    redirectUri: googleRedirectUri(request.nextUrl.origin),
  });

  const response = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";

  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };

  response.cookies.set(GOOGLE_STATE_COOKIE, state, cookie);
  response.cookies.set(GOOGLE_VERIFIER_COOKIE, verifier, cookie);
  if (next) {
    response.cookies.set(GOOGLE_NEXT_COOKIE, next, cookie);
  } else {
    // Make sure a stale `next` from a previous flow does not leak forward.
    const existing = (await cookies()).get(GOOGLE_NEXT_COOKIE);
    if (existing) response.cookies.delete(GOOGLE_NEXT_COOKIE);
  }

  return response;
}
