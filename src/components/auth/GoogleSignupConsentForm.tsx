"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/lib/analytics/useAnalytics";
import {
  completeGoogleSignupAction,
  type AuthFormState,
} from "@/lib/auth/actions";

import { FieldError } from "./LoginForm";
import styles from "./LoginForm.module.scss";

const EMPTY: AuthFormState = {};

/**
 * Consent step shown after a Google sign-in for a brand-new account. Name
 * and email are read straight off the signed pending-signup cookie (not
 * these inputs) so the form shows them as read-only; the three required
 * checkboxes and the optional marketing consent are what we collect here.
 */
export function GoogleSignupConsentForm({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeGoogleSignupAction,
    EMPTY,
  );
  const { track } = useAnalytics();

  useEffect(() => {
    if (state.error || state.fieldErrors) {
      track("signup_failed", {
        reason: state.error ?? "validation",
      });
    }
  }, [state, track]);

  return (
    <form
      className={styles.form}
      action={formAction}
      onSubmit={() => track("signup_submitted", { method: "google" })}
    >
      <h1 className={styles.title}>Son adım</h1>
      <p className={styles.subtitle}>
        Google hesabınla devam ediyorsun. Hesabını açmadan önce üç onay gerekli.
      </p>

      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}

      <label className={styles.label}>Ad Soyad</label>
      <input
        className={styles.input}
        value={name ?? "—"}
        readOnly
        aria-readonly
      />

      <label className={styles.label}>E-posta</label>
      <input
        className={styles.input}
        value={email}
        readOnly
        aria-readonly
      />

      <fieldset className={styles.consentGroup}>
        <legend className={styles.consentLegend}>Onaylar</legend>

        <label className={styles.consent}>
          <input
            type="checkbox"
            name="termsAccepted"
            aria-invalid={Boolean(state.fieldErrors?.termsAccepted)}
          />
          <span>
            <Link href="/kullanim-sartlari" className={styles.link} target="_blank">
              Kullanım Şartları
            </Link>
            'nı okudum ve kabul ediyorum.
          </span>
        </label>
        <FieldError messages={state.fieldErrors?.termsAccepted} />

        <label className={styles.consent}>
          <input
            type="checkbox"
            name="kvkkAcknowledged"
            aria-invalid={Boolean(state.fieldErrors?.kvkkAcknowledged)}
          />
          <span>
            <Link href="/kvkk" className={styles.link} target="_blank">
              KVKK Aydınlatma Metni
            </Link>
            'ni okuduğumu onaylıyorum.
          </span>
        </label>
        <FieldError messages={state.fieldErrors?.kvkkAcknowledged} />

        <label className={styles.consent}>
          <input
            type="checkbox"
            name="ageConfirmed"
            aria-invalid={Boolean(state.fieldErrors?.ageConfirmed)}
          />
          <span>18 yaşından büyük olduğumu beyan ederim.</span>
        </label>
        <FieldError messages={state.fieldErrors?.ageConfirmed} />

        <label className={styles.consent}>
          <input type="checkbox" name="marketingConsent" />
          <span className={styles.consentOptional}>
            Fondeks'ten ürün ve kampanya duyurularını e-posta ile almak
            istiyorum. (İsteğe bağlı — istediğin an iptal edebilirsin.)
          </span>
        </label>
      </fieldset>

      <div className={styles.submit}>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Hesap oluşturuluyor…" : "Hesabı oluştur"}
        </Button>
      </div>
    </form>
  );
}
