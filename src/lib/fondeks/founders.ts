import { slugify } from "./slug";
import type { Fund } from "./types";

/**
 * Issuers whose logo lives in `/public/founders`. Map the founder's slug to the
 * public path of its logo and drop the file in beside it; fund rows then show
 * the logo in place of the initials mark. An issuer not listed here keeps the
 * initials mark and fires no image request, so the list never 404s for the many
 * founders that have no logo yet.
 *
 * Add one line per issuer, e.g.
 *   "ak-portfoy": "/founders/ak-portfoy.svg",
 *   "is-portfoy": "/founders/is-portfoy.png",
 *
 * Find the slug a founder resolves to with `founderSlug("Ak Portföy")`.
 */
const FOUNDER_LOGOS: Record<string, string> = {};

/** Stable slug for an issuer name, e.g. "Ak Portföy" → "ak-portfoy". */
export function founderSlug(founder: string): string {
  return slugify(founder);
}

/** The registered logo path for an issuer, or undefined when none exists. */
export function founderLogoSrc(founder: string): string | undefined {
  return FOUNDER_LOGOS[founderSlug(founder)];
}

/**
 * The logo a fund's mark should show, or undefined to keep the initials mark.
 * The issuer's own `founderIcon` from the API wins; a locally-registered logo
 * is the fallback for issuers the API has no icon for yet.
 */
export function fundLogoSrc(fund: Fund): string | undefined {
  return fund.founderIcon?.trim() || founderLogoSrc(fund.founder);
}
