import type { FundCategory } from "./constants";

export type { FundCategory };

/** Risk value on the TEFAS 1–7 scale. */
export type RiskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A fund row joined with its issuer's branding — what every screen renders. */
export type Fund = {
  code: string;
  /** Canonical URL segment: `CODE-fund-name`. */
  slug: string;
  name: string;
  founder: string;
  founderInitials: string;
  founderColor: string;
  category: FundCategory;
  isin: string | null;
  /** Yıllık yönetim ücreti, %. */
  managementFee: number;
  /** Stopaj oranı, %. */
  withholdingTax: number;
  /** Alış / satış valörü, T+n iş günü. */
  buyValueDays: number;
  sellValueDays: number;
  /** Whether the fund trades on TEFAS. */
  onTefas: boolean;
  /** Latest unit price in TRY. */
  price: number;
  /** Percentage returns. */
  daily: number;
  m1: number;
  m3: number;
  y1: number;
  /** Fon toplam değeri (latest month), in TRY. */
  aum: number;
  /** Yatırımcı sayısı (latest month). */
  investors: number;
  risk: RiskLevel;
  /** Kuruluş tarihi, ISO date. */
  inceptionDate: string | null;
};

/** A fund plus one highlighted figure, for the discovery widgets. */
export type FundHighlight = {
  fund: Fund;
  /** Primary figure, already formatted. */
  value: string;
  tone?: "pos" | "neg" | "neutral";
  /** Optional supporting line under the fund name. */
  detail?: string;
};

/** A point on the daily price series. */
export type PricePoint = {
  date: string;
  price: number;
};

/** Fon toplam değeri, yatırımcı sayısı and nakit akışı for one month. */
export type MonthlyStat = {
  month: string;
  totalValue: number;
  investorCount: number;
  netFlow: number;
};

export type MarketIndex = {
  name: string;
  symbol: string;
  color: string;
  /** Latest quote and its change against the previous one, in percent. */
  value: number;
  change: number;
  unit: string;
  decimals: number;
  /** Formatting override, e.g. "%v" renders 46.25 as "%46,25". */
  displayPattern: string | null;
  /** Polyline points for the card's sparkline, from the real series. */
  spark: string | null;
};

export type CategoryPerformance = {
  category: FundCategory;
  y1: number;
};

export type HoldingChange = {
  ticker: string;
  name: string;
  color: string | null;
  /** Share of the portfolio, in percent. */
  weight: number;
  /** Change in weight over the period, in percentage points. */
  change: number;
};

export type Allocation = {
  label: string;
  pct: number;
};

export type SimilarFund = {
  code: string;
  slug: string;
  label: string;
  initials: string;
  color: string;
  /** Portfolio overlap, 0–100. */
  similarity: number;
  y1: number;
  risk: RiskLevel;
};

export type CompareRow = {
  label: string;
  values: string[];
};

export type FundDetail = {
  fund: Fund;
  /** Annualised volatility over the last year, %, from the price series. */
  volatility: number | null;
  prices: PricePoint[];
  monthly: MonthlyStat[];
  increased: HoldingChange[];
  decreased: HoldingChange[];
  allocation: Allocation[];
  similar: SimilarFund[];
  compare: {
    codes: string[];
    rows: CompareRow[];
  };
};

export type NewsSource = "haber" | "kap";

export type NewsItem = {
  id: string;
  source: NewsSource;
  title: string;
  summary: string | null;
  /** Related BIST ticker or fund code, when the item is about one. */
  symbol: string | null;
  publisher: string | null;
  url: string | null;
  publishedAt: Date;
};

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readingMinutes: number;
  publishedAt: Date;
};

export type GuideDetail = Guide & {
  /** Paragraphs, already split. */
  paragraphs: string[];
};
