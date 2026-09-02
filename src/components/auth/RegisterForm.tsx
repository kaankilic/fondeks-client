"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

import { FieldError } from "./LoginForm";
import styles from "./LoginForm.module.scss";

const EMPTY: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUpAction, EMPTY);

  return (
    <form className={styles.form} action={formAction}>
      <h1 className={styles.title}>Ücretsiz hesap oluştur</h1>
      <p className={styles.subtitle}>
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className={styles.link}>
          Giriş yap
        </Link>
      </p>

      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}

      <label className={styles.label} htmlFor="name">
        Ad Soyad
      </label>
      <input
        id="name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        aria-invalid={Boolean(state.fieldErrors?.name)}
        className={styles.input}
        placeholder="Adın ve soyadın"
      />
      <FieldError messages={state.fieldErrors?.name} />

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

      <label className={styles.label} htmlFor="password">
        Şifre
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(state.fieldErrors?.password)}
        className={`${styles.input} ${styles.password}`}
        placeholder="En az 8 karakter"
      />
      <FieldError messages={state.fieldErrors?.password} />

      <div className={styles.submit}>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
        </Button>
      </div>
    </form>
  );
}
