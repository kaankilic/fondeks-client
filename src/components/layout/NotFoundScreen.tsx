import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";

import styles from "./NotFoundScreen.module.scss";

const SUGGESTIONS = [
  { href: "/", label: "Keşfet" },
  { href: "/piyasa-ozeti", label: "Piyasa Özeti" },
  { href: "/arama", label: "Fon Ara" },
  { href: "/rehber", label: "Rehber" },
] as const;

/** Shared 404 body, in the app's surface language. */
export function NotFoundScreen() {
  return (
    <div className={styles.screen}>
      <span className={styles.code}>404</span>

      <h1 className={styles.title}>Bu sayfa bulunamadı</h1>
      <p className={styles.body}>
        Aradığın sayfa taşınmış, kaldırılmış ya da adresi yanlış yazılmış
        olabilir. Fon kodunu biliyorsan üstteki aramadan hızlıca ulaşabilirsin.
      </p>

      <div className={styles.actions}>
        <Link href="/" className={buttonClass({ variant: "brand" })}>
          Keşfet&apos;e dön
        </Link>
        <Link href="/arama" className={buttonClass({ variant: "secondary" })}>
          Fon ara
        </Link>
      </div>

      <nav className={styles.links} aria-label="Öneriler">
        {SUGGESTIONS.map((item) => (
          <Link key={item.href} href={item.href} className={styles.link}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
