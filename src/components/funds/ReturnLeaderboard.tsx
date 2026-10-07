import Link from "next/link";

import { fundLogoSrc } from "@/lib/fondeks/founders";
import { direction, formatPercent } from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";

import { BrandMark, FundCode, fundLogo, Meter } from "./primitives";
import styles from "./ReturnLeaderboard.module.scss";

/** The first three places carry the brand color; the rest stay neutral. */
const PODIUM = 3;

export function ReturnLeaderboard({ funds }: { funds: Fund[] }) {
  // Ranked by the daily change, best first, independent of how the caller
  // ordered the list.
  const ranked = [...funds].sort((a, b) => b.daily - a.daily);
  const best = ranked.reduce((max, fund) => Math.max(max, fund.daily), 0);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Getiri Liderleri</span>
        <span className={styles.live}>Canlı</span>
      </div>

      {ranked.length === 0 ? (
        <p className={styles.empty}>Sıralama için yeterli veri yok.</p>
      ) : null}

      {ranked.map((fund, index) => {
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
                <BrandMark
                  logo={fundLogo(fund)}
                  src={fundLogoSrc(fund)}
                  size="sm"
                />
                <FundCode code={fund.code} size="sm" />
                <span className={styles.founder}>{fund.founder}</span>
              </div>
              <div className={styles.meter}>
                <Meter
                  pct={
                    best > 0
                      ? Math.max(0, Math.round((fund.daily / best) * 100))
                      : 0
                  }
                  color={podium ? "var(--brand)" : "var(--border-strong)"}
                />
              </div>
            </div>

            <span
              className={`${styles.value} ${styles[direction(fund.daily)]}`}
            >
              {formatPercent(fund.daily)}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
