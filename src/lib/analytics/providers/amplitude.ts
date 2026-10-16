"use client";

import * as amplitude from "@amplitude/analytics-browser";

import type { AnalyticsProvider, UserTraits } from "../types";

/**
 * Amplitude, EU data residency. The SDK bootstraps lazily in `init()` — only
 * when the key is set, so a local run without the env var quietly no-ops.
 * Amplitude's own `page_view` autocapture is off because the dispatcher
 * already fires a typed `page_view` event through `track`, which keeps the
 * wire shape identical with every other provider.
 */

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

export const amplitudeProvider: AnalyticsProvider = {
  name: "amplitude",

  init() {
    if (!API_KEY || typeof window === "undefined") return;
    amplitude.init(API_KEY, {
      serverZone: "EU",
      autocapture: { pageViews: false },
    });
  },

  track(event, params) {
    amplitude.track(event, params as Record<string, unknown>);
  },

  identify(userId, traits) {
    amplitude.setUserId(userId);
    if (traits) applyTraits(traits);
  },

  setUserProperties(traits) {
    applyTraits(traits);
  },

  reset() {
    amplitude.reset();
  },
};

function applyTraits(traits: UserTraits) {
  const identify = new amplitude.Identify();
  for (const [key, value] of Object.entries(traits)) {
    if (value === undefined || value === null) continue;
    identify.set(key, value);
  }
  amplitude.identify(identify);
}
