import {
  boolean,
  date,
  jsonb,
  uuid,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { FUND_CATEGORIES } from "@/lib/fondeks/constants";

export const fundCategory = pgEnum("fund_category", FUND_CATEGORIES);

/** Whether the manager added to or trimmed a position over the period. */
export const positionDirection = pgEnum("position_direction", [
  "increased",
  "decreased",
]);

/** Kurucu — the issuer, with the branding shown next to every fund code. */
export const founders = pgTable("founders", {
  name: text().primaryKey(),
  initials: varchar({ length: 4 }).notNull(),
  color: varchar({ length: 9 }).notNull(),
});

/**
 * One row per fund. Everything here is a standing attribute of the fund;
 * anything that moves over time lives in the child tables below.
 */
export const funds = pgTable("funds", {
  /** TEFAS code, e.g. AFT. */
  code: varchar({ length: 8 }).primaryKey(),
  name: text().notNull(),
  founder: text()
    .notNull()
    .references(() => founders.name),
  category: fundCategory().notNull(),
  isin: text(),
  /** Kuruluş tarihi — when the fund started trading. */
  inceptionDate: date({ mode: "string" }),
  /** Yıllık yönetim ücreti, percent per year. */
  managementFee: numeric({ precision: 5, scale: 3, mode: "number" }).notNull(),
  /** Stopaj oranı, percent withheld on gains. */
  withholdingTax: numeric({ precision: 5, scale: 2, mode: "number" }).notNull(),
  /** Risk değeri on the TEFAS 1–7 scale. */
  risk: smallint().notNull(),
  /** Alış valörü — settlement lag in business days (T+n). */
  buyValueDays: smallint().notNull(),
  /** Satış valörü — redemption lag in business days (T+n). */
  sellValueDays: smallint().notNull(),
  /** Whether the fund trades on TEFAS. */
  onTefas: boolean().notNull().default(true),
  /** Source's own fund-type code, kept for traceability. */
  tefasTypeCode: varchar({ length: 16 }),
  /** False once the source stops publishing the fund. */
  isActive: boolean().notNull().default(true),
  /** Where this row came from: "tefas" or "fixture". */
  source: varchar({ length: 16 }).notNull().default("fixture"),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** BIST equities a fund can hold. */
export const symbols = pgTable("symbols", {
  ticker: varchar({ length: 10 }).primaryKey(),
  name: text().notNull(),
  color: varchar({ length: 9 }),
});

/**
 * Artırılan / azaltılan pozisyonlar: one row per fund, symbol and reporting
 * month, so position changes can be read back for any past period.
 */
export const fundPositions = pgTable(
  "fund_positions",
  {
    fundCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    ticker: varchar({ length: 10 })
      .notNull()
      .references(() => symbols.ticker),
    /** First day of the reporting month. */
    period: date({ mode: "string" }).notNull(),
    direction: positionDirection().notNull(),
    /** Share of the portfolio, in percent. */
    weight: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
    /** Change in weight over the period, in percentage points. */
    changePoints: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
    rank: smallint().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fundCode, table.ticker, table.period] }),
    index("fund_positions_lookup_idx").on(
      table.fundCode,
      table.period,
      table.direction,
    ),
  ],
);

/**
 * One row per fund per trading day — the single source the app derives
 * returns, volatility, size and investor trends from. TEFAS publishes all of
 * these together, so they share a grain.
 */
export const fundDailyStats = pgTable(
  "fund_daily_stats",
  {
    fundCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    /** Katılma payı fiyatı. */
    price: numeric({ precision: 18, scale: 6, mode: "number" }).notNull(),
    /** Fon toplam değeri, TRY. */
    totalValue: numeric({ precision: 20, scale: 2, mode: "number" }),
    /** Yatırımcı (kişi) sayısı. */
    investorCount: integer(),
    /** Tedavüldeki pay sayısı. */
    shareCount: numeric({ precision: 24, scale: 2, mode: "number" }),
    ingestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.fundCode, table.date] }),
    index("fund_daily_stats_date_idx").on(table.date),
    index("fund_daily_stats_fund_date_idx").on(table.fundCode, table.date),
  ],
);



export const fundAllocations = pgTable(
  "fund_allocations",
  {
    fundCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    /** The day the breakdown was published. */
    date: date({ mode: "string" }).notNull(),
    label: text().notNull(),
    pct: numeric({ precision: 5, scale: 2, mode: "number" }).notNull(),
    /** Rank within the day, heaviest slice first. */
    position: smallint().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fundCode, table.date, table.label] }),
    // Both readers start from a fund's newest day and walk back.
    index("fund_allocations_lookup_idx").on(table.fundCode, table.date),
  ],
);

/** Portfolio overlap between two funds, 0–100. */
export const fundSimilarities = pgTable(
  "fund_similarities",
  {
    fundCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    peerCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    /** Short display name for the peer inside the widget. */
    peerLabel: text(),
    similarity: smallint().notNull(),
  },
  (table) => [primaryKey({ columns: [table.fundCode, table.peerCode] })],
);

/**
 * The indices shown on Piyasa Özeti. This row is presentation plus source
 * wiring; the numbers live in `index_quotes` so the value, the change and the
 * sparkline all come from the same dated series.
 */
export const marketIndices = pgTable("market_indices", {
  name: text().primaryKey(),
  symbol: varchar({ length: 4 }).notNull(),
  color: varchar({ length: 9 }).notNull(),
  /** Rendered instead of the raw number when the unit needs it (e.g. "%46,25"). */
  displayPattern: varchar({ length: 16 }),
  unit: varchar({ length: 8 }).notNull().default(""),
  /** Which provider fills this series, and the symbol it knows it by. */
  source: varchar({ length: 16 }).notNull().default("fixture"),
  sourceSymbol: varchar({ length: 32 }),
  /** Decimals used when formatting the value. */
  decimals: smallint().notNull().default(2),
  position: smallint().notNull(),
  isActive: boolean().notNull().default(true),
});

/** One observation per index per day. */
export const indexQuotes = pgTable(
  "index_quotes",
  {
    indexName: text()
      .notNull()
      .references(() => marketIndices.name, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    value: numeric({ precision: 18, scale: 4, mode: "number" }).notNull(),
    ingestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.indexName, table.date] }),
    index("index_quotes_date_idx").on(table.date),
  ],
);

/**
 * Raw portfolio disclosures: what each fund held, per reporting period.
 * `fund_positions` is derived from consecutive snapshots.
 */
export const fundHoldingSnapshots = pgTable(
  "fund_holding_snapshots",
  {
    fundCode: varchar({ length: 8 })
      .notNull()
      .references(() => funds.code, { onDelete: "cascade" }),
    /** First day of the reporting period. */
    period: date({ mode: "string" }).notNull(),
    ticker: varchar({ length: 10 }).notNull(),
    /** Share of the portfolio, in percent. */
    weight: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
    source: varchar({ length: 16 }).notNull().default("fixture"),
    ingestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.fundCode, table.period, table.ticker] }),
    index("fund_holding_snapshots_period_idx").on(table.period),
  ],
);

export const categoryPerformance = pgTable("category_performance", {
  category: fundCategory().primaryKey(),
  y1: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
});

/** Editorial market news versus KAP (public disclosure platform) filings. */
export const newsSource = pgEnum("news_source", ["haber", "kap"]);

export const news = pgTable(
  "news",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: newsSource().notNull(),
    title: text().notNull(),
    summary: text(),
    /** Related BIST ticker or fund code, when the item is about one. */
    symbol: varchar({ length: 10 }),
    /** Who published it — an outlet for haber, the filer for KAP. */
    publisher: text(),
    url: text(),
    publishedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [index("news_published_idx").on(table.publishedAt)],
);

export type NewsRow = typeof news.$inferSelect;

/** Rehber: short explainers about how funds work. */
export const guides = pgTable("guides", {
  slug: varchar({ length: 80 }).primaryKey(),
  title: text().notNull(),
  summary: text().notNull(),
  /** Grouping label shown as a chip, e.g. "Temeller", "Vergi". */
  category: text().notNull(),
  readingMinutes: smallint().notNull(),
  /** Plain text; paragraphs separated by a blank line. */
  body: text().notNull(),
  publishedAt: timestamp({ withTimezone: true }).notNull(),
});

export type GuideRow = typeof guides.$inferSelect;

/** Every ingestion attempt, so failures and freshness are observable. */
export const ingestStatus = pgEnum("ingest_status", [
  "running",
  "success",
  "failed",
]);

export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Job name, e.g. "daily-stats" or "fund-catalog". */
    job: varchar({ length: 40 }).notNull(),
    status: ingestStatus().notNull(),
    /** What the job was asked to do (date range, codes, …). */
    params: jsonb(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    /** Rows written, and rows the source returned. */
    rowsWritten: integer().notNull().default(0),
    rowsRead: integer().notNull().default(0),
    error: text(),
  },
  (table) => [index("ingest_runs_job_idx").on(table.job, table.startedAt)],
);

export type IngestRunRow = typeof ingestRuns.$inferSelect;

export type FundRow = typeof funds.$inferSelect;
export type FounderRow = typeof founders.$inferSelect;
export type SymbolRow = typeof symbols.$inferSelect;
export type MarketIndexRow = typeof marketIndices.$inferSelect;
export type FundDailyRow = typeof fundDailyStats.$inferSelect;
