# Fondeks — Hukuki Risk Değerlendirmesi (Türkiye)

Hazırlayan: senior fintech hukukçusu perspektifiyle, canlı koddaki
yüzeyleri okuyarak çıkarılmıştır.
Tarih: 2026-10-25
Kapsam: `fondeks-client` deposu HEAD — yasal sayfalar, kayıt akışı,
analitik/çerezler, DecisionPanel ve goal sayfaları, fon verisi kullanımı,
footer uyarıları.

> **Not:** Bu bir iç risk haritasıdır, imzalı hukuki mütalaa değildir.
> Lansmandan ya da ücretli bir özelliğin açılmasından önce bir SPK uyum +
> KVKK deneyimli avukatla aşağıdaki "lansman öncesi" kalemler kapatılmalı.

Risk seviyeleri: 🔴 kritik · 🟠 yüksek · 🟡 orta · ⚪ düşük.

---

## 1. KVKK ve Veri Koruması

### 1.1 🔴 Yasal metinler yayında ama **içeriği boş**
`src/components/layout/LegalPage.tsx` tüm "/kvkk", "/gizlilik",
"/kullanim-sartlari" sayfalarını tek şablonla üretiyor ve içerik olarak
şu metni gösteriyor:
> "Metnin nihai hâli hazırlanıyor. Yayına almadan önce hukuk onaylı sürümle
> değiştirilmelidir."

**Dayanak:** 6698 s. KVKK m. 10 (aydınlatma yükümlülüğü), m. 18/1-a (ihlâl
hâlinde 2026 için 68.083 TL – 3.406.800 TL idari para cezası).
**Risk:** Hesap açan her kullanıcı için işlemenin hukuki dayanağı yok
sayılabilir (m. 5). İlk şikâyette Kurum müdahil olur.
**Yapılması gereken:**
- Veri sorumlusu kimliği (ticari ünvan, MERSİS no, KEP, adres, iletişim).
- İşleme amaçları ve KVKK m. 5/2 bentlerinden hukuki sebep eşlemesi.
- Aktarılan taraflar (Google LLC — GA4; Amplitude Inc./EU; hosting;
  Postgres sağlayıcısı), saklama süreleri, m. 11 hakları.
- VERBIS eşik kontrolü (çalışan sayısı ≥ 50 veya yıllık mali bilanço
  ≥ 25M TL ise zorunlu kayıt).

### 1.2 🔴 Çerez onay sistemi hiç yok
`grep` sıfır sonuç: `CookieBanner`, `ConsentManager`, "çerez" bazlı modül
yok. Buna rağmen:
- `src/components/layout/Analytics.tsx` production'da GA4 (`G-WTPD2PRKR0`)
  gtag.js'i koşulsuz yüklüyor.
- `src/lib/analytics/providers/amplitude.ts` — Amplitude EU anahtarı
  varsa `amplitude.init()` çağrısı yapıyor.
- `src/app/(app)/layout.tsx` → `IdentifyUser` kullanıcı id'sini
  `analytics.identify(user.id)` ile dağıtıyor.
- `src/lib/auth/session.ts` → `fondeks_session` çerezi (30 gün).

**Dayanak:** KVKK Kurulu 2022 "Çerez Uygulamaları Hakkında Rehber" —
teknik olarak zorunlu olmayan çerezler **önceden açık rıza** ister
(opt-in; pasif banner yetmez). 2024 TikTok/Meta kararları emsal.
**Risk:** Her kullanıcı girişinde ihlâl üretiyor. Toplu şikâyete açık.
**Yapılması gereken:**
- Granüler bir onay katmanı: zorunlu (session), analitik, pazarlama;
  varsayılan "kapalı".
- Onay yoksa `gtag.js` ve Amplitude SDK **yüklenmemeli** (yalnızca
  "config" göndermemek yetmez — kaynak dosyanın yüklenmesi bile çerez
  bırakır).
- Mevcut `fondeks_session` ve `fondeks_signup_completed` çerezleri
  "oturum için teknik olarak gerekli" sayılıp aydınlatma metninde
  listelenmeli.

### 1.3 🟠 Kayıt formunda rıza kutuları yok
`src/components/auth/RegisterForm.tsx` sadece ad soyad, e-posta, şifre
alıyor, doğrudan "Hesap Oluştur" butonuna gidiyor. Yok olanlar:
- KVKK aydınlatma linki.
- Kullanım Şartları ve Gizlilik Sözleşmesi onayı (görünür link + onay).
- 6563 s. Elektronik Ticaret Kanunu m. 6 — ticari elektronik ileti onayı,
  ayrı ve ön-işaretsiz. İYS kaydı da gerekir (10.000 kullanıcıya posta
  atmak için ayrı yükümlülük).
- 18+ yaş kapısı. 18 altı kullanıcı için velinin açık rızası aranır
  (KVKK m. 5/2-a mahrumiyet değil; onay yoksa işlenemez).

**Dayanak:** KVKK m. 10, 6563 m. 6 (başına 1.000 – 15.000 TL ceza), İYS
Tebliği.
**Yapılması gereken:** Üç ayrı onay kutusu (zorunlu: KVKK aydınlatma +
Kullanım Şartları + 18 yaş; opsiyonel: pazarlama izni).

### 1.4 🟠 Yurt dışı veri aktarımı için hukuki temel yok
`analytics.identify(user.id)` ile kullanıcı id'si GA4 üzerinden Google LLC
(ABD) ve Amplitude EU'ya aktarılıyor. Pseudonymised olsa dahi KVKK m. 9
kapsamında yurt dışı aktarımdır.
**Mevcut dayanak:** Hiçbiri (ne açık rıza, ne taahhütname, ne Kurul kararı).
**Dayanak:** KVKK m. 9/1-a ve m. 9/6 — Kurul'a onaylı taahhütname veya
açık rıza. Kurul'un 2024 yılında yurt dışı aktarım kararları ve
"standart sözleşme" düzenlemesi var.

### 1.5 🔴 Hesap silme hakkı sistemsel olarak eksik
`src/components/auth/UserMenu.tsx` yalnızca "Çıkış yap" sunuyor. `grep`
sonucu: `delete-account`, `hesap sil`, `deleteAccount` → sıfır.
**Dayanak:** KVKK m. 11/1-e (silme hakkı) ve m. 7 (silme/anonim hale
getirme yükümlülüğü).
**Risk:** Veri sahibinin yazılı başvurusuna süresinde cevap verememek, en
sık görülen KVKK şikâyet sebeplerinden.
**Yapılması gereken:** Kullanıcının hesap arayüzünden silme talebi
başlatabildiği akış + 30 gün içinde yerine getirmeyi garanti eden
operasyon prosedürü.

### 1.6 🟡 Teknik güvenlik — iyi başlıyor, eksikler var
İyi tarafı: `src/lib/auth/session.ts` session token'ı DB'ye yalnız hash
olarak yazıyor, HttpOnly, prod'da Secure, SameSite=Lax.
Eksikler:
- Veri ihlali bildirim prosedürü (m. 12/5 — 72 saat Kurul bildirim).
- Yetkisiz erişim ve admin işlem loglama politikası.
- Yedek şifreleme politikası.
- Password hashing algoritması dokümante değil (bcrypt/argon2 beklenir;
  `src/lib/auth/password.ts` incelenmeli).

### 1.7 🟡 Profilleme açıkça aydınlatılmıyor
`src/lib/analytics/types.ts` içinde `fund_watch_toggled`,
`compare_fund_added`, `compare_to_track` eventleri kullanıcının hangi fonu
takip ettiğini kaydediyor. Bu bir **profilleme** faaliyetidir.
**Dayanak:** KVKK m. 10/1-c (otomatik sistemler yoluyla analiz) açıkça
belirtilmeli. Kullanıcıya "profillenmekten çıkma" seçeneği sunulmalı.

### 1.8 🟡 Arama metni ham olarak GA/Amplitude'a gidiyor
`src/components/layout/NavCenter.tsx` → `track("search_submitted", { query:
needle, source: "nav" })`. Kullanıcı fon kodu yerine kendi adını,
TC'sini veya telefon numarasını yazarsa, bu PII GA4 ve Amplitude
sunucularına orijinal hâliyle gönderilir.
**Dayanak:** KVKK veri minimizasyonu ilkesi (m. 4/2-ç).
**Yapılması gereken:** Önce normalize et (sadece alfasayısal, max 32
karakter), T.C. kimlik numarası / telefon örüntüsü regex ile tespit edilip
reddedilmeli, uzun inputlar kısaltılmalı.

---

## 2. SPK · Yatırım Danışmanlığı Sınırı

### 2.1 🔴 "Karar Paneli" ve kopya dili sınırı aşındırıyor
`src/components/fund-detail/DecisionPanel.tsx`:
> `<span className={styles.title}>Karar Paneli</span>`
> `<span className={styles.hint}>Doğru fonda mıyım?</span>`

`src/lib/fondeks/choose.ts` → `fundVerdict()` çıktıları:
> "Katılmadan önce reel getiriye bak."
> "Son 1 yılda %X kayıpta."
> "Son 5 yılın 4'ünde kategorisini geçti. Son 1 yıl: %Y."

**Dayanak:** SPK III-55.1 (Yatırım Hizmetleri Tebliği) + III-39.3 (Yatırım
Danışmanlığı Tebliği). İkisi arasındaki ayrım:
- **Yatırım danışmanlığı** (yetki belgesi şart): belirli bir müşteriye
  özgü, kişiselleştirilmiş yorum ve öneri.
- **Genel yatırım tavsiyesi** (yetkisiz verilebilir, ama şartlı): genel
  nitelikli, pazarlama olmayan, SPK standart uyarısıyla.

"Karar Paneli" ismi + "Doğru fonda mıyım?" sorusu + fona özgü yorum,
kişiselleşmemiş bile olsa, sunuş açısından yatırım danışmanlığına
yaklaşıyor. SPK uygulamada şekilden çok işleve bakar.

**Risk:** SPK Karar yaptırımları — ihlâl para cezası, faaliyetin durdurulması,
yasaklama.
**Yapılması gereken:**
- "Karar Paneli" → "Bilgi Paneli" veya benzeri nötr ad.
- "Doğru fonda mıyım?" → "Bu fonu nasıl okuyabilirim?" gibi bilgi-yönlü
  revizyon.
- "Katılmadan önce …" fiil kipinden kaçın; "… bakılabilir / incelenebilir"
  tipi genel ifadeler.
- SPK standart uyarısının **her tavsiye içeren ekranda** (fon sayfası,
  goal sayfası, compare board) tam metinle görünmesi:
  > "Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım
  > danışmanlığı kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı
  > kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar
  > ile müşteri arasında imzalanacak yatırım danışmanlığı sözleşmesi
  > çerçevesinde sunulmaktadır. Burada yer alan yorum ve tavsiyeler,
  > yorum ve tavsiyede bulunanların kişisel görüşlerine dayanmaktadır.
  > Bu görüşler mali durumunuz ile risk ve getiri tercihlerinize uygun
  > olmayabilir. Bu nedenle, sadece burada yer alan bilgilere dayanılarak
  > yatırım kararı verilmesi beklentilerinize uygun sonuçlar doğurmayabilir."

### 2.2 🟠 "En iyi X fonları" iddiası
`src/lib/fondeks/goals.ts`:
> "En iyi para piyasası fonları"
> "En iyi altın ve kıymetli maden fonları"
> "En iyi borçlanma (tahvil) fonları"

**Dayanak:**
- SPK: Yetkisiz "en iyi" iddiası tavsiye niteliğine girebilir.
- Reklam Kurulu / Ticari Reklam Yönetmeliği m. 7: "en iyi" iddiası
  objektif, ölçülebilir ve belgelenebilir bir kriterle desteklenmeli.
  Hangi metrik olduğu kullanıcıya **açıkça** söylenmeli.

**Yapılması gereken:** "En iyi …" yerine
"Net reel getiriye göre öne çıkan … fonları" veya başlık altında ölçüt
rozeti ("Sıralama: 1 yıllık stopaj sonrası net getiri").

### 2.3 🟡 TEFAS veri gecikme uyarısı yok
TEFAS fiyatları T+1 gecikmelidir (seanslar kapandıktan sonra yayımlanır).
Fon detay sayfası veya karşılaştırma board'ında bu belirtilmiyor.
**Dayanak:** SPK dürüstlük prensibi + Reklam Kurulu yanıltıcı reklam
yasağı. "Canlı" izlenimi veren "piyasa" ikonları yanıltıcı sayılabilir.
**Yapılması gereken:** Her fiyat ekranında "Fiyatlar TEFAS'tan alınır;
T+1 gün gecikmelidir. Son fiyat tarihi: {priceDate}" ibaresi.

---

## 3. Haksız Rekabet ve Karşılaştırmalı Reklam

### 3.1 🟠 "Bankanın önerdiği fonun ikinci görüşü" karşılaştırmalı reklam
Bu ifade henüz canlı kopya değil (benim önerim); ama ürünün tezinde
hali hazırda var ve lansman kopyasında kullanılacağı anlaşılıyor.

**Dayanak:** TTK m. 55/1-a-5 (karşılaştırmalı reklam yasağı — koşullu),
Ticari Reklam Yönetmeliği m. 8. Karşılaştırmalı reklam şu şartlarla
serbest: objektif, doğrulanabilir, aynı ihtiyacı karşılayan ürünler
arasında, yanıltıcı değil, rakibin itibarını zedelemeyen.

**Risk:** Fon kurucusu bir banka (Garanti BBVA, İş Portföy, Ak Portföy,
QNB Finansinvest …), "ticari itibarının zedelendiği" iddiasıyla ihtiyati
tedbir ve maddi/manevi tazminat talep edebilir (TTK m. 56).

**Yapılması gereken:**
- "Bankanın önerdiği" ifadesinden belirli bir rakibi adıyla hedeflememek
  (bir banka adını zikretmeksizin genel ifade — bu da dava açık ama
  savunma güçleniyor).
- İddiayı olgulara dayandır: "Bir fonu dağıtan kurum grubu ile fonu
  yöneten portföy şirketi aynı holding içindeyse, bu durum …". Olgu +
  belgelenebilirlik = TTK 55/1 savunması.

### 3.2 🟡 "Gider oranından faydalanan: {founder}" ifadesi
Bu ifade kurucu portföy şirketinin yönetim ücreti aldığını doğruluyor —
olgu doğru, "fair comment" savunulabilir. Ama "yanıltıcı" bulunursa
haksız rekabet dayanağı olur.
**Yapılması gereken:** İfadeyi genişlet — "Fonun yönetim şirketi {founder};
toplam gider oranının bir kısmı yönetim ücreti olarak {founder}'a ödenir."
İddiayı spekülasyondan çıkarıp olguya kilitler.

---

## 4. Marka ve Fikri Mülkiyet

### 4.1 🟡 Fon kurucu logoları ve isimleri
`fund.founder`, `fund.founderIcon` ile kurucu adı ve logosu
gösteriliyor.
**Dayanak:** SMK m. 7/5 (nominative fair use — bilgilendirme amaçlı
kullanım). Savunulabilir, ama koşullu:
- Logolar nereden besleniyor? Hotlink mi, kendi CDN'imizden mi?
- Logoya bitişik negatif değerlendirme ("gider oranından faydalanan …")
  "fair use" savunmasını zayıflatır.
**Yapılması gereken:** Logo kullanım politikası dokümanı; her logoya
alt-text ("…. logosu, bilgilendirme amaçlı").

### 4.2 🟡 TEFAS / KAP veri hakları
`src/app/api/cron/sync-positions`, `sync-disclosures`, `sync-inceptions`
cronları Takasbank TEFAS kaynağından veri çekiyor.
**Dayanak:** FSEK m. 81/B (sui generis veritabanı hakkı). Takasbank
veritabanı yapımcı sıfatına sahip.
**Yapılması gereken:**
- Takasbank TEFAS veri kullanım şartlarının (son yayımlanmış sürümüne)
  uyum kontrolü.
- "Reasonable extraction" sınırı — ürünü eğitirken toplu dump değil, sorgu
  bazında çekme.
- Her sayfada atıf (kaynak: TEFAS / Takasbank).
- KAP metin kullanımı (`src/components/news/NewsPanel.tsx`) için KAP
  "atıfla iktibas" sınırları (KAP ToS).

---

## 5. E-Ticaret ve Tüketici

### 5.1 🟡 Hizmet sağlayıcı bilgileri eksik
6563 s. Kanun m. 3 — Fondeks sitesinin herkesin kolayca erişebileceği bir
yerde ticari ünvan, MERSİS no, güncel iletişim ve KEP bilgisi
göstermesi zorunlu.
**Mevcut:** Footer'da sadece "© Fondeks" var.
**Yapılması gereken:** Footer'a ticari ünvan, MERSİS, adres, KEP, telefon.

### 5.2 ⚪ Ücretli özellik yok (şu an için)
Mevcut sürümde ücretli özellik görünmüyor. Hayata geçerse ayrıca
Mesafeli Sözleşmeler Yönetmeliği, dijital içerik cayma hakkı
istisnası, ön bilgilendirme formu şartları yürürlüğe girer.

### 5.3 🟡 Uyuşmazlık çözüm yolu
Gizlilik Sözleşmesi veya Kullanım Şartlarında Tüketici Hakem Heyeti
başvuru yolu, parasal sınır bilgisi ve yetkili mahkeme açıkça
belirtilmeli.

---

## 6. İş Sürekliliği ve Uyum Operasyonu

### 6.1 🟡 Veri İhlali Müdahale Prosedürü (DPIM)
KVKK m. 12/5 — veri sahibinin kişisel verilerinin başkaları tarafından ele
geçirilmesi durumunda **72 saat içinde** Kurul'a ve ilgili kişiye bildirim
zorunluluğu. Mevcut depoda böyle bir prosedür belgesi görünmüyor.
**Yapılması gereken:** `docs/kvkk-ihlal-mudahale.md` veya iç wiki; kimin
sorumlu olduğu, iletişim akışı, bildirim şablonu.

### 6.2 🟡 Alt yüklenici (işleyen) sözleşmeleri
Google (GA4), Amplitude, Postgres hosting, e-posta sağlayıcısı — her biri
KVKK anlamında **veri işleyen**. Veri sorumlusu Fondeks ile aralarında
KVKK m. 12/2 çerçevesinde "veri işleyen taahhüdü" içeren sözleşme
olmalı. Google ve Amplitude'un standart DPA'ları var; imzalanmış kopyalar
dosyada tutulmalı.

### 6.3 ⚪ Dışarıdan erişilebilir veri — bot taraması
Fondeks fon verilerini gösteriyor; başka ürünlerin bu veriyi scrape
etmesi (Fondeks üzerinden Takasbank'a dolaylı erişim) FSEK 81/B
kapsamında Fondeks'in de taraf olacağı bir alt-ihlal doğurabilir.
**Yapılması gereken:** `robots.txt`, rate limit, ToS'ta scrape yasağı.

---

## Öncelik Özeti

### Lansman öncesi (mutlaka tamamlanmalı)
- [x] KVKK Aydınlatma Metni gerçek içerikle doldurulsun (1.1) — `src/lib/legal/content.ts` + `src/app/(app)/kvkk/page.tsx` · hukuk incelemesi beklemektedir
- [x] Gizlilik Sözleşmesi + Kullanım Şartları gerçek metinle (1.1) — aynı modül, üç belge · hukuk incelemesi beklemektedir
- [x] Çerez onay katmanı + onay sonrası GA4/Amplitude yüklemesi (1.2) — `src/components/consent/ConsentBanner.tsx` + `src/lib/consent/{types,store}.ts`; Analytics ve Amplitude provider onay-arkası
- [x] Kayıt formunda KVKK + Şartlar + 18+ onay kutuları (1.3) — `src/components/auth/RegisterForm.tsx` + `src/lib/auth/validation.ts` · users tablosunda denetim zaman damgaları
- [x] Hesap silme akışı (1.5) — `/hesap` + `DeleteAccountForm` + `deleteAccountAction` · "SİL" doğrulamalı
- [x] "Karar Paneli" dilinin SPK uyumlu revizyonu (2.1) — başlık "Bilgi Paneli", `fundVerdict()` bilgi odaklı dile çevrildi
- [x] SPK standart uyarısının tavsiye içeren her ekranda görünmesi (2.1) — `SpkDisclaimer` fon detay, kategori ve karşılaştırma sayfalarında mount edildi
- [x] "En iyi" iddialarının ölçüt bazlı ifadeye çevrilmesi (2.2) — goals.ts başlıkları + `rankingCriterion` kategori sayfasında görünür
- [x] TEFAS gecikme uyarısı (2.3) — `TefasFreshness` fon detay, kategori ve karşılaştırma sayfalarında
- [x] Footer'a ticari ünvan + MERSİS + adres + KEP (5.1) — `src/lib/legal/entity.ts` + Footer, TODO alanlar lansmandan önce doldurulacak

### İlk 30 gün
- [ ] Yurt dışı veri aktarımı için açık rıza veya taahhütname (1.4) — onay sistemi altyapıya hazır, Kurul taahhütnamesi/standart sözleşme imzalanmalı
- [ ] İYS kaydı — pazarlama iletişimi planlıysa (1.3) · pazarlama onayı altyapı tarafı hazır
- [x] Veri ihlali müdahale prosedürü (6.1) — `docs/kvkk-ihlal-mudahale.md`
- [x] Alt yüklenici DPA'ları imzalanıp dosyalanmalı (6.2) — `docs/dpa-register.md` iskeleti
- [x] Analitik arama metni filtresi (1.8) — `src/lib/analytics/sanitize.ts` + `NavCenter.tsx`
- [ ] "İkinci görüş" iddialarının olgu bazlı revizyonu (3.1) · yalnız iç dokümanda var, pazarlama kopyasına ulaştığında hukuk süzgecinden geçmeli

### Önerilen (ileri aşama)
- [ ] VERBIS kayıt eşik kontrolü (1.1)
- [ ] Logo kullanım politikası dokümanı (4.1)
- [ ] Takasbank/TEFAS veri kullanım şartları yazılı mutabakat (4.2)
- [ ] Tüketici hakem heyeti bilgisi Kullanım Şartlarında (5.3)
- [ ] Scrape koruması + ToS'ta scrape yasağı (6.3)

---

## Sonuç ve Yönetici Özeti

Fondeks'in **ürün tezi savunulabilir**: TEFAS verisini okuyarak yatırımcıya
daha dürüst bir karşılaştırma sunmak, SPK'nın "genel yatırım tavsiyesi"
istisnası çerçevesinde yasal olarak mümkündür. Problem içerikte değil,
içeriği taşıyacak altyapıdadır:

1. **Üç yasal metin ("/kvkk", "/gizlilik", "/kullanim-sartlari") şu anda
   "Metnin nihai hâli hazırlanıyor" placeholder'ı gösteriyor.** Üretim
   ortamında kullanıcı kayıt alıyorsak, aydınlatma yükümlülüğünü yerine
   getirmiyoruz. Bu tek başına Kurul şikâyet gerekçesidir.
2. **Çerez onayı hiç yok, GA4 ve Amplitude koşulsuz yükleniyor.** 2022
   Çerez Rehberi'ne göre doğrudan ihlâl.
3. **"Karar Paneli" ismi ve kopya dili yatırım danışmanlığı sınırını
   aşındırıyor.** SPK'nın şekilden çok işleve baktığı unutulmamalı.
4. **Hesap silme hakkı sistemsel olarak kurulmamış.** KVKK m. 11/1-e.
5. **Hizmet sağlayıcı kimlik bilgileri (MERSİS, adres) footer'da yok.**
   6563 m. 3.

Yukarıdaki beş kalem bir SPK uyum + KVKK deneyimli avukatla **iki
haftalık** bir uyum sprintinde çözülebilir. Lansman veya ücretli özellik
açılışı bu beş kalem kapatılmadan yapılmamalıdır.

Yan not: `.claude/auth/maktescomtr-a7b0f1f444d3.json` dosyası depoda
servis hesabı özel anahtarı tutuyor. Git takip altında değil (iyi), ama
ekibin başka üyelerine açık bir yere taşınmalı (örn. 1Password / GCP
Secret Manager) ve kullanım `GOOGLE_APPLICATION_CREDENTIALS` env
değişkeni üzerinden yapılmalı. Mevcut key'in rotation'ı — bu dosya başka
bir yere kopyalandıysa — ayrıca değerlendirilmeli.
