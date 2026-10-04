import {
  direction,
  formatIndexChange,
  formatIndexValue,
} from "@/lib/fondeks/format";
import type { MarketIndex } from "@/lib/fondeks/types";

import styles from "./IndexTicker.module.scss";

/**
 * Thin market strip above the discovery KPIs: BIST, gold and FX read left to
 * right, terminal-style. Fed by the app's own index reader, so it stays empty
 * (and renders nothing) until that endpoint is live — never a row of zeros.
 */
export function IndexTicker({ indices }: { indices: MarketIndex[] }) {
  if (indices.length === 0) return null;

  return (
    <div className={styles.ticker} aria-label="Piyasa endeksleri">
      {indices.map((index) => (
        <div key={index.symbol} className={styles.item}>
          <span className={styles.name}>{index.name}</span>
          <span className={styles.value}>
            {formatIndexValue(index.value, index.decimals, index.displayPattern)}
          </span>
          {index.change !== null ? (
            <span
              className={`${styles.change} ${styles[direction(index.change)]}`}
            >
              {formatIndexChange(index.change)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
