import {
  formatAum,
  formatCount,
  formatPercent,
} from "@/lib/fondeks/format";
import type { MonthlyStat } from "@/lib/fondeks/types";

import styles from "./MonthlyTrends.module.scss";

const WIDTH = 220;
const HEIGHT = 54;

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(
    new Date(month),
  );

/** Line + fill for a series that only moves up and down around its own range. */
function TrendLine({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * WIDTH;
      const y = 4 + (1 - (value - min) / span) * (HEIGHT - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Bars around a zero line: inflows above, outflows below. */
function FlowBars({ values }: { values: number[] }) {
  const extent = Math.max(...values.map(Math.abs)) || 1;
  const mid = HEIGHT / 2;
  const barWidth = WIDTH / values.length - 2;

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      preserveAspectRatio="none"
      aria-hidden
    >
      <line className={styles.zero} x1="0" y1={mid} x2={WIDTH} y2={mid} />
      {values.map((value, index) => {
        const height = (Math.abs(value) / extent) * (mid - 4);
        return (
          <rect
            key={index}
            x={(index / values.length) * WIDTH}
            y={value >= 0 ? mid - height : mid}
            width={Math.max(barWidth, 1)}
            height={Math.max(height, 0.5)}
            rx="1"
            fill={value >= 0 ? "var(--pos)" : "var(--neg)"}
          />
        );
      })}
    </svg>
  );
}

/**
 * Fon toplam değeri, yatırımcı sayısı and nakit giriş/çıkışı, straight from
 * the monthly series.
 */
export function MonthlyTrends({ monthly }: { monthly: MonthlyStat[] }) {
  if (monthly.length < 2) return null;

  const latest = monthly[monthly.length - 1];
  const previous = monthly[monthly.length - 2];

  const valueChange = (latest.totalValue / previous.totalValue - 1) * 100;
  const investorChange =
    (latest.investorCount / previous.investorCount - 1) * 100;

  const flowSign = latest.netFlow >= 0 ? "+" : "−";

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Aylık Gelişim</span>
        <span className={styles.period}>
          {monthLabel(monthly[0].month)} – {monthLabel(latest.month)}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.block}>
          <div className={styles.label}>Fon Toplam Değeri</div>
          <div className={styles.value}>
            {formatAum(latest.totalValue)}
            <span
              className={`${styles.delta} ${
                valueChange >= 0 ? styles.pos : styles.neg
              }`}
            >
              {formatPercent(valueChange)}
            </span>
          </div>
          <TrendLine
            values={monthly.map((row) => row.totalValue)}
            color="var(--brand)"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Yatırımcı Sayısı</div>
          <div className={styles.value}>
            {formatCount(latest.investorCount)}
            <span
              className={`${styles.delta} ${
                investorChange >= 0 ? styles.pos : styles.neg
              }`}
            >
              {formatPercent(investorChange)}
            </span>
          </div>
          <TrendLine
            values={monthly.map((row) => row.investorCount)}
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
          <FlowBars values={monthly.map((row) => row.netFlow)} />
        </div>
      </div>

      <div className={styles.axis} style={{ padding: "0 18px 12px" }}>
        <span>{monthLabel(monthly[0].month)}</span>
        <span>{monthLabel(latest.month)}</span>
      </div>
    </section>
  );
}
