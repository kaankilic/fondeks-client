/**
 * Çerez / takip onayı için ortak tipler. KVKK Kurulu'nun 2022 Çerez Rehberi'ne
 * göre teknik olarak zorunlu olmayan tüm çerezler için önceden açık rıza
 * (opt-in) gerekiyor. Bu modül kategorileri ayırır ve kullanıcı seçimini
 * depoya yazar; GA4 ve Amplitude init'leri yalnızca ilgili kategori açıkken
 * yüklenir.
 */

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type ConsentState = {
  /** Teknik olarak zorunlu — her zaman true, kullanıcı değiştiremez. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /**
   * Kullanıcının bu tercihleri verdiği an. Null ise henüz onay/ret alınmadı
   * ve banner gösterilmelidir.
   */
  decidedAt: string | null;
};

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  decidedAt: null,
};

export const CONSENT_COOKIE = "fondeks_consent";
/** 180 gün — KVKK Kurulu rehber süresinin iki katı makul kabul edilir. */
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/** Onay değişikliği olduğunda yayılan DOM event ismi. */
export const CONSENT_EVENT = "fondeks:consent";
