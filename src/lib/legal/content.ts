/**
 * Yasal metin içerikleri — KVKK Aydınlatma, Gizlilik Sözleşmesi ve Kullanım
 * Şartları. Metinler, Fondeks'in gerçek veri akışları (GA4, Amplitude EU,
 * Postgres host, oturum çerezi) üzerinden savunulabilir bir ilk sürüm
 * olarak yazılmıştır. **Hukuk incelemesinden geçmeden lansmana çıkarılmamalı**;
 * sayfa şablonu bu uyarıyı kullanıcıya her sayfanın başında gösterir.
 *
 * Tek değişken alan `ENTITY` ve `LEGAL_REVISION_DATE` üzerinden okunur, böylece
 * ticari ünvan / MERSİS / adres değiştiğinde sadece `entity.ts` güncellenir.
 */

export type LegalSection = {
  /** Yan menü ve anchor için id. */
  id: string;
  heading: string;
  body: string[];
};

export type LegalDocument = {
  title: string;
  lead: string;
  sections: LegalSection[];
};

export const KVKK_AYDINLATMA: LegalDocument = {
  title: "KVKK Aydınlatma Metni",
  lead:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, Fondeks'i " +
    "kullandığında hangi kişisel verilerinin, hangi amaçla, hangi hukuki sebeple " +
    "işlendiğini ve bu süreçte sahip olduğun hakları açıklıyoruz.",
  sections: [
    {
      id: "veri-sorumlusu",
      heading: "1. Veri Sorumlusu",
      body: [
        "Veri sorumlusu, aşağıda ticari ünvanı ve iletişim bilgileri yer alan " +
          "işletmedir. KVKK kapsamındaki başvurular, KEP veya KVKK iletişim adresi " +
          "üzerinden yapılabilir.",
      ],
    },
    {
      id: "islenen-veriler",
      heading: "2. İşlenen Kişisel Veriler",
      body: [
        "Hesap verileri: ad soyad, e-posta adresi, şifre (yalnızca tek yönlü " +
          "özet / hash biçiminde saklanır).",
        "Oturum ve güvenlik verileri: oturum tanımlayıcısı (çerez üzerinden " +
          "taşınan tokenın SHA-256 özeti), oturum oluşturma / sona erme zamanı.",
        "Kullanım verileri: Fondeks üzerindeki sayfa görüntülemeleri, " +
          "takip listesine eklenen fon kodları, karşılaştırma listesine eklenen " +
          "fonlar, arama sorguları, tıklama olayları.",
        "Teknik veriler: IP adresi (log/anti-abuse amacıyla kısa süreli), " +
          "tarayıcı türü, cihaz türü, dil, erişim zamanı.",
        "İzin verildiğinde, pazarlama iletişimi için e-posta adresin ayrıca " +
          "işlenir.",
      ],
    },
    {
      id: "amaclar",
      heading: "3. İşleme Amaçları",
      body: [
        "Hesap oluşturma ve kimlik doğrulama (oturum yönetimi).",
        "Hizmetin sunulması: takip listesi, karşılaştırma, bireysel ekran " +
          "tercihlerinin saklanması.",
        "Ürünün geliştirilmesi için istatistiksel analiz (hangi özelliklerin " +
          "nasıl kullanıldığını anlamak).",
        "Güvenlik: yetkisiz erişim ve kötüye kullanım tespiti.",
        "Yasal yükümlülüklerin yerine getirilmesi.",
        "Açık rıza verildiyse: pazarlama ve kampanya iletişimi.",
      ],
    },
    {
      id: "hukuki-sebep",
      heading: "4. İşlemenin Hukuki Sebepleri (KVKK m. 5)",
      body: [
        "Sözleşmenin kurulması veya ifası (hesap açma, hizmet verme) — " +
          "KVKK m. 5/2-c.",
        "Hukuki yükümlülüklerin yerine getirilmesi — KVKK m. 5/2-ç.",
        "Veri sorumlusunun meşru menfaati (güvenlik ve ürün iyileştirme), " +
          "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla — " +
          "KVKK m. 5/2-f.",
        "Pazarlama iletişimi ve analitik çerezlerin işlenmesi: açık rıza — " +
          "KVKK m. 5/1.",
      ],
    },
    {
      id: "aktarim",
      heading: "5. Verilerin Aktarıldığı Taraflar",
      body: [
        "Google LLC (Amerika Birleşik Devletleri) — Google Analytics 4 " +
          "üzerinden anonim/pseudonymize kullanım verisi, yalnızca analitik " +
          "çerez onayı verildiyse.",
        "Amplitude, Inc. (AB veri bölgesi) — ürün analitiği, yalnızca onay " +
          "verildiyse.",
        "Sunucu ve veritabanı hizmet sağlayıcısı — hizmetin barındırılması " +
          "için zorunlu teknik aktarım.",
        "Yetkili kamu kurumları — yasal talep ve mahkeme kararı hâlinde.",
        "Yurt dışına aktarım, KVKK m. 9 kapsamında açık rızaya veya Kurul " +
          "onaylı taahhütname / Standart Sözleşme'ye dayanır.",
      ],
    },
    {
      id: "saklama",
      heading: "6. Saklama Süreleri",
      body: [
        "Hesap verileri: hesap aktif olduğu sürece; hesap silindiğinde en geç " +
          "30 gün içinde silinir veya anonim hâle getirilir.",
        "Oturum verileri: oturumun süresi (varsayılan 30 gün) + 6 ay güvenlik " +
          "log retansiyonu.",
        "Analitik veriler: GA4 ve Amplitude platformlarının 14 aylık " +
          "varsayılan retansiyon süresi.",
      ],
    },
    {
      id: "haklar",
      heading: "7. İlgili Kişinin Hakları (KVKK m. 11)",
      body: [
        "Kişisel verilerinin işlenip işlenmediğini öğrenme.",
        "İşlenmişse buna ilişkin bilgi talep etme.",
        "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
        "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.",
        "Eksik veya yanlış işlenmişse düzeltilmesini isteme.",
        "KVKK ve diğer mevzuatta öngörülen şartlar çerçevesinde silinmesini " +
          "veya yok edilmesini isteme.",
        "Bu işlemlerin, aktarılan üçüncü kişilere bildirilmesini isteme.",
        "Otomatik sistemlerle analiz sonucu aleyhine bir sonuç çıkmasına itiraz.",
        "Hukuka aykırı işleme nedeniyle uğradığı zararın giderilmesini talep.",
      ],
    },
    {
      id: "basvuru",
      heading: "8. Başvuru Yöntemi",
      body: [
        "Haklarını kullanmak için başvurunu KEP adresine, Veri Sorumlusuna " +
          "Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun biçimde iletebilirsin. " +
          "Başvurular en geç 30 gün içinde sonuçlandırılır.",
      ],
    },
  ],
};

export const GIZLILIK_SOZLESMESI: LegalDocument = {
  title: "Gizlilik Sözleşmesi",
  lead:
    "Fondeks'i kullandığında topladığımız verilerin kapsamı, nasıl " +
    "işlendiği, kimlerle paylaşıldığı ve nasıl koruduğumuz bu sayfada " +
    "açıklanır. Bu belge KVKK Aydınlatma Metni'nin tamamlayıcısıdır.",
  sections: [
    {
      id: "veri-topluyoruz",
      heading: "1. Hangi Verileri Topluyoruz",
      body: [
        "Hesap bilgileri (ad, e-posta, şifre özeti).",
        "Oturum çerezleri (teknik olarak zorunlu).",
        "Analitik ve pazarlama çerezleri — yalnızca açık rıza ile; onay " +
          "verilmediği sürece bu çerezler ve ilgili üçüncü taraf scriptleri " +
          "(Google Analytics, Amplitude) yüklenmez.",
        "Kullanım olayları (hangi sayfaları gezdiğin, hangi fonu takip ettiğin, " +
          "hangi fonları karşılaştırdığın).",
      ],
    },
    {
      id: "cerezler",
      heading: "2. Çerezler",
      body: [
        "Teknik olarak zorunlu çerezler: oturum çerezi (fondeks_session), " +
          "giriş sonrası dönüşüm izleme çerezi (fondeks_signup_completed). " +
          "Çalışması için onay gerekmez; hizmetin sunulması için zorunludur.",
        "Analitik çerezler: Google Analytics ve Amplitude tarafından set " +
          "edilen çerezler. Yalnızca açık rıza alınmışsa yüklenir.",
        "Pazarlama çerezleri: ileride entegre edilecek herhangi bir reklam " +
          "ağının çerezi — yalnızca ayrı açık rıza ile.",
        "Çerez tercihlerini istediğin an sayfanın altındaki 'Çerez Ayarları' " +
          "bağlantısından güncelleyebilirsin.",
      ],
    },
    {
      id: "paylasim",
      heading: "3. Üçüncü Taraflarla Paylaşım",
      body: [
        "Google LLC (ABD) — Google Analytics 4; onayla.",
        "Amplitude, Inc. (AB veri bölgesi) — ürün analitiği; onayla.",
        "Hosting ve veritabanı sağlayıcısı — zorunlu teknik işleme.",
        "Yasal yükümlülük veya mahkeme kararı hâli dışında kişisel veriler " +
          "ticari amaçla üçüncü taraflara satılmaz, kiralanmaz, paylaşılmaz.",
      ],
    },
    {
      id: "guvenlik",
      heading: "4. Güvenlik Önlemleri",
      body: [
        "Şifreler, tek yönlü scrypt özeti olarak saklanır.",
        "Oturum tokenları yalnızca HttpOnly, SameSite=Lax ve prod'da Secure " +
          "çerez olarak taşınır; veritabanında yalnızca SHA-256 özetleri tutulur.",
        "Sunucu ve veritabanı erişimleri sınırlı sayıda kişiye verilmiştir.",
        "Veri ihlali olasılığı tespit edildiğinde KVKK m. 12/5 kapsamında " +
          "72 saat içinde Kurul'a ve etkilenen kişilere bildirim yapılır.",
      ],
    },
    {
      id: "haklar-ozet",
      heading: "5. Haklarını Nasıl Kullanırsın",
      body: [
        "Hesabını kullanıcı arayüzünden silebilirsin — silme talebi 30 gün " +
          "içinde yerine getirilir.",
        "Diğer tüm KVKK m. 11 haklarını Aydınlatma Metni'ndeki başvuru " +
          "yöntemiyle kullanabilirsin.",
      ],
    },
  ],
};

export const KULLANIM_SARTLARI: LegalDocument = {
  title: "Kullanım Şartları",
  lead:
    "Fondeks'i kullanırken geçerli olan koşullar, hizmetin kapsamı, " +
    "sorumluluk sınırları ve kullanıcı yükümlülükleri bu sayfada " +
    "düzenlenir. Hesap oluşturarak bu şartları kabul etmiş sayılırsın.",
  sections: [
    {
      id: "hizmet-kapsami",
      heading: "1. Hizmetin Kapsamı",
      body: [
        "Fondeks, TEFAS üzerinden kamuya açık fon verilerini okuyarak " +
          "yatırımcılara **bilgi amaçlı** değerlendirme sunan bir " +
          "yazılım hizmetidir. Burada yer alan içerikler yatırım danışmanlığı " +
          "veya alım-satım tavsiyesi değildir.",
        "Veriler Takasbank/TEFAS kaynağından T+1 iş günü gecikmeli olarak " +
          "alınır. Fondeks veri doğruluğu için makul özeni gösterir fakat " +
          "kaynak hatalarından sorumlu değildir.",
      ],
    },
    {
      id: "hesap",
      heading: "2. Hesap ve Yaş Şartı",
      body: [
        "Hesap açarak 18 yaşından büyük olduğunu, ad-soyad ve e-posta " +
          "bilgilerinin sana ait ve doğru olduğunu beyan edersin.",
        "Hesap şifresinin güvenliğinden kullanıcı sorumludur. Yetkisiz " +
          "erişim şüphesinde Fondeks ekibine derhal bildirilmelidir.",
        "Fondeks, hesabı kötüye kullanım tespiti hâlinde askıya alma veya " +
          "kapatma hakkını saklı tutar.",
      ],
    },
    {
      id: "yasaklar",
      heading: "3. Yasak Davranışlar",
      body: [
        "Fondeks verisini otomatik araçlarla (bot/crawler/scraper) toplu " +
          "biçimde çekmek, API bariyerlerini aşmaya çalışmak.",
        "Fondeks üzerinden üçüncü kişilerin verilerine izinsiz erişmek.",
        "Hizmeti, mevzuata aykırı amaçlarla veya başka bir kullanıcıya zarar " +
          "verecek şekilde kullanmak.",
        "Fondeks markasını, logosunu veya içeriklerini izinsiz çoğaltmak.",
      ],
    },
    {
      id: "yatirim-uyarisi",
      heading: "4. Yatırım Uyarısı",
      body: [
        "Fondeks üzerinde yer alan tüm yorum, sıralama ve değerlendirmeler " +
          "yatırım danışmanlığı kapsamında değildir. Yatırım kararları, " +
          "kullanıcının kendi mali durumuna, risk tercihine ve araştırmasına " +
          "dayanmalıdır. Fondeks, kullanıcıların yatırım sonuçlarından " +
          "sorumlu değildir.",
      ],
    },
    {
      id: "sorumluluk",
      heading: "5. Sorumluluğun Sınırı",
      body: [
        "Fondeks, hizmetin kesintisiz veya hatasız olacağını taahhüt etmez. " +
          "Olası veri yanlışlığı, hizmet kesintisi, üçüncü taraf kaynaklı " +
          "aksaklıklar nedeniyle doğacak zararlar için sorumluluk, yürürlükteki " +
          "mevzuatın izin verdiği azami ölçüde sınırlıdır.",
      ],
    },
    {
      id: "uyusmazlik",
      heading: "6. Uyuşmazlık Çözümü",
      body: [
        "Bu Sözleşme'den doğan uyuşmazlıklarda Türkiye Cumhuriyeti hukuku " +
          "uygulanır. Tüketici sıfatını haiz kullanıcılar, Tüketici Hakem " +
          "Heyetleri ve Tüketici Mahkemeleri'ne, Gümrük ve Ticaret Bakanlığı " +
          "tarafından her yıl açıklanan parasal sınırlar çerçevesinde " +
          "başvurabilir.",
      ],
    },
    {
      id: "degisiklik",
      heading: "7. Değişiklik Hakkı",
      body: [
        "Fondeks bu şartlarda değişiklik yapma hakkını saklı tutar. Önemli " +
          "değişiklikler önceden hesap e-postan üzerinden duyurulur ve " +
          "revizyon tarihi bu sayfada güncellenir.",
      ],
    },
  ],
};
