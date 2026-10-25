"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  acceptAll,
  getConsent,
  hasDecided,
  rejectAll,
  setConsent,
  subscribe,
} from "@/lib/consent/store";
import type { ConsentState } from "@/lib/consent/types";

import styles from "./ConsentBanner.module.scss";

/**
 * KVKK Kurulu'nun 2022 Çerez Rehberi'ne uyum için önceden açık rıza (opt-in)
 * bannerı. Mount edildiğinde çerezden mevcut tercihleri okur; henüz karar
 * verilmediyse görünür olur ve kullanıcı seçimini yapana kadar analytics /
 * pazarlama script'leri **yüklenmez**.
 *
 * "Tümünü Reddet" seçeneği "Tümünü Kabul Et" kadar prominent gösterilir —
 * aksi hâlde onay geçerli sayılmaz (Rehber §4.3). Ayrı tercih için "Ayarla"
 * panelini açar.
 */
export function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const current = getConsent();
    setState(current);
    setPrefs({ analytics: current.analytics, marketing: current.marketing });
    return subscribe((next) => setState(next));
  }, []);

  if (!state) return null;
  if (hasDecided(state)) return null;

  function handleAcceptAll() {
    acceptAll();
  }
  function handleRejectAll() {
    rejectAll();
  }
  function handleSave() {
    setConsent(prefs);
  }

  return (
    <div
      className={styles.wrap}
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-heading"
    >
      <div className={styles.inner}>
        <h2 id="consent-heading" className={styles.heading}>
          Çerez tercihlerini seç
        </h2>
        <p className={styles.body}>
          Fondeks, hizmetin çalışması için gereken teknik çerezleri kullanır.
          Analitik ve pazarlama çerezleri yalnızca onayın ile yüklenir.
          Ayrıntılar{" "}
          <Link href="/gizlilik" className={styles.link}>
            Gizlilik Sözleşmesi
          </Link>
          'nde yer alır.
        </p>

        {expanded ? (
          <div className={styles.prefs}>
            <label className={styles.pref}>
              <input type="checkbox" checked disabled aria-readonly />
              <span>
                <span className={styles.prefLabel}>Zorunlu çerezler</span>
                <span className={styles.prefHint}>
                  Oturum ve güvenlik için gereklidir, kapatılamaz.
                </span>
              </span>
            </label>

            <label className={styles.pref}>
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, analytics: e.target.checked }))
                }
              />
              <span>
                <span className={styles.prefLabel}>Analitik çerezler</span>
                <span className={styles.prefHint}>
                  Google Analytics ve Amplitude — hangi özelliklerin
                  kullanıldığını anlamak için.
                </span>
              </span>
            </label>

            <label className={styles.pref}>
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, marketing: e.target.checked }))
                }
              />
              <span>
                <span className={styles.prefLabel}>Pazarlama çerezleri</span>
                <span className={styles.prefHint}>
                  Kampanya ve reklam performansını ölçmek için kullanılır.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className={styles.actions}>
          {expanded ? (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setExpanded(false)}
              >
                Geri
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={handleSave}
              >
                Seçimimi kaydet
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setExpanded(true)}
              >
                Ayarla
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={handleRejectAll}
              >
                Tümünü Reddet
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={handleAcceptAll}
              >
                Tümünü Kabul Et
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
