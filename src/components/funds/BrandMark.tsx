"use client";

import { useState } from "react";

import type { Logo } from "@/lib/fondeks/palette";

import styles from "./primitives.module.scss";

export type MarkSize = "sm" | "md" | "lg" | "xl" | "hero";

const MARK_CLASS: Record<MarkSize, string> = {
  sm: styles.markSm,
  md: styles.markMd,
  lg: styles.markLg,
  xl: styles.markXl,
  hero: styles.markHero,
};

/**
 * The founder / issuer mark. Given a `src`, it shows that logo on a light tile;
 * with no `src` — or if the image fails to load — it falls back to the initials
 * mark on the brand color. Callers pass a `src` only for issuers that actually
 * have a logo (see `founderLogoSrc`), so a logoless founder makes no request.
 */
export function BrandMark({
  logo,
  src,
  size = "lg",
}: {
  logo: Logo;
  /** Founder logo path; omit to always render the initials mark. */
  src?: string;
  size?: MarkSize;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`${styles.mark} ${MARK_CLASS[size]}`}
      style={{ background: showImage ? "#fff" : logo.background }}
      aria-hidden
    >
      {showImage ? (
        // A tiny decorative logo from /public; next/image buys nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.markImg}
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        logo.initials
      )}
    </span>
  );
}
