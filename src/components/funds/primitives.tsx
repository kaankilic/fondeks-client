import type { CSSProperties, ReactNode } from "react";

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

export function ChangePill({ value }: { value: number }) {
  return (
    <span className={`${styles.pill} ${styles[direction(value)]}`}>
      {formatDaily(value)}
    </span>
  );
}

export function RiskChip({ risk }: { risk: RiskLevel }) {
  const tone = riskTone(risk);
  return (
    <span
      className={styles.risk}
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
}: {
  fund: Fund;
  meta?: ReactNode;
  markSize?: MarkSize;
  codeSize?: "sm" | "md" | "lg";
}) {
  return (
    <div className={styles.identity}>
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
}: {
  points: string;
  color: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      className={styles.spark}
      width={width}
      height={height}
      viewBox={`0 0 ${SPARK_VIEWBOX.width} ${SPARK_VIEWBOX.height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
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
