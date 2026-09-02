/**
 * Deterministic series generators, ported verbatim from the design canvas so
 * server and client render byte-identical SVG (no hydration mismatch) until
 * real TEFAS price history is wired in.
 */

/** Linear congruential step used by every generator here. */
function step(seed: number): number {
  return (seed * 9301 + 49297) % 233280;
}

export const SPARK_VIEWBOX = { width: 120, height: 42 } as const;

/**
 * 16-point sparkline for a 120×42 viewBox.
 * `declining` flips the drift so losers trend down.
 */
export function sparklinePoints(seed: number, declining = false): string {
  let s = seed * 9301;
  let v = 20;
  const points: string[] = [];
  const n = 16;

  for (let i = 0; i < n; i++) {
    s = step(s);
    const r = s / 233280 - 0.5;
    v += r * 7 + (declining ? -1.1 : 0.9);
    v = Math.max(4, Math.min(38, v));
    const x = (i / (n - 1)) * 118 + 1;
    points.push(`${x.toFixed(1)},${(42 - v).toFixed(1)}`);
  }

  return points.join(" ");
}
