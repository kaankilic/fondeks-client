import type { FundCategory } from "./constants";

/**
 * Seed data lifted from the design canvas. `src/db/seed.ts` is the only
 * consumer — the app itself always reads through the query layer.
 */

export const FOUNDER_FIXTURES: {
  name: string;
  initials: string;
  color: string;
}[] = [
  { name: "Ak Portföy", initials: "AK", color: "#E30613" },
  { name: "Marmara Capital", initials: "MC", color: "#1F5FA6" },
  { name: "İş Portföy", initials: "İŞ", color: "#12386B" },
  { name: "Garanti Portföy", initials: "GP", color: "#0A7A3D" },
  { name: "YKB Portföy", initials: "YK", color: "#0B4DA2" },
  { name: "Tacirler Portföy", initials: "TP", color: "#7A2E8E" },
  { name: "HSBC Portföy", initials: "HS", color: "#C4122F" },
  { name: "QNB Portföy", initials: "QN", color: "#8A1538" },
  { name: "Ziraat Portföy", initials: "ZP", color: "#B01030" },
];

/**
 * Standing attributes plus the targets the generated series must hit: the
 * seed builds a daily price history whose latest price and 1-day / 1-month /
 * 1-year returns come out exactly as listed here.
 */
export const FUND_FIXTURES: {
  code: string;
  name: string;
  founder: string;
  category: FundCategory;
  isin: string;
  /** Kuruluş tarihi. */
  inception: string;
  /** Yıllık yönetim ücreti, %. */
  managementFee: number;
  /** Stopaj oranı, % — hisse yoğun fonlarda 0. */
  withholdingTax: number;
  risk: number;
  /** Alış / satış valörü, T+n iş günü. */
  buyValueDays: number;
  sellValueDays: number;
  onTefas: boolean;
  /** Series targets. */
  price: number;
  daily: number;
  m1: number;
  y1: number;
  /** Annualised volatility, %, used to size the daily noise. */
  volatility: number;
  /** Latest fon toplam değeri and yatırımcı sayısı. */
  aum: number;
  investors: number;
}[] = [
  { code: "AFT", name: "Ak Portföy Teknoloji Yabancı Hisse Fonu", founder: "Ak Portföy", category: "Hisse Senedi", inception: "2019-04-08", isin: "TRAKPY00001", managementFee: 1.91, withholdingTax: 0, risk: 6, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 0.412843, daily: 2.45, m1: 8.32, y1: 64.7, volatility: 18.4, aum: 4_280_000_000, investors: 128_420 },
  { code: "MAC", name: "Marmara Capital Hisse Senedi (TL)", founder: "Marmara Capital", category: "Hisse Senedi", inception: "2016-11-21", isin: "TRMRMC00002", managementFee: 2.15, withholdingTax: 0, risk: 6, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 1.28431, daily: 1.18, m1: 6.91, y1: 58.2, volatility: 21.7, aum: 2_910_000_000, investors: 94_210 },
  { code: "IPJ", name: "İş Portföy Teknoloji Hisse Senedi", founder: "İş Portföy", category: "Hisse Senedi", inception: "2021-02-15", isin: "TRISPJ00003", managementFee: 2.04, withholdingTax: 0, risk: 7, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 0.93821, daily: -0.74, m1: 4.15, y1: 51.9, volatility: 24.1, aum: 6_120_000_000, investors: 186_740 },
  { code: "GTL", name: "Garanti Portföy Altın Fonu", founder: "Garanti Portföy", category: "Kıymetli Maden", inception: "2013-06-03", isin: "TRGRGT00004", managementFee: 1.42, withholdingTax: 10, risk: 4, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 0.28491, daily: 0.92, m1: 5.44, y1: 47.3, volatility: 14.2, aum: 3_450_000_000, investors: 142_060 },
  { code: "YAS", name: "Yapı Kredi Portföy Serbest (TL)", founder: "YKB Portföy", category: "Serbest", inception: "2026-05-18", isin: "TRYKYA00005", managementFee: 2.38, withholdingTax: 10, risk: 5, buyValueDays: 1, sellValueDays: 3, onTefas: false, price: 2.10482, daily: -1.32, m1: -2.18, y1: 41.6, volatility: 19.6, aum: 1_780_000_000, investors: 38_940 },
  { code: "TCD", name: "Tacirler Portföy Değişken Fon", founder: "Tacirler Portföy", category: "Değişken", inception: "2026-07-06", isin: "TRTCTC00006", managementFee: 1.74, withholdingTax: 10, risk: 4, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 0.671203, daily: 0.34, m1: 3.02, y1: 38.4, volatility: 12.8, aum: 842_000_000, investors: 21_570 },
  { code: "HVT", name: "HSBC Portföy Çoklu Varlık Değişken", founder: "HSBC Portföy", category: "Değişken", inception: "2026-03-24", isin: "TRHSHV00007", managementFee: 1.28, withholdingTax: 10, risk: 3, buyValueDays: 1, sellValueDays: 2, onTefas: true, price: 0.512048, daily: 0.11, m1: 1.87, y1: 33.1, volatility: 9.4, aum: 1_120_000_000, investors: 47_310 },
  { code: "QNB", name: "QNB Portföy Para Piyasası (TL)", founder: "QNB Portföy", category: "Para Piyasası", inception: "2011-09-12", isin: "TRQNQN00008", managementFee: 0.42, withholdingTax: 10, risk: 1, buyValueDays: 0, sellValueDays: 1, onTefas: true, price: 0.048291, daily: 0.13, m1: 1.21, y1: 29.8, volatility: 1.8, aum: 8_940_000_000, investors: 512_830 },
  { code: "ZPX", name: "Ziraat Portföy Kısa Vadeli Borçlanma", founder: "Ziraat Portföy", category: "Borçlanma", inception: "2015-01-19", isin: "TRZRZP00009", managementFee: 0.68, withholdingTax: 10, risk: 2, buyValueDays: 0, sellValueDays: 1, onTefas: true, price: 0.09341, daily: -0.05, m1: 0.94, y1: 26.5, volatility: 3.1, aum: 5_370_000_000, investors: 268_190 },
];

/**
 * The index cards and where each series comes from. Values live in
 * `index_quotes`, so only presentation and source wiring are configured here.
 *
 * TCMB's daily bulletin is free and needs no key; the rest come from TCMB's
 * EVDS service, which needs TCMB_EVDS_API_KEY. Series codes are the commonly
 * used ones — verify them against your EVDS account before going live.
 */
export const INDEX_FIXTURES: {
  name: string;
  symbol: string;
  color: string;
  unit: string;
  decimals: number;
  displayPattern?: string;
  source: "tcmb" | "evds" | "fixture";
  sourceSymbol?: string;
}[] = [
  { name: "BIST 100", symbol: "B", color: "#0B4DA2", unit: "TRY", decimals: 2, source: "evds", sourceSymbol: "TP.MK.F.BILESIK" },
  { name: "BIST 30", symbol: "B", color: "#12386B", unit: "TRY", decimals: 2, source: "evds", sourceSymbol: "TP.MK.F.ENDEKS30" },
  { name: "USD / TRY", symbol: "$", color: "#2E7D5B", unit: "", decimals: 4, source: "tcmb", sourceSymbol: "USD" },
  { name: "Gram Altın", symbol: "Au", color: "#B9821A", unit: "TRY", decimals: 2, source: "evds", sourceSymbol: "TP.MK.KUL.YTL" },
  { name: "EUR / TRY", symbol: "€", color: "#3B5BA5", unit: "", decimals: 4, source: "tcmb", sourceSymbol: "EUR" },
  { name: "Gösterge Faiz", symbol: "%", color: "#7A2E8E", unit: "", decimals: 2, displayPattern: "%%v", source: "evds", sourceSymbol: "TP.APIFON4" },
];

export const CATEGORY_PERFORMANCE_FIXTURES: {
  category: FundCategory;
  y1: number;
}[] = [
  { category: "Hisse Senedi", y1: 52.4 },
  { category: "Kıymetli Maden", y1: 47.3 },
  { category: "Serbest", y1: 41.6 },
  { category: "Değişken", y1: 33.1 },
  { category: "Para Piyasası", y1: 29.8 },
  { category: "Borçlanma", y1: 26.5 },
];

/** BIST equities used to build each fund's position-change widgets. */
export const STOCK_POOL: { ticker: string; name: string; color: string }[] = [
  { ticker: "ASELS", name: "Aselsan", color: "#C4122F" },
  { ticker: "THYAO", name: "Türk Hava Yolları", color: "#B01030" },
  { ticker: "TUPRS", name: "Tüpraş", color: "#0A6E8A" },
  { ticker: "SASA", name: "Sasa Polyester", color: "#0A7A3D" },
  { ticker: "KCHOL", name: "Koç Holding", color: "#12386B" },
  { ticker: "EREGL", name: "Ereğli Demir Çelik", color: "#7A2E8E" },
  { ticker: "BIMAS", name: "BİM Mağazalar", color: "#B8140F" },
  { ticker: "FROTO", name: "Ford Otosan", color: "#0B4DA2" },
  { ticker: "GARAN", name: "Garanti BBVA", color: "#0A7A3D" },
  { ticker: "AKBNK", name: "Akbank", color: "#E30613" },
  { ticker: "SISE", name: "Şişecam", color: "#1F5FA6" },
  { ticker: "PETKM", name: "Petkim", color: "#8A1538" },
];

/** AFT is the fund the detail screen was designed around — seeded verbatim. */
export const AFT_HOLDINGS = {
  increased: [
    { ticker: "ASELS", weight: 8.4, change: 1.8 },
    { ticker: "THYAO", weight: 6.9, change: 1.2 },
    { ticker: "TUPRS", weight: 5.1, change: 0.9 },
    { ticker: "SASA", weight: 4.3, change: 0.6 },
  ],
  decreased: [
    { ticker: "KCHOL", weight: 3.2, change: -1.4 },
    { ticker: "EREGL", weight: 2.7, change: -0.9 },
    { ticker: "BIMAS", weight: 2.1, change: -0.7 },
    { ticker: "FROTO", weight: 1.8, change: -0.5 },
  ],
};

export const AFT_ALLOCATION = [
  { label: "Yurt İçi Hisse", pct: 62 },
  { label: "Yurt Dışı Hisse", pct: 24 },
  { label: "Nakit / Repo", pct: 8 },
  { label: "Diğer", pct: 6 },
];

/** Allocation shape per category, for every fund other than AFT. */
export const ALLOCATION_TEMPLATES: Record<
  FundCategory,
  { label: string; pct: number }[]
> = {
  "Hisse Senedi": [
    { label: "Yurt İçi Hisse", pct: 74 },
    { label: "Yurt Dışı Hisse", pct: 14 },
    { label: "Nakit / Repo", pct: 7 },
    { label: "Diğer", pct: 5 },
  ],
  "Kıymetli Maden": [
    { label: "Altın", pct: 71 },
    { label: "Gümüş", pct: 15 },
    { label: "Nakit / Repo", pct: 9 },
    { label: "Diğer", pct: 5 },
  ],
  Serbest: [
    { label: "Yurt İçi Hisse", pct: 42 },
    { label: "Özel Sektör Tahvili", pct: 28 },
    { label: "Nakit / Repo", pct: 21 },
    { label: "Diğer", pct: 9 },
  ],
  Değişken: [
    { label: "Yurt İçi Hisse", pct: 38 },
    { label: "Devlet Tahvili", pct: 32 },
    { label: "Nakit / Repo", pct: 22 },
    { label: "Diğer", pct: 8 },
  ],
  "Para Piyasası": [
    { label: "Ters Repo", pct: 58 },
    { label: "Mevduat", pct: 30 },
    { label: "Kısa Vadeli Bono", pct: 10 },
    { label: "Diğer", pct: 2 },
  ],
  Borçlanma: [
    { label: "Devlet Tahvili", pct: 54 },
    { label: "Özel Sektör Tahvili", pct: 31 },
    { label: "Nakit / Repo", pct: 12 },
    { label: "Diğer", pct: 3 },
  ],
};

/** Shorter names used inside the "Benzer Fonlar" widget. */
export const PEER_LABELS: Record<string, string> = {
  AFT: "Ak Portföy Teknoloji",
  MAC: "Marmara Capital Hisse",
  IPJ: "İş Portföy Teknoloji",
  GTL: "Garanti Altın",
  YAS: "Yapı Kredi Serbest",
  TCD: "Tacirler Değişken",
  HVT: "HSBC Çoklu Varlık",
  QNB: "QNB Para Piyasası",
  ZPX: "Ziraat Kısa Vadeli",
};

/** Overlap between AFT and its peers, exactly as drawn in the design. */
export const AFT_SIMILARITY: Record<string, number> = {
  MAC: 92,
  IPJ: 88,
  TCD: 74,
  HVT: 69,
};

/**
 * Market news and KAP filings. Fixture copy: plausible headlines for the
 * layout, not real disclosures. `hoursAgo` is resolved against seed time.
 */
export const NEWS_FIXTURES: {
  source: "haber" | "kap";
  title: string;
  summary?: string;
  symbol?: string;
  publisher: string;
  hoursAgo: number;
}[] = [
  { source: "haber", title: "BIST 100 günü %1,24 yükselişle 10.842 puandan kapattı", summary: "Bankacılık ve holding hisselerindeki alımlar endeksi gün içi zirvesine taşıdı. İşlem hacmi 118 milyar TL olarak gerçekleşti.", publisher: "Fondeks Piyasalar", hoursAgo: 2 },
  { source: "haber", title: "TCMB politika faizini %46,25 seviyesinde sabit tuttu", summary: "Karar metninde sıkı duruşun enflasyonda kalıcı düşüş sağlanana kadar süreceği vurgulandı.", publisher: "Fondeks Piyasalar", hoursAgo: 5 },
  { source: "haber", title: "Hisse senedi fonlarına ağustosta 12,4 milyar TL giriş", summary: "TEFAS verilerine göre hisse yoğun fonlar üst üste dördüncü ayda da net giriş kaydetti.", publisher: "Fondeks Analiz", hoursAgo: 9 },
  { source: "haber", title: "Gram altın 4.284 TL ile rekor tazeledi", summary: "Ons altındaki yükseliş ve kur etkisiyle kıymetli maden fonlarının yıllık getirisi %47'ye ulaştı.", publisher: "Fondeks Piyasalar", hoursAgo: 22 },
  { source: "haber", title: "Teknoloji fonlarında yabancı hisse ağırlığı artıyor", summary: "Portföy yöneticileri yurt dışı teknoloji hisselerinin payını son çeyrekte ortalama 6 puan yükseltti.", publisher: "Fondeks Analiz", hoursAgo: 30 },
  { source: "haber", title: "Serbest fonlarda nitelikli yatırımcı sayısı 1 milyonu aştı", summary: "SPK verilerine göre serbest fon yatırımcı sayısı yıllık bazda %38 arttı.", publisher: "Fondeks Piyasalar", hoursAgo: 47 },
  { source: "haber", title: "Para piyasası fonları getiriyi mevduatın üzerine taşıdı", summary: "Kısa vadeli enstrümanlardaki faiz seviyesi, para piyasası fonlarının yıllık getirisini %29,8'e çıkardı.", publisher: "Fondeks Analiz", hoursAgo: 54 },

  { source: "kap", title: "Pay Geri Alım Programı Hakkında Bildirim", summary: "Şirket, 500 milyon TL üst limitli pay geri alım programı başlattığını duyurdu.", symbol: "ASELS", publisher: "KAP", hoursAgo: 1 },
  { source: "kap", title: "Ağustos Ayı Trafik Sonuçları Açıklandı", summary: "Toplam yolcu sayısı geçen yılın aynı ayına göre %7,2 arttı; doluluk oranı %86,4 oldu.", symbol: "THYAO", publisher: "KAP", hoursAgo: 4 },
  { source: "kap", title: "Yatırım Teşvik Belgesi Alınması", summary: "Rafineri modernizasyon yatırımı için teşvik belgesi alındığı bildirildi.", symbol: "TUPRS", publisher: "KAP", hoursAgo: 12 },
  { source: "kap", title: "Kapasite Artırım Yatırımı Tamamlandı", summary: "Yeni üretim hattının devreye alınmasıyla yıllık kapasite %18 arttı.", symbol: "SASA", publisher: "KAP", hoursAgo: 26 },
  { source: "kap", title: "Bağlı Ortaklık Pay Devri Hakkında", summary: "Bağlı ortaklıktaki payların bir bölümünün devrine ilişkin sözleşme imzalandı.", symbol: "KCHOL", publisher: "KAP", hoursAgo: 33 },
  { source: "kap", title: "Kâr Payı Dağıtım Tarihi Belirlendi", summary: "Genel kurulda onaylanan temettünün ödeme tarihi açıklandı.", symbol: "EREGL", publisher: "KAP", hoursAgo: 40 },
  { source: "kap", title: "Yeni Mağaza Açılışlarına İlişkin Bildirim", summary: "Yıl sonu hedefi kapsamında 120 yeni mağaza açıldığı bildirildi.", symbol: "BIMAS", publisher: "KAP", hoursAgo: 58 },
];
