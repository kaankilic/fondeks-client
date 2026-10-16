"use client";

import { useEffect } from "react";

import { useAnalytics } from "./useAnalytics";

/**
 * Single document-level click listener that detects anchor navigations off
 * our own host and reports them. Mounted once from the root layout so every
 * route inherits the behaviour; the listener is passive on hot paths and
 * swallows malformed hrefs without touching the user's click.
 */
export function OutboundLinkTracker() {
  const { track } = useAnalytics();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.host === window.location.host) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      track("outbound_link_click", {
        destination: url.href,
        host: url.host,
        location: window.location.pathname,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [track]);

  return null;
}
