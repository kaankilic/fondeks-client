/**
 * Analitik olaylara yollanmadan önce arama metni gibi serbest kullanıcı
 * girdilerini temizler. KVKK veri minimizasyonu (m. 4/2-ç) gereği olası
 * PII değerler (T.C. kimlik, telefon, e-posta) tespit edilip reddedilir.
 * Diğer ifadeler max 32 karaktere kısaltılır ve yalnız alfasayısal + boşluk +
 * birkaç nötr noktalama bırakılır.
 */

const TCKN_PATTERN = /\b\d{11}\b/;
const PHONE_PATTERN = /(?:\+?90[\s-]?)?0?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const MAX_LEN = 32;

export type SanitizedQuery =
  | { ok: true; value: string }
  | { ok: false; reason: "pii" | "empty" | "too_long" };

export function sanitizeSearchQuery(input: string): SanitizedQuery {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  if (
    TCKN_PATTERN.test(trimmed) ||
    PHONE_PATTERN.test(trimmed) ||
    EMAIL_PATTERN.test(trimmed)
  ) {
    return { ok: false, reason: "pii" };
  }

  // Yalnız harf / rakam / boşluk / tire / nokta. Diğer karakterler düşer.
  const clean = trimmed
    .replace(/[^\p{L}\p{N}\s.\-_]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return { ok: false, reason: "empty" };
  if (clean.length > MAX_LEN) {
    return { ok: true, value: clean.slice(0, MAX_LEN) };
  }

  return { ok: true, value: clean };
}
