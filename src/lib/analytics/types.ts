/**
 * The vendor-neutral contract every analytics destination implements, plus the
 * typed catalogue of events the product emits.
 *
 * The product only ever talks to the dispatcher in `./index` through the
 * `useAnalytics` hook; the dispatcher fans each call out to every registered
 * provider. Adding Amplitude or Woopra later is a matter of writing one more
 * object that satisfies `AnalyticsProvider` and registering it — no call site
 * changes.
 */

/** GA4 (and most vendors) only accept flat, primitive event parameters. */
export type EventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Where in the UI a list/search action originated, for funnel breakdowns. */
export type SurfaceContext =
  | "nav"
  | "screener"
  | "table"
  | "watchlist"
  | "compare"
  | "leaderboard"
  | "category"
  | "goal";

/**
 * Every event the product can emit, with its payload. `track` is typed against
 * this map, so a typo in a name or a wrong parameter is a compile error.
 *
 * Names are snake_case and ≤ 40 chars to satisfy GA4's event-name rules, and
 * carry no personally identifying data — see `identify` in `./index`.
 */
export type AnalyticsEvents = {
  // Navigation & discovery
  page_view: { path: string; navigation_type?: string };
  navigation_click: { label: string; href: string };

  // Search
  search_submitted: { query: string; source: SurfaceContext };
  search_result_selected: {
    code: string;
    query?: string;
    source: SurfaceContext;
  };

  // Fund lists & detail
  fund_list_item_click: { code: string; context: SurfaceContext };
  list_sorted: { sort: string; context: SurfaceContext };
  list_filtered: { filter: string; value: string; context: SurfaceContext };
  filters_reset: { context: SurfaceContext };
  filter_results_shown: { count: number; context: SurfaceContext };
  fund_compare_click: { code: string; authed: boolean };
  fund_watch_toggled: { code: string; action: "add" | "remove"; authed: boolean };
  chart_range_changed: { range: string };

  // Compare board
  compare_fund_added: { code: string; total: number };
  compare_fund_removed: { code: string; total: number };

  // Goal-based discovery (v2.1 "Choose")
  goal_entry_click: { goal: string; location: "home" | "category" };
  category_page_viewed: { goal: string; funds: number };

  /**
   * The north-star event: a fund the user had compared is added to their
   * tracking list — the Choose stage coupling to Hold. `from` says which
   * surface the add happened on; `compared` is whether this code had been put
   * on the compare board earlier in the session.
   */
  compare_to_track: {
    code: string;
    from: "compare" | "fund";
    compared: boolean;
  };

  // Fund-detail depth & impressions (growth v1)
  decision_panel_viewed: {
    code: string;
    has_full_year: boolean;
    bilinmiyor_count: number;
  };
  fund_detail_scroll_depth: { code: string; depth: 25 | 50 | 75 | 100 };
  compare_board_viewed: { funds: number };
  watchlist_viewed: { count: number; empty: boolean };
  fund_similar_click: { from: string; to: string };

  // Content engagement
  guide_viewed: { slug: string };
  guide_scroll_depth: { slug: string; depth: 25 | 50 | 75 | 100 };
  search_no_results: { query: string; source: SurfaceContext };

  // Hygiene
  outbound_link_click: { destination: string; host: string; location: string };
  not_found_viewed: { path: string };

  // Conversion & auth
  signup_gate_viewed: { preset: "fund" | "watchlist"; code?: string };
  signup_gate_dismissed: { preset: "fund" | "watchlist"; code?: string };
  auth_cta_click: {
    target: "login" | "signup" | "google";
    location: string;
  };
  login_submitted: { method: "password" };
  login_failed: { reason?: string };
  signup_submitted: { method: "password" };
  signup_failed: { reason?: string };
  logout_clicked: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/**
 * Attributes describing the signed-in user. Deliberately free of PII: GA4
 * forbids sending email, names, or anything that identifies a person, so only
 * the opaque account id and coarse flags belong here.
 */
export type UserTraits = EventParams;

export interface AnalyticsProvider {
  /** Stable identifier, used in debug output. */
  readonly name: string;
  /** Called once when the provider is registered. */
  init?(): void;
  /** Record a named event with its parameters. */
  track<E extends AnalyticsEventName>(
    event: E,
    params: AnalyticsEvents[E],
  ): void;
  /** Associate subsequent events with a user. */
  identify(userId: string, traits?: UserTraits): void;
  /**
   * Set properties on the current (anonymous or signed-in) user without
   * changing their id. Used for growth segmentation flags like
   * `has_watchlist` / `has_compared`.
   */
  setUserProperties?(traits: UserTraits): void;
  /** Forget the current user (e.g. on sign-out). */
  reset?(): void;
}
