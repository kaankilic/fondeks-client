import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  fundHoldingSnapshots,
  fundPositions,
  funds,
  kapExtractionBatches,
  kapPortfolioReports,
  symbols,
} from "@/db/schema/funds";
import {
  batchStatus,
  buildExtractionRequest,
  collectBatch,
  disclosureIndexFrom,
  extractionModel,
  isExtractionConfigured,
  REQUESTS_PER_BATCH,
  submitBatch,
  validateExtraction,
  type ExtractionRequest,
} from "@/lib/market/kap-extract";
import {
  FixturePreviousHoldingsProvider,
  FixtureHoldingsProvider,
  fetchDocumentPdf,
  holdingsProviderName,
  isKapEnabled,
  listPortfolioReports,
  resolveReportDocument,
  type HoldingSnapshot,
  type PortfolioReport,
  type ReportDocument,
} from "@/lib/market/kap";

import { withJobLock } from "./lock";
import { withRun, type RunSummary } from "./runs";

/**
 * Portfolio holdings pipeline.
 *
 *   KAP filings ── discover ──▶ kap_portfolio_reports
 *                                      │ document (where the fund's PDF lives)
 *                                      │ submit   (Batch API)
 *                                      ▼
 *                               fund_holding_snapshots   (what a fund held)
 *                                      │  diff consecutive periods
 *                                      ▼
 *                              fund_positions            (artırılan / azaltılan)
 *
 * Extraction is asynchronous, so a period is worked in two passes: one that
 * discovers filings and submits them, and one that collects finished batches
 * and rebuilds the movers. Both are idempotent and resumable — a run that dies
 * mid-period leaves its reports queued against a batch the next collect finds.
 *
 * Between the two sits the document pass. It records where each fund's report
 * PDF lives on KAP without downloading or reading it, which is the cheap step
 * worth doing eagerly: discovery is a walk over every filing day in the window
 * and cannot be repeated for free, while a recorded document turns any later
 * read of that report into a single download. That is what makes a second
 * extraction — a new prompt, a section the first pass did not transcribe —
 * something that can be run over the archive whenever, rather than a reason to
 * crawl KAP again.
 *
 * Keeping the raw snapshots means the movers can be recomputed for any pair of
 * periods, and a corrected filing repairs the derived table on the next run.
 */

const CHUNK_SIZE = 500;
/** How many movers each side of the widget shows. */
const TOP_N = 4;

/**
 * Reports one submit pass will pay to extract.
 *
 * Sized for the scheduler rather than for the month: fetching this many PDFs at
 * KAP_CONCURRENCY has to finish inside a cron invocation's budget. The submit
 * cron runs daily through the filing window, so a catalogue larger than this
 * converges over a few days instead of in one run. Raise it for a CLI backfill,
 * where nothing is timing out.
 */
const DEFAULT_SUBMIT_LIMIT = Number(process.env.KAP_SUBMIT_LIMIT ?? 200);

/**
 * Reports one document pass will locate. Higher than the submit limit on
 * purpose: this pass makes one listing call per filing and downloads nothing,
 * so it can stay ahead of extraction and keep the archive complete even in a
 * month whose extraction is still catching up.
 */
const DEFAULT_DOCUMENT_LIMIT = Number(process.env.KAP_DOCUMENT_LIMIT ?? 500);

/**
 * Statuses a submit pass picks up by default.
 *
 * `failed` is included: a batch that errored server-side, or an extraction the
 * weight check rejected, is worth one more attempt rather than leaving the
 * fund's position permanently blank. `queued` never is — that work is in flight
 * and already billed — and `extracted` only when a re-extraction asks for it.
 */
const SUBMITTABLE = ["discovered", "failed"] as const;

/** Statuses that have a fund behind them, so their document is worth locating. */
const DOCUMENTABLE = [
  "discovered",
  "failed",
  "extracted",
  "no_detail",
  "queued",
] as const;

type ReportStatus = (typeof kapPortfolioReports.$inferSelect)["status"];

/**
 * How long after a period ends to keep looking for its filings. Most arrive in
 * the first fortnight of the following month; late ones trickle in for weeks,
 * and `isLate` on the filing says so.
 */
const REPORTING_WINDOW_DAYS = 75;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** First day of the month, the grain filings are published at. */
export function periodOf(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function previousPeriod(period: string): string {
  const date = new Date(`${period}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextPeriod(period: string): string {
  const date = new Date(`${period}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * When a period's filings are published: from the day the period closes until
 * the window shuts, never past today. A report for July is filed in August.
 */
export function reportingWindow(period: string, now = new Date()) {
  const opens = nextPeriod(period);
  const closes = addDays(opens, REPORTING_WINDOW_DAYS);
  const today = now.toISOString().slice(0, 10);

  return { from: opens, to: closes < today ? closes : today };
}

async function trackedFundCodes(): Promise<Set<string>> {
  const rows = await db.select({ code: funds.code }).from(funds);
  return new Set(rows.map((row) => row.code));
}

async function writeSnapshots(rows: HoldingSnapshot[], source: string) {
  const known = await trackedFundCodes();

  const values = rows
    .filter((row) => known.has(row.code))
    .map((row) => ({
      fundCode: row.code,
      period: row.period,
      ticker: row.ticker,
      weight: row.weight,
      source,
    }));

  let written = 0;

  for (const batch of chunk(values)) {
    const result = await db
      .insert(fundHoldingSnapshots)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          fundHoldingSnapshots.fundCode,
          fundHoldingSnapshots.period,
          fundHoldingSnapshots.ticker,
        ],
        set: {
          weight: sql`excluded.weight`,
          source: sql`excluded.source`,
          ingestedAt: sql`now()`,
        },
      });

    written += result.rowCount ?? batch.length;
  }

  return written;
}

/* ── Discovery ─────────────────────────────────────────────────────────── */

/**
 * Records every portfolio report KAP published in a window.
 *
 * Filings are recorded whether or not we follow the fund — the row is the
 * answer to "has this fund reported yet?", and one that only exists for funds
 * already in the catalogue could not answer it after a catalogue gap. Reports
 * for funds we don't track are marked skipped and never extracted.
 *
 * A report already past `discovered` is left alone: KAP re-publishing the same
 * disclosure index must not silently re-queue work that has been paid for.
 */
export async function discoverPortfolioReports(window: {
  from: string;
  to: string;
}) {
  return withRun("kap-discovery", window, async () => {
    const reports = await listPortfolioReports(window.from, window.to);
    if (reports.length === 0) return { rowsRead: 0, rowsWritten: 0, reports };

    const tracked = await trackedFundCodes();

    const values = reports.map((report) => ({
      disclosureIndex: report.disclosureIndex,
      fundCode: report.fundCode,
      fundTitle: report.fundTitle,
      period: report.period,
      publishedAt: report.publishedAt,
      isLate: report.isLate,
      status: tracked.has(report.fundCode)
        ? ("discovered" as const)
        : ("skipped" as const),
    }));

    let written = 0;

    for (const batch of chunk(values)) {
      const result = await db
        .insert(kapPortfolioReports)
        .values(batch)
        .onConflictDoUpdate({
          target: kapPortfolioReports.disclosureIndex,
          set: {
            fundTitle: sql`excluded.fund_title`,
            publishedAt: sql`excluded.published_at`,
            isLate: sql`excluded.is_late`,
            // Only a report nothing has been spent on yet can change lane —
            // this is what makes re-discovery free.
            status: sql`case
              when ${kapPortfolioReports.status} in ('discovered', 'skipped')
              then excluded.status
              else ${kapPortfolioReports.status}
            end`,
          },
        });

      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: reports.length, rowsWritten: written, reports };
  });
}

/* ── Documents ─────────────────────────────────────────────────────────── */

/**
 * Records where each fund's report PDF lives, without downloading it.
 *
 * KAP hosts the file and keeps hosting it, so the archive is the reference —
 * the attachment id and the URL it resolves to — rather than a copy of the
 * bytes. What that buys is a report that can be read again on demand: the
 * expensive parts of getting here are the day-by-day disclosure walk and the
 * per-filing attachment lookup, and both are behind us once this row is
 * written.
 *
 * Only reports for funds we follow are located; KAP files for every fund in the
 * country and resolving all of them would be thousands of calls for documents
 * nothing will ever open. A report whose document is already known is skipped,
 * which makes the pass cheap to re-run and safe to leave in the daily cron.
 */
export async function recordReportDocuments(
  period = periodOf(),
  limit = DEFAULT_DOCUMENT_LIMIT,
) {
  return withRun("kap-documents", { period, limit }, async () => {
    const pending = await db
      .select()
      .from(kapPortfolioReports)
      .where(
        and(
          eq(kapPortfolioReports.period, period),
          isNull(kapPortfolioReports.documentObjId),
          inArray(kapPortfolioReports.status, [...DOCUMENTABLE]),
        ),
      )
      .orderBy(kapPortfolioReports.publishedAt)
      .limit(limit);

    if (pending.length === 0) return { rowsRead: 0, rowsWritten: 0, missing: 0 };

    const tracked = await trackedFundCodes();
    const wanted = pending.filter((row) => tracked.has(row.fundCode));

    // `resolveReportDocument` goes through KAP's own concurrency limiter, so
    // handing it the whole slice at once is bounded, not a flood.
    const resolved = await Promise.all(
      wanted.map(async (row) => {
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
        // Left as it is rather than failed: the filing may simply not have had
        // its attachment published yet, and the next pass picks it up again.
        missing += 1;
        if (error) console.warn(`[kap] ${row.disclosureIndex}: ${error}`);
        continue;
      }

      await saveReportDocument(row.disclosureIndex, document);
      written += 1;
    }

    return { rowsRead: pending.length, rowsWritten: written, missing };
  });
}

function saveReportDocument(disclosureIndex: number, document: ReportDocument) {
  return markReport(disclosureIndex, {
    documentObjId: document.objId,
    documentName: document.fileName,
    documentUrl: document.url,
  });
}

/**
 * The report PDF for one row, going through the recorded document when there is
 * one and recording it when there is not.
 *
 * A submit pass that runs without a document pass behind it therefore still
 * works, and still leaves the reference behind for whatever reads the report
 * next.
 */
async function reportPdf(
  row: typeof kapPortfolioReports.$inferSelect,
): Promise<Uint8Array | null> {
  if (row.documentObjId) {
    return fetchDocumentPdf({ objId: row.documentObjId }, row.disclosureIndex);
  }

  const document = await resolveReportDocument(row.disclosureIndex);
  if (!document) return null;

  await saveReportDocument(row.disclosureIndex, document);
  return fetchDocumentPdf(document, row.disclosureIndex);
}

/** Every report of a fund we hold a document for, newest period first. */
export async function fundReportDocuments(fundCode: string) {
  return db
    .select({
      disclosureIndex: kapPortfolioReports.disclosureIndex,
      period: kapPortfolioReports.period,
      publishedAt: kapPortfolioReports.publishedAt,
      status: kapPortfolioReports.status,
      fileName: kapPortfolioReports.documentName,
      url: kapPortfolioReports.documentUrl,
    })
    .from(kapPortfolioReports)
    .where(
      and(
        eq(kapPortfolioReports.fundCode, fundCode.toUpperCase()),
        isNotNull(kapPortfolioReports.documentUrl),
      ),
    )
    .orderBy(desc(kapPortfolioReports.period));
}

/* ── Extraction ────────────────────────────────────────────────────────── */

export type SubmitOptions = {
  limit?: number;
  /** Which lanes to pick up. Defaults to `SUBMITTABLE`. */
  statuses?: readonly ReportStatus[];
  /** Restrict to these funds, e.g. for a re-extraction of one house. */
  codes?: string[];
};

/**
 * Sends a period's outstanding reports to the model.
 *
 * The PDFs come from the recorded documents, so this is one download per
 * report and no listing traffic — which is what makes `statuses` worth having:
 * pointing it at `extracted` re-reads reports already in the archive, and that
 * is the whole re-extraction path (`reextractPositions`).
 */
export async function submitExtractions(
  period = periodOf(),
  options: SubmitOptions = {},
) {
  const {
    limit = DEFAULT_SUBMIT_LIMIT,
    statuses = SUBMITTABLE,
    codes,
  } = options;

  if (!isExtractionConfigured()) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — portfolio reports cannot be extracted",
    );
  }

  return withRun(
    "kap-extract-submit",
    { period, limit, statuses, codes, model: extractionModel },
    async () => {
      const pending = await db
        .select()
        .from(kapPortfolioReports)
        .where(
          and(
            eq(kapPortfolioReports.period, period),
            inArray(kapPortfolioReports.status, [...statuses]),
            ...(codes?.length
              ? [inArray(kapPortfolioReports.fundCode, codes)]
              : []),
          ),
        )
        // Oldest filing first, so a catalogue that needs several runs works
        // through the period in a predictable order.
        .orderBy(kapPortfolioReports.publishedAt)
        .limit(limit);

      if (pending.length === 0) {
        return { rowsRead: 0, rowsWritten: 0, batches: [] as string[] };
      }

      const tracked = await trackedFundCodes();
      const batches: string[] = [];
      let submitted = 0;

      // Downloaded a slice at a time: a whole period's PDFs held at once, then
      // base64'd for the request, is a few hundred megabytes of process memory.
      for (const slice of chunk(pending, REQUESTS_PER_BATCH)) {
        const requests: ExtractionRequest[] = [];

        const fetched = await Promise.all(
          slice.map(async (row) => {
            if (!tracked.has(row.fundCode)) {
              return { row, pdf: null, error: undefined as string | undefined };
            }

            try {
              return { row, pdf: await reportPdf(row), error: undefined };
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              return { row, pdf: null, error: message };
            }
          }),
        );

        for (const { row, pdf, error } of fetched) {
          if (!tracked.has(row.fundCode)) {
            await markReport(row.disclosureIndex, {
              status: "skipped",
              note: "fund is not in the catalogue",
            });
            continue;
          }

          if (!pdf) {
            await markReport(row.disclosureIndex, {
              status: "failed",
              note: error ?? "filing carries no PDF attachment",
            });
            continue;
          }

          requests.push(buildExtractionRequest(toPortfolioReport(row), pdf));
        }

        if (requests.length === 0) continue;

        const batch = await submitBatch(requests);
        batches.push(batch.id);

        const queued = requests
          .map((request) => disclosureIndexFrom(request.custom_id))
          .filter((index): index is number => index !== null);

        // The batch is already running and already billable. Recording it and
        // marking its reports has to happen together: a batch row without
        // queued reports collects into nothing, and queued reports without a
        // batch row are never collected at all.
        await db.transaction(async (tx) => {
          await tx.insert(kapExtractionBatches).values({
            id: batch.id,
            period,
            status: batch.status,
            requestCount: requests.length,
          });

          await tx
            .update(kapPortfolioReports)
            .set({ status: "queued", batchId: batch.id, note: null })
            .where(inArray(kapPortfolioReports.disclosureIndex, queued));
        });

        submitted += requests.length;
      }

      return { rowsRead: pending.length, rowsWritten: submitted, batches };
    },
  );
}

function toPortfolioReport(
  row: typeof kapPortfolioReports.$inferSelect,
): PortfolioReport {
  return {
    disclosureIndex: row.disclosureIndex,
    fundCode: row.fundCode,
    fundTitle: row.fundTitle,
    period: row.period,
    publishedAt: row.publishedAt,
    isLate: row.isLate,
  };
}

async function markReport(
  disclosureIndex: number,
  set: Partial<typeof kapPortfolioReports.$inferInsert>,
) {
  await db
    .update(kapPortfolioReports)
    .set(set)
    .where(eq(kapPortfolioReports.disclosureIndex, disclosureIndex));
}

/**
 * Replaces one fund's equity holdings for a period.
 *
 * A report is the fund's whole equity book, so a position it no longer lists
 * has been sold — the period is rewritten rather than merged, or the sale would
 * read as an unchanged holding forever.
 */
async function applyExtractedHoldings(
  report: typeof kapPortfolioReports.$inferSelect,
  holdings: { ticker: string; name: string; weight: number }[],
) {
  if (holdings.length > 0) {
    await db
      .insert(symbols)
      .values(
        holdings.map((holding) => ({
          ticker: holding.ticker,
          name: holding.name,
          // No brand colour is published anywhere; the widget falls back.
          color: null,
        })),
      )
      // A curated name or colour outranks whatever the filing printed.
      .onConflictDoNothing({ target: symbols.ticker });
  }

  await db
    .delete(fundHoldingSnapshots)
    .where(
      and(
        eq(fundHoldingSnapshots.fundCode, report.fundCode),
        eq(fundHoldingSnapshots.period, report.period),
      ),
    );

  if (holdings.length === 0) return 0;

  const result = await db.insert(fundHoldingSnapshots).values(
    holdings.map((holding) => ({
      fundCode: report.fundCode,
      period: report.period,
      ticker: holding.ticker,
      weight: holding.weight,
      source: "kap",
    })),
  );

  return result.rowCount ?? holdings.length;
}

/**
 * Reads back every finished extraction batch and writes what it returned.
 *
 * Batches that are still running are left for the next pass; the run reports
 * how many it is still waiting on so a caller can decide whether to come back.
 */
export async function collectExtractions() {
  return withRun("kap-extract-collect", {}, async () => {
    const open = await db
      .select()
      .from(kapExtractionBatches)
      .where(isNull(kapExtractionBatches.collectedAt));

    let read = 0;
    let written = 0;
    let pending = 0;
    const periods = new Set<string>();

    for (const batch of open) {
      const status = await batchStatus(batch.id);

      if (!status.ended) {
        pending += 1;
        if (status.status !== batch.status) {
          await db
            .update(kapExtractionBatches)
            .set({ status: status.status })
            .where(eq(kapExtractionBatches.id, batch.id));
        }
        continue;
      }

      const outcomes = await collectBatch(batch.id);
      read += outcomes.length;

      for (const outcome of outcomes) {
        if (outcome.disclosureIndex === null) {
          console.warn(`[kap] ${batch.id}: ${outcome.error}`);
          continue;
        }

        const [report] = await db
          .select()
          .from(kapPortfolioReports)
          .where(
            eq(kapPortfolioReports.disclosureIndex, outcome.disclosureIndex),
          );

        if (!report) continue;

        if (!outcome.ok) {
          await markReport(report.disclosureIndex, {
            status: "failed",
            note: outcome.error,
          });
          continue;
        }

        const checked = validateExtraction(
          outcome.extraction,
          toPortfolioReport(report),
        );

        if (checked.missingTable) {
          // Terminal: the filing will never gain a section III, so it is not a
          // failure to retry. The fund keeps its asset-class panel.
          await markReport(report.disclosureIndex, {
            status: "no_detail",
            note: checked.warnings.join("; ").slice(0, 1000),
          });
          continue;
        }

        if (checked.rejected) {
          // Rejected whole: a misread weight column would become a fabricated
          // position change next month, which is worse than an empty panel.
          await markReport(report.disclosureIndex, {
            status: "failed",
            note: checked.warnings.join("; ").slice(0, 1000),
          });
          continue;
        }

        const rows = await applyExtractedHoldings(report, checked.holdings);
        written += rows;
        periods.add(report.period);

        await markReport(report.disclosureIndex, {
          status: "extracted",
          holdingsCount: checked.holdings.length,
          note: checked.warnings.length
            ? checked.warnings.join("; ").slice(0, 1000)
            : null,
          extractedAt: new Date(),
        });
      }

      await db
        .update(kapExtractionBatches)
        .set({ status: status.status, collectedAt: new Date() })
        .where(eq(kapExtractionBatches.id, batch.id));
    }

    return {
      rowsRead: read,
      rowsWritten: written,
      pendingBatches: pending,
      periods: [...periods],
    };
  });
}

/* ── Offline path ──────────────────────────────────────────────────────── */

/** Imports one reporting period's holdings from the fixture provider. */
export async function syncFixtureHoldings(period = periodOf()) {
  const provider = new FixtureHoldingsProvider();

  return withRun("fund-holdings", { provider: provider.name, period }, async () => {
    const rows = await provider.fetchHoldings(period);
    const written = await writeSnapshots(rows, provider.name);
    return { rowsRead: rows.length, rowsWritten: written };
  });
}

/** Seeds the previous period offline, so the first diff has a baseline. */
export async function seedPreviousHoldings(period = previousPeriod(periodOf())) {
  const provider = new FixturePreviousHoldingsProvider();
  const rows = await provider.fetchHoldings(period);
  return writeSnapshots(rows, provider.name);
}

/* ── Movers ────────────────────────────────────────────────────────────── */

/**
 * Rebuilds `fund_positions` by diffing two snapshots: the biggest weight
 * increases and decreases per fund, which is exactly what the detail page
 * shows as artırılan / azaltılan pozisyonlar.
 */
export async function computeFundPositions(period = periodOf()) {
  const previous = previousPeriod(period);

  return withRun("fund-positions", { period, previous }, async () => {
    const current = await db
      .select({
        fundCode: fundHoldingSnapshots.fundCode,
        ticker: fundHoldingSnapshots.ticker,
        weight: fundHoldingSnapshots.weight,
      })
      .from(fundHoldingSnapshots)
      .where(eq(fundHoldingSnapshots.period, period));

    const before = await db
      .select({
        fundCode: fundHoldingSnapshots.fundCode,
        ticker: fundHoldingSnapshots.ticker,
        weight: fundHoldingSnapshots.weight,
      })
      .from(fundHoldingSnapshots)
      .where(eq(fundHoldingSnapshots.period, previous));

    const baseline = new Map(
      before.map((row) => [`${row.fundCode}:${row.ticker}`, row.weight]),
    );

    // Diffing needs both sides. A fund missing the baseline would read as
    // having opened every position; one missing the current period would read
    // as having sold every position — and a fund whose filing omits section III
    // (`no_detail`) has exactly that shape, month after month. Both are
    // fabrications, so only funds present in both periods are diffed at all.
    const held = new Set(current.map((row) => row.fundCode));
    const comparable = new Set(
      before.map((row) => row.fundCode).filter((code) => held.has(code)),
    );

    // Only tickers we can name are shown; the widget renders the company.
    const known = new Set(
      (await db.select({ ticker: symbols.ticker }).from(symbols)).map(
        (row) => row.ticker,
      ),
    );

    const byFund = new Map<
      string,
      { ticker: string; weight: number; change: number }[]
    >();

    for (const row of current) {
      if (!known.has(row.ticker)) continue;
      if (!comparable.has(row.fundCode)) continue;

      const previousWeight = baseline.get(`${row.fundCode}:${row.ticker}`) ?? 0;
      const change = Number((row.weight - previousWeight).toFixed(2));
      if (change === 0) continue;

      const list = byFund.get(row.fundCode) ?? [];
      list.push({ ticker: row.ticker, weight: row.weight, change });
      byFund.set(row.fundCode, list);
    }

    // A position held last period and absent now was sold outright — it is the
    // sharpest cut a fund can make, and reading only `current` would miss it.
    // Only for a fund whose current report we actually read: `comparable`
    // carries that guarantee.
    const currentKeys = new Set(
      current.map((row) => `${row.fundCode}:${row.ticker}`),
    );

    for (const row of before) {
      if (!known.has(row.ticker)) continue;
      if (!comparable.has(row.fundCode)) continue;

      const key = `${row.fundCode}:${row.ticker}`;
      if (currentKeys.has(key)) continue;

      const list = byFund.get(row.fundCode) ?? [];
      list.push({ ticker: row.ticker, weight: 0, change: -row.weight });
      byFund.set(row.fundCode, list);
    }

    const rows: (typeof fundPositions.$inferInsert)[] = [];

    for (const [fundCode, movers] of byFund) {
      const increased = movers
        .filter((mover) => mover.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, TOP_N);

      const decreased = movers
        .filter((mover) => mover.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, TOP_N);

      increased.forEach((mover, rank) =>
        rows.push({
          fundCode,
          ticker: mover.ticker,
          period,
          direction: "increased",
          weight: mover.weight,
          changePoints: mover.change,
          rank,
        }),
      );

      decreased.forEach((mover, rank) =>
        rows.push({
          fundCode,
          ticker: mover.ticker,
          period,
          direction: "decreased",
          weight: mover.weight,
          changePoints: mover.change,
          rank,
        }),
      );
    }

    // The period is recomputed wholesale, so removed movers disappear.
    await db.delete(fundPositions).where(eq(fundPositions.period, period));

    let written = 0;
    for (const batch of chunk(rows)) {
      const result = await db.insert(fundPositions).values(batch);
      written += result.rowCount ?? batch.length;
    }

    return { rowsRead: current.length, rowsWritten: written };
  });
}

/* ── Entry points ──────────────────────────────────────────────────────── */

/**
 * What a submit pass did. Offline it finished the job; against KAP it handed
 * the reports to a batch that a later `collectPositions` applies.
 */
export type SyncPositionsResult =
  | {
      mode: "offline";
      provider: string;
      holdings: RunSummary;
      positions: RunSummary;
    }
  | {
      mode: "queued";
      provider: "kap";
      window: { from: string; to: string };
      discovery: RunSummary;
      documents: RunSummary;
      submission: RunSummary;
      batches: string[];
    }
  /** Another runner already has this job; nothing was read, sent or billed. */
  | { mode: "locked" };

/**
 * The scheduler's submit pass: find the period's filings and send them for
 * extraction. Offline, it fills the snapshots directly and rebuilds the movers
 * in one go, since nothing is asynchronous.
 */
export async function syncPositions(
  period = periodOf(),
): Promise<SyncPositionsResult> {
  const outcome = await withJobLock("sync-positions", async () => {
    if (!isKapEnabled()) {
      const holdings = await syncFixtureHoldings(period);
      const positions = await computeFundPositions(period);
      return {
        mode: "offline" as const,
        provider: holdingsProviderName(),
        holdings: holdings.run,
        positions: positions.run,
      };
    }

    const window = reportingWindow(period);
    const discovery = await discoverPortfolioReports(window);

    // Ahead of submission, so the period's reports are all locatable even when
    // extraction only gets through the first `KAP_SUBMIT_LIMIT` of them.
    const documents = await recordReportDocuments(period);
    const submission = await submitExtractions(period);

    return {
      mode: "queued" as const,
      provider: "kap" as const,
      window,
      discovery: discovery.run,
      documents: documents.run,
      submission: submission.run,
      batches: submission.batches,
    };
  });

  return outcome.ran ? outcome.result : { mode: "locked" };
}

/**
 * Reads a period's reports again, from the documents already recorded.
 *
 * This is the point of keeping the reference: extraction is a model reading a
 * PDF, so a better prompt or a schema that asks for more than equity rows is
 * worth re-running over filings that were transcribed months ago — and doing so
 * costs one download per report, with no discovery walk and no attachment
 * lookup. Reports whose extraction is still in flight are left alone; paying
 * for the same batch twice is the one thing this must not do.
 *
 * `codes` narrows it to a few funds, which is how to try a prompt change
 * without re-billing the whole catalogue.
 */
export async function reextractPositions(options: {
  period?: string;
  codes?: string[];
  limit?: number;
} = {}) {
  const period = options.period ?? periodOf();

  if (!isKapEnabled()) {
    throw new Error(
      "re-extraction reads KAP filings — set HOLDINGS_PROVIDER=kap",
    );
  }

  const outcome = await withJobLock("sync-positions", async () => {
    // Anything discovered but never located is picked up here too, so a
    // re-extraction of an old period does not silently skip it.
    const documents = await recordReportDocuments(period);

    const submission = await submitExtractions(period, {
      limit: options.limit,
      statuses: ["discovered", "failed", "extracted", "no_detail"],
      codes: options.codes?.map((code) => code.trim().toUpperCase()),
    });

    return {
      period,
      documents: documents.run,
      submission: submission.run,
      batches: submission.batches,
    };
  });

  return outcome.ran ? outcome.result : null;
}

/**
 * The scheduler's collect pass: apply whatever finished, then rebuild the
 * movers for every period that gained holdings.
 */
export async function collectPositions(): Promise<CollectPositionsResult> {
  const outcome = await withJobLock("collect-positions", async () => {
    const collected = await collectExtractions();

    const rebuilt = [];
    for (const period of collected.periods) {
      const positions = await computeFundPositions(period);
      rebuilt.push({ period, ...positions.run });
    }

    return {
      locked: false as const,
      collection: collected.run,
      pendingBatches: collected.pendingBatches,
      positions: rebuilt,
    };
  });

  return outcome.ran ? outcome.result : { locked: true };
}

export type CollectPositionsResult =
  | {
      locked: false;
      collection: RunSummary;
      pendingBatches: number;
      positions: (RunSummary & { period: string })[];
    }
  /** Another runner already has this job. */
  | { locked: true };

/** Whether a period still has work in flight. */
export async function periodProgress(period = periodOf()) {
  const rows = await db
    .select({
      status: kapPortfolioReports.status,
      count: sql<number>`count(*)::int`,
    })
    .from(kapPortfolioReports)
    .where(eq(kapPortfolioReports.period, period))
    .groupBy(kapPortfolioReports.status);

  return Object.fromEntries(rows.map((row) => [row.status, row.count])) as Partial<
    Record<typeof kapPortfolioReports.$inferSelect.status, number>
  >;
}
