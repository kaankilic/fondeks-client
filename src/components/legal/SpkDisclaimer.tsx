import {
  SPK_DISCLAIMER_HEADING,
  SPK_DISCLAIMER_TEXT,
} from "@/lib/legal/disclaimer";

import styles from "./SpkDisclaimer.module.scss";

/**
 * SPK III-55.1 / III-39.3 kapsamındaki standart "yatırım danışmanlığı değildir"
 * uyarısı. Yetkisiz yorum/tavsiye içerebilecek her ekranda **tam metinle**
 * görünmesi gerekir — footer'daki tek satır yetmez. Fon detay, kategori ve
 * karşılaştırma sayfalarında ilgili içeriğin yanında mount edilir.
 *
 * `tone="inline"` ekran içine akan sakin bir metin bloğu; `tone="emphasis"`
 * uyarı tonlu bir kutu — her sayfanın tasarımına göre seçilir.
 */
export function SpkDisclaimer({
  tone = "inline",
}: {
  tone?: "inline" | "emphasis";
}) {
  return (
    <aside
      className={`${styles.wrap} ${tone === "emphasis" ? styles.emphasis : ""}`}
      aria-labelledby="spk-disclaimer-heading"
    >
      <h3 id="spk-disclaimer-heading" className={styles.heading}>
        {SPK_DISCLAIMER_HEADING}
      </h3>
      <p className={styles.body}>{SPK_DISCLAIMER_TEXT}</p>
    </aside>
  );
}
