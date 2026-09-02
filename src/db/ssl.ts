/**
 * `pg` merges connection-string parameters *over* the options passed beside
 * them, and without libpq compatibility it reads `sslmode=require` as
 * `verify-full`. So a URL ending in `?sslmode=require` both discards any
 * `ssl: { rejectUnauthorized: false }` we pass and demands a publicly
 * verifiable chain — managed providers that sign with their own CA then fail
 * with "self-signed certificate".
 *
 * Opting into libpq semantics (the default from pg v9) restores the intent:
 * `require` encrypts without verifying the chain, `verify-full` still verifies
 * it. Shared with drizzle.config.ts so drizzle-kit connects the same way.
 */
export function withLibpqSsl(connectionString: string): string {
  if (!/[?&]sslmode=/i.test(connectionString)) return connectionString;
  if (/[?&]uselibpqcompat=/i.test(connectionString)) return connectionString;

  return `${connectionString}&uselibpqcompat=true`;
}
