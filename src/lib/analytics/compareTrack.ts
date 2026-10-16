"use client";

/**
 * The thin memory behind the compare-to-track north-star metric: which funds
 * the visitor has put on the compare board this session. When one of them is
 * later added to the watch list, the watch call can report that the add
 * followed a comparison — the exact coupling the strategy measures.
 *
 * It lives in `sessionStorage` so it resets per visit and never leaves the
 * browser; every access is guarded because storage throws in private windows
 * and when a browser blocks site data. A thrown or empty read simply means
 * "not known to have compared", which is the safe default.
 */

const KEY = "fondeks.compared";

function read(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Record that `code` has been placed on the compare board this session. */
export function markCompared(code: string): void {
  try {
    const set = read();
    set.add(code);
    sessionStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // Storage unavailable — the coupling signal is best-effort, so drop it.
  }
}

/** Whether `code` was compared earlier this session. */
export function wasCompared(code: string): boolean {
  return read().has(code);
}
