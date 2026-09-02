"use client";

import { useMemo, useState } from "react";

import { formatPercent } from "@/lib/fondeks/format";
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

  const chart = useMemo(() => {
    const sessions =
      RANGES.find((item) => item.label === range)?.sessions ?? prices.length;
    const slice = prices.slice(-Math.max(sessions, 2));

    if (slice.length < 2) return null;

    const values = slice.map((point) => point.price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const line = slice
      .map((point, index) => {
        const x = (index / (slice.length - 1)) * WIDTH;
        const y =
          PADDING + (1 - (point.price - min) / span) * (HEIGHT - PADDING * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return {
      line,
      area: `M0,${HEIGHT} L${line.replace(/ /g, " L")} L${WIDTH},${HEIGHT} Z`,
      change: (values[values.length - 1] / values[0] - 1) * 100,
      from: slice[0].date,
      to: slice[slice.length - 1].date,
    };
  }, [prices, range]);

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
              onClick={() => setRange(item.label)}
              aria-pressed={item.label === range}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {chart ? (
        <>
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
                <stop offset="0" stopColor="var(--brand)" stopOpacity="0.28" />
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
