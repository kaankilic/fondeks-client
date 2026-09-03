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

/**
 * How long to sit out after a 429. A throttle is measured in windows, not in
 * milliseconds: exponential backoff from a sub-second base exhausts every
 * retry long before the window clears, which reads as a hard failure. Sources
 * that send Retry-After override this; TEFAS sends nothing.
 */
const DEFAULT_COOLDOWN_MS = 60_000;

/** Retry-After is either seconds or an HTTP date. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RequestOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  /** Wait after a 429 when the response carries no Retry-After. */
  cooldownMs?: number;
  headers?: Record<string, string>;
  /** Serialised as JSON when present. */
  body?: unknown;
  method?: "GET" | "POST";
  signal?: AbortSignal;
  /** Paces this request against a shared budget, retries included. */
  rateLimiter?: RateLimiter;
};

/**
 * Sliding-window rate limit: at most `limit` starts in any `windowMs`.
 *
 * A cap on concurrency is not a cap on rate — three workers can still empty a
 * per-minute budget in seconds. Callers queue in order, so a short job spends
 * its burst immediately and pays nothing, while a long backfill paces itself.
 */
export class RateLimiter {
  private starts: number[] = [];
  private blockedUntil = 0;
  /** Serialises admission, so concurrent callers can't read one free slot. */
  private admission: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  acquire(): Promise<void> {
    const next = this.admission.then(() => this.admit());
    // Failures must not poison the chain for everyone behind this caller.
    this.admission = next.catch(() => {});
    return next;
  }

  /**
   * Holds every caller back until `ms` from now. Called when the source says
   * we are over budget, so the rest of the batch stops walking into the same
   * wall while the blocked request waits its turn out.
   */
  pause(ms: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + ms);
  }

  private async admit(): Promise<void> {
    for (;;) {
      const now = Date.now();

      if (now < this.blockedUntil) {
        await sleep(this.blockedUntil - now);
        continue;
      }

      const cutoff = now - this.windowMs;
      this.starts = this.starts.filter((start) => start > cutoff);

      if (this.starts.length < this.limit) {
        this.starts.push(now);
        return;
      }

      // Wait for the oldest start to age out of the window.
      await sleep(this.starts[0] - cutoff);
    }
  }
}

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
    cooldownMs = DEFAULT_COOLDOWN_MS,
    headers = {},
    body,
    method = body === undefined ? "GET" : "POST",
    signal,
    rateLimiter,
  }: RequestOptions = {},
): Promise<T> {
  let lastError: unknown;
  /** Set when the source throttles us, so the wait matches its window. */
  let cooldown: number | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    // Every attempt spends budget, so retries queue like first tries.
    await rateLimiter?.acquire();

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
        if (response.status === 429) {
          cooldown = retryAfterMs(response) ?? cooldownMs;
          // Hold the rest of the batch back too, or it walks into the same wall.
          rateLimiter?.pause(cooldown);
        }

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

      // Full jitter on top of the cooldown, so a throttled batch does not all
      // come back at the same instant and trip the next window together.
      await sleep(
        cooldown === null
          ? backoffMs(attempt, retryBaseMs)
          : cooldown + backoffMs(attempt, retryBaseMs),
      );
      cooldown = null;
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
