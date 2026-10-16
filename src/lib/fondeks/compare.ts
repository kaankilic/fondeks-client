import { resolveNetReturn } from "./choose";
import { UNKNOWN } from "./constants";
import {
  formatAum,
  formatCountOrUnknown,
  formatPercent,
  formatPercentPrefixed,
  formatPrice,
} from "./format";
import type { CompareRow, Fund } from "./types";

/**
 * The metrics shown on the compare board, one row each, in reading order. The
 * Choose-stage rows (net-of-stopaj, real return, TER, category standing) sit
 * among the headline returns so the honest comparison is the first thing read;
 * each degrades to "Bilinmiyor" where the figure is not yet published.
 */
const METRICS: { label: string; value: (fund: Fund) => string }[] = [
  { label: "1 Yıl", value: (f) => formatPercent(f.y1) },
  {
    label: "Stopaj Sonrası Net (1Y)",
    value: (f) => {
      const net = resolveNetReturn(f, "y1");
      return net === null ? UNKNOWN : formatPercent(net.value);
    },
  },
  {
    label: "Reel Getiri (1Y)",
    value: (f) =>
      f.realReturn?.y1 == null ? UNKNOWN : formatPercent(f.realReturn.y1),
  },
  { label: "3 Ay", value: (f) => formatPercent(f.m3) },
  { label: "1 Ay", value: (f) => formatPercent(f.m1) },
  { label: "Günlük", value: (f) => formatPercent(f.daily) },
  {
    label: "Toplam Gider (TER)",
    value: (f) => (f.ter == null ? UNKNOWN : formatPercentPrefixed(f.ter, 2)),
  },
  {
    label: "Kategori Dilimi (1Y)",
    value: (f) =>
      f.categoryPercentile == null
        ? UNKNOWN
        : `İlk %${Math.max(1, 100 - f.categoryPercentile)}`,
  },
  { label: "Son Fiyat", value: (f) => formatPrice(f.price) },
  { label: "Risk", value: (f) => (f.risk === null ? UNKNOWN : `${f.risk}/7`) },
  { label: "Büyüklük", value: (f) => formatAum(f.aum) },
  { label: "Yatırımcı", value: (f) => formatCountOrUnknown(f.investors) },
  { label: "Kurucu", value: (f) => f.founder },
  { label: "Kategori", value: (f) => f.category },
];

/** Turn a set of funds into aligned compare rows (values follow fund order). */
export function compareRows(funds: Fund[]): CompareRow[] {
  return METRICS.map((metric) => ({
    label: metric.label,
    values: funds.map(metric.value),
  }));
}
