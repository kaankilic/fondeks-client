import {
  direction,
  formatIndexChange,
  formatIndexValue,
} from "@/lib/fondeks/format";
import type { MarketIndex } from "@/lib/fondeks/types";

import { BrandMark, Sparkline } from "@/components/funds/primitives";
import styles from "./IndexCard.module.scss";

const TONE_VAR = {
  pos: "var(--pos)",
  neg: "var(--neg)",
  flat: "var(--text-dim)",
} as const;

/** Shown in place of a change a fresh series has no previous quote for. */
const NOT_UPDATED = "Güncellenmedi";

export function IndexCards({ indices }: { indices: MarketIndex[] }) {
  return (
    <div className={styles.grid}>
      {indices.map((index) => {
        const change = index.change;
        const tone = change === null ? "flat" : direction(change);
        return (
          <article key={index.name} className={styles.card}>
            <div className={styles.top}>
              <div className={styles.identity}>
                <BrandMark
                  logo={{ initials: index.symbol, background: index.color }}
                  size="xl"
                />
                <span className={styles.name}>{index.name}</span>
              </div>
              <span className={`${styles.change} ${styles[tone]}`}>
                {change === null ? NOT_UPDATED : formatIndexChange(change)}
              </span>
            </div>

            <div className={styles.bottom}>
              <div className={styles.value}>
                {formatIndexValue(index.value, index.decimals, index.displayPattern)}
                {index.unit ? (
                  <span className={styles.unit}> {index.unit}</span>
                ) : null}
              </div>
              {index.spark ? (
                <Sparkline
                  points={index.spark}
                  color={TONE_VAR[tone]}
                  width={90}
                  height={30}
                />
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
