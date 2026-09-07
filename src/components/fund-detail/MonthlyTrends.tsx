"use client";

import { useState } from "react";

import { formatAum, formatCount, formatPercent } from "@/lib/fondeks/format";
import type { MonthlyStat } from "@/lib/fondeks/types";

import styles from "./MonthlyTrends.module.scss";

/** The panel reads the last half year, one bar per month. */
const MONTHS = 6;

const shortMonth = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const longMonth = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});
const rangeMonth = new Intl.DateTimeFormat("tr-TR", {
  month: "short",
  year: "2-digit",
});

/**
 * "2026-04-01" as local midnight. Handing the string to `new Date` parses it as
 * UTC, which lands on the previous month west of Greenwich — and this renders
 * on both the server and the client, so the two have to agree.
 */
const parseMonth = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1);
};

const changePercent = (current: number, previous: number) =>
  previous > 0 ? (current / previous - 1) * 100 : null;

type Bar = { month: string; value: number };

/**
 * One bar per month, with the hovered — or focused — month's own value on a
 * tooltip above the bars.
 *
 * Sizes and investor counts move by a few percent a month, so measuring those
 * bars from zero would draw six identical blocks. They start from a floor just
 * under the smallest month instead, which reads the shape; the exact number is
 * always a hover away. Net flow is signed and does belong around zero.
 */
function BarChart({
  bars,
  format,
  color,
  signed = false,
}: {
  bars: Bar[];
  format: (value: number) => string;
  color?: string;
  signed?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  const values = bars.map((bar) => bar.value);
  const extent = Math.max(...values.map(Math.abs)) || 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const floor = min - (max - min) * 0.25;
  const span = max - floor || 1;

  const heightOf = (value: number) =>
    signed
      ? (Math.abs(value) / extent) * 100
      : Math.max(((value - floor) / span) * 100, 2);

  // Anchor the tooltip on the bar, then pull it back by the same fraction of
  // its own width so the edge months stay inside the chart.
  const anchor = active === null ? 0 : ((active + 0.5) / bars.length) * 100;

  return (
    <div className={styles.chart} onMouseLeave={() => setActive(null)}>
      <div className={styles.tipZone}>
        {active !== null ? (
          <div
            className={styles.tooltip}
            style={{
              left: `${anchor}%`,
              transform: `translateX(-${anchor}%)`,
            }}
            aria-hidden
          >
            <span className={styles.tipMonth}>
              {longMonth.format(parseMonth(bars[active].month))}
            </span>
            <span className={styles.tipValue}>
              {format(bars[active].value)}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`${styles.columns} ${
          active === null ? "" : styles.columnsActive
        }`}
      >
        {bars.map((bar, index) => {
          const height = heightOf(bar.value);
          const label = `${longMonth.format(parseMonth(bar.month))}: ${format(
            bar.value,
          )}`;

          return (
            <button
              key={bar.month}
              type="button"
              className={`${styles.column} ${
                index === active ? styles.columnActive : ""
              }`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={label}
            >
              <span
                className={`${styles.bars} ${signed ? styles.barsSigned : ""}`}
              >
                {signed ? (
                  <>
                    <span className={styles.half}>
                      {bar.value >= 0 ? (
                        <span
                          className={`${styles.bar} ${styles.barPos}`}
                          style={{ height: `${height}%` }}
                        />
                      ) : null}
                    </span>
                    <span className={`${styles.half} ${styles.halfDown}`}>
                      {bar.value < 0 ? (
                        <span
                          className={`${styles.bar} ${styles.barNeg}`}
                          style={{ height: `${height}%` }}
                        />
                      ) : null}
                    </span>
                  </>
                ) : (
                  <span className={styles.half}>
                    <span
                      className={styles.bar}
                      style={{ height: `${height}%`, background: color }}
                    />
                  </span>
                )}
              </span>

              <span className={styles.tick}>
                {shortMonth.format(parseMonth(bar.month))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fon toplam değeri, yatırımcı sayısı and nakit giriş/çıkışı over the last six
 * months, straight from the monthly series.
 */
export function MonthlyTrends({ monthly }: { monthly: MonthlyStat[] }) {
  if (monthly.length < 2) return null;

  const recent = monthly.slice(-MONTHS);
  const latest = recent[recent.length - 1];
  const previous = recent[recent.length - 2];

  const valueChange = changePercent(latest.totalValue, previous.totalValue);
  const investorChange = changePercent(
    latest.investorCount,
    previous.investorCount,
  );

  const flowSign = latest.netFlow >= 0 ? "+" : "−";
  const formatFlow = (value: number) =>
    `${value >= 0 ? "+" : "−"}${formatAum(Math.abs(value))}`;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Aylık Gelişim</span>
        <span className={styles.period}>
          {rangeMonth.format(parseMonth(recent[0].month))} –{" "}
          {rangeMonth.format(parseMonth(latest.month))}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.block}>
          <div className={styles.label}>Fon Toplam Değeri</div>
          <div className={styles.value}>
            {formatAum(latest.totalValue)}
            {valueChange === null ? null : (
              <span
                className={`${styles.delta} ${
                  valueChange >= 0 ? styles.pos : styles.neg
                }`}
              >
                {formatPercent(valueChange)}
              </span>
            )}
          </div>
          <BarChart
            bars={recent.map((row) => ({
              month: row.month,
              value: row.totalValue,
            }))}
            format={formatAum}
            color="var(--brand)"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Yatırımcı Sayısı</div>
          <div className={styles.value}>
            {formatCount(latest.investorCount)}
            {investorChange === null ? null : (
              <span
                className={`${styles.delta} ${
                  investorChange >= 0 ? styles.pos : styles.neg
                }`}
              >
                {formatPercent(investorChange)}
              </span>
            )}
          </div>
          <BarChart
            bars={recent.map((row) => ({
              month: row.month,
              value: row.investorCount,
            }))}
            format={formatCount}
            color="var(--action)"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Nakit Giriş / Çıkışı</div>
          <div
            className={`${styles.value} ${
              latest.netFlow >= 0 ? styles.pos : styles.neg
            }`}
          >
            {flowSign}
            {formatAum(Math.abs(latest.netFlow))}
          </div>
          <BarChart
            bars={recent.map((row) => ({
              month: row.month,
              value: row.netFlow,
            }))}
            format={formatFlow}
            signed
          />
        </div>
      </div>
    </section>
  );
}
