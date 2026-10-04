import Link from "next/link";

import { direction, formatPercent, type Direction } from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";

import { BrandMark, FundCode, fundLogo, Sparkline } from "./primitives";
import styles from "./FeaturedFunds.module.scss";

const TONE_VAR = { pos: "var(--pos)", neg: "var(--neg)" } as const;

export function FeaturedFunds({
  funds,
  sparklines,
}: {
  funds: Fund[];
  /** Polyline points per fund code, from the daily price series. */
  sparklines: Record<string, string>;
}) {
  return (
    <section>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Öne Çıkanlar</span>
        <Link href="/arama" className={styles.more}>
          Tümünü gör →
        </Link>
      </div>

      <div className={styles.grid}>
        {funds.map((fund) => {
          // Ranked on the week; the sparkline takes the week's direction.
          const tone = direction(fund.w1);
          const lead: Direction = direction(fund.y1);
          const spark = sparklines[fund.code];
          return (
            <Link
              key={fund.code}
              href={`/fon/${fund.slug}`}
              className={styles.card}
            >
              <div className={styles.top}>
                <BrandMark logo={fundLogo(fund)} size="md" />
                <FundCode code={fund.code} size="md" />
                <span className={styles.name}>{fund.name}</span>
              </div>

              <div className={styles.lead}>
                <span className={`${styles.leadValue} ${styles[lead]}`}>
                  {formatPercent(fund.y1)}
                </span>
                <span className={styles.leadLabel}>1 Yıl</span>
              </div>

              <div className={styles.metrics}>
                <Metric label="Günlük" value={fund.daily} />
                <Metric label="1 Hafta" value={fund.w1} />
                <Metric label="1 Ay" value={fund.m1} />
              </div>

              {spark ? (
                <div className={styles.spark}>
                  <Sparkline
                    points={spark}
                    color={TONE_VAR[tone]}
                    fill
                    gradientId={`spark-${fund.code}`}
                  />
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const tone: Direction = direction(value);
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${styles[tone]}`}>
        {formatPercent(value)}
      </span>
    </div>
  );
}
