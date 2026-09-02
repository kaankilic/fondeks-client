import "server-only";

import type { FundCategory } from "@/lib/fondeks/constants";

/**
 * The contract every market-data source implements. The app and the ingest
 * jobs only know this shape, so swapping TEFAS for another feed — or for the
 * offline fixtures — touches one factory.
 */

export type FundCatalogEntry = {
  code: string;
  name: string;
  founder: string;
  /** Issuer branding, when the source knows it; derived otherwise. */
  founderInitials?: string | null;
  founderColor?: string | null;
  category: FundCategory;
  /** The source's own type code, kept for traceability. */
  typeCode?: string | null;
  isin?: string | null;
  inceptionDate?: string | null;
  managementFee?: number | null;
  withholdingTax?: number | null;
  risk?: number | null;
  buyValueDays?: number | null;
  sellValueDays?: number | null;
  onTefas?: boolean;
};

/** One fund on one trading day, exactly as the source publishes it. */
export type DailyStat = {
  code: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  price: number;
  totalValue?: number | null;
  investorCount?: number | null;
  shareCount?: number | null;
};

export type AllocationSlice = {
  code: string;
  date: string;
  label: string;
  pct: number;
};

export type DateRange = { from: string; to: string };

export interface MarketDataProvider {
  readonly name: string;
  /** Every fund the source knows about. */
  listFunds(): Promise<FundCatalogEntry[]>;
  /** Daily rows for a date range; the source may cap the span per call. */
  fetchDailyStats(range: DateRange): Promise<DailyStat[]>;
  /** Portfolio breakdown, when the source exposes it. */
  fetchAllocations?(range: DateRange): Promise<AllocationSlice[]>;
}

export function providerName(): string {
  return process.env.MARKET_DATA_PROVIDER?.trim() || "fixture";
}

/**
 * Resolves the configured provider. Defaults to fixtures so a checkout runs
 * without network access; production sets MARKET_DATA_PROVIDER=tefas.
 */
export async function getProvider(): Promise<MarketDataProvider> {
  const name = providerName();

  switch (name) {
    case "tefas": {
      const { TefasProvider } = await import("./tefas");
      return new TefasProvider();
    }
    case "fixture": {
      const { FixtureProvider } = await import("./fixture");
      return new FixtureProvider();
    }
    default:
      throw new Error(
        `Unknown MARKET_DATA_PROVIDER "${name}". Use "tefas" or "fixture".`,
      );
  }
}
