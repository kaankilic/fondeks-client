"use client";

import { type PointerEvent, useMemo, useState } from "react";

import { formatDate, formatPercent, formatPrice } from "@/lib/fondeks/format";
import type { PricePoint } from "@/lib/fondeks/types";

import styles from "./PriceChart.module.scss";

const WIDTH = 680;
const HEIGHT = 200;
const PADDING = 10;

/** Sessions per range. Daily prices, so there is no intraday view. */
const RANGES = [
  { label: "1H", sessions: 5 },
  { label: "1A", sessions: 22 },
  { label: "3A", sessions: 66 },
  { label: "6A", sessions: 132 },
  { label: "1Y", sessions: 252 },
] as const;

type RangeLabel = (typeof RANGES)[number]["label"];

export function PriceChart({ prices }: { prices: PricePoint[] }) {
  const [range, setRange] = useState<RangeLabel>("1Y");
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    const sessions =
      RANGES.find((item) => item.label === range)?.sessions ?? prices.length;
    const slice = prices.slice(-Math.max(sessions, 2));

    if (slice.length < 2) return null;

    const values = slice.map((point) => point.price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const points = slice.map((point, index) => ({
      x: (index / (slice.length - 1)) * WIDTH,
      y: PADDING + (1 - (point.price - min) / span) * (HEIGHT - PADDING * 2),
      price: point.price,
      date: point.date,
    }));
    const line = points
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");

    return {
      points,
      line,
      area: `M0,${HEIGHT} L${line.replace(/ /g, " L")} L${WIDTH},${HEIGHT} Z`,
      change: (values[values.length - 1] / values[0] - 1) * 100,
      from: slice[0].date,
      to: slice[slice.length - 1].date,
    };
  }, [prices, range]);

  // The session the crosshair is snapped to, clamped so a stale index from the
  // previous range never reads past the new slice.
  const cursor =
    chart && hover !== null
      ? chart.points[Math.min(hover, chart.points.length - 1)]
      : null;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (!chart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, fraction));
    setHover(Math.round(clamped * (chart.points.length - 1)));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <span className={styles.title}>Fiyat Grafiği</span>
          {chart ? (
            <span
              className={`${styles.change} ${
                chart.change >= 0 ? styles.pos : styles.neg
              }`}
            >
              {formatPercent(chart.change)}
            </span>
          ) : null}
        </div>

        <div className={styles.ranges}>
          {RANGES.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.range} ${
                item.label === range ? styles.rangeActive : ""
              }`}
              onClick={() => {
                setRange(item.label);
                setHover(null);
              }}
              aria-pressed={item.label === range}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {chart ? (
        <>
          <div
            className={styles.plot}
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            <svg
              className={styles.chart}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              height={HEIGHT}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${range} fiyat grafiği, ${formatPercent(chart.change)}`}
            >
              <defs>
                <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0"
                    stopColor="var(--brand)"
                    stopOpacity="0.16"
                  />
                  <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[50, 100, 150].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2={WIDTH}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
              ))}

              <path d={chart.area} fill="url(#price-fill)" />
              <polyline
                points={chart.line}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {cursor ? (
              <>
                <span
                  className={styles.vline}
                  style={{ left: `${(cursor.x / WIDTH) * 100}%` }}
                  aria-hidden
                />
                <span
                  className={styles.hline}
                  style={{ top: `${(cursor.y / HEIGHT) * 100}%` }}
                  aria-hidden
                />
                <span
                  className={styles.marker}
                  style={{
                    left: `${(cursor.x / WIDTH) * 100}%`,
                    top: `${(cursor.y / HEIGHT) * 100}%`,
                  }}
                  aria-hidden
                />
                <div
                  className={styles.readout}
                  style={{
                    left: `${Math.min(
                      94,
                      Math.max(6, (cursor.x / WIDTH) * 100),
                    )}%`,
                  }}
                >
                  <span className={styles.readoutPrice}>
                    {formatPrice(cursor.price)}
                  </span>
                  <span className={styles.readoutDate}>
                    {formatDate(cursor.date)}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.axis}>
            <span>{chart.from}</span>
            <span>{chart.to}</span>
          </div>
        </>
      ) : (
        <p className={styles.empty}>Bu aralık için fiyat verisi yok.</p>
      )}
    </section>
  );
}
