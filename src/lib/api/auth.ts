import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Shared secret for scheduler-triggered routes. Accepts either
 * `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`, which covers
 * Vercel Cron, GitHub Actions and a plain curl from a server crontab.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";

  const provided = Buffer.from(header);
  const expected = Buffer.from(secret);

  // Constant-time compare, but only when the lengths match — timingSafeEqual
  // throws otherwise, and the length alone is not a useful secret.
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export function unauthorized() {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "cache-control": "no-store" } },
  );
}
