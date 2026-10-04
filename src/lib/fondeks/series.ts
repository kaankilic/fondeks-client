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

/**
 * Polyline points for a real price series, min-max normalised into the
 * {@link SPARK_VIEWBOX}. A flat series (no spread) draws down the middle rather
 * than dividing by zero. Fewer than two points has no shape, so it yields "".
 */
export function sparklineFromValues(values: number[]): string {
  if (values.length < 2) return "";

  const { width, height } = SPARK_VIEWBOX;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
      const y =
        max === min
          ? height / 2
          : height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
