"use client";

import Link from "next/link";

import { useAnalytics } from "@/lib/analytics/useAnalytics";
import { GOALS } from "@/lib/fondeks/goals";

import styles from "./GoalGrid.module.scss";

/**
 * Goal-based entry points — the homepage's new lead, in place of the day's top
 * mover. Each card names a job a saver actually has ("park cash", "hold gold",
 * "grow over years") and routes to the ranked category behind it, so the first
 * thing the screen asks is "what are you trying to do?" rather than "what
 * jumped today?".
 *
 * `current` dims the card for the page you are already on, when the grid is
 * reused as cross-navigation on a category page.
 */
export function GoalGrid({
  location = "home",
  current,
}: {
  location?: "home" | "category";
  current?: string;
}) {
  const { track } = useAnalytics();

  return (
    <section className={styles.wrap} aria-label="Hedefe göre fonlar">
      <div className={styles.head}>
        <h2 className={styles.title}>Ne yapmak istiyorsun?</h2>
        <p className={styles.sub}>
          Günün zirvesini değil, hedefini seç. Her liste maliyet ve stopaj
          sonrası getiriye göre sıralanır.
        </p>
      </div>

      <div className={styles.grid}>
        {GOALS.map((goal) => {
          const active = goal.slug === current;
          return (
            <Link
              key={goal.slug}
              href={`/kategori/${goal.slug}`}
              className={`${styles.card} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => track("goal_entry_click", { goal: goal.slug, location })}
            >
              <span className={styles.glyph} aria-hidden>
                {goal.glyph}
              </span>
              <span className={styles.label}>{goal.label}</span>
              <span className={styles.tagline}>{goal.tagline}</span>
              <span className={styles.arrow} aria-hidden>
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
