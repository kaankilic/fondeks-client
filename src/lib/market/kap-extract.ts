import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { PortfolioReport } from "./kap";

/**
 * Reading holdings out of a Portföy Dağılım Raporu.
 *
 * The filing is a PDF built from a fixed SPK template, but it is not a
 * machine-readable one. Its fonts are subsetted with per-file encodings, its
 * table cells emit in paint order rather than reading order, and section III
 * carries twenty-two columns whose headers land nowhere near their values. A
 * deterministic parser would be a column-guessing heuristic per issuing house.
 * Handing the page to a model that can see the layout is the honest approach,
 * and the numbers it returns are checked against a total the report itself
 * prints (see `EQUITY_TOTAL_TOLERANCE`).
 *
 * Extraction runs through the Batch API: this is a monthly job over roughly one
 * report per fund, nothing waits on it, and batching halves the bill.
 */

/**
 * Haiku 4.5 — the caller's choice, and a good fit: the work is transcription
 * from a fixed template, not judgement. Note it predates adaptive thinking and
 * effort, so neither is set below; both error on this model.
 */
const MODEL = "claude-haiku-4-5";

/**
 * A large equity fund files on the order of a hundred rows. 8k leaves room for
 * roughly three hundred before truncation, which would show up as a `max_tokens`
 * stop reason rather than as quietly missing positions.
 */
const MAX_TOKENS = 8_000;

/**
 * Requests per batch. The API's own ceiling is 100k requests or 256 MB, and the
 * binding one here is bytes: a report is ~80 KB of PDF, ~107 KB once base64
 * inflates it, so a whole month in one batch would sit near the size limit.
 * Splitting keeps each submission well clear and lets a failure lose one slice.
 */
export const REQUESTS_PER_BATCH = Number(
  process.env.KAP_EXTRACT_BATCH_SIZE ?? 200,
);

/**
 * How far the extracted weights may sit from the group total the report prints
 * before the extraction is rejected. Rows are published to two decimals, so a
 * hundred of them carry half a point of rounding on their own.
 */
const EQUITY_TOTAL_TOLERANCE = 1.0;

const HoldingSchema = z.object({
  ticker: z
    .string()
    .describe(
      'BIST ticker exactly as printed in the MENKUL KIYMET column, e.g. "ASELS", "TUPRS". Letters and digits only, no dots or suffixes.',
    ),
  name: z
    .string()
    .describe(
      'Issuer name as printed, e.g. "ASTOR ENERJİ A.Ş.". Use the ticker itself when the row prints no separate name.',
    ),
  isin: z
    .string()
    .nullable()
    .describe('ISIN from the ISIN KODU column, e.g. "TRAASELS91H2". Null if absent.'),
  weight: z
    .number()
    .describe(
      "The row's share of fund portfolio value, from the TOPLAM (FPD göre) column, as a number: 20,53 becomes 20.53.",
    ),
});

const ExtractionSchema = z.object({
  fundCode: z
    .string()
    .nullable()
    .describe('Fund code printed in the report header, e.g. "BHE".'),
  hasPortfolioTable: z
    .boolean()
    .describe(
      'True only if section III, "FON PORTFÖY DEĞERİ TABLOSU", is actually present in the document. Some filings skip it entirely and jump from section II to section V.',
    ),
  periodLabel: z
    .string()
    .nullable()
    .describe('Reporting month as printed, e.g. "Temmuz-2026".'),
  equityGroupWeight: z
    .number()
    .nullable()
    .describe(
      "GRUP TOPLAMI for the HİSSE SENETLERİ group on the TOPLAM (FPD göre) basis. Null if the fund holds no equities.",
    ),
  holdings: z
    .array(HoldingSchema)
    .describe("One entry per equity row. Empty when the fund holds no equities."),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractedHolding = z.infer<typeof HoldingSchema>;

const SYSTEM_PROMPT = `You read Turkish investment fund portfolio reports ("Portföy Dağılım Raporu", filed monthly on KAP) and transcribe their equity holdings.

The report follows a fixed SPK template. Section III, "FON PORTFÖY DEĞERİ TABLOSU", lists the fund's individual positions grouped by instrument type: HİSSE SENETLERİ (equities), then groups such as T.REPO, TPP, kira sertifikaları, mevduat and so on. Each group ends in a GRUP TOPLAMI line.

Transcribe only the HİSSE SENETLERİ group. Ignore every other group, and ignore the aggregate percentages in sections I and II — those are averages over the month, not positions.

Each equity row carries several percentage columns. Take the one under TOPLAM (FPD göre) — the position's share of fund portfolio value. Do not take GRUP (b), which is the share within the equity group and sums to 100, and do not take TOPLAM (FTD göre), which divides by total fund value instead. As a check: the FPD percentages of the equity rows sum to the equity GRUP TOPLAMI, while the GRUP (b) ones sum to 100.

Numbers are Turkish-formatted: "." groups thousands and "," is the decimal separator, so 20,53 is 20.53 and 1.234,56 is 1234.56.

Not every filing includes section III. Some — short ones, often exchange-traded funds — go straight from section II to section V and never list a position, even when section I reports a large equity percentage. That is not the same as a fund holding no equities: set hasPortfolioTable to false and return no holdings, and the report will be set aside rather than read as an empty portfolio.

Report what the document shows. Never infer a ticker, an ISIN or a weight that is not printed, never carry a value across from an adjacent row, and if a row is unreadable leave it out rather than guessing. An empty holdings list is a valid answer for a fund that holds no equities.`;

let cachedClient: Anthropic | null = null;

/** Lazily built, so importing this module never demands a key. */
export function anthropic(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({
      maxRetries: Number(process.env.ANTHROPIC_MAX_RETRIES ?? 3),
    });
  }
  return cachedClient;
}

export function isExtractionConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.ANTHROPIC_AUTH_TOKEN?.trim(),
  );
}

/**
 * `custom_id` is the only channel back from a batch result to what it was for,
 * so it carries the fund and period rather than a row id the DB would have to
 * be consulted for. KAP's disclosure index is globally unique and stable.
 */
export function customIdFor(report: PortfolioReport): string {
  return `pdr-${report.disclosureIndex}`;
}

export function disclosureIndexFrom(customId: string): number | null {
  const match = customId.match(/^pdr-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export type ExtractionRequest =
  Anthropic.Messages.Batches.BatchCreateParams.Request;

/** One report, as a batch request carrying the PDF inline. */
export function buildExtractionRequest(
  report: PortfolioReport,
  pdf: Uint8Array,
): ExtractionRequest {
  return {
    custom_id: customIdFor(report),
    params: {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(ExtractionSchema) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: Buffer.from(pdf).toString("base64"),
              },
            },
            {
              type: "text",
              // The fund and month are already known from the filing metadata;
              // stating them lets a mismatch surface instead of being absorbed.
              text: `This is the ${report.period.slice(0, 7)} Portföy Dağılım Raporu for fund ${report.fundCode} (${report.fundTitle}). Transcribe its equity holdings.`,
            },
          ],
        },
      ],
    },
  };
}

export async function submitBatch(
  requests: ExtractionRequest[],
): Promise<{ id: string; status: string }> {
  const batch = await anthropic().messages.batches.create({ requests });
  return { id: batch.id, status: batch.processing_status };
}

export async function batchStatus(batchId: string) {
  const batch = await anthropic().messages.batches.retrieve(batchId);
  return {
    id: batch.id,
    status: batch.processing_status,
    ended: batch.processing_status === "ended",
    counts: batch.request_counts,
  };
}

export type ExtractionOutcome =
  | { disclosureIndex: number; ok: true; extraction: Extraction }
  | { disclosureIndex: number; ok: false; error: string }
  /** A result whose custom_id we no longer recognise — logged, not applied. */
  | { disclosureIndex: null; ok: false; error: string };

/** Parses one batch result, keeping a bad row from failing the whole batch. */
function readResult(
  customId: string,
  result: Anthropic.Messages.Batches.MessageBatchIndividualResponse["result"],
): ExtractionOutcome {
  const disclosureIndex = disclosureIndexFrom(customId);
  if (disclosureIndex === null) {
    return { disclosureIndex: null, ok: false, error: `unknown custom_id ${customId}` };
  }

  if (result.type === "errored") {
    return {
      disclosureIndex,
      ok: false,
      error: `${result.error.type}: ${JSON.stringify(result.error.error ?? {})}`.slice(0, 500),
    };
  }

  if (result.type !== "succeeded") {
    return { disclosureIndex, ok: false, error: result.type };
  }

  const message = result.message;

  if (message.stop_reason === "max_tokens") {
    // Truncated JSON parses as nothing, but say why rather than "bad JSON".
    return { disclosureIndex, ok: false, error: "response hit max_tokens" };
  }

  if (message.stop_reason === "refusal") {
    return { disclosureIndex, ok: false, error: "model declined the request" };
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text.trim()) {
    return { disclosureIndex, ok: false, error: "empty response" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { disclosureIndex, ok: false, error: `unparseable JSON: ${text.slice(0, 200)}` };
  }

  const parsed = ExtractionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      disclosureIndex,
      ok: false,
      error: `schema mismatch: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    };
  }

  return { disclosureIndex, ok: true, extraction: parsed.data };
}

/** Every result in a finished batch. */
export async function collectBatch(batchId: string): Promise<ExtractionOutcome[]> {
  const outcomes: ExtractionOutcome[] = [];

  for await (const entry of await anthropic().messages.batches.results(batchId)) {
    outcomes.push(readResult(entry.custom_id, entry.result));
  }

  return outcomes;
}

export function cancelBatch(batchId: string) {
  return anthropic().messages.batches.cancel(batchId);
}

const TICKER_PATTERN = /^[A-Z0-9]{3,10}$/;

export type ValidatedHoldings = {
  holdings: ExtractedHolding[];
  /** Why rows were dropped, or the whole extraction rejected. */
  warnings: string[];
  rejected: boolean;
  /** The filing carries no section III, so it says nothing about positions. */
  missingTable: boolean;
};

/**
 * Checks an extraction against what the report asserts about itself before any
 * of it reaches the database.
 *
 * The weights are the point of the exercise: a wrong one becomes a fabricated
 * "artırılan pozisyon" next month. The report prints its own equity group
 * total, so a transcription that read the wrong percentage column — the most
 * likely failure, since the columns sit side by side — does not add up, and is
 * dropped whole rather than half-applied.
 */
export function validateExtraction(
  extraction: Extraction,
  report: PortfolioReport,
): ValidatedHoldings {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const holdings: ExtractedHolding[] = [];

  if (
    extraction.fundCode &&
    extraction.fundCode.trim().toUpperCase() !== report.fundCode
  ) {
    // Noted, never fatal. Houses head the PDF with their own label, which is
    // often a legacy code — KAP files QTEMZ's report as DJA — and the binding
    // between filing and fund is KAP's disclosure id, not this string.
    warnings.push(
      `document is headed ${extraction.fundCode}, KAP files it under ${report.fundCode}`,
    );
  }

  if (!extraction.hasPortfolioTable) {
    // Distinct from an empty portfolio: the filing simply does not say. Writing
    // "holds nothing" here would read as a total liquidation next month.
    return {
      holdings: [],
      rejected: false,
      missingTable: true,
      warnings: [...warnings, "filing carries no section III holdings table"],
    };
  }

  for (const holding of extraction.holdings) {
    const ticker = holding.ticker.trim().toUpperCase().replace(/\.$/, "");

    if (!TICKER_PATTERN.test(ticker)) {
      warnings.push(`dropped unusable ticker ${JSON.stringify(holding.ticker)}`);
      continue;
    }

    if (!Number.isFinite(holding.weight) || holding.weight < 0 || holding.weight > 100) {
      warnings.push(`dropped ${ticker}: weight ${holding.weight} out of range`);
      continue;
    }

    if (seen.has(ticker)) {
      // The template splits a position across lines when it was bought in
      // tranches; the report still prints one weight per line, so summing
      // would double-count. Keep the first and say so.
      warnings.push(`dropped duplicate row for ${ticker}`);
      continue;
    }

    seen.add(ticker);
    holdings.push({ ...holding, ticker, name: holding.name.trim() || ticker });
  }

  const total = holdings.reduce((sum, holding) => sum + holding.weight, 0);

  if (total > 100 + EQUITY_TOTAL_TOLERANCE) {
    return {
      holdings: [],
      rejected: true,
      missingTable: false,
      warnings: [...warnings, `equity weights sum to ${total.toFixed(2)}%`],
    };
  }

  const stated = extraction.equityGroupWeight;

  if (stated !== null && Math.abs(total - stated) > EQUITY_TOTAL_TOLERANCE) {
    return {
      holdings: [],
      rejected: true,
      missingTable: false,
      warnings: [
        ...warnings,
        `rows sum to ${total.toFixed(2)}% but the report's equity GRUP TOPLAMI is ${stated.toFixed(2)}%`,
      ],
    };
  }

  return { holdings, warnings, rejected: false, missingTable: false };
}

export const extractionModel = MODEL;
