import Link from "next/link";

import { BrandMark, FundCode, Meter } from "@/components/funds/primitives";
import { formatPercent } from "@/lib/fondeks/format";
import type { SimilarFund } from "@/lib/fondeks/types";

import styles from "./SimilarFunds.module.scss";

/** Overlap at or above this share is called out in brand gold. */
const STRONG_OVERLAP = 85;

export function SimilarFunds({ funds }: { funds: SimilarFund[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Benzer Fonlar</span>
        <span className={styles.hint}>Portföy örtüşmesi</span>
      </div>

      {funds.map((fund) => {
        const color =
          fund.similarity >= STRONG_OVERLAP ? "var(--brand)" : "var(--action)";

        return (
          <Link
            key={fund.code}
            href={`/fon/${fund.slug}`}
            className={styles.row}
          >
            <div className={styles.identity}>
              <BrandMark
                logo={{ initials: fund.initials, background: fund.color }}
                size="sm"
              />
              <FundCode code={fund.code} size="sm" />
              <span className={styles.name}>{fund.label}</span>
            </div>

            <div className={styles.similarity}>
              <div className={styles.meter}>
                <Meter pct={fund.similarity} color={color} />
              </div>
              <span className={styles.similarityValue} style={{ color }}>
                %{fund.similarity}
              </span>
            </div>

            <span className={styles.return}>{formatPercent(fund.y1)}</span>
            <span className={styles.risk} title={`Risk ${fund.risk} / 7`}>
              {fund.risk}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
