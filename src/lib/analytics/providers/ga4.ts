import type { AnalyticsProvider } from "../types";

/**
 * Google Analytics 4, speaking through the global `gtag` that
 * `components/layout/Analytics.tsx` loads. That tag is only injected in
 * production, so in development `window.gtag` is undefined and every method
 * here quietly no-ops — exactly what we want from a local run.
 *
 * `page_view` is handled by GA4's own Enhanced measurement (initial load +
 * every App Router history change), so this provider ignores the event when
 * it comes through `track`. Other providers (Amplitude, Woopra) still
 * receive it — they just don't have an equivalent automatic sensor.
 */

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

function gtag(): Gtag | undefined {
  return typeof window === "undefined" ? undefined : window.gtag;
}

export const ga4Provider: AnalyticsProvider = {
  name: "ga4",

  track(event, params) {
    // GA4's Enhanced measurement already records page_view on load and on
    // every history change; forwarding ours would double-count.
    if (event === "page_view") return;
    gtag()?.("event", event, params);
  },

  identify(userId, traits) {
    // `set` persists these across every later event without re-sending a
    // page_view, which re-running `config` would.
    gtag()?.("set", { user_id: userId });
    if (traits) gtag()?.("set", "user_properties", traits);
  },

  reset() {
    gtag()?.("set", { user_id: null });
  },
};
