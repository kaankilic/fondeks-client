"use client";

import { useEffect, useRef } from "react";

import { useAnalytics } from "@/lib/analytics/useAnalytics";

const COOKIE = "fondeks_signup_completed";

/**
 * Fires the `sign_up_completed` conversion event on the first client load
 * after `signUpAction` created the account. The action drops a short-lived
 * cookie before redirecting; this component reads it, emits the event, then
 * clears the cookie so refreshing the destination page cannot double-fire.
 */
export function SignupCompletionTracker() {
  const { track } = useAnalytics();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`),
    );
    const method = match?.[1];
    if (!method) return;
    fired.current = true;
    // The action writes "password" or "google" into the cookie's value so
    // the funnel can attribute the conversion to the right path.
    track("sign_up_completed", {
      method: method === "google" ? "google" : "password",
    });
    document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [track]);

  return null;
}
