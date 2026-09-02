/**
 * Fund URLs read as `AFT-ak-portfoy-teknoloji-yabanci-hisse-fonu`: the TEFAS
 * code stays upper-case and addressable, the name is there for humans and
 * search engines.
 */

const TURKISH_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
};

export function slugify(text: string): string {
  return text
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (char) => TURKISH_MAP[char] ?? char)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fundSlug(code: string, name: string): string {
  return `${code.toUpperCase()}-${slugify(name)}`;
}

/** The code is everything before the first dash, so old `/fon/AFT` links work. */
export function codeFromSlug(slug: string): string {
  return decodeURIComponent(slug).split("-")[0].toUpperCase();
}
