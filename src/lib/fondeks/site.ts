/**
 * The site's canonical origin. Search engines index one host, so this is
 * configuration rather than something derived from request headers — a
 * sitemap built from whatever Host a crawler happened to send would list URLs
 * on preview domains.
 */

const DEFAULT_SITE_URL = "https://fondeks.com";

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || DEFAULT_SITE_URL).replace(/\/$/, "");
}

/** Absolute URL for an app-relative path, e.g. `/fon/AAL-ata-portfoy`. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
