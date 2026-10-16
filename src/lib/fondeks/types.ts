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
  /** Issuer logo URL. When set, rows show it in place of the initials mark. */
  founderIcon?: string | null;
  category: FundCategory;
  isin: string | null;
  /** Yıllık yönetim ücreti, %. */
  managementFee: number;
  /** Stopaj oranı, %. Null where no source publishes it. */
  withholdingTax: number | null;
  /** Alış / satış valörü, T+n iş günü. Null where unpublished. */
  buyValueDays: number | null;
  sellValueDays: number | null;
  /** Whether the fund trades on TEFAS; null where the question does not apply. */
  onTefas: boolean | null;
  /** Latest unit price in TRY. */
  price: number;
  /** The session that price is from, ISO date. */
  priceDate: string;
  /** Percentage returns. */
  daily: number;
  /** Trailing one week. */
  w1: number;
  m1: number;
  m3: number;
  y1: number;
  /** Fon toplam değeri (latest month), in TRY. */
  aum: number;
  /** Yatırımcı sayısı (latest month). Null where the source counts no holders. */
  investors: number | null;
  /** Null where no source publishes the fund's risk value. */
  risk: RiskLevel | null;
  /** Kuruluş tarihi, ISO date. */
  inceptionDate: string | null;

  // ── Choose-stage decision metrics (v2.1) ──────────────────────────────────
  //
  // Everything below is optional and backend-computed: the fund-detail and
  // compare screens read each field where it is present and fall back to
  // "Bilinmiyor" where it is not, so the UI ships before the API grows them.
  // See docs/v2.1-backend-requirements.md for the contract each one expects.

  /**
   * Toplam gider oranı (TER), % per year — the fund's full cost, not just the
   * management fee. Computed by BiFon; null until the API publishes it.
   */
  ter?: number | null;
  /**
   * Stopaj sonrası net getiri, %, by window — the gross return less the
   * withholding the holder actually pays, which depends on fund type and
   * holding period. Backend-computed; the client derives a rough estimate only
   * where it cannot read this.
   */
  netReturn?: Partial<Record<ReturnWindow, number>> | null;
  /**
   * TÜFE enflasyonundan arındırılmış reel getiri, %, by window. Needs the
   * official inflation series, so it is backend-only; null until published.
   */
  realReturn?: Partial<Record<ReturnWindow, number>> | null;
  /**
   * The fund's standing in its own category, 0–100 (higher is better): "100"
   * is the category's best performer over the window. Backend-computed on the
   * detail response; the category pages derive their own from the peers they
   * already load.
   */
  categoryPercentile?: number | null;
  /**
   * Multi-year consistency: how many of the last `years` the fund beat its
   * category median. "4 of 5" is the signal that replaces a one-year spike.
   */
  consistency?: { beaten: number; years: number } | null;
};

/** The trailing windows the product shows a return for. */
export type ReturnWindow = "daily" | "w1" | "m1" | "m3" | "y1";

/** One indexable fund URL: the canonical slug and when its data last moved. */
export type SitemapFund = { slug: string; lastModified: Date };

/** The reduced fund shape the quick-search endpoint returns. */
export type SearchResult = {
  code: string;
  slug: string;
  name: string;
  founder: string;
  initials: string;
  color: string;
  category: string;
  y1: number;
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
  investorCount: number | null;
  netFlow: number;
};

export type MarketIndex = {
  name: string;
  symbol: string;
  color: string;
  /** Latest quote and its change against the previous one, in percent. */
  value: number;
  /** Percent change, or null when there is no previous quote to compare. */
  change: number | null;
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

/**
 * One asset class whose share of a portfolio moved over the period.
 *
 * Not a single security: TEFAS publishes no holdings endpoint and KAP no
 * longer exposes a public API, so movement is measured over the asset classes
 * that are actually published.
 */
export type HoldingChange = {
  /** A held security, e.g. "ASELSAN", or the asset class it falls back to. */
  label: string;
  /** BIST ticker for an individual security, e.g. "TABGD"; null for an asset class. */
  ticker: string | null;
  /** URL of the security's symbol icon; null when the API has none. */
  icon: string | null;
  color: string | null;
  /** Share of the portfolio now, in percent. */
  weight: number;
  /** Change in that share over the period, in percentage points. */
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
  risk: RiskLevel | null;
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
  /** The day the allocation breakdown was published, ISO date; null if absent. */
  allocationDate: string | null;
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
  /** Article body as sanitized HTML, ready to render. */
  bodyHtml: string;
};
