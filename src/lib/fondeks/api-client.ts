import "server-only";

/**
 * Thin client for the external Fondeks market-data API. Every reader in
 * `queries.ts` that the API can serve goes through here rather than touching a
 * database: the app no longer owns the data, it consumes the published
 * contract described in the project's OpenAPI document.
 *
 * The base URL is configured with `FONDEKS_API_URL` — the production subdomain
 * has no `/api` prefix, while a local Laravel host serves the same routes under
 * `/api`, so the full prefix belongs in the variable, not in the paths here.
 */
const BASE_URL = (
  process.env.FONDEKS_API_URL ?? "https://api.fondeks.com"
).replace(/\/+$/, "");

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

/**
 * Default freshness window, in seconds. The API publishes
 * `Cache-Control: s-maxage=60, stale-while-revalidate=300`, so 60s matches what
 * it considers fresh: navigation is served from Next's data cache, and a price
 * is never more than a minute behind. Readers over stable data (the catalogue
 * size, the sitemap) pass a longer window.
 */
const DEFAULT_REVALIDATE = 60;

/** A non-2xx response, carrying the status so callers can single out a 404. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * GET a JSON resource. Throws {@link ApiError} on a non-2xx response, using the
 * API's `{ "error": "…" }` body as the message when it has one.
 *
 * Cached through Next's data cache for `revalidate` seconds (default
 * {@link DEFAULT_REVALIDATE}). The API is the freshness authority — it declares
 * a 60s window — so holding a response that long keeps navigation fast while
 * prices stay within a minute of the source.
 */
export async function apiFetch<T>(
  path: string,
  params?: QueryParams,
  revalidate: number = DEFAULT_REVALIDATE,
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: { accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    let message = `Fondeks API ${response.status}`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Non-JSON error body — keep the status-line message.
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

/** As {@link apiFetch}, but a 404 resolves to `null` rather than throwing. */
export async function apiFetchOrNull<T>(
  path: string,
  params?: QueryParams,
  revalidate: number = DEFAULT_REVALIDATE,
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, params, revalidate);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
