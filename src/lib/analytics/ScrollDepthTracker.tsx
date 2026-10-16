"use client";

import { useEffect, useRef } from "react";

import { useAnalytics } from "./useAnalytics";

type Depth = 25 | 50 | 75 | 100;
type Props =
  | { kind: "fund"; code: string }
  | { kind: "guide"; slug: string };

/**
 * Fires a depth bucket (25 / 50 / 75 / 100) once per page view when the
 * reader passes that threshold. Uses a rAF-throttled passive scroll listener
 * so there is no per-frame work; buckets fired by this instance are kept in
 * a ref so a React 19 strict-mode remount cannot double-fire them.
 */
export function ScrollDepthTracker(props: Props) {
  const { track } = useAnalytics();
  const fired = useRef<Set<Depth>>(new Set());
  const anchor = props.kind === "fund" ? props.code : props.slug;

  useEffect(() => {
    fired.current = new Set();
    const buckets: Depth[] = [25, 50, 75, 100];

    function compute() {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.max(0, (h.scrollTop / total) * 100));
      for (const bucket of buckets) {
        if (pct >= bucket && !fired.current.has(bucket)) {
          fired.current.add(bucket);
          if (props.kind === "fund") {
            track("fund_detail_scroll_depth", {
              code: props.code,
              depth: bucket,
            });
          } else {
            track("guide_scroll_depth", {
              slug: props.slug,
              depth: bucket,
            });
          }
        }
      }
    }

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        compute();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // `anchor` fully identifies the page target; props re-wraps object
    // identity on each render but the anchor does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, anchor]);

  return null;
}
