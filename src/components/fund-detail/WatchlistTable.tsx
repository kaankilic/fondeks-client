"use client";

import Link from "next/link";

import { ChangePill, FundIdentity, RiskChip } from "@/components/funds/primitives";
import { direction, formatPercent } from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";
import { toggleWatch } from "@/lib/watchlist/actions";

import styles from "./WatchlistTable.module.scss";

/** The signed-in user's tracked funds, each removable in place. */
export function WatchlistTable({ funds }: { funds: Fund[] }) {
  if (funds.length === 0) {
    return (
      <section className={styles.panel}>
        <p className={styles.empty}>
          İzleme listen boş. Bir fon sayfasında{" "}
          <strong>Takip Listeme Ekle</strong>&apos;ye dokunarak buraya ekle.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.headRow}>
        <span className={styles.colFund}>Fon</span>
        <span className={styles.colNum}>1 Yıl</span>
        <span className={styles.colNum}>Günlük</span>
        <span className={styles.colRisk}>Risk</span>
        <span className={styles.colRemove} aria-hidden />
      </div>

      {funds.map((fund) => (
        <div key={fund.code} className={styles.row}>
          <Link href={`/fon/${fund.slug}`} className={styles.fund}>
            <FundIdentity fund={fund} markSize="md" codeSize="sm" />
          </Link>
          <span className={`${styles.value} ${styles[direction(fund.y1)]}`}>
            {formatPercent(fund.y1)}
          </span>
          <ChangePill value={fund.daily} className={styles.daily} />
          <RiskChip risk={fund.risk} className={styles.riskChip} />
          <form
            action={toggleWatch.bind(null, fund.code)}
            className={styles.removeForm}
          >
            <button
              type="submit"
              className={styles.remove}
              aria-label={`${fund.code} fonunu listeden çıkar`}
              title="Listeden çıkar"
            >
              ✕
            </button>
          </form>
        </div>
      ))}
    </section>
  );
}
