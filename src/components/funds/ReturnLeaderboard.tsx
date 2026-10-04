import Link from "next/link";

import { direction, formatPercent } from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";

import { BrandMark, FundCode, fundLogo, Meter } from "./primitives";
import styles from "./ReturnLeaderboard.module.scss";

/** The first three places carry the brand color; the rest stay neutral. */
const PODIUM = 3;

export function ReturnLeaderboard({ funds }: { funds: Fund[] }) {
  const best = funds.reduce((max, fund) => Math.max(max, fund.y1), 0);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Getiri Liderleri</span>
        <span className={styles.live}>Canlı</span>
      </div>

      {funds.length === 0 ? (
        <p className={styles.empty}>Sıralama için yeterli veri yok.</p>
      ) : null}

      {funds.map((fund, index) => {
        const podium = index < PODIUM;
        return (
          <Link
            key={fund.code}
            href={`/fon/${fund.slug}`}
            className={styles.row}
          >
            <span
              className={`${styles.rank} ${podium ? styles.rankTop : ""}`}
            >
              {index + 1}
            </span>

            <div className={styles.fund}>
              <div className={styles.fundTop}>
                <BrandMark logo={fundLogo(fund)} size="sm" />
                <FundCode code={fund.code} size="sm" />
                <span className={styles.founder}>{fund.founder}</span>
              </div>
              <div className={styles.meter}>
                <Meter
                  pct={Math.round((fund.y1 / best) * 100)}
                  color={podium ? "var(--brand)" : "var(--border-strong)"}
                />
              </div>
            </div>

            <span
              className={`${styles.value} ${styles[direction(fund.y1)]}`}
            >
              {formatPercent(fund.y1)}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
