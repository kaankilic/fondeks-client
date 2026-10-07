"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { scorePassword } from "@/lib/auth/password-strength";
import { Button } from "@/components/ui/Button";
import { useEvents } from "@/lib/analytics/useEvents";

import { FieldError } from "./LoginForm";
import styles from "./LoginForm.module.scss";

const EMPTY: AuthFormState = {};

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, EMPTY);
  const { track } = useEvents();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  // Only flag a mismatch once the second field has something in it, so the
  // hint doesn't fire while the user is still typing the confirmation.
  const mismatch = confirm.length > 0 && confirm !== password;

  // Success redirects and unmounts this form, so only failures surface as new
  // state; the completed sign-up is captured by `identify` on the next page.
  useEffect(() => {
    if (state.error || state.fieldErrors) {
      track("signup_failed", { reason: state.error ?? "validation" });
    }
  }, [state, track]);

  return (
    <form
      className={styles.form}
      action={formAction}
      onSubmit={() => track("signup_submitted", { method: "password" })}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <h1 className={styles.title}>Ücretsiz hesap oluştur</h1>
      <p className={styles.subtitle}>
        Zaten hesabın var mı?{" "}
        <Link
          href={next ? `/giris?next=${encodeURIComponent(next)}` : "/giris"}
          className={styles.link}
          onClick={() =>
            track("auth_cta_click", {
              target: "login",
              location: "signup_form",
            })
          }
        >
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
      <div className={styles.inputWrap}>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby="password-strength"
          className={`${styles.input} ${styles.password} ${styles.withToggle}`}
          placeholder="En az 8 karakter"
        />
        <RevealButton
          shown={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
      </div>

      {password ? (
        <div className={styles.strength} id="password-strength">
          <div className={styles.meter} data-score={strength.score}>
            {[1, 2, 3, 4].map((seg) => (
              <span
                key={seg}
                className={`${styles.segment} ${
                  seg <= strength.score ? styles.segmentOn : ""
                }`}
              />
            ))}
          </div>
          <span className={styles.strengthLabel} aria-live="polite">
            {strength.label}
          </span>
        </div>
      ) : (
        <div className={styles.spacer} />
      )}
      <FieldError messages={state.fieldErrors?.password} />

      <label className={styles.label} htmlFor="confirmPassword">
        Şifre tekrar
      </label>
      <div className={styles.inputWrap}>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || Boolean(state.fieldErrors?.confirmPassword)}
          className={`${styles.input} ${styles.password} ${styles.withToggle}`}
          placeholder="Şifreni yeniden gir"
        />
        <RevealButton
          shown={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
        />
      </div>
      {mismatch ? (
        <p className={styles.fieldError} role="alert">
          Şifreler eşleşmiyor.
        </p>
      ) : (
        <FieldError messages={state.fieldErrors?.confirmPassword} />
      )}

      <div className={styles.submit}>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
        </Button>
      </div>
    </form>
  );
}

function RevealButton({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.reveal}
      onClick={onToggle}
      aria-pressed={shown}
      aria-label={shown ? "Şifreyi gizle" : "Şifreyi göster"}
      title={shown ? "Şifreyi gizle" : "Şifreyi göster"}
      tabIndex={-1}
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4M6.2 6.2A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 3.6-.7M9.9 9.9a3 3 0 0 0 4.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
