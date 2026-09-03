import "server-only";

import {
  ConcurrencyLimiter,
  RateLimiter,
  requestJson,
  UpstreamError,
} from "./http";
import {
  pick,
  toCategory,
  toIsoDate,
  toInteger,
  toNumber,
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
 * endpoints are gone ("Method not found or disabled!") and the site — now a
 * Next.js app — talks to a JSON gateway at `www.tefas.gov.tr/api/funds/*`.
 * Every path, request body and field name below was read off the live service.
 *
 * The gateway answers 200 for an unknown *request* and 404 with an ERR-006
 * fault for an unknown *path*, so a failure to route shows up as a plain
 * UpstreamError rather than as silently empty data.
 *
 * Set INGEST_LOG_SAMPLES=true to log one raw row per endpoint, which is the
 * quickest way to confirm the mapping after an upstream change.
 */

const DEFAULT_BASE = "https://www.tefas.gov.tr/api/funds";

/** The universe the product covers: TEFAS securities mutual funds. */
const FUND_TYPE = "YAT";

/** Endpoint paths, taken from the site bundle's API module. */
const ENDPOINTS = {
  /** Whole catalogue for a fund type — code, name, type, issuer, fee. */
  catalog: "/fonYonetimBazliBilgiGetir",
  /** Issuer code → issuer legal name. */
  founders: "/fonKurucuGetir",
  /** Daily price, size and investor counts over a date range. */
  dailyList: "/fonGnlBlgSiraliGetir",
  /** Portfolio breakdown over a date range. */
  allocation: "/dagilimSiraliGetirT",
} as const;

/** Field-name candidates, verified name first. */
const MAPPING = {
  code: ["fonKodu", "fonKod"],
  name: ["fonUnvan", "fonUnvani"],
  founderCode: ["kurucuKod", "kurucuKodu"],
  founderName: ["kurucuUnvan", "kurucuUnvani"],
  type: ["fonTurAciklama", "fonTuru"],
  typeCode: ["fonTurKod", "fonTurKodu"],
  date: ["tarih"],
  price: ["fiyat"],
  totalValue: ["portfoyBuyukluk", "portBuyukluk"],
  investors: ["kisiSayisi", "yatirimciSayi"],
  shares: ["tedPaySayisi", "payAdet"],
  /** Applied annual management/operating fee, as a percentage. */
  managementFee: ["uygulananYu1Y", "fonIcTuzukYu1G"],
  onTefas: ["tefasDurum"],
} as const;

/**
 * Portfolio breakdown columns. The service returns one short code per asset
 * class with a percentage, so the labels live here rather than upstream.
 */
const ALLOCATION_LABELS: Record<string, string> = {
  hs: "Hisse Senedi",
  dt: "Devlet Tahvili",
  hb: "Hazine Bonosu",
  fb: "Finansman Bonosu",
  ost: "Özel Sektör Tahvili",
  bb: "Banka Bonosu",
  vdm: "Varlığa Dayalı Menkul Kıymet",
  eut: "Eurobond",
  kibd: "Kamu Dış Borçlanma Aracı",
  osdb: "Özel Sektör Dış Borçlanma Aracı",
  kba: "Kamu Dövize Endeksli İç Borçlanma Aracı",
  dot: "Dövize Ödemeli Bono",
  db: "Dövize Ödemeli Tahvil",
  tpp: "Takasbank Para Piyasası",
  bpp: "BİST Para Piyasası",
  btaa: "BİST Taahhütlü İşlem Alım",
  btas: "BİST Taahhütlü İşlem Satım",
  r: "Repo",
  tr: "Ters Repo",
  vm: "Vadeli Mevduat",
  vmtl: "Vadeli Mevduat (TL)",
  vmd: "Vadeli Mevduat (Döviz)",
  vmau: "Vadeli Mevduat (Altın)",
  kh: "Katılma Hesabı",
  khtl: "Katılma Hesabı (TL)",
  khd: "Katılma Hesabı (Döviz)",
  khau: "Katılma Hesabı (Altın)",
  kks: "Kamu Kira Sertifikası",
  kkstl: "Kamu Kira Sertifikası (TL)",
  kksd: "Kamu Kira Sertifikası (Döviz)",
  kksyd: "Kamu Yurt Dışı Kira Sertifikası",
  osks: "Özel Sektör Kira Sertifikası",
  oksyd: "Özel Sektör Yurt Dışı Kira Sertifikası",
  km: "Kıymetli Maden",
  kmbyf: "Kıymetli Maden Borsa Yatırım Fonu",
  kmkba: "Kıymetli Madenler Kamu Borçlanma Aracı",
  kmkks: "Kıymetli Madenler Kira Sertifikası",
  ymk: "Yabancı Menkul Kıymet",
  yba: "Yabancı Borçlanma Aracı",
  ybkb: "Yabancı Kamu Borçlanma Aracı",
  ybosb: "Yabancı Özel Sektör Borçlanma Aracı",
  yhs: "Yabancı Hisse Senedi",
  ybyf: "Yabancı Borsa Yatırım Fonu",
  fkb: "Fon Katılma Belgesi",
  yyf: "Yatırım Fonu Katılma Payı",
  byf: "Borsa Yatırım Fonu",
  gykb: "Gayrimenkul Yatırım Fonu",
  gyy: "Gayrimenkul Yatırım Ortaklığı",
  gsykb: "Girişim Sermayesi Yatırım Fonu",
  gsyy: "Girişim Sermayesi Yatırım Ortaklığı",
  gas: "Gayrimenkul Sertifikası",
  t: "Türev Araç",
  vint: "Vadeli İşlem Nakit Teminatı",
  d: "Diğer",
};

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * The service rejects anything wider with "Tarih aralığı 1 ayı aşamaz". 28
 * days keeps every chunk clear of that cap regardless of month length.
 */
const MAX_RANGE_DAYS = 28;

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

/** yyyymmdd — the format the service expects. */
function toTefasDate(iso: string): string {
  return iso.replaceAll("-", "");
}

/**
 * The listing endpoints share one filter object and reject a partial one, so
 * every field is sent — nulls and empty strings included, as the site does.
 */
function listBody(range: DateRange) {
  return {
    fonTipi: FUND_TYPE,
    fonKodu: null,
    aramaMetni: null,
    fonTurKod: null,
    fonGrubu: null,
    sfonTurKod: null,
    fonTurAciklama: null,
    kurucuKod: null,
    basTarih: toTefasDate(range.from),
    bitTarih: toTefasDate(range.to),
    basSira: 1,
    bitSira: 100_000,
    dil: "TR",
    sFonTurKod: "",
    fonKod: "",
    fonGrup: "",
    fonUnvanTip: "",
  };
}

type Envelope = {
  errorCode?: unknown;
  errorMessage?: string | null;
  resultList?: RawRow[] | null;
};

/**
 * Messages the service uses for "nothing here" — a weekend, a holiday, or a
 * range that predates a fund. They are absence of data, not failure.
 */
const EMPTY_MESSAGES = ["out of bounds", "veri bulunamadı", "kayıt bulunamadı"];

function isEmptyMessage(message: string): boolean {
  const text = message.toLocaleLowerCase("tr");
  return EMPTY_MESSAGES.some((marker) => text.includes(marker));
}

export class TefasProvider implements MarketDataProvider {
  readonly name = "tefas";

  private readonly base = (
    process.env.TEFAS_BASE_URL?.trim() || DEFAULT_BASE
  ).replace(/\/$/, "");

  private readonly limiter = new ConcurrencyLimiter(
    envNumber("TEFAS_CONCURRENCY", 3),
  );

  /**
   * Measured against the live gateway: the tenth request inside a minute comes
   * back 429 "Because of reaching Throttling limit", and the block clears
   * about sixty seconds later. Eight leaves room for a retry inside the window.
   */
  private readonly rateLimiter = new RateLimiter(
    envNumber("TEFAS_RATE_LIMIT", 8),
    envNumber("TEFAS_RATE_WINDOW_MS", 60_000),
  );

  private readonly logSamples = process.env.INGEST_LOG_SAMPLES === "true";
  private readonly sampled = new Set<string>();

  private async call(path: string, body: unknown): Promise<RawRow[]> {
    const payload = await this.limiter.run(() =>
      requestJson<Envelope>(`${this.base}${path}`, {
        body,
        // A 28-day slice is ~9MB and measured 15-40s to build server-side, so
        // the usual 20s ceiling aborts most of a backfill's chunks.
        timeoutMs: envNumber("TEFAS_TIMEOUT_MS", 90_000),
        maxRetries: envNumber("TEFAS_MAX_RETRIES", 3),
        rateLimiter: this.rateLimiter,
        headers: {
          // The gateway 404s JSON-only Accept on some paths; the site sends */*.
          accept: "*/*",
          origin: "https://www.tefas.gov.tr",
          referer: "https://www.tefas.gov.tr/tr/fon-verileri",
          "accept-language": "tr-TR,tr;q=0.9",
          "user-agent":
            process.env.TEFAS_USER_AGENT?.trim() ||
            "FondeksBot/1.0 (+https://fondeks.com; market data sync)",
        },
      }),
    );

    // Errors come back inside a 200 body, so they have to be read out here.
    const message = payload.errorMessage?.trim();
    if (message && !isEmptyMessage(message)) {
      throw new UpstreamError(
        `${path} failed: ${message}`,
        undefined,
        payload.errorCode == null ? undefined : String(payload.errorCode),
      );
    }

    const rows = message || !payload.resultList ? [] : payload.resultList;

    // One sample per endpoint is enough to verify the field mapping.
    if (this.logSamples && rows.length > 0 && !this.sampled.has(path)) {
      this.sampled.add(path);
      console.info(`[tefas] sample row from ${path}:`, JSON.stringify(rows[0]));
    }

    return rows;
  }

  /** Issuer code → legal name; the catalogue only carries the code. */
  private async founderNames(): Promise<Map<string, string>> {
    const rows = await this.call(ENDPOINTS.founders, {
      fonTipi: FUND_TYPE,
      dil: "TR",
    });

    const names = new Map<string, string>();
    for (const row of rows) {
      const code = pick(row, [...MAPPING.founderCode]);
      const name = pick(row, [...MAPPING.founderName]);
      if (typeof code === "string" && typeof name === "string") {
        names.set(code.trim(), name.trim());
      }
    }

    return names;
  }

  async listFunds(): Promise<FundCatalogEntry[]> {
    const [rows, founders] = await Promise.all([
      this.call(ENDPOINTS.catalog, { fonTipi: FUND_TYPE, dil: "TR" }),
      this.founderNames(),
    ]);

    return rows.flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const name = pick(row, [...MAPPING.name]);
      if (typeof code !== "string" || typeof name !== "string") return [];

      const founderCode = pick(row, [...MAPPING.founderCode]);
      const founder =
        (typeof founderCode === "string"
          ? founders.get(founderCode.trim())
          : undefined) ?? "Bilinmiyor";

      return [
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          founder,
          category: toCategory(pick(row, [...MAPPING.type])),
          typeCode: String(pick(row, [...MAPPING.typeCode]) ?? "") || null,
          managementFee: toNumber(pick(row, [...MAPPING.managementFee])),
          // `tefasDurum` is a real tri-state: true, false, or unknown.
          onTefas: pick(row, [...MAPPING.onTefas]) !== false,
        },
      ];
    });
  }

  async fetchDailyStats(range: DateRange): Promise<DailyStat[]> {
    const chunks = splitRange(range);
    const results = await Promise.all(
      chunks.map((chunk) => this.call(ENDPOINTS.dailyList, listBody(chunk))),
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
    const chunks = splitRange(range);
    const results = await Promise.all(
      chunks.map((chunk) => this.call(ENDPOINTS.allocation, listBody(chunk))),
    );

    return results.flat().flatMap((row) => {
      const code = pick(row, [...MAPPING.code]);
      const date = toIsoDate(pick(row, [...MAPPING.date]));
      if (typeof code !== "string" || !date) return [];

      // One row holds every asset class as its own column; the empty ones
      // come back null, so only the funded slices are kept.
      return Object.entries(ALLOCATION_LABELS).flatMap(([key, label]) => {
        const pct = toNumber(row[key]);
        if (pct === null || pct === 0) return [];
        return [{ code: code.trim().toUpperCase(), date, label, pct }];
      });
    });
  }
}
