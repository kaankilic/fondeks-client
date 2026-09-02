import {
  direction,
  formatIndexChange,
  formatIndexValue,
} from "@/lib/fondeks/format";
import type { MarketIndex } from "@/lib/fondeks/types";

import { BrandMark, Sparkline } from "@/components/funds/primitives";
import styles from "./IndexCard.module.scss";

const TONE_VAR = { pos: "var(--pos)", neg: "var(--neg)" } as const;

export function IndexCards({ indices }: { indices: MarketIndex[] }) {
  return (
    <div className={styles.grid}>
      {indices.map((index) => {
        const tone = direction(index.change);
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
                {formatIndexChange(index.change)}
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
