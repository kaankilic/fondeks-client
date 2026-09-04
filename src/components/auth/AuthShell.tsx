import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { getFundCount } from "@/lib/fondeks/queries";

import styles from "./AuthShell.module.scss";

/** Brand panel + form, shared by the sign-in and sign-up screens. */
export async function AuthShell({ children }: { children: ReactNode }) {
  const universe = (await getFundCount()).toLocaleString("tr-TR");

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <aside className={styles.brand}>
          <div className={styles.glow} aria-hidden />

          <div className={styles.wordmarkRow}>
            <Logo className={styles.logo} size={34} />
            <span className={styles.wordmark}>Fondeks</span>
          </div>

          <div className={styles.pitch}>
            <p className={styles.headline}>
              BIST fonlarını
              <br />
              tek ekranda tara.
            </p>
            <p className={styles.blurb}>
              {universe} TEFAS fonu, canlı getiri sıralaması ve risk analizi.
              Yatırım kararlarını veriyle ver.
            </p>

            <div className={styles.stats}>
              <div>
                <div className={`${styles.statValue} ${styles.brandTone}`}>
                  {universe}
                </div>
                <div className={styles.statLabel}>Fon</div>
              </div>
              <div>
                <div className={`${styles.statValue} ${styles.posTone}`}>
                  Canlı
                </div>
                <div className={styles.statLabel}>TEFAS veri</div>
              </div>
              <div>
                <div className={`${styles.statValue} ${styles.neutralTone}`}>
                  Ücretsiz
                </div>
                <div className={styles.statLabel}>Başla</div>
              </div>
            </div>
          </div>
        </aside>

        <div className={styles.formSide}>{children}</div>
      </div>
    </div>
  );
}
