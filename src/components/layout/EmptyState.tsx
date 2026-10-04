import styles from "./EmptyState.module.scss";

/**
 * A neutral "nothing here yet" panel for screens whose data source is not wired
 * up yet — honest about the gap rather than rendering a blank region.
 */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </section>
  );
}
