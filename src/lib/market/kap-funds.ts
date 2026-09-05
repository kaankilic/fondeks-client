import "server-only";

import { ConcurrencyLimiter, requestText } from "./http";

/**
 * Fund records from KAP — the fund's own page rather than its filings.
 *
 * A fund's launch date is not in TEFAS. Its catalogue endpoint
 * (`fonYonetimBazliBilgiGetir`) returns code, title, type, issuer and fees and
 * nothing dated, and the two fund-level endpoints beside it carry prices, not a
 * künye. KAP publishes it: every fund has a record page whose "FONA İLİŞKİN
 * BİLGİLER" section states `Fonun Halka Arz Tarihi` — the day the fund was
 * first offered, which is what "Son Çıkan Fonlar" ranks on.
 *
 * KAP renders those pages server-side, so this reads HTML rather than JSON.
 * There is no API behind them: the page ships its values inside the React
 * Server Component payload, which is why the parsing below matches on the
 * field keys KAP names its cells with (`td_halkaArzTarihleri`) instead of on
 * markup, which reshuffles with the design.
 *
 * A launch date never changes, so a fund is read once and never again.
 */

const BASE = (
  process.env.KAP_BASE_URL?.trim() || "https://www.kap.org.tr"
).replace(/\/$/, "");

const LANG = "tr";

/** Every fund type KAP lists — YF alone omits ETFs and pension funds. */
const DIRECTORY_PATH = `${BASE}/${LANG}/YatirimFonlari/ALL`;

function timeoutMs(): number {
  return Number(process.env.KAP_TIMEOUT_MS ?? 25_000);
}

/** The directory is one large page; the fund records are ordinary ones. */
function directoryTimeoutMs(): number {
  return Number(process.env.KAP_DIRECTORY_TIMEOUT_MS ?? 90_000);
}

function headers(referer: string): Record<string, string> {
  return {
    referer,
    "accept-language": "tr-TR,tr;q=0.9",
    "user-agent":
      process.env.KAP_USER_AGENT?.trim() ||
      "FondeksBot/1.0 (+https://fondeks.com; portfolio disclosures)",
  };
}

const limiter = new ConcurrencyLimiter(
  Number(process.env.KAP_CONCURRENCY ?? 3),
);

/** "25/01/2010" and "25.01.2010" both appear on KAP; both mean the same day. */
function toIsoDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;

  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/**
 * Fund code → the slug its record lives at, read from KAP's own directory.
 *
 * The slug is the code plus the fund's title, and the title changes with a
 * rename, so it is looked up rather than constructed.
 */
export async function fetchFundDirectory(): Promise<Map<string, string>> {
  const html = await requestText(DIRECTORY_PATH, {
    timeoutMs: directoryTimeoutMs(),
    headers: headers(`${BASE}/${LANG}`),
  });

  const slugs = new Map<string, string>();

  for (const match of html.matchAll(
    /fon-bilgileri\/ozet\/([a-z0-9]+)-([a-z0-9-]+)/g,
  )) {
    // ASCII on both sides: a Turkish fold would read the slug's "i" as "İ"
    // and never match the code TEFAS lists.
    const code = match[1].toUpperCase();
    // A fund is listed under several types; the first entry is as good as any.
    if (!slugs.has(code)) slugs.set(code, `${match[1]}-${match[2]}`);
  }

  return slugs;
}

/**
 * The day a fund was first offered, or null when KAP has no date for it.
 *
 * `Fonun Halka Arz Tarihi` is a table: a fund issued in tranches has one row
 * per tranche, and the fund's age is the first of them. `Fonun Kuruluş Tarihi`
 * is a separate field on the same form that only some fund types file, so it
 * stands in when the offering table is absent.
 */
export async function fetchFundInception(slug: string): Promise<string | null> {
  const html = await limiter.run(() =>
    requestText(`${BASE}/${LANG}/fon-bilgileri/genel/${slug}`, {
      timeoutMs: timeoutMs(),
      headers: headers(`${BASE}/${LANG}/fon-bilgileri/ozet/${slug}`),
    }),
  );

  const offerings = [
    ...html.matchAll(
      /td_halkaArzTarihleri[^]{0,300}?children\\"\s*:\s*\\"([^"\\]{6,12})\\"/g,
    ),
  ]
    .map((match) => toIsoDate(match[1]))
    .filter((date): date is string => date !== null)
    .sort();

  if (offerings.length > 0) return offerings[0];

  for (const key of ["kpy81_acc1_kurulus_tarihi", "kpy81_acc1_fon_kurulus_tarih"]) {
    const pattern = new RegExp(
      `\\\\"div\\\\",\\\\"${key}\\\\"[^]{0,1200}?self-center\\\\",\\\\"children\\\\":\\\\"([^"\\\\]{6,12})\\\\"`,
    );
    const match = html.match(pattern);
    const date = match && toIsoDate(match[1]);
    if (date) return date;
  }

  return null;
}
