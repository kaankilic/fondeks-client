import { formatPercentPrefixed } from "@/lib/fondeks/format";
import { allocationColor } from "@/lib/fondeks/palette";
import type { Allocation as AllocationSlice } from "@/lib/fondeks/types";

import styles from "./Allocation.module.scss";

export function Allocation({ slices }: { slices: AllocationSlice[] }) {
  return (
    <section className={styles.panel}>
      <span className={styles.title}>Varlık Dağılımı</span>

      <div className={styles.bar}>
        {slices.map((slice, index) => (
          <div
            key={slice.label}
            className={styles.segment}
            style={{
              width: `${slice.pct}%`,
              background: allocationColor(index),
            }}
            title={`${slice.label} ${formatPercentPrefixed(slice.pct)}`}
          />
        ))}
      </div>

      <div className={styles.legend}>
        {slices.map((slice, index) => (
          <div key={slice.label} className={styles.item}>
            <span
              className={styles.swatch}
              style={{ background: allocationColor(index) }}
              aria-hidden
            />
            <span className={styles.label}>{slice.label}</span>
            <span className={styles.value}>
              {formatPercentPrefixed(slice.pct)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
