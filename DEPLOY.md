# Cloudflare Pages'e Yayınlama Rehberi (sıfırdan)

Cloudflare, siteni internete ücretsiz koyan bir servis. Hesap + yayınlama
bedava, kredi kartı istemiyor. Toplam ~15 dakika.

## 0. Neler lazım

- Bir e-posta adresi (Cloudflare + GitHub hesabı için)
- Bilgisayarda `git` (kurulu — bu projede zaten kullandık)
- Spotify Client ID'n (`.env` dosyandaki `VITE_SPOTIFY_CLIENT_ID`)

## 1. Kodu GitHub'a koy

GitHub, kodunun duracağı ücretsiz depo. Hesabın yoksa github.com'da aç.

1. github.com/new adresine git, **Repository name** yaz (örn. `cartridge`),
   **Public** seç, **Create repository** de. (README falan ekleme, boş kalsın.)
2. Açılan sayfadaki adresi kopyala, şuna benzer:
   `https://github.com/KULLANICIADIN/cartridge.git`
3. Terminalde proje klasöründe şunları çalıştır:

```sh
git remote add origin https://github.com/KULLANICIADIN/cartridge.git
git branch -M main
git push -u origin main
```

GitHub kullanıcı adı + şifre isterse: şifre yerine **token** gerekir
(GitHub → Settings → Developer settings → Personal access tokens →
Generate). Tokenı şifre kutusuna yapıştır.

Kontrol: GitHub'daki repo sayfanı yenile, dosyaları görmelisin.

## 2. Cloudflare hesabı aç

1. dash.cloudflare.com/sign-up adresine git, e-posta + şifreyle kaydol.
2. E-postana gelen doğrulamayı onayla, giriş yap.
3. Kredi kartı sorulursa atla — Pages için gerekmiyor.

## 3. Siteyi oluştur

1. Soldaki menüden **Workers & Pages** → **Create** → **Pages** sekmesi →
   **Connect to Git**.
2. **Connect GitHub** de, GitHub iznini onayla, `cartridge` reposunu seç →
   **Begin setup**.
3. Ayarlar (çoğu otomatik gelir, kontrol et):
   - **Project name:** `cartridge` (adresin `cartridge.pages.dev` olur)
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** bölümüne iki satır ekle (Production):
   - `VITE_SPOTIFY_CLIENT_ID` = Spotify Client ID'n
   - `VITE_SPOTIFY_REDIRECT_URI` = `https://cartridge.pages.dev/callback`
     (project name farklıysa ona göre yaz)
5. **Save and Deploy** de. 1-2 dakikada yayınlanır, adresin açılır.

## 4. Spotify'ya yeni adresi tanıt

1. developer.spotify.com/dashboard → uygulaman → **Settings**.
2. **Redirect URIs** listesine şunu ekle:
   `https://cartridge.pages.dev/callback` (kendi adresinle)
3. **Save** (localhost satırları durabilir, zararı yok).

## 5. Test et

`https://cartridge.pages.dev` adresini aç → **Connect Spotify** → tek
seferde giriş yapmalısın (localhost sorunları burada yok, HTTPS hazır).

## 6. Sonraki güncellemeler

Kodda bir şey değişince:

```sh
git add -A
git commit -m "ne değişti"
git push
```

Cloudflare değişikliği otomatik algılayıp yeniden yayınlar (~1-2 dk).
Env değişirse: Pages → Settings → Environment variables → değiştir →
**Retry deployment**.

## Sorun giderme

| Sorun | Çözüm |
|---|---|
| Build fail (Node sürümü) | Pages → Settings → Environment variables → `NODE_VERSION` = `20` ekle, Retry deployment |
| `/app` açılınca 404 | Olmamalı (`_redirects` dosyası var). Olursa deploy logunda `_redirects` kopyalanmış mı bak |
| Eski sürüm görünüyor | Sert yenile (`Ctrl+Shift+R`). `sw.js` cache'siz ayarlı |
| Login "Invalid redirect URI" | Spotify listesindeki adresle Pages adresin birebir aynı mı + Save basıldı mı kontrol et |
| Login "Insecure" | Adres `https` ile mi başlıyor kontrol et |
