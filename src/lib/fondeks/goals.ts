/**
 * Goal-based entry points — the v2.1 answer to "which fund for what I'm trying
 * to do?", in place of a wall of 2,060 funds sorted by today's move.
 *
 * Each goal maps an investor intention ("park cash", "hold gold", "grow over
 * years") onto the fund categories that serve it, and carries the copy its
 * landing page and the homepage card share. The same list seeds the first
 * comparison pages (`/kategori/{slug}`) and the sitemap, so a goal added here
 * shows up in navigation, on the homepage and in search without a second edit.
 *
 * Client-safe: no server-only imports, so both the homepage grid and the
 * (server-rendered) category pages read it.
 */

import type { SecurityCategory } from "./constants";

export type Goal = {
  /** URL segment under `/kategori`. */
  slug: string;
  /** Short label for the homepage card and nav. */
  label: string;
  /** The investor job this goal serves, one line, plain Turkish. */
  tagline: string;
  /** H1 / page title on the landing page. */
  heading: string;
  /**
   * The measurable criterion the ranking is built on. Shown next to the
   * heading so the "öne çıkan" claim is objective and belgelenebilir
   * (Ticari Reklam Yönetmeliği m. 7).
   */
  rankingCriterion: string;
  /** Lead paragraph: what the category is for and how to read the ranking. */
  intro: string;
  /** The securities-fund categories whose funds this goal gathers. */
  categories: SecurityCategory[];
  /** Search intent the page targets, for `<meta keywords>`. */
  keywords: string[];
  /** Single-emoji glyph for the card; decorative only. */
  glyph: string;
};

/**
 * Ordered by how a saver typically climbs the risk ladder — cash first, then
 * gold, bonds, balanced, and long-horizon equity last. The homepage renders
 * them in this order.
 */
export const GOALS: Goal[] = [
  {
    slug: "para-piyasasi-fonlari",
    label: "Nakit & kısa vade",
    tagline: "Paranı kısa vadede değerlendir",
    heading: "Net getiriye göre öne çıkan para piyasası fonları",
    rankingCriterion: "1 yıllık stopaj sonrası net getiriye göre sıralı",
    intro:
      "Para piyasası fonları, kısa vadeli ve düşük dalgalanmalı araçlarda durur; " +
      "birikimini güvenli tarafta tutup getiriden de tümüyle vazgeçmek istemeyenler " +
      "için başlangıç noktasıdır. Aşağıdaki sıralama, maliyet ve stopaj sonrası " +
      "net reel getiriyi öne çıkarır — nominal getiri tek başına yanıltıcı olabilir.",
    categories: ["Para Piyasası"],
    keywords: [
      "para piyasası fonu",
      "en iyi para piyasası fonları",
      "kısa vadeli fon",
      "likit fon",
    ],
    glyph: "💵",
  },
  {
    slug: "altin-fonlari",
    label: "Altın & kıymetli maden",
    tagline: "Altın ve kıymetli madende kal",
    heading: "Net getiriye göre öne çıkan altın ve kıymetli maden fonları",
    rankingCriterion: "1 yıllık stopaj sonrası net getiriye göre sıralı",
    intro:
      "Kıymetli maden fonları ağırlıklı olarak altın ve gümüşte konumlanır; " +
      "enflasyona ve kur hareketlerine karşı bir sığınak olarak tercih edilir. " +
      "Fonlar arasındaki fark çoğu zaman getiriden çok maliyette ortaya çıkar, " +
      "o yüzden gider oranını getiriyle birlikte okumak gerekir.",
    categories: ["Kıymetli Maden"],
    keywords: [
      "altın fonu",
      "en iyi altın fonları",
      "kıymetli maden fonu",
      "gümüş fonu",
    ],
    glyph: "🪙",
  },
  {
    slug: "borclanma-fonlari",
    label: "Tahvil & borçlanma",
    tagline: "Tahvil ve borçlanmada sabit gelir ara",
    heading: "Reel getiriye göre öne çıkan borçlanma (tahvil) fonları",
    rankingCriterion: "1 yıllık reel (TÜFE sonrası) getiriye göre sıralı",
    intro:
      "Borçlanma araçları fonları tahvil ve bonolarda konumlanır; hisseye göre " +
      "daha istikrarlı, para piyasasına göre daha uzun vadeli bir getiri profili " +
      "sunar. Reel getiri — yani enflasyon sonrası getiri — bu kategoride en " +
      "belirleyici ölçüttür.",
    categories: ["Borçlanma"],
    keywords: [
      "borçlanma fonu",
      "tahvil fonu",
      "en iyi tahvil fonları",
      "sabit getirili fon",
    ],
    glyph: "📄",
  },
  {
    slug: "dengeli-fonlar",
    label: "Dengeli & değişken",
    tagline: "Riski dengeli bir karışıma yay",
    heading: "Tutarlılığa göre öne çıkan dengeli ve değişken fonlar",
    rankingCriterion:
      "Kategorisini düzenli geçen fonlar · 1 yıllık net getiri ile birlikte",
    intro:
      "Değişken fonlar hisse, tahvil ve diğer varlıklar arasında serbestçe " +
      "dağılım yapar; tek bir varlık sınıfına bağlı kalmadan dengeli bir getiri " +
      "arayanlar için uygundur. Bu esneklik, fonlar arasında tutarlılığı — her yıl " +
      "kategorisinin neresinde durduğunu — önemli kılar.",
    categories: ["Değişken"],
    keywords: [
      "değişken fon",
      "dengeli fon",
      "en iyi değişken fonlar",
      "karma fon",
    ],
    glyph: "⚖️",
  },
  {
    slug: "uzun-vadeli-hisse-fonlari",
    label: "Uzun vadeli hisse",
    tagline: "Yıllara yayılan getiri için hisseye yatır",
    heading: "Çok yıllı tutarlılığa göre öne çıkan hisse senedi fonları",
    rankingCriterion:
      "Çok yıllı tutarlılık · kategorisini yıllara yayan performans",
    intro:
      "Hisse senedi fonları uzun vadede en yüksek getiri potansiyelini taşır, " +
      "ama aynı zamanda en dalgalı kategoridir. Bir günün sıçraması değil, yıllara " +
      "yayılan tutarlı performans belirleyicidir; sıralama bu yüzden tek yıllık " +
      "zıplamayı değil, kategorisini düzenli geçen fonları öne çıkarmayı hedefler.",
    categories: ["Hisse Senedi"],
    keywords: [
      "hisse senedi fonu",
      "en iyi hisse fonları",
      "uzun vadeli fon",
      "hisse fonu karşılaştırma",
    ],
    glyph: "📈",
  },
];

/** The goal for a URL segment, or undefined when nothing matches it. */
export function goalBySlug(slug: string): Goal | undefined {
  return GOALS.find((goal) => goal.slug === slug);
}
