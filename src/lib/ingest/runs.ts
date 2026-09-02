import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { ingestRuns } from "@/db/schema/funds";

export type RunSummary = {
  id: string;
  job: string;
  rowsRead: number;
  rowsWritten: number;
  durationMs: number;
};

/**
 * Wraps a job so every attempt is recorded — start, finish, row counts and the
 * error when it fails. `/api/health` reads these to report freshness.
 */
export async function withRun<T extends { rowsRead: number; rowsWritten: number }>(
  job: string,
  params: Record<string, unknown>,
  task: () => Promise<T>,
): Promise<T & { run: RunSummary }> {
  const startedAt = Date.now();

  const [run] = await db
    .insert(ingestRuns)
    .values({ job, status: "running", params })
    .returning({ id: ingestRuns.id });

  try {
    const result = await task();

    await db
      .update(ingestRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        rowsRead: result.rowsRead,
        rowsWritten: result.rowsWritten,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      ...result,
      run: {
        id: run.id,
        job,
        rowsRead: result.rowsRead,
        rowsWritten: result.rowsWritten,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(ingestRuns)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(ingestRuns.id, run.id));

    throw error;
  }
}

export async function getLastRun(job: string) {
  const [row] = await db
    .select()
    .from(ingestRuns)
    .where(eq(ingestRuns.job, job))
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);

  return row ?? null;
}

export async function getRecentRuns(limit = 10) {
  return db
    .select()
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.startedAt))
    .limit(limit);
}
