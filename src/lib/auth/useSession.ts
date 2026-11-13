"use client";

import { useEffect, useState } from "react";

import type { SessionUser } from "./session";

/**
 * Client-side session resolver. The server render path no longer reads
 * cookies (that would mark every route dynamic and kill the edge cache for
 * Googlebot), so the UI mounts without knowing who the viewer is and this
 * hook fills it in on the client.
 *
 * `status: "loading"` is the window between hydration and the first response
 * from `/api/session` — call sites render a neutral placeholder in that gap
 * rather than flashing the signed-out UI.
 */
export type SessionState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: SessionUser | null };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ user: SessionUser | null }>)
          : { user: null as SessionUser | null },
      )
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", user: data.user ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "ready", user: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
