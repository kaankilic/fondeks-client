import type { AnalyticsProvider } from "../types";

/**
 * Google Analytics 4, speaking through the global `gtag` that
 * `components/layout/Analytics.tsx` loads. That tag is only injected in
 * production, so in development `window.gtag` is undefined and every method
 * here quietly no-ops — exactly what we want from a local run.
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
    gtag()?.("event", event, params);
  },

  identify(userId, traits) {
    // `set` persists these across every later event without re-sending a
    // page_view, which re-running `config` would.
    gtag()?.("set", { user_id: userId });
    if (traits) gtag()?.("set", "user_properties", traits);
  },

  // No `page`: GA4 enhanced measurement already fires page_view on every App
  // Router history change, so emitting one here would double-count.

  reset() {
    gtag()?.("set", { user_id: null });
  },
};
