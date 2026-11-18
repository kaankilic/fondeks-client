import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Minimal Google OAuth 2.0 / OpenID Connect client. Deliberately dependency-
 * free: this project already has its own session system (`fondeks_session`
 * cookie, scrypt passwords, consent audit columns), and NextAuth would
 * create a second parallel auth stack. Instead, Google is one more way to
 * resolve a Fondeks account — it never owns the session.
 *
 * The flow:
 *
 *   /api/auth/google/start      Generates state + PKCE verifier, drops both
 *                               in HttpOnly cookies, redirects to Google.
 *   /api/auth/google/callback   Verifies state, exchanges the code for an
 *                               ID token, verifies the token's issuer,
 *                               audience and expiry, returns the signed
 *                               claims (sub, email, name).
 *
 * The callback then either signs the user in (known googleId / email) or
 * drops a signed "pending signup" cookie and sends them to the consent
 * screen, where the three required consents are captured before the user
 * row is created.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** OpenID Connect scopes: `openid` makes Google return an ID token. */
const SCOPES = ["openid", "email", "profile"].join(" ");

export const GOOGLE_STATE_COOKIE = "fondeks_google_state";
export const GOOGLE_VERIFIER_COOKIE = "fondeks_google_verifier";
export const GOOGLE_NEXT_COOKIE = "fondeks_google_next";
export const PENDING_SIGNUP_COOKIE = "fondeks_pending_signup";

/** 10 minutes — enough for a Google flow, short enough to limit exposure. */
export const OAUTH_COOKIE_MAX_AGE = 60 * 10;

/** 15 minutes to complete the consent step after Google returns. */
export const PENDING_SIGNUP_MAX_AGE = 60 * 15;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function googleClientId(): string {
  return requireEnv("GOOGLE_OAUTH_CLIENT_ID");
}

function googleClientSecret(): string {
  return requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
}

function authSecret(): string {
  return requireEnv("AUTH_SECRET");
}

export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

/** base64url(urlencode-safe, no padding) — the format OAuth 2.0 wants. */
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** PKCE S256 challenge: SHA-256 of the verifier, base64url-encoded. */
export function pkceChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function buildAuthUrl(options: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "online",
    prompt: "select_account",
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleIdentity = {
  /** Stable, unique identifier for the Google account. */
  sub: string;
  /** Verified email address — Google only returns `email_verified: true`. */
  email: string;
  /** Full name, when the user permits it. */
  name: string | null;
};

type TokenResponse = {
  id_token?: string;
};

type IdTokenClaims = {
  iss?: string;
  aud?: string;
  azp?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function decodeJwtPayload<T>(jwt: string): T {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token.");
  const payload = Buffer.from(
    parts[1].replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  return JSON.parse(payload) as T;
}

/**
 * Exchanges the Google authorization code for an ID token, then validates
 * the ID token's structural claims. The signature itself is NOT verified
 * here: the token comes back over TLS from Google's token endpoint directly,
 * and we only trust claims that arrived through that channel, so an attacker
 * cannot forge a signed token for us.
 *
 * Returns both the parsed identity (for cookie / routing decisions) and the
 * raw ID token, which is what the backend `/auth/google` endpoint wants.
 */
export async function exchangeCodeForIdentity(options: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ identity: GoogleIdentity; idToken: string }> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: options.code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: options.redirectUri,
      grant_type: "authorization_code",
      code_verifier: options.codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}).`);
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.id_token) throw new Error("Google did not return an ID token.");

  const claims = decodeJwtPayload<IdTokenClaims>(token.id_token);

  if (
    claims.iss !== "https://accounts.google.com" &&
    claims.iss !== "accounts.google.com"
  ) {
    throw new Error("ID token issuer does not match Google.");
  }
  if (claims.aud !== googleClientId()) {
    throw new Error("ID token audience does not match this client.");
  }
  if (!claims.exp || claims.exp * 1000 < Date.now()) {
    throw new Error("ID token is expired.");
  }
  if (!claims.sub) {
    throw new Error("ID token is missing the subject claim.");
  }
  if (!claims.email || !claims.email_verified) {
    throw new Error("Google did not return a verified email address.");
  }

  return {
    identity: {
      sub: claims.sub,
      email: claims.email.trim().toLowerCase(),
      name: claims.name?.trim() || null,
    },
    idToken: token.id_token,
  };
}

/**
 * HMAC-signed container for the pending-signup cookie. Google's claims are
 * trusted (we just verified them against the token endpoint) but we must
 * not let the user tamper with their own email / name / sub before the
 * consent step — otherwise they could register a different Google account
 * from the one that actually authenticated. Signing pins the three values
 * together with a server-only secret.
 */
export type PendingSignup = {
  sub: string;
  email: string;
  name: string | null;
  /**
   * The raw Google ID token. Carried forward so the consent step can POST
   * it to `/auth/google` with the chosen consent flags and finish the
   * account creation server-side.
   */
  idToken: string;
  /** Issued-at, in seconds, so we can reject stale consent attempts. */
  iat: number;
  /** Optional post-signup redirect, if the start route was passed `next`. */
  next?: string;
};

export function signPendingSignup(payload: PendingSignup): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", authSecret()).update(body).digest();
  return `${body}.${base64url(mac)}`;
}

export function verifyPendingSignup(raw: string | undefined): PendingSignup | null {
  if (!raw) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;

  const expected = createHmac("sha256", authSecret()).update(body).digest();
  const provided = Buffer.from(mac, "base64url");
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as PendingSignup;
    if (!payload.sub || !payload.email) return null;
    if ((Date.now() - payload.iat * 1000) / 1000 > PENDING_SIGNUP_MAX_AGE) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
