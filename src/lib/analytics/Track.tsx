"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { AnalyticsEventName, AnalyticsEvents } from "./index";
import { useEvents } from "./useEvents";

/**
 * Client helpers that let Server Components emit events without becoming client
 * components themselves — drop one of these in as a child.
 */

/** Fires a single event when it mounts. Use for impressions (e.g. a gate view). */
export function TrackView<E extends AnalyticsEventName>({
  event,
  params,
}: {
  event: E;
  params: AnalyticsEvents[E];
}) {
  const { track } = useEvents();
  // Guard against a double-fire from React 19 strict-mode remounts.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, params);
    // The event identity is fixed for a given mount; re-firing on param object
    // identity changes would defeat the "once" contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Wraps clickable children and fires an event when they're activated. Rendered
 * as `display: contents`, so it adds no box and leaves layout untouched.
 */
export function TrackClick<E extends AnalyticsEventName>({
  event,
  params,
  children,
}: {
  event: E;
  params: AnalyticsEvents[E];
  children: ReactNode;
}) {
  const { track } = useEvents();

  return (
    <span style={{ display: "contents" }} onClick={() => track(event, params)}>
      {children}
    </span>
  );
}
