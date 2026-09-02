import { formatRelativeTime } from "@/lib/fondeks/format";
import type { NewsItem } from "@/lib/fondeks/types";

import styles from "./NewsPanel.module.scss";

/**
 * Market news and KAP filings share one presentation: the difference is the
 * ticker badge and whether summaries are shown.
 */
export function NewsPanel({
  title,
  hint,
  items,
  compact = false,
  showSummary = true,
}: {
  title: string;
  hint?: string;
  items: NewsItem[];
  compact?: boolean;
  showSummary?: boolean;
}) {
  return (
    <section className={`${styles.panel} ${compact ? styles.compact : ""}`}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Şu an gösterilecek başlık yok.</p>
      ) : (
        items.map((item) => {
          const body = (
            <>
              <div className={styles.meta}>
                {item.symbol ? (
                  <span className={styles.symbol}>{item.symbol}</span>
                ) : null}
                {item.publisher ? (
                  <span className={styles.publisher}>{item.publisher}</span>
                ) : null}
                <time
                  className={styles.time}
                  dateTime={item.publishedAt.toISOString()}
                >
                  {formatRelativeTime(item.publishedAt)}
                </time>
              </div>

              <div className={styles.headline}>{item.title}</div>

              {showSummary && item.summary ? (
                <p className={styles.summary}>{item.summary}</p>
              ) : null}
            </>
          );

          return item.url ? (
            <a
              key={item.id}
              href={item.url}
              className={styles.item}
              target="_blank"
              rel="noreferrer"
            >
              {body}
            </a>
          ) : (
            <article key={item.id} className={styles.item}>
              {body}
            </article>
          );
        })
      )}
    </section>
  );
}
