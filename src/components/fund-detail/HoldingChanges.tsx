import { BrandMark } from "@/components/funds/primitives";
import { formatPoints } from "@/lib/fondeks/format";
import { FALLBACK_LOGO } from "@/lib/fondeks/palette";
import type { HoldingChange } from "@/lib/fondeks/types";

import styles from "./HoldingChanges.module.scss";

/** Two letters for the mark: "Hisse Senedi" → "HS", "Eurobond" → "EU". */
function initialsFor(label: string): string {
  const words = label.split(/[\s(]+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[1][0] : label.slice(0, 2);
  return letters.toLocaleUpperCase("tr");
}

function HoldingPanel({
  title,
  direction,
  holdings,
}: {
  title: string;
  direction: "up" | "down";
  holdings: HoldingChange[];
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span
          className={`${styles.dot} ${
            direction === "up" ? styles.dotUp : styles.dotDown
          }`}
          aria-hidden
        />
        <span className={styles.title}>{title}</span>
        <span className={styles.period}>Son ay</span>
      </div>

      {holdings.map((holding) => (
        <div key={holding.label} className={styles.row}>
          <div className={styles.stock}>
            <BrandMark
              logo={{
                initials: initialsFor(holding.label),
                background: holding.color ?? FALLBACK_LOGO.background,
              }}
              size="md"
            />
            <span className={styles.name}>{holding.label}</span>
          </div>
          <span className={styles.weight}>
            {holding.weight.toFixed(1).replace(".", ",")}%
          </span>
          <span className={`${styles.change} ${styles[direction]}`}>
            {direction === "up" ? "▲" : "▼"} {formatPoints(holding.change)}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Positions the manager added to and trimmed over the last month. */
export function HoldingChanges({
  increased,
  decreased,
}: {
  increased: HoldingChange[];
  decreased: HoldingChange[];
}) {
  return (
    <div className={styles.grid}>
      <HoldingPanel
        title="Artırılan Pozisyonlar"
        direction="up"
        holdings={increased}
      />
      <HoldingPanel
        title="Azaltılan Pozisyonlar"
        direction="down"
        holdings={decreased}
      />
    </div>
  );
}
