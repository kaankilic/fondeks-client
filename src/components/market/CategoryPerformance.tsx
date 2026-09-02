import { Meter } from "@/components/funds/primitives";
import { formatPercent } from "@/lib/fondeks/format";
import type { CategoryPerformance as CategoryPerformanceItem } from "@/lib/fondeks/types";

import styles from "./CategoryPerformance.module.scss";

/** The two strongest categories are highlighted in brand gold. */
const HIGHLIGHT = 2;

export function CategoryPerformance({
  categories,
}: {
  categories: CategoryPerformanceItem[];
}) {
  const best = Math.max(...categories.map((category) => category.y1));

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Kategori Performansı</div>
        <div className={styles.subtitle}>Ortalama 1 yıllık getiri</div>
      </div>

      <div className={styles.body}>
        {categories.map((category, index) => (
          <div key={category.category}>
            <div className={styles.rowTop}>
              <span className={styles.name}>{category.category}</span>
              <span className={styles.value}>{formatPercent(category.y1)}</span>
            </div>
            <Meter
              pct={Math.round((category.y1 / best) * 100)}
              color={index < HIGHLIGHT ? "var(--brand)" : "var(--action)"}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
