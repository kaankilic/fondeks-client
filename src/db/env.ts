import "server-only";

/** Reads DATABASE_URL lazily so a missing value fails at query time, not at import time. */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return url;
}
