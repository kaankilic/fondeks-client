"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAnalytics } from "@/lib/analytics/useAnalytics";

/**
 * Fires `not_found_viewed` once with the current pathname, so the lost-URL
 * radar in GA/Amplitude can rank which 404s are worth fixing or redirecting.
 */
export function NotFoundTracker() {
  const { track } = useAnalytics();
  const path = usePathname();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("not_found_viewed", { path: path ?? "" });
  }, [track, path]);

  return null;
}
