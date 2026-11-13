"use client";

import dynamic from "next/dynamic";

import type { PricePoint } from "@/lib/fondeks/types";

import styles from "./PriceChart.module.scss";

/**
 * The chart is interactive-only (hover, range toggle) and sits below the fold,
 * so it does not have to render on the server. Deferring the chunk until mount
 * trims the critical path and keeps Googlebot's HTML small. The skeleton holds
 * the chart's exact canvas so the layout does not jump when it swaps in.
 */
const PriceChart = dynamic(
  () => import("./PriceChart").then((mod) => ({ default: mod.PriceChart })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.skeleton} aria-hidden>
        <div className={styles.skeletonCanvas} />
        <div className={styles.skeletonControls} />
      </div>
    ),
  },
);

export function PriceChartLazy({ prices }: { prices: PricePoint[] }) {
  return <PriceChart prices={prices} />;
}
