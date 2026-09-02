import Link from "next/link";
import type { ReactNode } from "react";

import type { FundHighlight } from "@/lib/fondeks/types";

import { BrandMark, FundCode, fundLogo } from "./primitives";
import styles from "./FundHighlights.module.scss";

/** Grid wrapper so the discovery widgets share one rhythm. */
export function HighlightGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

/**
 * A short ranked list of funds with one highlighted figure — the shape every
 * discovery widget on the Keşfet screen uses.
 */
export function FundHighlightPanel({
  title,
  hint,
  items,
}: {
  title: string;
  hint?: string;
  items: FundHighlight[];
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Henüz veri yok.</p>
      ) : (
        items.map((item, index) => (
          <Link
            key={item.fund.code}
            href={`/fon/${item.fund.slug}`}
            className={styles.row}
          >
            <span className={styles.rank}>{index + 1}</span>

            <div className={styles.fund}>
              <div className={styles.fundTop}>
                <BrandMark logo={fundLogo(item.fund)} size="sm" />
                <FundCode code={item.fund.code} size="sm" />
                <span className={styles.name}>{item.fund.name}</span>
              </div>
              {item.detail ? (
                <div className={styles.detail}>{item.detail}</div>
              ) : null}
            </div>

            <span
              className={`${styles.value} ${styles[item.tone ?? "neutral"]}`}
            >
              {item.value}
            </span>
          </Link>
        ))
      )}
    </section>
  );
}
