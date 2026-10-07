"use client";

import Link from "next/link";

import { signOutAction } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui/Button";
import { useEvents } from "@/lib/analytics/useEvents";
import type { SessionUser } from "@/lib/auth/session";

import styles from "./SessionMenu.module.scss";

function initialsOf(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("tr");
}

/**
 * Right-hand side of the top navigation: the signed-in user's avatar, or the
 * two entry points for visitors who have no account yet.
 */
export function UserMenu({ user }: { user: SessionUser | null }) {
  const { track } = useEvents();

  if (!user) {
    return (
      <div className={styles.authActions}>
        <Link
          href="/giris"
          className={buttonClass({ variant: "secondary" })}
          onClick={() =>
            track("auth_cta_click", { target: "login", location: "nav" })
          }
        >
          Giriş Yap
        </Link>
        <Link
          href="/kayit"
          className={buttonClass({ variant: "brand" })}
          onClick={() =>
            track("auth_cta_click", { target: "signup", location: "nav" })
          }
        >
          Kayıt Ol
        </Link>
      </div>
    );
  }

  return (
    <details className={styles.menu}>
      <summary className={styles.avatar} title={user.email}>
        {initialsOf(user.name, user.email)}
      </summary>
      <div className={styles.dropdown}>
        {user.name ? <div className={styles.name}>{user.name}</div> : null}
        <div className={styles.email}>{user.email}</div>
        <form
          action={signOutAction}
          onSubmit={() => track("logout_clicked", {})}
        >
          <button type="submit" className={styles.signOut}>
            Çıkış yap
          </button>
        </form>
      </div>
    </details>
  );
}
