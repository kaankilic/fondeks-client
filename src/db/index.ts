import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseUrl } from "./env";
import * as schema from "./schema";
import { withLibpqSsl } from "./ssl";

// Next.js dev reloads modules on every change; reuse one pool across reloads
// so we don't exhaust the database's connection limit.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

function createPool(): Pool {
  // Managed providers (Neon, Supabase, RDS) usually require TLS and sign with
  // their own CA; `withLibpqSsl` makes `sslmode=require` mean "encrypt without
  // verifying the chain" instead of failing on a self-signed certificate.
  const connectionString = withLibpqSsl(getDatabaseUrl());

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool = globalForDb.__pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
  logger: process.env.DRIZZLE_LOG === "true",
});

export type Database = typeof db;
export { schema };
