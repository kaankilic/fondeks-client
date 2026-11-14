"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

/**
 * One-shot cookie the sign-up action drops just before redirecting, read on
 * the next client load by `SignupCompletionTracker` to fire the
 * `sign_up_completed` conversion event — the only moment where the client
 * is alive after `signUpAction` has created the account.
 */
const SIGNUP_COMPLETION_COOKIE = "fondeks_signup_completed";

import { db } from "@/db";
import { users } from "@/db/schema/auth";

import { PENDING_SIGNUP_COOKIE, verifyPendingSignup } from "./google";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { googleConsentSchema, loginSchema, registerSchema } from "./validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Echoed back so the form keeps what was typed after a failed submit. */
  values?: { name?: string; email?: string };
};

const DB_ERROR =
  "Veritabanına ulaşılamadı. DATABASE_URL ayarlı mı ve şema yüklü mü kontrol et.";

/** Generic on purpose: never reveal whether an address is registered. */
const BAD_CREDENTIALS = "E-posta veya şifre hatalı.";

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

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    // No passwordHash means this account was created through Google OAuth
    // and never set a password — the password check cannot succeed on
    // principle. Return the same generic error so an attacker cannot
    // enumerate which accounts are Google-only.
    if (
      !user ||
      !user.passwordHash ||
      !(await verifyPassword(parsed.data.password, user.passwordHash))
    ) {
      return { error: BAD_CREDENTIALS, values: { email: typedEmail } };
    }

    await createSession(user.id);
  } catch {
    return { error: DB_ERROR, values: { email: typedEmail } };
  }

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

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (existing) {
      return {
        fieldErrors: { email: ["Bu e-posta ile bir hesap zaten var."] },
        values,
      };
    }

    const consentNow = new Date();
    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        termsAcceptedAt: consentNow,
        kvkkAcknowledgedAt: consentNow,
        ageConfirmedAt: consentNow,
        marketingConsentAt: parsed.data.marketingConsent ? consentNow : null,
      })
      .returning({ id: users.id });

    await createSession(created.id);
    const jar = await cookies();
    jar.set(SIGNUP_COMPLETION_COOKIE, "password", {
      maxAge: 60,
      path: "/",
      sameSite: "lax",
    });
  } catch {
    return { error: DB_ERROR, values };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

/**
 * Completes a Google-initiated signup. The verified identity rides on the
 * HMAC-signed pending-signup cookie (set by the OAuth callback), so the
 * form can only supply the four consent fields — the user cannot
 * substitute a different email or Google account between the OAuth round
 * trip and this action.
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

  let userId: string;
  try {
    // Race guard: between the OAuth callback and this action a password
    // signup could have raced in on the same email. Check again, and stitch
    // the googleId onto that account if so — Google already verified the
    // email so linking is safe.
    const [existing] = await db
      .select({ id: users.id, googleId: users.googleId })
      .from(users)
      .where(eq(users.email, pending.email))
      .limit(1);

    if (existing) {
      if (!existing.googleId) {
        await db
          .update(users)
          .set({ googleId: pending.sub })
          .where(eq(users.id, existing.id));
      }
      userId = existing.id;
    } else {
      const consentNow = new Date();
      const [created] = await db
        .insert(users)
        .values({
          name: pending.name,
          email: pending.email,
          // No password: Google owns the credential for this account.
          passwordHash: null,
          googleId: pending.sub,
          termsAcceptedAt: consentNow,
          kvkkAcknowledgedAt: consentNow,
          ageConfirmedAt: consentNow,
          marketingConsentAt: parsed.data.marketingConsent ? consentNow : null,
        })
        .returning({ id: users.id });
      userId = created.id;
    }

    await createSession(userId);
    jar.set(SIGNUP_COMPLETION_COOKIE, "google", {
      maxAge: 60,
      path: "/",
      sameSite: "lax",
    });
    jar.delete(PENDING_SIGNUP_COOKIE);
  } catch (err) {
    console.error("[google-oauth] consent signup failed", err);
    return { error: DB_ERROR };
  }

  revalidatePath("/", "layout");
  redirect(
    pending.next && pending.next.startsWith("/") && !pending.next.startsWith("//")
      ? pending.next
      : "/",
  );
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/giris");
}

/**
 * KVKK m. 11/1-e kapsamında kullanıcının hesap silme hakkı — oturumdaki
 * kullanıcıyı siler. Oturum tablosunda FK `ON DELETE CASCADE` olduğu için
 * aktif ve geçmiş oturumlar da birlikte silinir. İşlem geri alınamaz;
 * UI tarafında ayrı bir onay akışı vardır.
 */
export async function deleteAccountAction(): Promise<void> {
  const { getCurrentUser } = await import("./session");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/giris");
  }
  try {
    await db.delete(users).where(eq(users.id, user.id));
  } catch {
    // Veritabanı erişilmezse yine de oturumu bırakmayalım — kullanıcı
    // tekrar deneyebilir; sessiz başarısızlık KVKK sürecini bozar, bu yüzden
    // hata loglanmalı. Burada minimal — gözetim bir sonraki PR'da genişler.
    throw new Error("Hesap silinirken bir hata oluştu. Lütfen daha sonra tekrar dene.");
  }
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/giris?silindi=1");
}
