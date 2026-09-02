/**
 * Rehber content. Plain explainers about how funds work — general information,
 * not investment advice. Seeded into the `guides` table.
 */
export const GUIDE_FIXTURES: {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readingMinutes: number;
  body: string;
  daysAgo: number;
}[] = [
  {
    slug: "yatirim-fonu-nedir",
    title: "Yatırım fonu nedir?",
    summary:
      "Bir fonun ne olduğunu, katılma payının ne anlama geldiğini ve paranın nerede tutulduğunu anlatan giriş yazısı.",
    category: "Temeller",
    readingMinutes: 4,
    daysAgo: 2,
    body: `Yatırım fonu, çok sayıda yatırımcının parasının bir havuzda toplanıp profesyonel bir portföy yönetim şirketi tarafından yönetildiği yapıdır. Havuzdaki para; hisse senedi, tahvil, kıymetli maden, mevduat gibi varlıklara fonun izahnamesinde tanımlanan kurallar çerçevesinde dağıtılır.

Fona yatırım yaptığında aslında fonun kendisini değil, fonun "katılma payı"nı satın alırsın. Katılma payının fiyatı, fonun sahip olduğu tüm varlıkların değerinin pay sayısına bölünmesiyle her iş günü yeniden hesaplanır. Bu yüzden fon fiyatları hisse senetleri gibi gün içinde sürekli değişmez; günde bir kez açıklanır.

Fonun varlıkları portföy yönetim şirketinin kendi mal varlığından ayrıdır ve saklamacı kuruluşta tutulur. Yönetim şirketi mali sıkıntıya düşse bile fonun varlıkları bu sıkıntıdan doğrudan etkilenmez.

Fonların en belirgin avantajı dağıtımdır: küçük bir tutarla onlarca farklı varlığa aynı anda yatırım yapmış olursun. Karşılığında yönetim ücreti ödersin ve portföyün içeriğine tek tek karar verme imkânın olmaz.`,
  },
  {
    slug: "tefas-nasil-calisir",
    title: "TEFAS nasıl çalışır?",
    summary:
      "Türkiye Elektronik Fon Alım Satım Platformu'nun işleyişi, hangi fonların platformda olduğu ve alım satımın nasıl gerçekleştiği.",
    category: "Temeller",
    readingMinutes: 4,
    daysAgo: 5,
    body: `TEFAS, Türkiye'de kurulu yatırım fonlarının tek bir platform üzerinden alınıp satılabildiği sistemdir. Kendi bankanın ya da aracı kurumunun müşterisi olsan bile, platformda işlem gören başka kurumların fonlarına da bu sistem sayesinde erişebilirsin.

Her fonun platformda üç harfli bir kodu vardır. Bu kod fonu tanımlar ve arama yaparken en hızlı yoldur. Fonun tam adı kurucusunu ve türünü de içerir; örneğin "hisse senedi" ibaresi taşıyan bir fon ağırlıklı olarak hisseye yatırım yapıyor demektir.

Bütün fonlar TEFAS'ta işlem görmez. Serbest fonların bir kısmı yalnızca nitelikli yatırımcılara sunulur ve platform dışında, kurucusunun kendi kanalları üzerinden alınır.

Emir verdiğinde işlem anında gerçekleşmez. Fonun fiyatı gün sonunda hesaplandığı için alım ya da satım, valör kuralları çerçevesinde ilerleyen iş günlerinde tamamlanır.`,
  },
  {
    slug: "risk-degeri-1-7",
    title: "Risk değeri (1–7) ne anlama gelir?",
    summary:
      "Fon künyelerindeki risk göstergesinin nasıl hesaplandığı ve 1 ile 7 arasındaki farkın pratikte ne demek olduğu.",
    category: "Risk",
    readingMinutes: 3,
    daysAgo: 9,
    body: `Her fonun künyesinde 1 ile 7 arasında bir risk değeri bulunur. Bu değer, fonun geçmiş dönemdeki fiyat dalgalanmasına (volatilitesine) bakılarak hesaplanır ve fonun ne kadar oynak olduğunu tek bir sayıya indirger.

1'e yakın değerler düşük dalgalanmayı ifade eder; para piyasası ve kısa vadeli borçlanma fonları genelde bu grupta yer alır. 6 ve 7 ise yüksek dalgalanmayı gösterir: hisse senedi yoğun fonlar, yabancı hisse fonları ve kaldıraç kullanan serbest fonlar burada bulunur.

Risk değeri bir kalite notu değildir. Yüksek risk "kötü fon" anlamına gelmediği gibi, düşük risk de kayıp yaşanmayacağı garantisi vermez. Yalnızca fiyatın ne kadar sert hareket edebileceğine dair bir ölçüdür.

Bu değer geçmiş verilere dayandığı için zaman içinde değişebilir. Piyasa koşulları sertleştiğinde bir fonun risk değeri yükselebilir.`,
  },
  {
    slug: "yonetim-ucreti-ve-gider-orani",
    title: "Yönetim ücreti ve gider oranı",
    summary:
      "Fon getirisinin içinden sessizce çıkan maliyetler: yıllık yönetim ücreti, toplam gider oranı ve bunların birikimli etkisi.",
    category: "Maliyet",
    readingMinutes: 4,
    daysAgo: 14,
    body: `Yönetim ücreti, portföy yönetim şirketinin fonu yönetmek karşılığında aldığı bedeldir. Yıllık bir oran olarak açıklanır ama günlük olarak fonun varlıklarından düşülür. Bu yüzden ayrıca bir ödeme yapmazsın; ücret zaten açıklanan fiyatın içindedir.

Açıklanan getiriler de bu ücret düşüldükten sonraki getirilerdir. Yani "%64 yıllık getiri" gördüğünde bu, yönetim ücreti ödendikten sonra kalan getiridir.

Toplam gider oranı ise yönetim ücretine ek olarak saklama, denetim ve işlem maliyetlerini de kapsar; fonun gerçek maliyetini görmek için daha kapsayıcı bir göstergedir.

Küçük görünen oran farkları uzun vadede birikir. Benzer stratejiye sahip iki fon arasında yıllık yarım puanlık ücret farkı, on yıllık bir süreçte belirgin bir getiri farkına dönüşebilir. Bu nedenle fon seçerken maliyet, getiri kadar somut bir karşılaştırma ölçütüdür.`,
  },
  {
    slug: "fonlarda-stopaj",
    title: "Fonlarda stopaj ve vergilendirme",
    summary:
      "Fon kazancından kesilen stopajın nasıl işlediği ve hisse yoğun fonların neden farklı değerlendirildiği.",
    category: "Vergi",
    readingMinutes: 3,
    daysAgo: 21,
    body: `Yatırım fonu katılma paylarının elden çıkarılmasından doğan kazanç stopaja tabidir. Stopaj, satış anında kazanç üzerinden kesilir ve fon dağıtımını yapan kurum tarafından tahsil edilir; ayrıca beyanname vermen gerekmez.

Hisse senedi yoğun fonlar için farklı bir oran uygulanır. Portföyünün belirli bir bölümünü sürekli olarak BIST'te işlem gören hisse senetlerinde tutan fonlar bu kapsama girer ve kazançlarında stopaj avantajı bulunur.

Diğer fon türlerinde ise kazanç üzerinden standart oranda kesinti yapılır. Fondeks'te her fonun künyesinde geçerli stopaj oranını görebilirsin.

Vergi oranları mevzuat değişiklikleriyle güncellenebilir. Güncel oran ve kendi durumuna özel değerlendirme için mali müşavirine danışman en doğrusudur.`,
  },
  {
    slug: "alis-satis-valoru",
    title: "Alış ve satış valörü nedir?",
    summary:
      "Emrin ne zaman gerçekleştiği, paranın hesabına ne zaman geçtiği ve T+1, T+2 ifadelerinin okunuşu.",
    category: "İşlem",
    readingMinutes: 3,
    daysAgo: 28,
    body: `Valör, verdiğin emrin kaç iş günü sonra sonuçlandığını gösterir. "T" emri verdiğin günü, yanındaki sayı ise geçmesi gereken iş günü sayısını ifade eder.

Alış valörü T+1 olan bir fonda emrini bugün verdiğinde katılma payların bir iş günü sonra hesabına geçer ve o günden itibaren fonun getirisinden pay almaya başlarsın.

Satış valörü T+2 ise fonu bugün sattığında paran iki iş günü sonra kullanılabilir hale gelir. Nakit ihtiyacın olduğu bir tarih varsa bu süreyi hesaba katman gerekir.

Para piyasası fonları genelde en kısa valörlere sahiptir; serbest fonlarda ise süre daha uzun olabilir. Her fonun künyesinde kendi valör bilgisi yer alır.`,
  },
  {
    slug: "fon-getirisi-nasil-okunur",
    title: "Fon getirisi nasıl okunur?",
    summary:
      "Günlük, aylık ve yıllık getirilerin ne anlattığı, karşılaştırma yaparken nelere dikkat edilmesi gerektiği.",
    category: "Temeller",
    readingMinutes: 4,
    daysAgo: 35,
    body: `Fon listelerinde gördüğün getiriler, seçilen dönemin başındaki fiyat ile bugünkü fiyat arasındaki yüzdesel farktır. Günlük getiri bir önceki iş gününe, yıllık getiri ise bir yıl önceki fiyata göre hesaplanır.

Kısa dönemli getiriler yanıltıcı olabilir. Tek bir haftada öne çıkan bir fon, o dönemde ağırlık verdiği bir sektörün yükselişinden faydalanmış olabilir; bu performansın devam edeceği anlamına gelmez.

Karşılaştırma yaparken aynı türden fonlara bakmak önemlidir. Bir hisse senedi fonunun getirisini para piyasası fonuyla kıyaslamak, farklı risk seviyelerini aynı kefeye koymak olur.

Getiriyi tek başına değil; risk değeri, dalgalanma ve maliyetle birlikte okumak daha sağlıklı bir tablo verir. Geçmiş getiriler gelecek için garanti taşımaz.`,
  },
];
