/**
 * Fondeks'in veri sorumlusu / hizmet sağlayıcı kimlik bilgileri — tek
 * kaynağı. 6563 s. Elektronik Ticaret Kanunu m. 3 (hizmet sağlayıcı
 * tanıtım) ve 6698 s. KVKK m. 10 (aydınlatma) için gerekli alanlar burada
 * tutulur; footer, kayıt sayfası ve yasal metinler buradan okur.
 *
 * TODO: Değerler ticari ünvan, MERSİS, vergi dairesi/no, adres, KEP, iletişim
 * bilgileri lansmandan önce doldurulmalıdır. Değerleri değiştirirken
 * `revisionDate` güncellenmelidir — yasal metinler bu tarihe atıf veriyor.
 */

export type LegalEntity = {
  /** Ticari ünvan (örn. "Fondeks Yazılım ve Danışmanlık A.Ş."). */
  commercialName: string;
  /** Pazarlama / marka ismi. */
  brandName: string;
  /** MERSİS numarası (16 hane). */
  mersisNo: string;
  /** Vergi dairesi. */
  taxOffice: string;
  /** Vergi numarası / TCKN (tüzel kişi ise VKN). */
  taxNo: string;
  /** Yerleşim yeri — tam, posta adresine uygun. */
  address: string;
  /** Kayıtlı elektronik posta (KEP) adresi. */
  kep: string;
  /** Genel iletişim e-postası. */
  email: string;
  /** KVKK başvuruları için iletişim e-postası (ayrı tutmak iyi pratiktir). */
  kvkkContact: string;
  /** Opsiyonel telefon. Yoksa boş string geçin. */
  phone: string;
};

/**
 * Lansmandan önce hukuk onaylı değerlerle doldurulmalıdır. `string.startsWith`
 * ile "TODO" kontrolü yapılarak uyarı/hata loglanabilir (bkz. `isEntityReady`).
 */
export const ENTITY: LegalEntity = {
  commercialName: "",
  brandName: "",
  mersisNo: "",
  taxOffice: "",
  taxNo: "",
  address: "",
  kep: "",
  email: "",
  kvkkContact: "",
  phone: "",
};

/** Yasal metinlerin güncellendiği son tarih — her değişiklikte güncellenir. */
export const LEGAL_REVISION_DATE = "2026-10-25";

/** Her TODO alanı doluysa true. Prodda bir sağlık kontrolünde kullanılabilir. */
export function isEntityReady(entity: LegalEntity = ENTITY): boolean {
  return !Object.values(entity).some(
    (value) => typeof value === "string" && value.startsWith("TODO_"),
  );
}

/** TODO alanları ekrana yansımasın diye kullanıcıya gösterilecek değer. */
export function displayValue(value: string, fallback = "—"): string {
  return value.startsWith("TODO_") ? fallback : value;
}
