# Veri İşleyen (DPA) Kayıt Defteri

KVKK m. 12/2 kapsamında, Fondeks'in kişisel veri işleme süreçlerinde
kullandığı alt yükleniciler (veri işleyen) ile aralarındaki yazılı
sözleşmeler bu defterde takip edilir. Her satır bir sağlayıcıyı temsil eder;
sağlayıcı eklendiğinde / sözleşme yenilendiğinde satır güncellenir.

| Sağlayıcı              | Hizmet                        | Veri kategorisi            | Lokasyon         | DPA imzalı mı? | Son güncelleme | Sorumlu  |
|------------------------|-------------------------------|----------------------------|------------------|----------------|----------------|----------|
| Google LLC             | Google Analytics 4            | Pseudonymize kullanım      | ABD              | TODO           | TODO           | TODO     |
| Amplitude, Inc.        | Ürün analitiği                | Pseudonymize kullanım      | AB (EU bölgesi)  | TODO           | TODO           | TODO     |
| TODO — Postgres host   | Veritabanı barındırma         | Hesap, oturum, kullanım    | TODO             | TODO           | TODO           | TODO     |
| TODO — Transactional   | İşlemsel e-posta (parola sıf.)| E-posta adresi             | TODO             | TODO           | TODO           | TODO     |
| Vercel, Inc.           | Barındırma / edge             | HTTP log (IP)              | ABD / küresel    | TODO           | TODO           | TODO     |

## Her satır için gereken belgeler
- İmzalı DPA (veri işleyen taahhüdü)
- Standart Sözleşme / Taahhütname (yurt dışı aktarım için, KVKK m. 9/6)
- Alt-işleyen listesi (sağlayıcının kendi tedarik zinciri)
- Güvenlik sertifikaları (SOC 2, ISO 27001 varsa)

## Sorumluluklar
- **Hukuk:** DPA metninin KVKK m. 12 ve mevzuata uygunluğunu kontrol eder.
- **CTO:** Teknik önlemlerin (şifreleme, erişim denetimi) sağlayıcıda
  karşılığı olup olmadığını doğrular.
- **IMS:** Her yılın Ocak ayında defter gözden geçirilir, imzalı DPA'ların
  yenilenme tarihleri kontrol edilir.

Son güncelleme: 2026-10-25.
