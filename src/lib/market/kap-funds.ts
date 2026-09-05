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
 * KAP renders those pages with React Server Components and there is no API
 * behind them, so this reads the page. Both shapes of it: the same URL answers
 * sometimes with HTML carrying the flight payload in a `<script>`, sometimes
 * with the flight payload alone, and which one arrives is KAP's cache's
 * business, not ours. Unescaping first collapses the two into one, and the
 * parsing then matches on the field keys KAP names its own values with —
 * `fundCode`, `fundOid`, `td_halkaArzTarihleri` — rather than on markup, which
 * reshuffles with the design.
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

/** The directory is one ~8MB page; the fund records are ordinary ones. */
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

/**
 * Flight data embedded in HTML escapes its quotes; served on its own it does
 * not. Undoing that leaves one shape to match against.
 */
function unescapeFlight(payload: string): string {
  return payload.replace(/\\"/g, '"');
}

/** "25/01/2010" and "25.01.2010" both appear on KAP; both mean the same day. */
function toIsoDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;

  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/**
 * Fund code → the id KAP files it under, read from KAP's own directory.
 *
 * A record page answers to either its `fundOid` or a slug of the fund's title;
 * the oid is the one that survives a rename.
 */
export async function fetchFundDirectory(): Promise<Map<string, string>> {
  const payload = unescapeFlight(
    await requestText(DIRECTORY_PATH, {
      timeoutMs: directoryTimeoutMs(),
      headers: headers(`${BASE}/${LANG}`),
    }),
  );

  const directory = new Map<string, string>();

  // The id leads its record; `fundId` sits between the two.
  for (const match of payload.matchAll(
    /"fundOid"\s*:\s*"([0-9a-fA-F]{16,40})"[\s\S]{0,200}?"fundCode"\s*:\s*"([A-Z0-9]{2,8})"/g,
  )) {
    const [, oid, code] = match;
    // A fund is listed under several types; the first entry is as good as any.
    if (!directory.has(code)) directory.set(code, oid);
  }

  return directory;
}

/**
 * The day a fund was first offered, or null when KAP has no date for it.
 *
 * `Fonun Halka Arz Tarihi` is a table: a fund issued in tranches has one row
 * per tranche, and the fund's age is the first of them. `Fonun Kuruluş Tarihi`
 * is a separate field on the same form that only some fund types file, so it
 * stands in when the offering table is absent.
 */
export async function fetchFundInception(oid: string): Promise<string | null> {
  const payload = unescapeFlight(
    await limiter.run(() =>
      requestText(`${BASE}/${LANG}/fon-bilgileri/genel/${oid}`, {
        timeoutMs: timeoutMs(),
        headers: headers(`${BASE}/${LANG}/fon-bilgileri/ozet/${oid}`),
      }),
    ),
  );

  const offerings = [
    ...payload.matchAll(
      /td_halkaArzTarihleri[\s\S]{0,300}?"children"\s*:\s*"([^"]{6,12})"/g,
    ),
  ]
    .map((match) => toIsoDate(match[1]))
    .filter((date): date is string => date !== null)
    .sort();

  if (offerings.length > 0) return offerings[0];

  for (const key of [
    "kpy81_acc1_kurulus_tarihi",
    "kpy81_acc1_fon_kurulus_tarih",
  ]) {
    const match = payload.match(
      new RegExp(
        `"div","${key}"[\\s\\S]{0,1200}?"children"\\s*:\\s*"([^"]{6,12})"`,
      ),
    );
    const date = match && toIsoDate(match[1]);
    if (date) return date;
  }

  return null;
}
