# KVKK Veri İhlali Müdahale Prosedürü

Bu doküman, Fondeks'te bir kişisel veri ihlali şüphesi hâlinde izlenecek
operasyonel adımları belirler. 6698 sayılı KVKK m. 12/5 ve KVKK Kurulu'nun
24.01.2019 tarihli ihlal bildirim rehberi esas alınmıştır.

> **Zaman kuralı:** Veri sorumlusunun ihlali öğrendiği andan itibaren **en geç
> 72 saat** içinde Kurul'a bildirim yapılması zorunludur. 72 saat
> aşıldığında gecikme sebebi raporlanmalıdır.

## Rol ve sorumluluklar
- **İhlal Müdahale Sorumlusu (IMS):** TODO — isim/rol. Ana karar verici.
- **Teknik Araştırma:** CTO / senior backend. Kök neden ve kapsam.
- **Hukuk:** Dış KVKK avukatı. Bildirim metni ve Kurul yazışması.
- **İletişim:** Pazarlama / destek. Etkilenen kişilere bildirim ve kamuoyu
  iletişimi.

## Adımlar

### 1. Tespit ve ilk kontrol (0 – 2 saat)
- İhlal sinyali (anormal erişim logu, destek bildirimi, dış araştırmacı
  bildirimi) IMS'ye iletilir.
- IMS, bir **"ihlal olayı"** kaydı açar (iç wiki / Linear) — tespit zamanı,
  kaynak, ön tespit.
- Teknik Araştırma, saldırının devam edip etmediğini belirler. Devam ediyorsa
  erişim kısıtlanır: etkilenen anahtar/token iptal, bağımlılık
  servislerinin yetkisi düşürülür.

### 2. Kapsam ve etki değerlendirmesi (2 – 24 saat)
- Hangi veri alanları (ad, e-posta, oturum tokeni, parola özeti vb.) ve
  hangi kullanıcılar etkilendi? Sayı ve kategoriler çıkarılır.
- Olası sonuçlar: kimlik avı riski, hesap ele geçirme, finansal zarar.
- Bulgular, iç olay kaydına eklenir. Zaman damgalı.

### 3. Kurul bildirimi (24 – 72 saat)
- Hukuk, KVKK Kurulu'nun "Kişisel Veri İhlal Bildirim Formu"nu doldurur.
- Form içeriği: etkilenen kişi sayısı ve kategorileri, veri türleri, olası
  sonuçlar, alınan ve alınacak önlemler, iletişim bilgileri.
- Form, veribildirim@kvkk.gov.tr adresine veya Kurul'un online portalına
  iletilir. IMS gönderim kanıtını saklar.

### 4. İlgili kişi bildirimi
- "Makul en kısa süre içinde" etkilenen kişilere **doğrudan** bildirim yapılır
  (e-posta). Doğrudan bildirim mümkün değilse, sitede duyuru ve basın
  açıklaması gibi alternatif yollar kullanılır.
- Bildirim metni: ihlalin ne zaman gerçekleştiği, hangi verileri kapsadığı,
  olası sonuçları, alınan önlemler, kullanıcının yapması önerilen adımlar
  (parola değiştirme, oturumları sonlandırma, kimlik avı uyarıları), iletişim.

### 5. Kök neden ve düzeltici önlemler
- Teknik Araştırma, 2 hafta içinde kök neden analizini bitirir.
- Düzeltici önlemler iç wiki'ye yazılır ve ürün backlog'una eklenir.
- Benzer olayları önleyecek izleme/alarm (log, DLP, erişim gözetimi)
  eklenir.

### 6. Kayıt tutma
- Her ihlal olayı, kapatıldıktan sonra **en az 3 yıl** saklanır. İçerik:
  tespit tarihi, kapsam, Kurul bildirimi, kullanıcı bildirimi, düzeltici
  önlem, kapanış tarihi.

## İletişim şablonları

### Kullanıcı bildirimi — e-posta şablonu
```
Konu: Fondeks hesabınla ilgili önemli güvenlik bildirimi

Merhaba {ad},

{tarih} itibarıyla Fondeks sistemlerinde {kısa açıklama} nedeniyle
kişisel verilerine yetkisiz bir erişim olasılığı tespit ettik.
Etkilenen veri türleri: {liste}. Olası sonuçlar: {liste}.

Önlem olarak:
- Şifreni değiştirmeni öneriyoruz.
- Hesabından açık tüm oturumları Hesap Ayarları → Çıkış seçeneğiyle
  sonlandırabilirsin.
- Fondeks e-posta görünümüyle gelen her mesaja şüpheyle yaklaşmalısın;
  biz asla şifreni e-posta ile istemeyiz.

Konu hakkında soruların için {kvkk@fondeks.com} adresine yazabilirsin.
KVKK kapsamındaki haklarına ilişkin ayrıntı https://fondeks.com/kvkk
adresinde yer almaktadır.

Fondeks Veri Koruma Ekibi
```

### Kurul bildirimi — kapak notu şablonu
```
Kişisel Verilerin Korunması Kurulu
Ankara

Konu: KVKK m. 12/5 kapsamında ihlal bildirimi

Veri sorumlusu Fondeks (TODO ticari ünvan) olarak {tarih} itibarıyla
tespit ettiğimiz bir kişisel veri ihlalini, Kurul'un "Kişisel Veri İhlal
Bildirim Formu" ile ekte sunuyoruz. İlgili kişilere bildirim {X} tarihinde
başlatılmıştır.

Saygılarımızla.
```

## Gözden geçirme
Bu doküman her 6 ayda bir IMS tarafından güncellenir. Son güncelleme:
2026-10-25.
