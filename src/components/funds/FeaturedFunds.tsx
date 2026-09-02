import Link from "next/link";

import { direction, formatPercent } from "@/lib/fondeks/format";
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
          const tone = direction(fund.y1);
          const spark = sparklines[fund.code];
          return (
            <Link
              key={fund.code}
              href={`/fon/${fund.slug}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardBrand}>
                  <BrandMark logo={fundLogo(fund)} />
                  <FundCode code={fund.code} size="lg" />
                </div>
                <span className={styles.star} aria-hidden>
                  ☆
                </span>
              </div>

              <div className={styles.name}>{fund.name}</div>

              <div className={styles.cardBottom}>
                <div>
                  <div className={styles.metricLabel}>1 Yıl</div>
                  <div className={`${styles.metricValue} ${styles[tone]}`}>
                    {formatPercent(fund.y1)}
                  </div>
                </div>
                {spark ? (
                  <Sparkline points={spark} color={TONE_VAR[tone]} />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
