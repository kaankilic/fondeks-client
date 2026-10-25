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

/**
 * Zorunlu bir onay kutusu için şema parçası — işaretli değilse netleşen hata
 * mesajı döner. `z.literal(true)` kutunun **ön-işaretli olmaması** şartını
 * karşılar: formda gelen değer "true" string'i değil, boolean true olmalıdır.
 */
const requiredConsent = (message: string) =>
  z
    .union([z.literal("on"), z.literal(true)])
    .transform(() => true)
    .refine((value) => value === true, { message });

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Adın en az 2 karakter olmalı.")
      .max(80, "Ad çok uzun."),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Şifreni tekrar gir."),
    termsAccepted: requiredConsent("Kullanım Şartları'nı kabul etmelisin."),
    kvkkAcknowledged: requiredConsent(
      "KVKK Aydınlatma Metni'ni okuduğunu onaylamalısın.",
    ),
    ageConfirmed: requiredConsent(
      "Hesap oluşturmak için 18 yaşından büyük olmalısın.",
    ),
    marketingConsent: z
      .union([z.literal("on"), z.literal(true), z.undefined()])
      .transform((value) => value === "on" || value === true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
