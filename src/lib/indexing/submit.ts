import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { ingestRuns } from "@/db/schema/funds";
import { listIndexableUrls } from "@/lib/fondeks/urls";
import { withRun } from "@/lib/ingest/runs";

import {
  GOOGLE_DAILY_QUOTA,
  isGoogleIndexingEnabled,
  submitToGoogle,
} from "./google";
import { isIndexNowEnabled, submitToIndexNow } from "./indexnow";

/**
 * Announces the site's URLs to the engines that take submissions.
 *
 * The two providers are told different things, because they ask for different
 * things. IndexNow wants what changed, so it gets the pages whose content has
 * moved since the last successful submission — everything, the first time.
 * Google publishes a 200-URL daily quota, so it gets a slice of the catalogue
 * per run and works through it in order, which covers a few thousand pages
 * over a couple of weeks.
 *
 * Both slices are derived from `ingest_runs`, the table every other job
 * already records itself in: what a run wrote is what was submitted, so the
 * day's spend and the rotation's position are both readable from history and
 * there is no separate bookkeeping to keep honest. A failed run writes
 * nothing, so its URLs come round again.
 */

const GOOGLE_JOB = "submit-google";
const INDEXNOW_JOB = "submit-indexnow";

export type ProviderSummary = {
  provider: string;
  enabled: boolean;
  submitted: number;
  failed: number;
  /** Why a provider sent nothing, when it sent nothing. */
  note?: string;
};

/** Successful submissions recorded for a job since a point in time. */
async function submittedSince(job: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${ingestRuns.rowsWritten}), 0)` })
    .from(ingestRuns)
    .where(
      and(
        eq(ingestRuns.job, job),
        eq(ingestRuns.status, "success"),
        gte(ingestRuns.startedAt, since),
      ),
    );

  return Number(row?.total ?? 0);
}

/** Everything a job has ever submitted — the rotation's position. */
async function submittedEver(job: string): Promise<number> {
  return submittedSince(job, new Date(0));
}

/** When a job last finished successfully, or null if it never has. */
async function lastSuccessAt(job: string): Promise<Date | null> {
  const [row] = await db
    .select({ startedAt: ingestRuns.startedAt })
    .from(ingestRuns)
    .where(and(eq(ingestRuns.job, job), eq(ingestRuns.status, "success")))
    .orderBy(sql`${ingestRuns.startedAt} desc`)
    .limit(1);

  return row?.startedAt ?? null;
}

/**
 * Google's quota is a calendar day in Pacific time; this counts a rolling 24
 * hours instead, which is never more generous and needs no timezone handling.
 */
function oneDayAgo(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

async function runGoogle(
  urls: { url: string; lastModified: Date }[],
  quota: number,
): Promise<ProviderSummary> {
  if (!isGoogleIndexingEnabled()) {
    return {
      provider: "google",
      enabled: false,
      submitted: 0,
      failed: 0,
      note: "GOOGLE_INDEXING_CLIENT_EMAIL / GOOGLE_INDEXING_PRIVATE_KEY not set",
    };
  }

  const spent = await submittedSince(GOOGLE_JOB, oneDayAgo());
  const budget = Math.max(0, quota - spent);

  if (budget === 0) {
    return {
      provider: "google",
      enabled: true,
      submitted: 0,
      failed: 0,
      note: `daily quota spent (${spent}/${quota} in the last 24h)`,
    };
  }

  // Where the rotation left off. Ordering is the sitemap's, which is stable
  // for a given catalogue, so consecutive runs walk forward rather than
  // resubmitting the same head every time.
  const offset = (await submittedEver(GOOGLE_JOB)) % urls.length;
  const slice = [...urls.slice(offset), ...urls.slice(0, offset)]
    .slice(0, budget)
    .map((entry) => entry.url);

  const result = await withRun(
    GOOGLE_JOB,
    { offset, budget, quota },
    async () => {
      const outcome = await submitToGoogle(slice);
      return {
        rowsRead: slice.length,
        rowsWritten: outcome.submitted.length,
        outcome,
      };
    },
  );

  return {
    provider: "google",
    enabled: true,
    submitted: result.outcome.submitted.length,
    failed: result.outcome.failed.length,
  };
}

async function runIndexNow(
  urls: { url: string; lastModified: Date }[],
): Promise<ProviderSummary> {
  if (!isIndexNowEnabled()) {
    return {
      provider: "indexnow",
      enabled: false,
      submitted: 0,
      failed: 0,
      note: "INDEXNOW_KEY not set, or not 8–128 hex characters",
    };
  }

  const since = await lastSuccessAt(INDEXNOW_JOB);
  const changed = since
    ? urls.filter((entry) => entry.lastModified > since)
    : urls;

  if (changed.length === 0) {
    return {
      provider: "indexnow",
      enabled: true,
      submitted: 0,
      failed: 0,
      note: "nothing changed since the last submission",
    };
  }

  const result = await withRun(
    INDEXNOW_JOB,
    { since: since?.toISOString() ?? null, urls: changed.length },
    async () => {
      const outcome = await submitToIndexNow(changed.map((entry) => entry.url));
      return {
        rowsRead: changed.length,
        rowsWritten: outcome.submitted.length,
        outcome,
      };
    },
  );

  return {
    provider: "indexnow",
    enabled: true,
    submitted: result.outcome.submitted.length,
    failed: result.outcome.failed.length,
  };
}

export type SubmitSummary = {
  urls: number;
  providers: ProviderSummary[];
};

export async function submitUrls({
  googleQuota = GOOGLE_DAILY_QUOTA,
  only,
}: {
  googleQuota?: number;
  /** Restricts the run to one provider — for a dry run of either. */
  only?: "google" | "indexnow";
} = {}): Promise<SubmitSummary> {
  const urls = await listIndexableUrls();
  const entries = urls.map((entry) => ({
    url: entry.url,
    lastModified:
      entry.lastModified instanceof Date
        ? entry.lastModified
        : new Date(entry.lastModified ?? Date.now()),
  }));

  const providers: ProviderSummary[] = [];

  if (only !== "indexnow") providers.push(await runGoogle(entries, googleQuota));
  if (only !== "google") providers.push(await runIndexNow(entries));

  return { urls: entries.length, providers };
}
