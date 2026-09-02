"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

import styles from "./LoginForm.module.scss";

const EMPTY: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, EMPTY);

  return (
    <form className={styles.form} action={formAction}>
      <h1 className={styles.title}>Hesabına giriş yap</h1>
      <p className={styles.subtitle}>
        Hesabın yok mu?{" "}
        <Link href="/kayit" className={styles.link}>
          Ücretsiz kaydol
        </Link>
      </p>

      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}

      <label className={styles.label} htmlFor="email">
        E-posta
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        aria-invalid={Boolean(state.fieldErrors?.email)}
        className={styles.input}
        placeholder="ornek@eposta.com"
      />
      <FieldError messages={state.fieldErrors?.email} />

      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor="password">
          Şifre
        </label>
        <span className={styles.muted}>Şifre sıfırlama yakında</span>
      </div>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        aria-invalid={Boolean(state.fieldErrors?.password)}
        className={`${styles.input} ${styles.password}`}
        placeholder="••••••••••"
      />
      <FieldError messages={state.fieldErrors?.password} />

      <div className={styles.submit}>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </div>

      <div className={styles.divider}>
        <span>veya</span>
      </div>

      <div className={styles.social}>
        <span className={styles.soon}>Çok Yakında</span>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          block
          disabled
          aria-disabled
          title="Google ile giriş çok yakında"
        >
          <span className={styles.googleMark} aria-hidden />
          Google ile devam et
        </Button>
      </div>
    </form>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return <div className={styles.spacer} />;

  return (
    <p className={styles.fieldError} role="alert">
      {messages[0]}
    </p>
  );
}
