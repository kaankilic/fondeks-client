import { z } from "zod";

// Normalise before validating: a pasted address often carries whitespace,
// and accounts are keyed on the lower-cased form.
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Geçerli bir e-posta adresi gir."));

export const passwordField = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(200, "Şifre çok uzun.");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Şifreni gir."),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Adın en az 2 karakter olmalı.")
    .max(80, "Ad çok uzun."),
  email: emailField,
  password: passwordField,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
