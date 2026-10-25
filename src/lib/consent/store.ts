"use client";

import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_EVENT,
  DEFAULT_CONSENT,
  type ConsentCategory,
  type ConsentState,
} from "./types";

/**
 * İstemci tarafı onay deposu — çerez olarak serileştirir ve değişiklikleri
 * `window` üzerinde `fondeks:consent` event'i ile duyurur. Analitik sağlayıcıların
 * başlatma kodu bu event'i dinleyerek onay geldiğinde kendini yükler.
 */

function parse(raw: string | null): ConsentState {
  if (!raw) return { ...DEFAULT_CONSENT };
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: Boolean(data.analytics),
      marketing: Boolean(data.marketing),
      decidedAt:
        typeof data.decidedAt === "string" && data.decidedAt.length > 0
          ? data.decidedAt
          : null,
    };
  } catch {
    return { ...DEFAULT_CONSENT };
  }
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  return match ? match.slice(CONSENT_COOKIE.length + 1) : null;
}

function writeCookie(state: ConsentState): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(state));
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}` +
    `; SameSite=Lax${secure}`;
}

export function getConsent(): ConsentState {
  return parse(readCookie());
}

export function hasDecided(state: ConsentState = getConsent()): boolean {
  return state.decidedAt !== null;
}

export function isAllowed(
  category: ConsentCategory,
  state: ConsentState = getConsent(),
): boolean {
  if (category === "necessary") return true;
  return state[category] === true;
}

type ConsentPatch = Partial<Pick<ConsentState, "analytics" | "marketing">>;

export function setConsent(patch: ConsentPatch): ConsentState {
  const current = getConsent();
  const next: ConsentState = {
    necessary: true,
    analytics: patch.analytics ?? current.analytics,
    marketing: patch.marketing ?? current.marketing,
    decidedAt: new Date().toISOString(),
  };
  writeCookie(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: next }));
  }
  return next;
}

export function acceptAll(): ConsentState {
  return setConsent({ analytics: true, marketing: true });
}

export function rejectAll(): ConsentState {
  return setConsent({ analytics: false, marketing: false });
}

export function subscribe(
  listener: (state: ConsentState) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ConsentState>).detail;
    listener(detail ?? getConsent());
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
