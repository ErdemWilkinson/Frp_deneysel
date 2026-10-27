# Açık Masa

> **Durum: Tamamlandı.** Proje bitti; yeni özellik geliştirilmesi planlanmıyor.
> Kod olduğu gibi bırakılmıştır, aşağıdaki adımlarla yerelde çalıştırılabilir ya da kendi sunucuna kurulabilir.

Bir DM ile bir oyuncunun farklı yerlerden bağlanıp D&D 5e oynadığı web masası.
DM karşılaşmaları kurar ya da bölgeye göre rastgele ürettirir; canavarlar ve
saldırıları SRD 5.1 kurallarıyla çalışır.

## Neler var

- **Paylaşılan masa:** DM parolayla, oyuncu masa koduyla girer; iki ekran WebSocket üzerinden canlı eşitlenir.
- **Karakter:** paylaşılan karakter sayfası, çanta (ışık veren eşyalar dahil), büyüler, XP.
  Karakter sayfası resmi isteğe bağlı olarak okutulup sayfaya aktarılabilir.
- **Savaş:** üstten görünen, karesiz savaş alanı; jetonlar serbest yürür, yol ve menzil ft ile ölçülür.
  İnisiyatif sırası, saldırı ve zar kayıtları, durum etkileri.
- **Karşılaşmalar:** DM elle kurar ya da bölgeye göre rastgele ürettirir; canavar düzenleyici ve stat blokları.
- **Dünya:** ana harita, arazi, kasaba ve zindan üretimi.
- **Kayıt:** oyunlar adlandırılarak kaydedilir, yüklenir, silinir.
- **Giriş gerektirmeyen sayfalar:** ana menüden karakter atölyesi (`#atolye`) ve salt okunur kitaplık (`#kitap`).
- **İçerik:** SRD 5.1'deki 366 canavarın tamamı Türkçeye çevrilmiş ve bölge etiketleriyle sınıflandırılmıştır.

Yapı: `shared/` (kurallar, zar, üreticiler), `server/` (Express + WebSocket, otoriter oyun durumu,
Postgres/PGlite kayıt) ve `web/` (React + Vite arayüz).

## Çalıştırma

    npm install
    npm run dev:server   # http://localhost:3001
    npm run dev:web      # http://localhost:5173

DM parolası yerelde `masa`. Oyuncu, DM ekranının üstünde yazan masa koduyla girer.
Yerelde ortam değişkeni gerekmez; boş bırakılırsa gömülü veritabanı kullanılır (`.env.example`).

## Test

    npm test
    npm run typecheck

Son durumda 535 testin tamamı geçiyor (shared 78, server 325, web 132) ve tip kontrolü temiz.

## Yayına alma (Render + Supabase)

1. **Supabase:** yeni bir proje aç. *Project Settings → Database → Connection string* bölümünden
   **Session pooler** adresini kopyala (`postgresql://postgres.<ref>:<parola>@…pooler.supabase.com:5432/postgres`).
   Tablolar ilk açılışta kendiliğinden oluşur; elle bir şey çalıştırman gerekmez.
   *Database → Settings → SSL configuration* altındaki CA sertifikasını indir ve içeriğini `DATABASE_CA` olarak ver;
   bağlantı sertifikası böylece doğrulanır. (Doğrulamayı kapatmak için `DATABASE_SSL_INSECURE=1` var ama önerilmez.)
2. **Render:** *New → Blueprint* ile bu depoyu bağla; `render.yaml` servisi kurar.
   Sorulan değerler: `DM_PASSWORD` (DM parolası), `DATABASE_URL` (Supabase adresi), isteğe bağlı `DATABASE_CA`
   ve `DEEPSEEK_API_KEY`. `SESSION_SECRET` kendiliğinden üretilir.
3. Servis açılınca Render'ın verdiği adrese git; DM parolayla, oyuncu ekranda yazan masa koduyla girer.

Ücretsiz Render planı boşta kalınca uyur; ilk istek birkaç saniye sürebilir, tarayıcı yeniden bağlanır.

## İçerik

Canavar verisi `server/data/` altındadır: `monsters.json` (SRD'den içe aktarılır,
`npm run import:monsters -w server`), `regions.json` (bölge etiketleri) ve
`tr.json` (Türkçe çeviri). Çeviri kuralları `server/data/CEVIRI.md` içindedir.
Çeviri ve etiket durumu `npm run content:status -w server` ile görülür (şu an 366/366).

## Lisans ve atıf

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1")
by Wizards of the Coast LLC and available at
https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed
under the Creative Commons Attribution 4.0 International License available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SRD metinleri bu projede Türkçeye çevrilmiş ve bölge etiketleriyle sınıflandırılmıştır.
