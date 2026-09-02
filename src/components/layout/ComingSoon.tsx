import Link from "next/link";

import styles from "./ComingSoon.module.scss";

/**
 * Placeholder for the nav destinations that have no artboard yet, so the
 * navigation never dead-ends on a 404.
 */
export function ComingSoon({ screen }: { screen: string }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{screen} yakında</h2>
      <p className={styles.body}>
        Bu ekranın tasarımı henüz hazır değil. Şu an için Keşfet, Piyasa Özeti ve
        fon detay ekranları kullanılabilir.
      </p>
      <Link href="/" className={styles.link}>
        Keşfet&apos;e dön →
      </Link>
    </section>
  );
}
