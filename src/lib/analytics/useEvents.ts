"use client";

import { useMemo } from "react";

import { analytics } from "./index";

/**
 * The hook every client component uses to emit customer-journey events.
 *
 *   const { track } = useEvents();
 *   track("fund_compare_click", { code, authed });
 *
 * It's a thin, stable handle on the shared dispatcher — the indirection is the
 * point: swap or add a provider (Amplitude, Woopra) in `./index` and every
 * call site keeps working untouched.
 */
export function useEvents() {
  return useMemo(
    () => ({
      track: analytics.track,
      identify: analytics.identify,
      page: analytics.page,
      reset: analytics.reset,
    }),
    [],
  );
}
