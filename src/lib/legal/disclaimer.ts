/**
 * SPK III-55.1 ve III-39.3 kapsamında yetkisiz yorum/tavsiye içerebilecek
 * her ekranda tam metinle gösterilmesi gereken standart yatırım danışmanlığı
 * uyarısı. Footer'daki özet yetmez — fon detay, kategori sayfası ve
 * karşılaştırma gibi "yorum" içeren her yüzeyde çıkmalıdır.
 */

export const SPK_DISCLAIMER_HEADING = "Yatırım Danışmanlığı Uyarısı";

export const SPK_DISCLAIMER_TEXT =
  "Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı " +
  "kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy " +
  "yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında " +
  "imzalanacak yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. " +
  "Burada yer alan yorum ve tavsiyeler, yorum ve tavsiyede bulunanların " +
  "kişisel görüşlerine dayanmaktadır. Bu görüşler mali durumunuz ile risk ve " +
  "getiri tercihlerinize uygun olmayabilir. Bu nedenle, sadece burada yer alan " +
  "bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun " +
  "sonuçlar doğurmayabilir.";

/** Fiyatların kaynak ve gecikme uyarısı — her fiyat gösteren ekranda. */
export function tefasFreshnessText(priceDate?: string | null): string {
  const base =
    "Fiyatlar TEFAS'tan (Takasbank) alınır ve T+1 iş günü gecikmelidir.";
  if (!priceDate) return base;
  return `${base} Son fiyat tarihi: ${priceDate}.`;
}
