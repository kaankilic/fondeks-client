import { consoleProvider } from "./providers/console";
import { ga4Provider } from "./providers/ga4";
import type {
  AnalyticsEventName,
  AnalyticsEvents,
  AnalyticsProvider,
  EventParams,
  UserTraits,
} from "./types";

export type {
  AnalyticsEventName,
  AnalyticsEvents,
  AnalyticsProvider,
  EventParams,
  SurfaceContext,
  UserTraits,
} from "./types";

/**
 * The single dispatcher the whole app talks to (through the `useEvents` hook).
 * It holds the registered providers and forwards every call to each of them,
 * swallowing a misbehaving provider so one broken sink can never take down a
 * user interaction.
 *
 * To add a destination later (Amplitude, Woopra, …) write an
 * `AnalyticsProvider` and `register()` it — nothing at the call sites changes.
 */

const providers: AnalyticsProvider[] = [];
let initialized = false;

/** Turn a debug flag on from the environment without shipping it to prod. */
const debugEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

function safely(action: () => void) {
  try {
    action();
  } catch (error) {
    if (debugEnabled) console.error("[analytics] provider threw", error);
  }
}

export function register(provider: AnalyticsProvider) {
  if (providers.some((existing) => existing.name === provider.name)) return;
  providers.push(provider);
  safely(() => provider.init?.());
}

/**
 * Register the default providers. Idempotent and safe to call from both the
 * client instrumentation hook and lazily on first use.
 */
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  register(ga4Provider);
  if (debugEnabled) register(consoleProvider);
}

export const analytics = {
  /** Called once at startup from `instrumentation-client`. */
  init() {
    ensureInitialized();
  },

  track<E extends AnalyticsEventName>(event: E, params: AnalyticsEvents[E]) {
    ensureInitialized();
    for (const provider of providers) {
      safely(() => provider.track(event, params));
    }
  },

  identify(userId: string, traits?: UserTraits) {
    ensureInitialized();
    for (const provider of providers) {
      safely(() => provider.identify(userId, traits));
    }
  },

  page(path: string, params?: EventParams) {
    ensureInitialized();
    for (const provider of providers) {
      safely(() => provider.page?.(path, params));
    }
  },

  reset() {
    for (const provider of providers) {
      safely(() => provider.reset?.());
    }
  },
};
