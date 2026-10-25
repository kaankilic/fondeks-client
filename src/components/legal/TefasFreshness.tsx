import { tefasFreshnessText } from "@/lib/legal/disclaimer";
import { formatDate } from "@/lib/fondeks/format";

import styles from "./TefasFreshness.module.scss";

/**
 * TEFAS fiyat kaynağı ve T+1 gecikme uyarısı — fon detay, kategori ve
 * karşılaştırma gibi fiyat gösteren her ekranda gösterilir. "Canlı" izlenimi
 * yaratan iletişim yasağını (Reklam Kurulu yanıltıcı reklam) karşılamak için
 * zorunlu.
 */
export function TefasFreshness({ priceDate }: { priceDate?: string | null }) {
  const formatted =
    priceDate && priceDate.length > 0 ? formatDate(priceDate) : null;
  return (
    <p className={styles.wrap} role="note">
      {tefasFreshnessText(formatted)}
    </p>
  );
}
