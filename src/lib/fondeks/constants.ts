/**
 * Shared, client-safe constants. Kept out of the schema and the data layer so
 * both can import them without dragging server-only code into the browser.
 */
/** The asset-class buckets a securities mutual fund falls into. */
export const FUND_CATEGORIES = [
  "Hisse Senedi",
  "Kıymetli Maden",
  "Serbest",
  "Değişken",
  "Para Piyasası",
  "Borçlanma",
] as const;

/**
 * Buckets only a pension fund carries. A BES fund is classified by the role it
 * plays in a plan as much as by what it holds — a Standart or an OKS Standart
 * fund is the default a contributor lands in, a Katkı fund holds the state's
 * contribution, a Başlangıç fund the first instalments — and none of those has
 * an asset class that would place it among the categories above.
 */
export const PENSION_CATEGORIES = [
  "Standart",
  "Başlangıç",
  "Katkı",
  "Fon Sepeti",
  "Karma",
  "Katılım",
  "Endeks",
] as const;

/** A securities fund's category — the closed set the screener's tabs read. */
export type SecurityCategory = (typeof FUND_CATEGORIES)[number];

export const ALL_CATEGORIES = [
  ...FUND_CATEGORIES,
  ...PENSION_CATEGORIES,
] as const;

export type FundCategory = (typeof ALL_CATEGORIES)[number];

/**
 * The universes TEFAS files funds under, by its own `fonTipi`: securities
 * mutual funds, emeklilik yatırım fonları and borsa yatırım fonları. All three
 * are ingested; the screens read one of them.
 */
export const FUND_TYPES = ["YAT", "EMK", "BYF"] as const;

export type FundType = (typeof FUND_TYPES)[number];

/**
 * The universe the fund lists cover — Keşfet, the screener, İzleme Listem.
 * Pension funds are bought inside a plan rather than off a shelf, so they are
 * not mixed in; they have their own section instead.
 */
export const PRODUCT_FUND_TYPE: FundType = "YAT";

/** The universe behind /emeklilik-fonlari. */
export const PENSION_FUND_TYPE: FundType = "EMK";

/**
 * The universes with pages of their own, and so the ones the sitemap offers.
 * BYF is ingested and reachable by URL, but nothing links to it yet.
 */
export const PAGED_FUND_TYPES: FundType[] = [
  PRODUCT_FUND_TYPE,
  PENSION_FUND_TYPE,
];

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
