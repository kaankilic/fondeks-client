"use client";

import { useEffect } from "react";

import { useSession } from "@/lib/auth/useSession";

import { useAnalytics } from "./useAnalytics";

/**
 * Bridges the client-resolved session to the analytics layer. When the
 * handshake lands with a user it calls `identify` with the opaque account id;
 * when it lands empty it resets.
 *
 * Note what is NOT sent — email and name never leave the server. GA4 forbids
 * personally identifying data, so only the id and coarse, non-PII flags go to
 * analytics.
 */
export function IdentifyUser() {
  const session = useSession();
  const { identify, reset } = useAnalytics();

  useEffect(() => {
    if (session.status !== "ready") return;
    if (session.user) identify(session.user.id, { logged_in: true });
    else reset();
  }, [session, identify, reset]);

  return null;
}
