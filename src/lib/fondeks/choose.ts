/**
 * The Choose wedge: pure helpers that turn the raw figures a fund carries into
 * the honest decision signals v2.1 leads with — where a fund stands in its
 * category, what it returns after the holder pays stopaj, and a plain-Turkish
 * verdict that refuses to let a good day hide a bad year.
 *
 * Everything here is a derivation over data the client already has, or a
 * read of a backend-computed field with an explicit fallback: nothing is
 * invented. Client-safe (no server-only imports), so both server components
 * and the compare board use it.
 */

import { formatPercent } from "./format";
import type { Fund, PricePoint, ReturnWindow } from "./types";

/** The windows a return is shown for, in reading order, with their labels. */
export const RETURN_WINDOWS: { key: ReturnWindow; label: string }[] = [
  { key: "y1", label: "1 Yıl" },
  { key: "m3", label: "3 Ay" },
  { key: "m1", label: "1 Ay" },
  { key: "w1", label: "1 Hafta" },
  { key: "daily", label: "Günlük" },
];

/** The gross return a fund carries for a window. */
export function grossReturn(fund: Fund, window: ReturnWindow): number {
  return fund[window];
}

/** Days in the trailing year, used to tell a young fund from an old one. */
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Whether the fund has lived a full year, so its `y1` is a real one-year
 * return rather than the flat zero the feed carries for a fund too young to
 * have one. When the inception date is unknown we cannot tell, so we assume it
 * does and trust `y1`.
 */
export function hasFullYear(fund: Fund, now: Date = new Date()): boolean {
  if (!fund.inceptionDate) return true;
  return now.getTime() - new Date(fund.inceptionDate).getTime() >= YEAR_MS;
}

/** Return from the first priced session to the last, %, or null if it can't. */
export function sinceInceptionReturn(prices: PricePoint[]): number | null {
  if (prices.length < 2) return null;
  const first = prices[0].price;
  const last = prices[prices.length - 1].price;
  if (!(first > 0)) return null;
  return ((last - first) / first) * 100;
}

/** A headline performance figure with the window it actually covers. */
export type PrimaryReturn = {
  value: number;
  /** Human label: "1 Yıl" for a full year, else "Kuruluştan beri" or shorter. */
  label: string;
  /** True when the figure runs from inception rather than a full year. */
  sinceInception: boolean;
};

/**
 * The return to lead with. For a fund with a full year behind it, that is its
 * one-year return. For one younger than a year — where `y1` is a misleading
 * zero — it is the return since the fund started: computed from the price
 * series when the caller has it, and otherwise from the longest trailing
 * window the fund does carry, so a new fund is never reported as "0% in a
 * year" it has not lived.
 */
export function primaryReturn(
  fund: Fund,
  prices?: PricePoint[],
  now: Date = new Date(),
): PrimaryReturn {
  if (hasFullYear(fund, now)) {
    return { value: fund.y1, label: "1 Yıl", sinceInception: false };
  }

  if (prices && prices.length >= 2) {
    const since = sinceInceptionReturn(prices);
    if (since !== null) {
      return { value: since, label: "Kuruluştan beri", sinceInception: true };
    }
  }

  // No series to hand: fall back to the longest window carrying a figure, so
  // the lead is still a real number rather than the empty yearly one.
  const windows: { key: ReturnWindow; label: string }[] = [
    { key: "m3", label: "3 Ay" },
    { key: "m1", label: "1 Ay" },
    { key: "w1", label: "1 Hafta" },
    { key: "daily", label: "Günlük" },
  ];
  const found = windows.find((w) => fund[w.key] !== 0);
  if (found) {
    return { value: fund[found.key], label: found.label, sinceInception: false };
  }

  return { value: fund.y1, label: "1 Yıl", sinceInception: false };
}

/**
 * Percentile rank of a fund within a peer set for a window, 0–100, where 100
 * is the best performer. A fund compared against only itself has no standing,
 * so this needs at least two peers; it returns null otherwise.
 *
 * Used by the category pages, which already hold every peer in the category.
 * The fund-detail page prefers the backend's `categoryPercentile` instead,
 * since it does not load the whole category.
 */
export function percentileRank(
  fund: Fund,
  peers: Fund[],
  window: ReturnWindow = "y1",
): number | null {
  if (peers.length < 2) return null;
  const value = grossReturn(fund, window);
  const atOrBelow = peers.filter(
    (peer) => grossReturn(peer, window) <= value,
  ).length;
  return Math.round((atOrBelow / peers.length) * 100);
}

/**
 * Net return after withholding, %, derived from the gross return and the fund's
 * stopaj rate. This is an arithmetic derivation — gross less the share withheld
 * on the gain — not an estimate of anything the source does not state, so it is
 * computed only where the rate is published and the gain is positive (stopaj is
 * levied on a gain, not a loss). Null where either is missing.
 *
 * The backend's `fund.netReturn[window]` is preferred when present, because it
 * can account for holding-period brackets this cannot; see
 * {@link resolveNetReturn}.
 */
export function deriveNetReturn(
  grossPct: number,
  withholdingTax: number | null,
): number | null {
  if (withholdingTax === null) return null;
  if (grossPct <= 0) return grossPct; // a loss is not taxed; net equals gross
  return grossPct * (1 - withholdingTax / 100);
}

/** Where a net-return figure came from, so the UI can mark a derived one. */
export type NetReturn = { value: number; source: "api" | "derived" } | null;

/**
 * The net-of-stopaj return for a window: the backend's figure when it has one,
 * otherwise the client derivation, otherwise null. The `source` lets the panel
 * footnote a derived number rather than pass it off as published.
 */
export function resolveNetReturn(fund: Fund, window: ReturnWindow): NetReturn {
  const fromApi = fund.netReturn?.[window];
  if (typeof fromApi === "number") return { value: fromApi, source: "api" };

  const derived = deriveNetReturn(grossReturn(fund, window), fund.withholdingTax);
  return derived === null ? null : { value: derived, source: "derived" };
}

/** "Son 5 yılın 4'ünde kategorisini geçti", or null when not published. */
export function consistencyLabel(fund: Fund): string | null {
  const c = fund.consistency;
  if (!c || c.years <= 0) return null;
  return `Son ${c.years} yılın ${c.beaten}'inde kategorisini geçti`;
}

export type VerdictTone = "good" | "neutral" | "warn";

/**
 * A one-line, fact-only read of the fund's standing — the "plain-Turkish
 * verdict" the strategy asks for. It only ever restates figures the fund
 * already carries; its whole job is to stop a loud daily number from being
 * read as the story when the year says otherwise.
 *
 * Pass the price series where it is to hand (the fund page) so a fund younger
 * than a year is judged on its return since inception, never reported as flat
 * over a year it has not lived.
 */
export function fundVerdict(
  fund: Fund,
  prices?: PricePoint[],
): { tone: VerdictTone; text: string } {
  // A fund without a full year of history has no one-year figure to speak to;
  // lead with the record it actually has, and say that the window is short.
  if (!hasFullYear(fund)) {
    const primary = primaryReturn(fund, prices);
    const tone: VerdictTone = primary.value < 0 ? "warn" : "neutral";
    return {
      tone,
      text:
        `${primary.label} ${formatPercent(primary.value)} getiri — fon 1 yılını ` +
        `doldurmadı, bu yüzden kısa bir karneye bakıyorsun.`,
    };
  }

  const { y1, daily } = fund;

  // A sharp up-day against a losing year: the case the homepage used to lead
  // with, named for what it is.
  if (y1 < 0 && daily >= 2) {
    return {
      tone: "warn",
      text:
        `Bugün ${formatPercent(daily)} yükseldi, ama son 1 yılda ` +
        `${formatPercent(y1)} kayıpta — günlük sıçrama bu tabloyu değiştirmez.`,
    };
  }

  if (y1 < 0) {
    return {
      tone: "warn",
      text: `Son 1 yılda ${formatPercent(y1)} kayıpta. Katılmadan önce reel getiriye bak.`,
    };
  }

  const consistency = consistencyLabel(fund);
  if (consistency) {
    return { tone: "good", text: `${consistency}. Son 1 yıl: ${formatPercent(y1)}.` };
  }

  return {
    tone: "neutral",
    text: `Son 1 yılda ${formatPercent(y1)} getiri. Reel getiri ve maliyetle birlikte değerlendir.`,
  };
}
