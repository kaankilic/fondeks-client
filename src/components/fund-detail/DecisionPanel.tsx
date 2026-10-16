import { UNKNOWN } from "@/lib/fondeks/constants";
import {
  consistencyLabel,
  deriveNetReturn,
  fundVerdict,
  hasFullYear,
  primaryReturn,
  resolveNetReturn,
  type VerdictTone,
} from "@/lib/fondeks/choose";
import {
  direction,
  formatPercent,
  formatPercentPrefixed,
} from "@/lib/fondeks/format";
import type { Fund, PricePoint } from "@/lib/fondeks/types";

import styles from "./DecisionPanel.module.scss";

/**
 * The Choose-stage decision panel — the first thing the strategy asks a fund
 * page to answer: "am I in the right fund?" It leads with an honest, plain
 * verdict and then the four figures a bank app won't line up for you: where the
 * fund stands in its category, its real (after-inflation) return, what's left
 * after stopaj, and its total cost.
 *
 * Every backend-sourced figure degrades to "Bilinmiyor" rather than a zero or
 * an invented number, so the panel ships before the API fills them in. The
 * `percentile` prop lets a page that already holds the category (the goal
 * pages) pass the figure it computed; the fund page leaves it off and the panel
 * reads the backend's `categoryPercentile`.
 */
export function DecisionPanel({
  fund,
  prices,
  percentile,
}: {
  fund: Fund;
  /** The fund's price series, so a sub-year fund is read since inception. */
  prices?: PricePoint[];
  percentile?: number | null;
}) {
  const verdict = fundVerdict(fund, prices);
  const fullYear = hasFullYear(fund);
  const primary = primaryReturn(fund, prices);

  const rank = percentile ?? fund.categoryPercentile ?? null;
  const real = fund.realReturn?.y1 ?? null;
  const consistency = consistencyLabel(fund);

  // Net of stopaj: the backend's one-year figure when the fund has a full year,
  // otherwise the net of the since-inception (or longest-window) return it does
  // have, so a young fund shows a real net number rather than net of zero.
  const net = fullYear
    ? resolveNetReturn(fund, "y1")
    : (() => {
        const value = deriveNetReturn(primary.value, fund.withholdingTax);
        return value === null
          ? null
          : ({ value, source: "derived" } as const);
      })();

  const metrics: Metric[] = [
    {
      label: "Kategori Sıralaması",
      hint: fullYear ? "1 yıllık getiri" : "kuruluştan beri",
      ...(rank === null
        ? unknown()
        : {
            value: `İlk %${Math.max(1, 100 - rank)}`,
            tone: rank >= 75 ? "good" : rank >= 40 ? "neutral" : "warn",
            detail: `${fund.category} kategorisinde`,
          }),
    },
    {
      label: "Reel Getiri",
      hint: "TÜFE sonrası · 1Y",
      ...(real === null
        ? unknown()
        : {
            value: formatPercent(real),
            tone: real >= 0 ? "good" : "warn",
            detail: "enflasyondan arındırılmış",
          }),
    },
    {
      label: "Stopaj Sonrası Net",
      hint: fullYear ? "1 yıllık getiri" : `${primary.label.toLocaleLowerCase("tr")} getiri`,
      ...(net === null
        ? unknown()
        : {
            value: formatPercent(net.value),
            tone: direction(net.value) === "pos" ? "good" : "warn",
            detail:
              net.source === "derived"
                ? "stopaj oranından hesaplandı"
                : "vergi sonrası",
          }),
    },
    {
      label: "Toplam Gider Oranı",
      hint: "yıllık (TER)",
      ...(fund.ter == null
        ? unknown()
        : {
            value: formatPercentPrefixed(fund.ter, 2),
            tone: "neutral",
            detail: "saklama ve işlem dahil",
          }),
    },
  ];

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Karar Paneli</span>
        <span className={styles.hint}>Doğru fonda mıyım?</span>
      </div>

      <p className={`${styles.verdict} ${styles[verdict.tone]}`}>
        {verdict.text}
      </p>

      <div className={styles.grid}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.cell}>
            <div className={styles.label}>{metric.label}</div>
            <div
              className={`${styles.value} ${
                metric.unknown ? styles.unknownValue : ""
              } ${metric.tone ? styles[metric.tone] : ""}`}
            >
              {metric.value}
            </div>
            <div className={styles.detail}>{metric.detail ?? metric.hint}</div>
          </div>
        ))}
      </div>

      {consistency ? (
        <p className={styles.consistency}>
          <span className={styles.badge} aria-hidden>
            ✓
          </span>
          {consistency} — tek yıllık sıçrama değil, süregelen performans.
        </p>
      ) : null}
    </section>
  );
}

type Metric = {
  label: string;
  hint: string;
  value: string;
  detail?: string;
  tone?: VerdictTone;
  unknown?: boolean;
};

/** The shared shape for a figure the source does not publish. */
function unknown(): Pick<Metric, "value" | "unknown"> {
  return { value: UNKNOWN, unknown: true };
}
