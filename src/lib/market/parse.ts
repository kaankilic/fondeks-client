import "server-only";

import { FUND_CATEGORIES, type FundCategory } from "@/lib/fondeks/constants";

/**
 * Tolerant parsing for upstream payloads. The feed mixes Turkish-formatted
 * numbers, several date shapes and both SCREAMING and camelCase field names,
 * so values are read by candidate key rather than by a single fixed name.
 */

export type RawRow = Record<string, unknown>;

/** First present, non-empty value among the candidate keys. */
export function pick(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * Accepts 1234.56, "1234.56", "1.234,56" and "%1,91".
 * Turkish thousands separators are dots, decimals are commas.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[%\s ]/g, "").trim();
  if (!cleaned) return null;

  // A trailing comma group is a decimal, however many digits follow it: the
  // feed publishes fee rates to nine places.
  const turkish = /,\d+$/.test(cleaned);
  const normalised = turkish
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");

  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toInteger(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

/** Accepts epoch millis, "dd.mm.yyyy", "yyyy-mm-dd" and ISO timestamps. */
export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const turkish = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(text);
  if (turkish) return `${turkish[3]}-${turkish[2]}-${turkish[1]}`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  if (/^\d+$/.test(text)) return toIsoDate(Number(text));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

export function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;

  const text = value.trim().toLocaleLowerCase("tr");
  if (["e", "evet", "true", "1", "y", "yes"].includes(text)) return true;
  if (["h", "hayır", "hayir", "false", "0", "n", "no"].includes(text)) {
    return false;
  }
  return null;
}

/** Settlement text such as "T+1" or "1 gün". */
export function toValueDays(value: unknown): number | null {
  if (typeof value === "number") return Math.round(value);
  if (typeof value !== "string") return null;

  const match = /(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

const CATEGORY_KEYWORDS: [RegExp, FundCategory][] = [
  [/hisse/i, "Hisse Senedi"],
  [/kıymetli|kiymetli|altın|altin|maden/i, "Kıymetli Maden"],
  [/serbest/i, "Serbest"],
  [/değişken|degisken/i, "Değişken"],
  [/para piyasası|para piyasasi|likit/i, "Para Piyasası"],
  [/borçlanma|borclanma|tahvil|bono/i, "Borçlanma"],
];

/**
 * Maps the source's fund-type text onto the categories the product shows.
 * Unmapped types fall back to "Değişken", the broadest mixed-asset bucket.
 */
export function toCategory(value: unknown): FundCategory {
  const text = typeof value === "string" ? value : "";

  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }

  const exact = FUND_CATEGORIES.find(
    (category) => category.toLocaleLowerCase("tr") === text.toLocaleLowerCase("tr"),
  );

  return exact ?? "Değişken";
}
