"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { getConsent, subscribe } from "@/lib/consent/store";

/**
 * Google Analytics 4 — yalnızca kullanıcı analitik çerez onayı verdikten
 * sonra yüklenir. Onay yoksa `gtag.js` indirilmez, çerez bırakılmaz. Onay
 * sonradan geri alınırsa script zaten yüklenmiş olabilir; bu durumda
 * {@link gtag}('consent', 'update') ile sinyali gönderiyoruz ve
 * {@link reset} ile mevcut GA client-id'yi yeniliyoruz, böylece ikinci bir
 * oturum ayrı sayılır.
 */

const MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "G-WTPD2PRKR0";

export function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(getConsent().analytics);
    return subscribe((state) => setAllowed(state.analytics));
  }, []);

  if (!MEASUREMENT_ID || process.env.NODE_ENV !== "production") return null;
  if (!allowed) return null;

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
gtag('consent', 'default', {ad_storage:'denied',analytics_storage:'granted'});
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
