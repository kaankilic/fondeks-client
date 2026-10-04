import type { CSSProperties, ReactNode } from "react";

import { UNKNOWN } from "@/lib/fondeks/constants";
import { riskTone, type Logo } from "@/lib/fondeks/palette";
import { direction, formatDaily } from "@/lib/fondeks/format";
import { SPARK_VIEWBOX } from "@/lib/fondeks/series";
import type { Fund, RiskLevel } from "@/lib/fondeks/types";

/** The issuer mark a fund row carries, assembled from its joined columns. */
export function fundLogo(fund: Fund): Logo {
  return { initials: fund.founderInitials, background: fund.founderColor };
}

import styles from "./primitives.module.scss";

type MarkSize = "sm" | "md" | "lg" | "xl" | "hero";

const MARK_CLASS: Record<MarkSize, string> = {
  sm: styles.markSm,
  md: styles.markMd,
  lg: styles.markLg,
  xl: styles.markXl,
  hero: styles.markHero,
};

export function BrandMark({
  logo,
  size = "lg",
}: {
  logo: Logo;
  size?: MarkSize;
}) {
  return (
    <span
      className={`${styles.mark} ${MARK_CLASS[size]}`}
      style={{ background: logo.background }}
      aria-hidden
    >
      {logo.initials}
    </span>
  );
}

export function FundCode({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md" | "lg" | "hero";
}) {
  const sizeClass =
    size === "sm"
      ? styles.codeSm
      : size === "lg"
        ? styles.codeLg
        : size === "hero"
          ? styles.codeHero
          : "";
  return <span className={`${styles.code} ${sizeClass}`}>{code}</span>;
}

export function ChangePill({
  value,
  className = "",
}: {
  value: number;
  /** Lets a table place the pill in one of its grid areas. */
  className?: string;
}) {
  return (
    <span className={`${styles.pill} ${styles[direction(value)]} ${className}`}>
      {formatDaily(value)}
    </span>
  );
}

export function RiskChip({
  risk,
  className = "",
}: {
  risk: RiskLevel | null;
  /** Lets a table place the chip in one of its grid areas. */
  className?: string;
}) {
  // No published risk value: a neutral chip, never a made-up level.
  if (risk === null) {
    return (
      <span
        className={`${styles.risk} ${className}`}
        style={{ color: "var(--text-dim)", background: "var(--track)" }}
        title={`Risk değeri ${UNKNOWN}`}
      >
        ?
      </span>
    );
  }

  const tone = riskTone(risk);
  return (
    <span
      className={`${styles.risk} ${className}`}
      style={{ color: tone.color, background: tone.background }}
      title={`Risk değeri ${risk} / 7`}
    >
      {risk}
    </span>
  );
}

export function Meter({
  pct,
  color,
  height,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  const style: CSSProperties | undefined = height ? { height } : undefined;
  return (
    <div className={styles.meter} style={style}>
      <div
        className={styles.meterFill}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/** Logo + code + name/meta, the recurring left-hand cell of every table. */
export function FundIdentity({
  fund,
  meta,
  markSize = "lg",
  codeSize = "md",
  className = "",
}: {
  fund: Fund;
  meta?: ReactNode;
  markSize?: MarkSize;
  codeSize?: "sm" | "md" | "lg";
  /** Lets a table place the cell in one of its grid areas. */
  className?: string;
}) {
  return (
    <div className={`${styles.identity} ${className}`}>
      <BrandMark logo={fundLogo(fund)} size={markSize} />
      <FundCode code={fund.code} size={codeSize} />
      <div className={styles.identityText}>
        <div className={styles.identityName}>{fund.name}</div>
        {meta ? <div className={styles.identityMeta}>{meta}</div> : null}
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  color,
  width = 96,
  height = 34,
  fill = false,
  gradientId,
}: {
  points: string;
  color: string;
  width?: number;
  height?: number;
  /** Draws a soft gradient wash under the line, fading to the baseline. */
  fill?: boolean;
  /** Deterministic id for the fill gradient — required when `fill` is set so
   *  server and client markup match. */
  gradientId?: string;
}) {
  const { width: vbW, height: vbH } = SPARK_VIEWBOX;

  // Close the trend line down to the baseline to make a fillable area. The
  // first/last x are read straight off the point string so any series shape
  // (seeded or real) produces a matching silhouette.
  const coords = points.split(" ");
  const firstX = coords[0]?.split(",")[0];
  const lastX = coords[coords.length - 1]?.split(",")[0];
  const canFill = fill && gradientId && firstX && lastX;
  const areaPoints = canFill
    ? `${firstX},${vbH} ${points} ${lastX},${vbH}`
    : "";

  return (
    <svg
      className={styles.spark}
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {canFill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
