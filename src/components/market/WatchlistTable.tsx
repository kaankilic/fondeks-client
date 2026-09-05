import Link from "next/link";

import { ChangePill, FundIdentity } from "@/components/funds/primitives";
import { direction, formatPercent, formatPrice } from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";

import styles from "./WatchlistTable.module.scss";

export function WatchlistTable({ funds }: { funds: Fund[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>İzleme Listem</span>
        <Link href="/izleme" className={styles.edit}>
          Düzenle
        </Link>
      </div>

      <div className={styles.headRow}>
        <span className={`${styles.colLabel} ${styles.cellIdentity}`}>
          Fon / Kod
        </span>
        <span
          className={`${styles.colLabel} ${styles.alignRight} ${styles.cellPrice}`}
        >
          Fiyat
        </span>
        <span
          className={`${styles.colLabel} ${styles.alignRight} ${styles.cellDaily}`}
        >
          Günlük
        </span>
        <span
          className={`${styles.colLabel} ${styles.alignRight} ${styles.cellY1}`}
        >
          1 Yıl
        </span>
      </div>

      {funds.map((fund) => (
        <Link key={fund.code} href={`/fon/${fund.slug}`} className={styles.row}>
          <FundIdentity
            className={styles.cellIdentity}
            fund={fund}
            meta={fund.category}
          />
          <span className={`${styles.price} ${styles.cellPrice}`}>
            {formatPrice(fund.price)}
          </span>
          <ChangePill value={fund.daily} className={styles.cellDaily} />
          <span
            className={`${styles.return} ${styles.cellY1} ${
              styles[direction(fund.y1)]
            }`}
          >
            {formatPercent(fund.y1)}
          </span>
        </Link>
      ))}
    </section>
  );
}
