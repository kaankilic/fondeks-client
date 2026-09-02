import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClass } from "@/components/ui/Button";

import styles from "./SignupGate.module.scss";

/** Minimal line icons for the locked-feature list. */
const ICONS: Record<string, ReactNode> = {
  chart: (
    <path
      d="M2 11L5.5 7L8 9.5L12 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  pie: (
    <>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 2v5h5" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  flows: (
    <>
      <path
        d="M4 9.5V3.5M4 3.5L2 5.5M4 3.5L6 5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 4.5v6M10 10.5l2-2M10 10.5l-2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  list: (
    <>
      <path
        d="M3 4h8M3 7h8M3 10h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  ),
  peers: (
    <>
      <circle cx="5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 11.5c.6-1.4 1.7-2.1 3-2.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </>
  ),
  scale: (
    <>
      <path
        d="M7 2.5v9M3.5 11.5h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M2 6.5h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  ),
};

type Feature = { icon: keyof typeof ICONS; label: string };

const FUND_FEATURES: Feature[] = [
  { icon: "chart", label: "Fiyat grafiği ve geçmiş getiriler" },
  { icon: "list", label: "Yönetim ücreti, stopaj ve valör bilgileri" },
  { icon: "flows", label: "Artırılan / azaltılan pozisyonlar" },
  { icon: "pie", label: "Varlık dağılımı" },
  { icon: "peers", label: "Benzer fonlar ve portföy örtüşmesi" },
  { icon: "scale", label: "Kıyaslama ve aylık nakit akışı" },
];

const WATCHLIST_FEATURES: Feature[] = [
  { icon: "list", label: "İstediğin fonları listene ekle" },
  { icon: "chart", label: "Günlük ve yıllık getirileri tek ekranda izle" },
  { icon: "scale", label: "Listendeki fonları karşılaştır" },
];

/**
 * Everything below the price strip is members-only. Visitors get this panel
 * instead — the locked content is never queried or sent to the browser.
 */
/** Content-shaped placeholder — no real figures, only the layout's silhouette. */
function LockedPreview() {
  return (
    <div className={styles.skeleton} aria-hidden>
      <div className={styles.skelPanel}>
        <div className={styles.skelBar} style={{ width: "120px" }} />
        <svg
          className={styles.skelChart}
          viewBox="0 0 680 150"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120 L80 104 L160 112 L240 78 L320 88 L400 54 L480 66 L560 30 L680 18"
            stroke="var(--brand)"
            strokeOpacity="0.5"
            strokeWidth="3"
          />
          <path
            d="M0 120 L80 104 L160 112 L240 78 L320 88 L400 54 L480 66 L560 30 L680 18 L680 150 L0 150 Z"
            fill="var(--brand)"
            fillOpacity="0.08"
          />
        </svg>
      </div>

      <div className={styles.skelRow}>
        {[0, 1].map((panel) => (
          <div key={panel} className={styles.skelPanel}>
            <div className={styles.skelBar} style={{ width: "140px" }} />
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className={styles.skelLine}>
                <span className={styles.skelDot} />
                <span
                  className={styles.skelBar}
                  style={{ width: `${55 - line * 8}%`, marginBottom: 0 }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type GateProps =
  | { preset: "fund"; fundCode: string }
  | { preset: "watchlist"; fundCode?: never };

/**
 * Members-only wall. `preset` picks the copy and the feature list; everything
 * behind it is never queried for signed-out visitors.
 */
export function SignupGate(props: GateProps) {
  const fund = props.preset === "fund";

  const title = fund
    ? "Fonun tamamını görmek için üye ol"
    : "İzleme listeni oluşturmak için üye ol";

  const body = fund ? (
    <>
      Ziyaretçiler {props.fundCode} için yalnızca fiyat ve getiri özetini
      görebilir. Ücretsiz Fondeks hesabıyla fonun tüm analizine eriş — kalıcı
      olarak, ücretsiz.
    </>
  ) : (
    <>
      İzleme listesi hesabına bağlıdır. Ücretsiz bir hesap aç, takip etmek
      istediğin fonları ekle ve her girişinde aynı listeyi bul.
    </>
  );

  const features = fund ? FUND_FEATURES : WATCHLIST_FEATURES;

  return (
    <div className={styles.stage}>
      <LockedPreview />

      <section className={styles.gate}>
        <div className={styles.glow} aria-hidden />

        <svg
          className={styles.ghost}
          viewBox="0 0 520 180"
          fill="none"
          aria-hidden
        >
          <path
            d="M0 150 L60 132 L120 138 L180 104 L240 112 L300 74 L360 84 L420 44 L480 52 L520 20"
            stroke="var(--brand)"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[40, 80, 120].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="520"
              y2={y}
              stroke="var(--border)"
              strokeOpacity="0.5"
            />
          ))}
        </svg>

        <div className={styles.content}>
          <span className={styles.badge}>
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="none"
              aria-hidden
            >
              <rect
                x="1"
                y="5"
                width="8"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M3 5V3.5a2 2 0 1 1 4 0V5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            Üyelere özel
          </span>

          <h2 className={styles.title}>{title}</h2>
          <p className={styles.body}>{body}</p>

          <ul className={styles.features}>
            {features.map((feature) => (
              <li key={feature.label} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    {ICONS[feature.icon]}
                  </svg>
                </span>
                {feature.label}
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link
              href="/kayit"
              className={buttonClass({ variant: "brand", size: "lg" })}
            >
              Ücretsiz Üye Ol →
            </Link>
            <Link
              href="/giris"
              className={buttonClass({ variant: "ghost", size: "lg" })}
            >
              Zaten üyeyim
            </Link>
          </div>

          <p className={styles.note}>
            Kredi kartı gerekmez · Kayıt 30 saniye sürer
          </p>
        </div>
      </section>
    </div>
  );
}
