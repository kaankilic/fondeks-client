import type { CompareRow } from "@/lib/fondeks/types";

import styles from "./CompareTable.module.scss";

export function CompareTable({
  codes,
  rows,
}: {
  codes: string[];
  rows: CompareRow[];
}) {
  const [subject, ...peers] = codes;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Kıyaslama</span>
        <span className={styles.hint}>{subject} vs benzer fonlar</span>
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
