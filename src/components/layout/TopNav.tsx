"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/components/auth/UserMenu";
import { useSession } from "@/lib/auth/useSession";

import { Logo } from "./Logo";
import { NavCenter, type NavItem } from "./NavCenter";
import styles from "./TopNav.module.scss";

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Keşfet", match: ["/", "/arama", "/fon"] },
  { href: "/emeklilik-fonlari", label: "Emeklilik Fonları" },
  { href: "/borsa-yatirim-fonlari", label: "Borsa Yatırım Fonları" },
  { href: "/piyasa-ozeti", label: "Piyasa Özeti" },
  { href: "/izleme", label: "İzleme Listem" },
  { href: "/rehber", label: "Rehber" },
];

/**
 * Session is resolved on the client via `useSession` so the server render
 * path stays stateless and the page can be edge-cached. UserMenu accepts
 * the loading state and renders a neutral placeholder while the handshake
 * is in flight, so the nav never flashes "signed out" to a signed-in user.
 */
export function TopNav() {
  const pathname = usePathname();
  const session = useSession();

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <Logo className={styles.logo} size={28} />
          <span className={styles.wordmark}>Fondeks</span>
        </Link>

        {/* Keyed by route: navigating collapses an open search. */}
        <NavCenter key={pathname} items={NAV_ITEMS} pathname={pathname} />

        <UserMenu session={session} />
      </div>
    </header>
  );
}
