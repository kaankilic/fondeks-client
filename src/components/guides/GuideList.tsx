import Link from "next/link";

import type { Guide } from "@/lib/fondeks/types";

import styles from "./GuideList.module.scss";

function Meta({ guide }: { guide: Guide }) {
  return (
    <>
      <span className={styles.category}>{guide.category}</span>
      <span className={styles.reading}>{guide.readingMinutes} dk okuma</span>
    </>
  );
}

/** Card grid for the Rehber index. */
export function GuideGrid({ guides }: { guides: Guide[] }) {
  return (
    <div className={styles.grid}>
      {guides.map((guide) => (
        <Link
          key={guide.slug}
          href={`/rehber/${guide.slug}`}
          className={styles.card}
        >
          <div className={styles.meta}>
            <Meta guide={guide} />
          </div>
          <h2 className={styles.title}>{guide.title}</h2>
          <p className={styles.summary}>{guide.summary}</p>
        </Link>
      ))}
    </div>
  );
}

/** Compact "latest from the guide" widget for the discovery screen. */
export function GuidePanel({ guides }: { guides: Guide[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.panelTitle}>Rehber</span>
        <Link href="/rehber" className={styles.all}>
          Tümü →
        </Link>
      </div>

      {guides.map((guide) => (
        <Link
          key={guide.slug}
          href={`/rehber/${guide.slug}`}
          className={styles.item}
        >
          <div className={styles.itemMeta}>
            <Meta guide={guide} />
          </div>
          <div className={styles.itemTitle}>{guide.title}</div>
          <p className={styles.itemSummary}>{guide.summary}</p>
        </Link>
      ))}
    </section>
  );
}
