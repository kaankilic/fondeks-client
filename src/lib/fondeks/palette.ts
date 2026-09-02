import type { RiskLevel } from "./types";

export type Logo = { initials: string; background: string };

export const FALLBACK_LOGO: Logo = { initials: "··", background: "#3F3F46" };

/** Risk 1–7 mapped onto the palette: calm green → alarming red. */
const RISK_TONES: Record<RiskLevel, { color: string; background: string }> = {
  1: { color: "var(--pos)", background: "rgba(16,185,129,.14)" },
  2: { color: "var(--pos)", background: "rgba(16,185,129,.14)" },
  3: { color: "var(--warn)", background: "rgba(234,179,8,.14)" },
  4: { color: "var(--warn)", background: "rgba(234,179,8,.14)" },
  5: { color: "var(--caution)", background: "rgba(249,115,22,.14)" },
  6: { color: "var(--neg)", background: "rgba(248,113,113,.14)" },
  7: { color: "var(--neg)", background: "rgba(248,113,113,.14)" },
};

export function riskTone(risk: number) {
  const level = Math.min(7, Math.max(1, Math.round(risk))) as RiskLevel;
  return RISK_TONES[level];
}

/** Asset-allocation slices are colored by position, largest first. */
export const ALLOCATION_PALETTE = [
  "var(--brand)",
  "var(--action)",
  "var(--pos)",
  "#52525b",
  "#3f3f46",
];

export function allocationColor(index: number): string {
  return ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length];
}
