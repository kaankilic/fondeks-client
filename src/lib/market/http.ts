import "server-only";

/**
 * Small resilient HTTP layer for upstream market data: bounded timeouts,
 * retries with exponential backoff and jitter, and a shared concurrency limit
 * so a backfill cannot hammer the source.
 */

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** Retry on transport errors, 429 and 5xx — never on a 4xx we caused. */
function isRetryable(error: unknown): boolean {
  if (error instanceof UpstreamError) {
    if (error.status === undefined) return true;
    return error.status === 429 || error.status >= 500;
  }
  return true;
}

function backoffMs(attempt: number, base: number): number {
  const exponential = base * 2 ** (attempt - 1);
  // Full jitter, so parallel workers don't retry in lockstep.
  return Math.round(Math.random() * Math.min(exponential, 30_000));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RequestOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  headers?: Record<string, string>;
  /** Serialised as JSON when present. */
  body?: unknown;
  method?: "GET" | "POST";
  signal?: AbortSignal;
};

/** Caps how many upstream requests are in flight at once, process-wide. */
export class ConcurrencyLimiter {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;

    try {
      return await task();
    } finally {
      this.active -= 1;
      this.queue.shift()?.();
    }
  }
}

export async function requestJson<T>(
  url: string,
  {
    timeoutMs = 20_000,
    maxRetries = 3,
    retryBaseMs = 500,
    headers = {},
    body,
    method = body === undefined ? "GET" : "POST",
    signal,
  }: RequestOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          accept: "application/json",
          ...(body === undefined
            ? {}
            : { "content-type": "application/json; charset=UTF-8" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        // Keep a short excerpt: enough to debug, small enough to log.
        const text = (await response.text().catch(() => "")).slice(0, 500);
        throw new UpstreamError(
          `${method} ${url} failed with ${response.status}`,
          response.status,
          text,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      const canRetry = attempt <= maxRetries && isRetryable(error);
      if (!canRetry) break;
      await sleep(backoffMs(attempt, retryBaseMs));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  if (lastError instanceof UpstreamError) throw lastError;
  throw new UpstreamError(
    `${method} ${url} failed: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
