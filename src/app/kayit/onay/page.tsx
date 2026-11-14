import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleSignupConsentForm } from "@/components/auth/GoogleSignupConsentForm";
import { PENDING_SIGNUP_COOKIE, verifyPendingSignup } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesap onayı",
  robots: { index: false, follow: false },
};

/**
 * Consent gate after a Google sign-in for a brand-new account. The Google
 * callback drops an HMAC-signed `fondeks_pending_signup` cookie with the
 * verified identity; this screen shows name + email (read-only), captures
 * the three required consents (Terms, KVKK, age 18+) plus the optional
 * marketing consent, and only then inserts the user row.
 *
 * The identity cannot be edited: it travels in the signed cookie, not the
 * form, so a tampered submission fails the HMAC check in the action.
 */
export default async function GoogleSignupConsentPage() {
  const raw = (await cookies()).get(PENDING_SIGNUP_COOKIE)?.value;
  const pending = verifyPendingSignup(raw);

  // No valid pending signup → the user either landed here directly, or the
  // 15-minute window expired. Send them back to the start, where they can
  // begin the Google flow again.
  if (!pending) {
    redirect("/kayit");
  }

  return (
    <AuthShell>
      <GoogleSignupConsentForm
        email={pending.email}
        name={pending.name}
      />
    </AuthShell>
  );
}
