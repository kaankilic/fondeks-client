"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/components/auth/UserMenu";
import type { SessionUser } from "@/lib/auth/session";

import { NavCenter, type NavItem } from "./NavCenter";
import styles from "./TopNav.module.scss";

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Keşfet", match: ["/", "/arama", "/fon"] },
  { href: "/piyasa-ozeti", label: "Piyasa Özeti" },
  { href: "/izleme", label: "İzleme Listem" },
  { href: "/rehber", label: "Rehber" },
];

export function TopNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            F
          </span>
          <span className={styles.wordmark}>Fondeks</span>
        </Link>

        {/* Keyed by route: navigating collapses an open search. */}
        <NavCenter key={pathname} items={NAV_ITEMS} pathname={pathname} />

        <UserMenu user={user} />
      </div>
    </header>
  );
}
