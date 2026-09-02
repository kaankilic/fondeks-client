import "server-only";

import { ConcurrencyLimiter, requestJson, UpstreamError } from "./http";
import {
  pick,
  toCategory,
  toIsoDate,
  toInteger,
  toNumber,
  toValueDays,
  toBoolean,
  type RawRow,
} from "./parse";
import type {
  AllocationSlice,
  DailyStat,
  DateRange,
  FundCatalogEntry,
  MarketDataProvider,
} from "./provider";

/**
 * TEFAS adapter.
 *
 * TEFAS was rebuilt in 2026: the old `www.tefas.gov.tr/api/DB/*` form-encoded
 * endpoints are gone ("Method not found or disabled!") and the site now reads
 * from Takasbank's portal services. The service paths below are taken from the
 * live site bundle; the host is not reachable from every network, so the field
 * names are read by candidate (see `parse.ts`) rather than assumed.
 *
 * On the first live run, set INGEST_LOG_SAMPLES=true — the adapter then logs
 * one raw row per endpoint so the mapping can be confirmed or corrected in one
 * place: MAPPING below.
 */

const DEFAULT_BASE =
  "https://tefasws.takasbank.com.tr/uga/fonbilgilendirme/portal/service";

/** Field-name candidates, in priority order. */
const MAPPING = {
  code: ["fonKodu", "FONKODU", "fonKod", "kod", "code"],
  name: ["fonUnvani", "FONUNVAN", "fonUnvan", "unvan", "name"],
  founder: ["kurucuUnvani", "KURUCUUNVAN", "kurucu", "founder"],
  type: ["fonTuru", "FONTURACIKLAMA", "fonTurAciklama", "tur", "type"],
  typeCode: ["fonTurKodu", "FONTURKOD", "turKodu"],
  isin: ["isinKodu", "ISINKODU", "isin"],
  date: ["tarih", "TARIH", "fiyatTarihi", "date"],
  price: ["fiyat", "FIYAT", "birimPayDegeri", "price"],
  totalValue: ["portfoyBuyuklugu", "PORTFOYBUYUKLUK", "fonToplamDeger", "toplamDeger"],
  investors: ["kisiSayisi", "KISISAYISI", "yatirimciSayisi"],
  shares: ["tedavuldekiPaySayisi", "TEDPAYSAYISI", "paySayisi"],
  inception: ["kurulusTarihi", "KURULUSTARIHI", "halkaArzTarihi"],
  managementFee: ["yonetimUcreti", "YONETIMUCRETI", "yillikYonetimUcreti"],
  withholding: ["stopajOrani", "STOPAJ", "stopaj"],
  risk: ["riskDegeri", "RISKDEGERI", "risk"],
  buyValue: ["alisValoru", "ALISVALOR", "alimValor"],
  sellValue: ["satisValoru", "SATISVALOR", "satimValor"],
  onTefas: ["tefasIslemDurumu", "TEFASDURUM", "tefas"],
  allocationLabel: ["varlikTuru", "VARLIKTURU", "enstrumanAdi", "label"],
  allocationPct: ["oran", "ORAN", "yuzde", "pct"],
} as const;

/** Endpoint paths, discovered from the live site bundle. */
const ENDPOINTS = {
  dailyList: "/fonGnlBlgSiraliGetir",
  fundInfo: "/fonBilgiGetir",
  fundDetail: "/fonDetayGetir",
  priceHistory: "/fonFiyatBilgiGetir",
  allocation: "/fonProfilDtyGetir",
} as const;

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** TEFAS caps how much history one call may span. */
const MAX_RANGE_DAYS = 90;

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function splitRange({ from, to }: DateRange): DateRange[] {
  const chunks: DateRange[] = [];
  let cursor = from;

  while (cursor <= to) {
    const end = addDays(cursor, MAX_RANGE_DAYS - 1);
    chunks.push({ from: cursor, to: end < to ? end : to });
    cursor = addDays(end, 1);
  }

  return chunks;
}

/** dd.mm.yyyy — the format the service expects. */
function toTefasDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** Accepts the several envelope shapes the portal services return. */
function unwrap(payload: unknown): RawRow[] {
  if (Array.isArray(payload)) return payload as RawRow[];

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "result", "resultList", "list", "items"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as RawRow[];
      if (value && typeof value === "object") {
        const nested = unwrap(value);
        if (nested.length) return nested;
      }
    }
  }

  return [];
}

export class TefasProvider implements MarketDataProvider {
  readonly name = "tefas";

  private readonly base = (
    process.env.TEFAS_BASE_URL?.trim() || DEFAULT_BASE
  ).replace(/\/$/, "");

  private readonly limiter = new ConcurrencyLimiter(
    envNumber("TEFAS_CONCURRENCY", 3),
  );

  private readonly logSamples = process.env.INGEST_LOG_SAMPLES === "true";
  private readonly sampled = new Set<string>();

  private async call(path: string, body: unknown): Promise<RawRow[]> {
    const payload = await this.limiter.run(() =>
      requestJson<unknown>(`${this.base}${path}`, {
        body,
        timeoutMs: envNumber("TEFAS_TIMEOUT_MS", 20_000),
        maxRetries: envNumber("TEFAS_MAX_RETRIES", 3),
        headers: {
          origin: "https://www.tefas.gov.tr",
          referer: "https://www.tefas.gov.tr/",
          "accept-language": "tr-TR,tr;q=0.9",
          "user-agent":
            process.env.TEFAS_USER_AGENT?.trim() ||
            "FondeksBot/1.0 (+https://fondeks.com; market data sync)",
        },
      }),
    );

    const rows = unwrap(payload);

    if (rows.length === 0) {
      throw new UpstreamError(
        `${path} returned no rows; the response envelope may have changed`,
        undefined,
        JSON.stringify(payload).slice(0, 500),
      );
    }

    // One sample per endpoint is enough to verify the field mapping.
    if (this.logSamples && !this.sampled.has(path)) {
      this.sampled.add(path);
      console.info(`[tefas] sample row from ${path}:`, JSON.stringify(rows[0]));
    }

    return rows;
  }

  async listFunds(): Promise<FundCatalogEntry[]> {
    const rows = await this.call(ENDPOINTS.fundInfo, { data: {} });

    return rows.flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const name = pick(row, [...MAPPING.name]);
      if (typeof code !== "string" || typeof name !== "string") return [];

      return [
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          founder: String(pick(row, [...MAPPING.founder]) ?? "Bilinmiyor").trim(),
          category: toCategory(pick(row, [...MAPPING.type])),
          typeCode: (pick(row, [...MAPPING.typeCode]) as string) ?? null,
          isin: (pick(row, [...MAPPING.isin]) as string) ?? null,
          inceptionDate: toIsoDate(pick(row, [...MAPPING.inception])),
          managementFee: toNumber(pick(row, [...MAPPING.managementFee])),
          withholdingTax: toNumber(pick(row, [...MAPPING.withholding])),
          risk: toInteger(pick(row, [...MAPPING.risk])),
          buyValueDays: toValueDays(pick(row, [...MAPPING.buyValue])),
          sellValueDays: toValueDays(pick(row, [...MAPPING.sellValue])),
          onTefas: toBoolean(pick(row, [...MAPPING.onTefas])) ?? true,
        },
      ];
    });
  }

  async fetchDailyStats(range: DateRange): Promise<DailyStat[]> {
    const chunks = splitRange(range);
    const results = await Promise.all(
      chunks.map((chunk) =>
        this.call(ENDPOINTS.dailyList, {
          data: {
            baslangicTarihi: toTefasDate(chunk.from),
            bitisTarihi: toTefasDate(chunk.to),
            fonTipi: "YAT",
          },
        }),
      ),
    );

    return results.flat().flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const date = toIsoDate(pick(row, [...MAPPING.date]));
      const price = toNumber(pick(row, [...MAPPING.price]));

      if (typeof code !== "string" || !date || price === null) return [];

      return [
        {
          code: code.trim().toUpperCase(),
          date,
          price,
          totalValue: toNumber(pick(row, [...MAPPING.totalValue])),
          investorCount: toInteger(pick(row, [...MAPPING.investors])),
          shareCount: toNumber(pick(row, [...MAPPING.shares])),
        },
      ];
    });
  }

  async fetchAllocations(range: DateRange): Promise<AllocationSlice[]> {
    const rows = await this.call(ENDPOINTS.allocation, {
      data: {
        baslangicTarihi: toTefasDate(range.from),
        bitisTarihi: toTefasDate(range.to),
      },
    });

    return rows.flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const date = toIsoDate(pick(row, [...MAPPING.date])) ?? range.to;
      const label = pick(row, [...MAPPING.allocationLabel]);
      const pct = toNumber(pick(row, [...MAPPING.allocationPct]));

      if (typeof code !== "string" || typeof label !== "string" || pct === null) {
        return [];
      }

      return [{ code: code.trim().toUpperCase(), date, label, pct }];
    });
  }
}
