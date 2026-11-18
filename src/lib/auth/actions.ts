"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * One-shot cookie the sign-up action drops just before redirecting, read on
 * the next client load by `SignupCompletionTracker` to fire the
 * `sign_up_completed` conversion event — the only moment where the client
 * is alive after `signUpAction` has created the account.
 */
const SIGNUP_COMPLETION_COOKIE = "fondeks_signup_completed";

import { PENDING_SIGNUP_COOKIE, verifyPendingSignup } from "./google";
import { destroySession, setSessionCookie } from "./session";
import { googleConsentSchema, loginSchema, registerSchema } from "./validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Echoed back so the form keeps what was typed after a failed submit. */
  values?: { name?: string; email?: string };
};

const NETWORK_ERROR =
  "Sunucuya ulaşılamadı. Lütfen birkaç saniye sonra tekrar dene.";

/** Generic on purpose: never reveal whether an address is registered. */
const BAD_CREDENTIALS = "E-posta veya şifre hatalı.";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "https://api.fondeks.com").replace(
    /\/$/,
    "",
  );
}

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string | null };
};

/**
 * Where to land after auth. Only in-app absolute paths are honoured, so a
 * crafted `next` can't bounce the user to another origin once signed in.
 */
function safeNext(formData: FormData): string {
  const next = formData.get("next");
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? next
    : "/";
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const typedEmail = String(formData.get("email") ?? "");

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: { email: typedEmail },
    };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: parsed.data.email,
        password: parsed.data.password,
        device_name: "web",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[auth] POST /login failed", err);
    return { error: NETWORK_ERROR, values: { email: typedEmail } };
  }

  if (response.status === 401) {
    return { error: BAD_CREDENTIALS, values: { email: typedEmail } };
  }
  if (!response.ok) {
    console.error(
      `[auth] POST /login returned ${response.status}`,
      await response.text().catch(() => ""),
    );
    return { error: NETWORK_ERROR, values: { email: typedEmail } };
  }

  const data = (await response.json()) as LoginResponse;
  await setSessionCookie(data.token);

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = registerSchema.safeParse({
    ...values,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    termsAccepted: formData.get("termsAccepted") ?? undefined,
    kvkkAcknowledged: formData.get("kvkkAcknowledged") ?? undefined,
    ageConfirmed: formData.get("ageConfirmed") ?? undefined,
    marketingConsent: formData.get("marketingConsent") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        terms_accepted: true,
        kvkk_acknowledged: true,
        age_confirmed: true,
        marketing_consent: parsed.data.marketingConsent,
        device_name: "web",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[auth] POST /register failed", err);
    return { error: NETWORK_ERROR, values };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    // The backend returns 400 with an error message for invalid input or
    // duplicate email. Surface the message under the email field when it
    // looks address-related, otherwise as a top-level error.
    if (response.status === 400 && body?.error) {
      const message = body.error;
      if (/e-?posta|email/i.test(message)) {
        return { fieldErrors: { email: [message] }, values };
      }
      return { error: message, values };
    }

    console.error(
      `[auth] POST /register returned ${response.status}`,
      body?.error ?? "",
    );
    return { error: NETWORK_ERROR, values };
  }

  const data = (await response.json()) as LoginResponse;
  await setSessionCookie(data.token);

  const jar = await cookies();
  jar.set(SIGNUP_COMPLETION_COOKIE, "password", {
    maxAge: 60,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

/**
 * Completes a Google-initiated signup. The raw Google ID token rides on the
 * HMAC-signed pending-signup cookie (set by the OAuth callback) so this
 * action can resubmit it to `/auth/google` with the three required consent
 * flags — that call is what actually creates the account server-side and
 * hands back a Sanctum token.
 */
export async function completeGoogleSignupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const jar = await cookies();
  const pending = verifyPendingSignup(jar.get(PENDING_SIGNUP_COOKIE)?.value);

  if (!pending) {
    // Cookie missing, tampered with, or past its 15-minute window — the
    // user has to restart the Google flow. The form itself cannot recover.
    redirect("/kayit?hata=oturum_dustu");
  }

  const parsed = googleConsentSchema.safeParse({
    termsAccepted: formData.get("termsAccepted") ?? undefined,
    kvkkAcknowledged: formData.get("kvkkAcknowledged") ?? undefined,
    ageConfirmed: formData.get("ageConfirmed") ?? undefined,
    marketingConsent: formData.get("marketingConsent") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id_token: pending.idToken,
        terms_accepted: true,
        kvkk_acknowledged: true,
        age_confirmed: true,
        marketing_consent: parsed.data.marketingConsent,
        device_name: "web",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[auth] POST /auth/google (consent) failed", err);
    return {
      error:
        "Hesap oluşturulamadı. Lütfen birkaç saniye sonra tekrar dene.",
    };
  }

  if (!response.ok) {
    console.error(
      `[auth] POST /auth/google (consent) returned ${response.status}`,
      await response.text().catch(() => ""),
    );
    return {
      error:
        "Hesap oluşturulamadı. Lütfen birkaç saniye sonra tekrar dene.",
    };
  }

  const data = (await response.json()) as LoginResponse & {
    is_new_user?: boolean;
  };
  await setSessionCookie(data.token);

  // SignupCompletionTracker reads this one-shot cookie on the next page
  // load and fires the `sign_up_completed` conversion.
  jar.set(SIGNUP_COMPLETION_COOKIE, "google", {
    maxAge: 60,
    path: "/",
    sameSite: "lax",
  });
  jar.delete(PENDING_SIGNUP_COOKIE);

  revalidatePath("/", "layout");
  redirect(pending.next && pending.next.startsWith("/") ? pending.next : "/");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/giris");
}

/**
 * KVKK m. 11/1-e kapsamında kullanıcının hesap silme hakkı. Hesap silme
 * backend tarafında henüz endpoint olarak çıkmadığı için şu an oturumu
 * kapatıp kullanıcıyı silme bildirim ekranına yolluyoruz; backend DELETE
 * /user/me eklendiğinde burası onu çağırıp sonucu bekler.
 */
export async function deleteAccountAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/giris?silindi=1");
}
