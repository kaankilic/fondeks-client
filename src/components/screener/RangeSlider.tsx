"use client";

import type { ReactNode } from "react";

import styles from "./RangeSlider.module.scss";

function pct(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

/** Single-handle slider — "at least this much return". */
export function RangeSlider({
  label,
  display,
  displayTone,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  display: ReactNode;
  displayTone?: "pos";
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const position = pct(value, min, max);

  return (
    <div className={styles.field}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span
          className={`${styles.value} ${
            displayTone === "pos" ? styles.valuePos : ""
          }`}
        >
          {display}
        </span>
      </div>
      <div className={styles.slider}>
        <div className={styles.fill} style={{ left: 0, width: `${position}%` }} />
        <input
          className={styles.input}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

/** Two handles on one track — the risk band. */
export function DualRangeSlider({
  label,
  display,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  display: ReactNode;
  value: [number, number];
  min: number;
  max: number;
  onChange: (value: [number, number]) => void;
}) {
  const [low, high] = value;
  const left = pct(low, min, max);
  const right = pct(high, min, max);

  return (
    <div className={styles.field}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{display}</span>
      </div>
      <div className={styles.slider}>
        <div
          className={styles.fill}
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <input
          className={styles.input}
          type="range"
          min={min}
          max={max}
          value={low}
          aria-label={`${label} — en düşük`}
          onChange={(event) =>
            onChange([Math.min(Number(event.target.value), high), high])
          }
        />
        <input
          className={styles.input}
          type="range"
          min={min}
          max={max}
          value={high}
          aria-label={`${label} — en yüksek`}
          onChange={(event) =>
            onChange([low, Math.max(Number(event.target.value), low)])
          }
        />
      </div>
    </div>
  );
}
