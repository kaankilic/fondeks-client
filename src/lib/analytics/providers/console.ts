import type { AnalyticsProvider } from "../types";

/**
 * A development sink that prints every call to the browser console, so the
 * customer-journey events can be verified locally where the real GA tag never
 * loads. Registered only outside production (see `../index`).
 */

const style = "color:#6b7cff;font-weight:600";

export const consoleProvider: AnalyticsProvider = {
  name: "console",

  track(event, params) {
    console.debug(`%c[analytics] ${event}`, style, params);
  },

  identify(userId, traits) {
    console.debug(`%c[analytics] identify ${userId}`, style, traits ?? {});
  },

  page(path, params) {
    console.debug(`%c[analytics] page ${path}`, style, params ?? {});
  },

  reset() {
    console.debug(`%c[analytics] reset`, style);
  },
};
