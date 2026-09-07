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

/**
 * The universes TEFAS files funds under, by its own `fonTipi`: securities
 * mutual funds, emeklilik yatırım fonları and borsa yatırım fonları. All three
 * are ingested; the screens read one of them.
 */
export const FUND_TYPES = ["YAT", "EMK", "BYF"] as const;

export type FundType = (typeof FUND_TYPES)[number];

/**
 * The universe every fund screen covers today. Pension funds and ETFs are kept
 * current in the database so a section for them starts with history rather
 * than with an empty table, but they are not mixed into the fund lists: they
 * are bought differently, and half their fund types have no home in
 * `FUND_CATEGORIES`.
 */
export const PRODUCT_FUND_TYPE: FundType = "YAT";

/**
 * Shown in place of a künye figure no source publishes — a fund's stopaj rate,
 * its valör or its risk value. An invented default would read as fact.
 */
export const UNKNOWN = "Bilinmiyor";

/** TEFAS risk scale. */
export const RISK_MIN = 1;
export const RISK_MAX = 7;

/** Trading session shown in the Piyasa Özeti header. */
export const MARKET_SESSION = {
  date: "25 Ağustos 2026, Salı",
  close: "Kapanış 18:10",
  open: true,
};
