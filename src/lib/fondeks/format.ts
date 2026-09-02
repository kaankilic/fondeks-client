/**
 * Turkish number formatting, matching the design canvas exactly:
 * comma decimal separator, explicit sign on percentages, tabular mono.
 */

const tr = (options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("tr-TR", options);

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2).replace(".", ",")}%`;
}

/** Percentage written the Turkish way, with the sign in front: "%62,0". */
export function formatPercentPrefixed(value: number, digits = 1): string {
  return `%${value.toFixed(digits).replace(".", ",")}`;
}

export function formatPrice(value: number): string {
  return value.toFixed(6).replace(".", ",");
}

/** Daily change with its direction arrow, e.g. "▲ +2,45%". */
export function formatDaily(value: number): string {
  return `${value >= 0 ? "▲ " : "▼ "}${formatPercent(value)}`;
}

export function formatIndexChange(value: number): string {
  const abs = Math.abs(value).toFixed(2).replace(".", ",");
  return `${value >= 0 ? "▲ +" : "▼ "}${abs}%`;
}

const BILLION = 1_000_000_000;
const MILLION = 1_000_000;

/** Assets under management in Turkish short scale: "4,28 Mlr", "842 Mn". */
export function formatAum(value: number): string {
  if (value >= BILLION) {
    return `${tr({ maximumFractionDigits: 2 }).format(value / BILLION)} Mlr`;
  }
  if (value >= MILLION) {
    return `${tr({ maximumFractionDigits: 0 }).format(value / MILLION)} Mn`;
  }
  return tr({ maximumFractionDigits: 0 }).format(value);
}

export function formatCount(value: number): string {
  return tr().format(value);
}

/**
 * Index values carry their own precision, and some are written with a leading
 * percent sign ("%46,25") — `pattern` places the formatted number at "%v".
 */
export function formatIndexValue(
  value: number,
  decimals = 2,
  pattern?: string | null,
) {
  const formatted = tr({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return pattern ? pattern.replace("%v", formatted) : formatted;
}

/** Position weight change, in percentage points: "+1,8 puan". */
export function formatPoints(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")} puan`;
}

export type Direction = "pos" | "neg";

export function direction(value: number): Direction {
  return value >= 0 ? "pos" : "neg";
}

const relative = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });

/** "2 sa önce", "dün", "3 gün önce" — for news timestamps. */
export function formatRelativeTime(value: Date, now = new Date()): string {
  const minutes = Math.round((value.getTime() - now.getTime()) / 60000);

  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");

  return relative.format(Math.round(hours / 24), "day");
}

/** Short Turkish date, e.g. "6 Tem 2026". */
export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}
