import "server-only";

/** Public market data is identical for everyone, so it is cacheable at the edge. */
export const PUBLIC_CACHE = {
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...PUBLIC_CACHE, ...init?.headers },
  });
}

export function badRequest(message: string) {
  return Response.json(
    { error: message },
    { status: 400, headers: { "cache-control": "no-store" } },
  );
}

export function notFound(message = "not found") {
  return Response.json(
    { error: message },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}
