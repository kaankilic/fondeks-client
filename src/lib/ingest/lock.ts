import "server-only";

import { pool } from "@/db";

/**
 * Single-runner guard for the ingest jobs.
 *
 * The cron routes can be driven from more than one place at once — Vercel Cron,
 * an external cron server, a `yarn ingest` by hand — and two overlapping runs of
 * the same job is not a harmless duplicate: `submitExtractions` would read the
 * same `discovered` reports twice and send both copies to the Batch API, which
 * is billed per request. A Postgres advisory lock is enough to make the second
 * runner stand down, and it costs no schema.
 *
 * The lock lives on one dedicated connection held for the whole job. Taking it
 * through the pool would be a bug: `pg_advisory_lock` is session-scoped, and the
 * unlock could land on a different pooled connection than the lock did.
 */

/** Namespace for this app's locks, so the keyspace can't collide. */
const LOCK_NAMESPACE = 0x464b; // "FK"

/** FNV-1a, so a job name maps to the same int4 on every host. */
function keyFor(job: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < job.length; i++) {
    hash ^= job.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Postgres advisory keys are signed int4.
  return hash | 0;
}

export type LockOutcome<T> =
  | { ran: true; result: T }
  /** Another runner holds the lock; this call did nothing. */
  | { ran: false; result: null };

/**
 * Runs `task` if no other runner holds `job`, otherwise returns immediately.
 *
 * Skipping is a normal outcome, not a failure — the other runner is doing the
 * work — so callers report it rather than throwing.
 */
export async function withJobLock<T>(
  job: string,
  task: () => Promise<T>,
): Promise<LockOutcome<T>> {
  const client = await pool.connect();

  try {
    const { rows } = await client.query<{ acquired: boolean }>(
      "select pg_try_advisory_lock($1, $2) as acquired",
      [LOCK_NAMESPACE, keyFor(job)],
    );

    if (!rows[0]?.acquired) {
      console.info(`[lock] ${job} is already running elsewhere — skipping`);
      return { ran: false, result: null };
    }

    try {
      return { ran: true, result: await task() };
    } finally {
      // Released explicitly rather than left to the connection closing, since
      // the client goes back to the pool still open.
      await client.query("select pg_advisory_unlock($1, $2)", [
        LOCK_NAMESPACE,
        keyFor(job),
      ]);
    }
  } finally {
    client.release();
  }
}
