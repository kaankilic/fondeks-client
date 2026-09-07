import "server-only";

import { ConcurrencyLimiter, requestJson, UpstreamError } from "./http";

/**
 * Fund portfolio disclosures, from KAP (Kamuyu Aydınlatma Platformu).
 *
 * Every Turkish fund files a monthly "Portföy Dağılım Raporu" (subject
 * `PORTFOLIO_REPORT_SUBJECT`). Section III of that filing — FON PORTFÖY DEĞERİ
 * TABLOSU — is the one place anyone publishes Turkish fund holdings at security
 * level: one row per instrument, carrying the BIST ticker, the ISIN and the
 * position's share of portfolio value. That is what artırılan / azaltılan
 * pozisyonlar needs, and it is why this module exists.
 *
 * The report is a PDF attachment, not data, so the numbers are read out of it
 * by an extraction pass (`./kap-extract`). This module's job is everything up
 * to that: find the filings, resolve their attachments, fetch the bytes.
 *
 * Three things about KAP's own API are load-bearing, all verified against the
 * live site rather than documented anywhere:
 *
 *  - `kapsitebackend.mkk.com.tr`, the origin its bundle names, does not resolve
 *    publicly. Every call has to go through the site's own `/{lang}/api/…`
 *    proxy, which is what `BASE` is.
 *  - the disclosure query takes `yyyy-MM-dd` dates and nothing else. The
 *    `dd.MM.yyyy` the UI displays comes back 500.
 *  - it caps a response at 2000 rows with no paging and no total, so a wide
 *    range silently truncates. Discovery walks one day at a time instead;
 *    a heavy day runs ~350 rows.
 */

/** Subject line KAP files the monthly portfolio report under. */
export const PORTFOLIO_REPORT_SUBJECT = "Portföy Dağılım Raporu";

/** Rows one `byCriteria` response will return before it silently truncates. */
const RESPONSE_ROW_CAP = 2000;

export type HoldingSnapshot = {
  code: string;
  /** First day of the reporting period. */
  period: string;
  ticker: string;
  /** Share of the portfolio, in percent. */
  weight: number;
};

export interface HoldingsProvider {
  readonly name: string;
  fetchHoldings(period: string): Promise<HoldingSnapshot[]>;
}

/**
 * A monthly portfolio report KAP has published — enough to identify the filing
 * and say what it is for. This is what an extraction is built against, and it
 * round-trips through `kap_portfolio_reports` unchanged.
 */
export type PortfolioReport = {
  disclosureIndex: number;
  fundCode: string;
  fundTitle: string;
  /** First day of the month the report covers. */
  period: string;
  publishedAt: Date;
  /** Filed after its deadline — still valid, just late. */
  isLate: boolean;
};

/** A report as the listing returns it, before anything has been fetched. */
export type DiscoveredReport = PortfolioReport & { attachmentCount: number };

export type ReportAttachment = {
  objId: string;
  fileName: string;
  fileExtension: string;
};

/**
 * The report PDF itself, kept as a reference to KAP's copy.
 *
 * `objId` is the identity and `url` is only derived from it, so a job that
 * wants the bytes again asks KAP for them rather than reading a file we mirror.
 * Recording this is what separates "we know where this fund's report is" from
 * "we have read it": the first is one cheap call at discovery time, and it is
 * what lets a later extraction pass — a new prompt, a section we did not read
 * the first time — start from the document instead of from the listing.
 */
export type ReportDocument = {
  objId: string;
  fileName: string;
  url: string;
};

type DisclosureRow = {
  disclosureIndex?: number;
  fundCode?: string | null;
  kapTitle?: string | null;
  subject?: string | null;
  publishDate?: string | null;
  year?: number | null;
  period?: number | null;
  isLate?: boolean | null;
  attachmentCount?: number | null;
};

type AttachmentDetail = {
  disclosure?: {
    disclosureBasic?: { attachments?: ReportAttachment[] | null } | null;
    attachments?: ReportAttachment[] | null;
  } | null;
  attachments?: ReportAttachment[] | null;
};

const BASE = (
  process.env.KAP_BASE_URL?.trim() || "https://www.kap.org.tr"
).replace(/\/$/, "");

const LANG = "tr";

function timeoutMs(): number {
  return Number(process.env.KAP_TIMEOUT_MS ?? 25_000);
}

/**
 * KAP serves the site to browsers, not to clients, and answers a bare fetch
 * with its Next.js error shell. A browser's Accept-Language and Referer are
 * enough; no cookie or token is involved.
 */
function headers(referer = `${BASE}/${LANG}`): Record<string, string> {
  return {
    referer,
    "accept-language": "tr-TR,tr;q=0.9",
    "user-agent":
      process.env.KAP_USER_AGENT?.trim() ||
      "FondeksBot/1.0 (+https://fondeks.com; portfolio disclosures)",
  };
}

/** Caps in-flight KAP requests, so a month's discovery cannot flood the site. */
const limiter = new ConcurrencyLimiter(
  Number(process.env.KAP_CONCURRENCY ?? 3),
);

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Every day from `from` to `to` inclusive, as yyyy-mm-dd. */
function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    days.push(isoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/** "03.08.2026 19:10:39" — KAP publishes local Istanbul time, UTC+3. */
function parsePublishDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = value
    .trim()
    .match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, day, month, year, hour, minute, second] = match;
  const at = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`,
  );

  return Number.isNaN(at) ? null : new Date(at);
}

/** `year` + `period` (the month number) is the period the report covers. */
function periodFrom(row: DisclosureRow): string | null {
  const { year, period } = row;
  if (!year || !period || period < 1 || period > 12) return null;

  return `${year}-${String(period).padStart(2, "0")}-01`;
}

/** One day of fund disclosures. Widening this past a day risks the row cap. */
async function fetchDay(day: string): Promise<DisclosureRow[]> {
  const rows = await limiter.run(() =>
    requestJson<DisclosureRow[]>(
      `${BASE}/${LANG}/api/disclosure/funds/byCriteria`,
      {
        method: "POST",
        body: {
          fromDate: day,
          toDate: day,
          fundTypeList: [],
          mkkMemberOidList: [],
          fundOidList: [],
          passiveFundOidList: [],
          disclosureClass: "",
          isLate: "",
          subjectList: [],
          discIndex: [],
          fromSrc: false,
          srcCategory: "",
        },
        timeoutMs: timeoutMs(),
        headers: headers(`${BASE}/${LANG}/bildirim-sorgu`),
      },
    ),
  );

  if (!Array.isArray(rows)) return [];

  if (rows.length >= RESPONSE_ROW_CAP) {
    // Silent truncation would look like "no report filed" for every fund past
    // the cap, and the next month's diff would read that as a sold position.
    console.warn(
      `[kap] ${day} returned ${rows.length} rows — at the response cap, so the day is likely truncated`,
    );
  }

  return rows;
}

/**
 * Portfolio reports KAP published between two dates.
 *
 * Filing runs from the first business days of a month well into the next one,
 * and late filings arrive later still, so the caller passes a publication
 * window and filters on the period each report *covers*.
 */
export async function listPortfolioReports(
  from: string,
  to: string,
): Promise<DiscoveredReport[]> {
  const days = daysBetween(from, to);
  const perDay = await Promise.all(days.map((day) => fetchDay(day)));

  const reports = new Map<number, DiscoveredReport>();

  for (const rows of perDay) {
    for (const row of rows) {
      if (row.subject !== PORTFOLIO_REPORT_SUBJECT) continue;

      const period = periodFrom(row);
      const publishedAt = parsePublishDate(row.publishDate);
      const code = row.fundCode?.trim().toUpperCase();

      if (!row.disclosureIndex || !period || !publishedAt || !code) continue;
      if (!row.attachmentCount) continue;

      const existing = reports.get(row.disclosureIndex);
      if (existing && existing.publishedAt >= publishedAt) continue;

      reports.set(row.disclosureIndex, {
        disclosureIndex: row.disclosureIndex,
        fundCode: code,
        fundTitle: row.kapTitle?.trim() ?? code,
        period,
        publishedAt,
        isLate: row.isLate === true,
        attachmentCount: row.attachmentCount,
      });
    }
  }

  return [...reports.values()].sort(
    (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime(),
  );
}

/** The files attached to one disclosure. A portfolio report carries one PDF. */
export async function fetchAttachments(
  disclosureIndex: number,
): Promise<ReportAttachment[]> {
  const payload = await limiter.run(() =>
    requestJson<AttachmentDetail[] | AttachmentDetail>(
      `${BASE}/${LANG}/api/notification/attachment-detail/${disclosureIndex}`,
      {
        timeoutMs: timeoutMs(),
        headers: headers(`${BASE}/${LANG}/Bildirim/${disclosureIndex}`),
      },
    ),
  );

  const entries = Array.isArray(payload) ? payload : [payload];

  return entries.flatMap((entry) => {
    const disclosure = entry?.disclosure;
    return (
      disclosure?.disclosureBasic?.attachments ??
      disclosure?.attachments ??
      entry?.attachments ??
      []
    );
  });
}

/**
 * Unwraps KAP's download envelope.
 *
 * The file endpoint does not return the PDF. It returns a Java-serialised
 * `byte[]` — `ac ed 00 05` and a type header, then a big-endian int32 length,
 * then the bytes — while still claiming `content-type: application/pdf`. Handed
 * to a PDF reader as-is it is simply a corrupt file, so the header is stripped
 * here rather than left for the extraction pass to trip over.
 */
export function unwrapSerialisedBytes(payload: Uint8Array): Uint8Array {
  const JAVA_STREAM_MAGIC = [0xac, 0xed, 0x00, 0x05];

  const wrapped = JAVA_STREAM_MAGIC.every(
    (byte, index) => payload[index] === byte,
  );
  if (!wrapped) return payload;

  // The array's length field is the four bytes before its first element, and
  // `%PDF` is that first element. Locating it by marker rather than by a fixed
  // offset keeps this working if the serialised type header ever changes.
  const start = indexOfAscii(payload, "%PDF");
  if (start < 4) return payload;

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  );
  const length = view.getInt32(start - 4, false);

  if (length <= 0 || start + length > payload.length) {
    // Header says one thing, the body another — trust what actually arrived.
    return payload.subarray(start);
  }

  return payload.subarray(start, start + length);
}

function indexOfAscii(bytes: Uint8Array, needle: string): number {
  const target = [...needle].map((char) => char.charCodeAt(0));

  outer: for (let i = 0; i + target.length <= bytes.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (bytes[i + j] !== target[j]) continue outer;
    }
    return i;
  }

  return -1;
}

/**
 * Where KAP serves one attachment.
 *
 * Derived from the id on every use rather than trusted from a stored string,
 * so a recorded document keeps resolving if `KAP_BASE_URL` ever moves.
 */
export function attachmentUrl(objId: string): string {
  return `${BASE}/${LANG}/api/file/download/${objId}`;
}

/** Downloads one attachment, unwrapped and ready to read. */
export async function fetchAttachmentBytes(
  objId: string,
  disclosureIndex?: number,
): Promise<Uint8Array> {
  const url = attachmentUrl(objId);

  return limiter.run(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());

    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/pdf,*/*",
          ...headers(
            disclosureIndex === undefined
              ? `${BASE}/${LANG}`
              : `${BASE}/${LANG}/Bildirim/${disclosureIndex}`,
          ),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new UpstreamError(
          `GET ${url} failed with ${response.status}`,
          response.status,
        );
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      return unwrapSerialisedBytes(bytes);
    } finally {
      clearTimeout(timer);
    }
  });
}

/**
 * Locates a disclosure's report PDF without downloading it.
 *
 * One listing call per filing, and the answer is worth keeping: with it stored,
 * every later read of that report is a single download.
 */
export async function resolveReportDocument(
  disclosureIndex: number,
): Promise<ReportDocument | null> {
  const attachments = await fetchAttachments(disclosureIndex);

  const pdf = attachments.find(
    (attachment) =>
      attachment.fileExtension?.toLowerCase() === "pdf" ||
      attachment.fileName?.toLowerCase().endsWith(".pdf"),
  );
  if (!pdf?.objId) return null;

  return {
    objId: pdf.objId,
    fileName: pdf.fileName?.trim() || `${disclosureIndex}.pdf`,
    url: attachmentUrl(pdf.objId),
  };
}

/** The bytes behind a document we have already located. */
export function fetchDocumentPdf(
  document: Pick<ReportDocument, "objId">,
  disclosureIndex?: number,
): Promise<Uint8Array> {
  return fetchAttachmentBytes(document.objId, disclosureIndex);
}

/** The report PDF for a disclosure, or null when it carries no PDF. */
export async function fetchReportPdf(
  disclosureIndex: number,
): Promise<{ document: ReportDocument; bytes: Uint8Array } | null> {
  const document = await resolveReportDocument(disclosureIndex);
  if (!document) return null;

  return {
    document,
    bytes: await fetchDocumentPdf(document, disclosureIndex),
  };
}

/**
 * Offline holdings. Produces two consecutive periods per fund so the diff job
 * has something real to compare, reproducing the design's AFT movers.
 */
export class FixtureHoldingsProvider implements HoldingsProvider {
  readonly name = "fixture";

  async fetchHoldings(period: string): Promise<HoldingSnapshot[]> {
    const { AFT_HOLDINGS, FUND_FIXTURES, STOCK_POOL } = await import(
      "@/lib/fondeks/fixtures"
    );

    return FUND_FIXTURES.flatMap((fund, fundIndex) => {
      if (fund.code === "AFT") {
        // Weights that reproduce the design's stated changes when diffed.
        return [
          ...AFT_HOLDINGS.increased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: holding.weight,
          })),
          ...AFT_HOLDINGS.decreased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: holding.weight,
          })),
        ];
      }

      return Array.from({ length: 8 }, (_, slot) => {
        const stock = STOCK_POOL[(fundIndex * 3 + slot) % STOCK_POOL.length];
        const rank = slot % 4;
        return {
          code: fund.code,
          period,
          ticker: stock.ticker,
          weight: Number((8.6 - rank * 1.4 - fundIndex * 0.2).toFixed(2)),
        };
      });
    });
  }
}

/** Previous period's weights, so the diff has a baseline to compare against. */
export class FixturePreviousHoldingsProvider implements HoldingsProvider {
  readonly name = "fixture-previous";

  async fetchHoldings(period: string): Promise<HoldingSnapshot[]> {
    const { AFT_HOLDINGS, FUND_FIXTURES, STOCK_POOL } = await import(
      "@/lib/fondeks/fixtures"
    );

    return FUND_FIXTURES.flatMap((fund, fundIndex) => {
      if (fund.code === "AFT") {
        return [
          ...AFT_HOLDINGS.increased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            // Last period's weight is today's minus the reported change.
            weight: Number((holding.weight - holding.change).toFixed(2)),
          })),
          ...AFT_HOLDINGS.decreased.map((holding) => ({
            code: fund.code,
            period,
            ticker: holding.ticker,
            weight: Number((holding.weight - holding.change).toFixed(2)),
          })),
        ];
      }

      return Array.from({ length: 8 }, (_, slot) => {
        const stock = STOCK_POOL[(fundIndex * 3 + slot) % STOCK_POOL.length];
        const increased = slot < 4;
        const rank = slot % 4;
        const change = (increased ? 1 : -1) * (1.7 - rank * 0.35);
        return {
          code: fund.code,
          period,
          ticker: stock.ticker,
          weight: Number((8.6 - rank * 1.4 - fundIndex * 0.2 - change).toFixed(2)),
        };
      });
    });
  }
}

/** "kap" reads real filings; anything else stays offline. */
export function holdingsProviderName(): string {
  return process.env.HOLDINGS_PROVIDER?.trim() || "fixture";
}

export function isKapEnabled(): boolean {
  return holdingsProviderName() === "kap";
}
