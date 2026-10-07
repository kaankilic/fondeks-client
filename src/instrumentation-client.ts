// Runs once in the browser, after the HTML loads and before React hydrates —
// Next.js' client-instrumentation entry point. We use it to wire up the
// analytics providers before any component can emit an event.
import { analytics } from "@/lib/analytics";

analytics.init();

/**
 * App Router navigations. GA4's enhanced measurement already records page_view
 * on these, so `analytics.page` is a no-op for GA — it exists for providers
 * (Amplitude, Woopra) that need an explicit page call. Kept here so route
 * tracking has one home the day such a provider is added.
 */
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  analytics.page(url, { navigation_type: navigationType });
}
