import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { fundDisclosures, funds } from "@/db/schema/funds";
import {
  disclosurePageUrl,
  listDisclosures,
  resolveReportDocument,
} from "@/lib/market/kap";

import { withRun } from "./runs";

/**
 * Fund disclosure archive.
 *
 *   KAP filings ── discover ──▶ fund_disclosures
 *                                     │ record (resolve the PDF link)
 *                                     ▼
 *                              pdf_url filled in
 *
 * Two idempotent passes, mirroring the holdings pipeline. Discovery walks the
 * publication window and upserts every filing of every subject — but only for
 * funds we track, because `fund_code` is a real foreign key here. Recording
 * resolves the direct PDF link for filings that carry an attachment; it is
 * bounded by a limit so a daily run finishes in budget, and skips anything
 * already resolved so it is cheap to re-run.
 */

const CHUNK_SIZE = 500;

/** Filings one record pass will resolve links for. */
const DEFAULT_RECORD_LIMIT = Number(process.env.KAP_DISCLOSURE_LIMIT ?? 500);

/**
 * How many days back a routine discovery run covers. Filings arrive over weeks,
 * and re-discovery is free, so a generous window costs only extra listing
 * calls and keeps late filings from being missed.
 */
const DEFAULT_DISCOVERY_DAYS = Number(process.env.KAP_DISCLOSURE_DAYS ?? 7);

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return isoDay(date);
}

async function trackedFundCodes(): Promise<Set<string>> {
  const rows = await db.select({ code: funds.code }).from(funds);
  return new Set(rows.map((row) => row.code));
}

/* ── Discovery ─────────────────────────────────────────────────────────── */

/**
 * Records every disclosure a tracked fund filed in a window.
 *
 * Filings for funds outside our catalogue are dropped, not stored: the foreign
 * key forbids them, and the whole point of this table is a fund's own paper
 * trail. A row that already exists has its mutable fields refreshed but keeps
 * whatever PDF link was resolved for it — re-discovery must not undo the record
 * pass.
 */
export async function discoverDisclosures(window: { from: string; to: string }) {
  return withRun("kap-disclosures", window, async () => {
    const disclosures = await listDisclosures(window.from, window.to);
    if (disclosures.length === 0) return { rowsRead: 0, rowsWritten: 0 };

    const tracked = await trackedFundCodes();
    const wanted = disclosures.filter((row) => tracked.has(row.fundCode));

    const values = wanted.map((row) => ({
      disclosureIndex: row.disclosureIndex,
      fundCode: row.fundCode,
      fundTitle: row.fundTitle,
      subject: row.subject,
      publishedAt: row.publishedAt,
      isLate: row.isLate,
      disclosureUrl: disclosurePageUrl(row.disclosureIndex),
      attachmentCount: row.attachmentCount,
    }));

    let written = 0;

    for (const batch of chunk(values)) {
      const result = await db
        .insert(fundDisclosures)
        .values(batch)
        .onConflictDoUpdate({
          target: fundDisclosures.disclosureIndex,
          set: {
            fundTitle: sql`excluded.fund_title`,
            subject: sql`excluded.subject`,
            publishedAt: sql`excluded.published_at`,
            isLate: sql`excluded.is_late`,
            disclosureUrl: sql`excluded.disclosure_url`,
            attachmentCount: sql`excluded.attachment_count`,
          },
        });

      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: disclosures.length, rowsWritten: written };
  });
}

/* ── Links ─────────────────────────────────────────────────────────────── */

/**
 * Resolves the direct PDF link for disclosures that carry an attachment.
 *
 * Only the link is kept, not the file. Filings with no attachment are left with
 * a null `pdf_url`, and a row whose link is already stored is skipped, so the
 * pass stays cheap and safe to leave in the daily cron.
 */
export async function recordDisclosureLinks(limit = DEFAULT_RECORD_LIMIT) {
  return withRun("kap-disclosure-links", { limit }, async () => {
    const pending = await db
      .select()
      .from(fundDisclosures)
      .where(
        and(
          isNull(fundDisclosures.pdfUrl),
          sql`${fundDisclosures.attachmentCount} > 0`,
        ),
      )
      .orderBy(fundDisclosures.publishedAt)
      .limit(limit);

    if (pending.length === 0) return { rowsRead: 0, rowsWritten: 0, missing: 0 };

    // `resolveReportDocument` goes through KAP's own concurrency limiter, so
    // handing it the whole slice at once is bounded, not a flood.
    const resolved = await Promise.all(
      pending.map(async (row) => {
        try {
          return {
            row,
            document: await resolveReportDocument(row.disclosureIndex),
            error: undefined as string | undefined,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { row, document: null, error: message };
        }
      }),
    );

    let written = 0;
    let missing = 0;

    for (const { row, document, error } of resolved) {
      if (!document) {
        // Left as it is rather than failed: the attachment may not be published
        // yet, and the next pass picks the row up again.
        missing += 1;
        if (error) console.warn(`[kap] ${row.disclosureIndex}: ${error}`);
        continue;
      }

      await db
        .update(fundDisclosures)
        .set({ pdfUrl: document.url, pdfName: document.fileName })
        .where(eq(fundDisclosures.disclosureIndex, row.disclosureIndex));

      written += 1;
    }

    return { rowsRead: pending.length, rowsWritten: written, missing };
  });
}

/* ── Entry point ───────────────────────────────────────────────────────── */

/**
 * The scheduler's disclosure pass: discover the window's filings, then resolve
 * the PDF links for anything still missing one.
 */
export async function syncDisclosures(
  options: { days?: number; limit?: number } = {},
) {
  const days = options.days ?? DEFAULT_DISCOVERY_DAYS;
  const discovery = await discoverDisclosures({
    from: daysAgo(days),
    to: isoDay(new Date()),
  });
  const links = await recordDisclosureLinks(options.limit);

  return { discovery, links };
}
