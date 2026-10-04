import type { CompareRow } from "@/lib/fondeks/types";

import styles from "./CompareTable.module.scss";

export function CompareTable({
  codes,
  rows,
  title = "Kıyaslama",
  hint,
  emptyLabel = "Kıyaslanacak benzer fon bulunamadı.",
}: {
  codes: string[];
  rows: CompareRow[];
  /** Panel heading; defaults to the fund-detail "Kıyaslama". */
  title?: string;
  /** Sub-label; defaults to "<subject> vs benzer fonlar". */
  hint?: string;
  /** Shown when there is only the subject column and nothing to compare. */
  emptyLabel?: string;
}) {
  const [subject, ...peers] = codes;

  // Nothing to compare against — the upstream detail bundle gave no peer codes
  // (or was unavailable). Render the panel with an empty state instead of a
  // table whose only column is the fund itself.
  if (peers.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
        </div>
        <p className={styles.empty}>{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.hint}>
          {hint ?? `${subject} vs benzer fonlar`}
        </span>
      </div>

      <div className={styles.headRow}>
        <span className={styles.colLabel}>Metrik</span>
        <span className={styles.subject}>{subject}</span>
        {peers.map((code) => (
          <span key={code} className={styles.peer}>
            {code}
          </span>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.metric}>{row.label}</span>
          <span className={styles.subjectValue}>{row.values[0]}</span>
          {row.values.slice(1).map((value, index) => (
            <span key={codes[index + 1]} className={styles.peerValue}>
              {value}
            </span>
          ))}
        </div>
      ))}
    </section>
  );
}
