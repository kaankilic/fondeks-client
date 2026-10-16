"use client";

import { useEffect } from "react";

import type { SessionUser } from "@/lib/auth/session";

import { useAnalytics } from "./useAnalytics";

/**
 * Bridges the server-resolved session to the analytics layer. Mounted in the
 * authenticated layout: when a user is present it calls `identify` with the
 * opaque account id, and on sign-out it resets.
 *
 * Note what is NOT sent — email and name never leave the server. GA4 forbids
 * personally identifying data, so only the id and coarse, non-PII flags go to
 * analytics.
 */
export function IdentifyUser({ user }: { user: SessionUser | null }) {
  const { identify, reset } = useAnalytics();

  useEffect(() => {
    if (user) identify(user.id, { logged_in: true });
    else reset();
  }, [user, identify, reset]);

  return null;
}
