"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/auth";

import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { loginSchema, registerSchema } from "./validation";

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

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return { error: BAD_CREDENTIALS, values: { email: typedEmail } };
    }

    await createSession(user.id);
  } catch {
    return { error: DB_ERROR, values: { email: typedEmail } };
  }

  revalidatePath("/", "layout");
  redirect("/");
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

    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      })
      .returning({ id: users.id });

    await createSession(created.id);
  } catch {
    return { error: DB_ERROR, values };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/giris");
}
