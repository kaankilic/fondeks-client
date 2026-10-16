"use client";

import { useEffect, useRef } from "react";

import type { AnalyticsEvents } from "@/lib/analytics";
import { useAnalytics } from "@/lib/analytics/useAnalytics";

type ViewParams = AnalyticsEvents["signup_gate_viewed"];

/**
 * Fires `signup_gate_viewed` on mount and, if the visitor leaves the page
 * without clicking either auth CTA, `signup_gate_dismissed`. "Leaves" is
 * detected via `visibilitychange` → hidden, which also covers tab close and
 * mobile backgrounding. The dismiss is reported only once per mount.
 */
export function SignupGateTracker({ params }: { params: ViewParams }) {
  const { track } = useAnalytics();
  const settled = useRef(false);

  useEffect(() => {
    track("signup_gate_viewed", params);

    function onCtaClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        "a[href='/kayit'], a[href='/giris']",
      );
      if (anchor) settled.current = true;
    }

    function onHide() {
      if (settled.current) return;
      if (document.visibilityState !== "hidden") return;
      settled.current = true;
      track("signup_gate_dismissed", params);
    }

    document.addEventListener("click", onCtaClick, { capture: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("click", onCtaClick, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, params.preset, params.code]);

  return null;
}
