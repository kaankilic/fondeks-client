import Script from "next/script";

/**
 * Google Analytics 4, as the gtag.js pair Google hands out.
 *
 * Route changes need nothing from us: GA4's enhanced measurement counts a
 * page view on every history event, which is what App Router navigation is.
 *
 * Development never reports, or a local run would land in the property's live
 * traffic. `yarn build && yarn start` is how to check the tag itself, since
 * that runs with NODE_ENV=production. Setting the env var to an empty string
 * turns the tag off — useful on a preview deployment.
 */

const MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "G-WTPD2PRKR0";

export function Analytics() {
  if (!MEASUREMENT_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
