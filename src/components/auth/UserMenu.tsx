"use client";

import Link from "next/link";

import { signOutAction } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui/Button";
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
  if (!user) {
    return (
      <div className={styles.authActions}>
        <Link
          href="/giris"
          className={buttonClass({ variant: "secondary" })}
        >
          Giriş Yap
        </Link>
        <Link href="/kayit" className={buttonClass({ variant: "brand" })}>
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
        <form action={signOutAction}>
          <button type="submit" className={styles.signOut}>
            Çıkış yap
          </button>
        </form>
      </div>
    </details>
  );
}
