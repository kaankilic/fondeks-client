import { UNKNOWN } from "./constants";
import {
  formatAum,
  formatCountOrUnknown,
  formatPercent,
  formatPrice,
} from "./format";
import type { CompareRow, Fund } from "./types";

/** The metrics shown on the compare board, one row each, in reading order. */
const METRICS: { label: string; value: (fund: Fund) => string }[] = [
  { label: "1 Yıl", value: (f) => formatPercent(f.y1) },
  { label: "3 Ay", value: (f) => formatPercent(f.m3) },
  { label: "1 Ay", value: (f) => formatPercent(f.m1) },
  { label: "Günlük", value: (f) => formatPercent(f.daily) },
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
