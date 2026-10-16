// Runs once in the browser, after the HTML loads and before React hydrates —
// Next.js' client-instrumentation entry point. We use it to wire up the
// analytics providers before any component can emit an event.
import { analytics } from "@/lib/analytics";

analytics.init();

// First page_view for the initial hard load — `onRouterTransitionStart` only
// fires on subsequent client-side navigations.
if (typeof window !== "undefined") {
  analytics.page(window.location.pathname + window.location.search, {
    navigation_type: "initial",
  });
}

/**
 * App Router navigations. Fires `page_view` through the shared dispatcher so
 * every provider — GA4 today, Amplitude tomorrow — receives the identical
 * event shape. GA4 Enhanced measurement's "Page views" toggle must be off to
 * avoid double-counting.
 */
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  analytics.page(url, { navigation_type: navigationType });
}
