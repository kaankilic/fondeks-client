/**
 * Shared, client-safe constants. Kept out of the schema and the data layer so
 * both can import them without dragging server-only code into the browser.
 */
export const FUND_CATEGORIES = [
  "Hisse Senedi",
  "Kıymetli Maden",
  "Serbest",
  "Değişken",
  "Para Piyasası",
  "Borçlanma",
] as const;

export type FundCategory = (typeof FUND_CATEGORIES)[number];

/** TEFAS risk scale. */
export const RISK_MIN = 1;
export const RISK_MAX = 7;

/** Trading session shown in the Piyasa Özeti header. */
export const MARKET_SESSION = {
  date: "25 Ağustos 2026, Salı",
  close: "Kapanış 18:10",
  open: true,
};
