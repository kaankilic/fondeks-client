import type { ReactNode } from "react";

import styles from "./Shell.module.scss";

export function Page({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}

/** Screen-level header strip that sits directly under the top nav. */
export function SubHeader({
  leading,
  title,
  subtitle,
  children,
}: {
  /** Rendered in place of the title block — e.g. the screener's search box. */
  leading?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.subheader}>
      {leading}
      {title ? (
        <div>
          <div className={styles.title}>{title}</div>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        </div>
      ) : null}
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

export function MarketStatus({ open }: { open: boolean }) {
  return (
    <span className={styles.status}>
      <span className={styles.statusDot} aria-hidden />
      {open ? "Piyasa Açık" : "Piyasa Kapalı"}
    </span>
  );
}
