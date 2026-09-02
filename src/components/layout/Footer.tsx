import Link from "next/link";

import styles from "./Footer.module.scss";

const LEGAL_LINKS = [
  { href: "/gizlilik", label: "Gizlilik Sözleşmesi" },
  { href: "/kvkk", label: "KVKK" },
  { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
] as const;

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.notice}>
          <svg
            className={styles.noticeIcon}
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <circle
              cx="8"
              cy="8"
              r="6.75"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M8 7.1v4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
          </svg>
          <p className={styles.disclaimer}>
            Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım
            danışmanlığı kapsamında değildir.
          </p>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} Fondeks. Tüm hakları saklıdır.
          </span>

          <nav className={styles.links} aria-label="Yasal bilgiler">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
