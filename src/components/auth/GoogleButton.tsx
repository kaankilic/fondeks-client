"use client";

import { useAnalytics } from "@/lib/analytics/useAnalytics";

import styles from "./GoogleButton.module.scss";

/**
 * "Google ile devam et" — leads both the sign-in and sign-up forms. The
 * button posts to `/api/auth/google/start`, which generates state + PKCE
 * and redirects to Google. On a brand-new account the callback funnels
 * the user into the consent screen before the account is created, so KVKK
 * / terms / age consents stay captured even when signup is one click.
 *
 * Rendered as a <form> so the browser handles the top-level navigation and
 * the button inherits the surrounding auth-form's submit button rhythm.
 */
export function GoogleButton({
  next,
  intent,
}: {
  next?: string;
  /** "signin" or "signup" — only used for the analytics event. */
  intent: "signin" | "signup";
}) {
  const { track } = useAnalytics();

  return (
    <form
      method="get"
      action="/api/auth/google/start"
      className={styles.wrap}
      onSubmit={() =>
        track("auth_cta_click", { target: "google", location: intent })
      }
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button type="submit" className={styles.button}>
        <GoogleMark />
        <span>
          {intent === "signup" ? "Google ile devam et" : "Google ile giriş yap"}
        </span>
      </button>
      <div className={styles.divider} role="presentation">
        <span>veya</span>
      </div>
    </form>
  );
}

/**
 * Google's current four-colour "G" mark, drawn inline so the button stays
 * dependency-free. Matches the brand guidelines' required proportions.
 */
function GoogleMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden
      className={styles.mark}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l8 6.2C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.2 5.3-4.7 7v5.8h7.6c4.4-4.1 6.9-10.1 6.9-17.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5v-5.8H2.6C.9 16.9 0 20.3 0 24s.9 7.1 2.6 10.3l8-5.8z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.6-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.2 0-11.5-4.1-13.4-9.8l-8 5.8C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
