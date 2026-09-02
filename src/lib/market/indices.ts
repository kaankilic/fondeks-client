import "server-only";

import { requestJson } from "./http";

/**
 * Index sources.
 *
 * TCMB's daily bulletin is the reference for FX: it is official, free, needs
 * no key, and is the rate Turkish funds are valued against. It is verified
 * working — the XML shape below is what the endpoint actually returns.
 *
 * Everything else (BIST indices, gram altın, gösterge faiz) comes from TCMB's
 * EVDS service, which needs a free API key. Without one the app simply shows
 * fewer indices rather than inventing numbers.
 */

export type IndexQuote = { name: string; date: string; value: number };

export interface IndexProvider {
  readonly name: string;
  /** Quotes for the given inclusive date range. */
  fetchQuotes(range: { from: string; to: string }): Promise<IndexQuote[]>;
}

function isoToTcmbPath(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}${month}/${day}${month}${year}`;
}

function eachDay({ from, to }: { from: string; to: string }): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/** `<Currency Kod="USD">…<ForexSelling>48.2759</ForexSelling>` */
function readRate(xml: string, code: string): number | null {
  const block = new RegExp(
    `<Currency[^>]*Kod="${code}"[^>]*>([\\s\\S]*?)</Currency>`,
  ).exec(xml);
  if (!block) return null;

  const selling = /<ForexSelling>([\d.]+)<\/ForexSelling>/.exec(block[1]);
  const unit = /<Unit>(\d+)<\/Unit>/.exec(block[1]);
  if (!selling) return null;

  const rate = Number(selling[1]);
  const per = unit ? Number(unit[1]) : 1;
  return Number.isFinite(rate) && per > 0 ? rate / per : null;
}

/** Which TCMB currency code feeds which index row. */
const TCMB_SYMBOLS: Record<string, string> = {
  USD: "USD",
  EUR: "EUR",
};

export class TcmbProvider implements IndexProvider {
  readonly name = "tcmb";

  private readonly base =
    process.env.TCMB_BASE_URL?.trim() || "https://www.tcmb.gov.tr/kurlar";

  /** Names are resolved by the caller; this maps source symbol → value. */
  async fetchRates(date: string): Promise<Record<string, number>> {
    const url = `${this.base}/${isoToTcmbPath(date)}.xml`;

    const response = await fetch(url, {
      headers: { accept: "application/xml" },
      cache: "no-store",
    });

    // Holidays and weekends simply have no bulletin.
    if (response.status === 404) return {};
    if (!response.ok) {
      throw new Error(`TCMB ${url} failed with ${response.status}`);
    }

    const xml = await response.text();
    const rates: Record<string, number> = {};

    for (const symbol of Object.values(TCMB_SYMBOLS)) {
      const rate = readRate(xml, symbol);
      if (rate !== null) rates[symbol] = rate;
    }

    return rates;
  }

  async fetchQuotes(range: { from: string; to: string }): Promise<IndexQuote[]> {
    const quotes: IndexQuote[] = [];

    // One bulletin per day; sequential on purpose, this is a small public site.
    for (const date of eachDay(range)) {
      const rates = await this.fetchRates(date);
      for (const [symbol, value] of Object.entries(rates)) {
        quotes.push({ name: symbol, date, value });
      }
    }

    return quotes;
  }
}

type EvdsResponse = {
  items?: Record<string, string | null>[];
};

/**
 * TCMB EVDS. Series codes are configurable because EVDS renames them
 * occasionally; the defaults are the commonly used ones.
 */
export class EvdsProvider implements IndexProvider {
  readonly name = "evds";

  private readonly key = process.env.TCMB_EVDS_API_KEY?.trim();

  private readonly base =
    process.env.EVDS_BASE_URL?.trim() ||
    "https://evds2.tcmb.gov.tr/service/evds";

  isConfigured(): boolean {
    return Boolean(this.key);
  }

  async fetchSeries(
    series: string,
    range: { from: string; to: string },
  ): Promise<IndexQuote[]> {
    if (!this.key) throw new Error("TCMB_EVDS_API_KEY is not set");

    const toEvds = (iso: string) => {
      const [year, month, day] = iso.split("-");
      return `${day}-${month}-${year}`;
    };

    const url =
      `${this.base}/series=${encodeURIComponent(series)}` +
      `&startDate=${toEvds(range.from)}&endDate=${toEvds(range.to)}&type=json`;

    const payload = await requestJson<EvdsResponse>(url, {
      headers: { key: this.key },
      timeoutMs: 20_000,
    });

    const column = series.replace(/[.-]/g, "_");

    return (payload.items ?? []).flatMap((item) => {
      const raw = item[column] ?? item[series];
      const date = item["Tarih"] ?? item["TARIH"];
      if (!raw || !date) return [];

      const value = Number(String(raw).replace(",", "."));
      const [day, month, year] = String(date).split("-");
      if (!Number.isFinite(value) || !year) return [];

      return [{ name: series, date: `${year}-${month}-${day}`, value }];
    });
  }

  async fetchQuotes(range: { from: string; to: string }): Promise<IndexQuote[]> {
    const series = (process.env.EVDS_SERIES ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const results = await Promise.all(
      series.map((code) => this.fetchSeries(code, range)),
    );

    return results.flat();
  }
}
