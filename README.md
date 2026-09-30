# AstrogameWAR — Kurulum ve Deploy Rehberi

## Bu ZIP İçinde Ne Var

```
astrowar-capacitor/
├── src/AstrogameWAR.jsx     ← Oyun kodu (Firebase buraya)
├── android/                 ← Hazır Android projesi (Capacitor)
├── .github/workflows/
│   ├── build-apk.yml        ← GitHub push → otomatik APK
│   └── deploy-web.yml       ← GitHub push → otomatik web deploy
├── vercel.json              ← Vercel yapılandırması
├── netlify.toml             ← Netlify yapılandırması
├── public/icons/            ← Uygulama ikonları (5 boyut)
├── vite.config.js
├── capacitor.config.json
└── package.json
```

---

## Adım 1 — Firebase Değerlerini Yaz

`src/AstrogameWAR.jsx` dosyasının en üstüne kendi değerlerini yapıştır:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "proje.firebaseapp.com",
  projectId:         "proje-id",
  storageBucket:     "proje.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:...:web:...",
};
const ADMIN_UIDS = ["SENIN_FIREBASE_UID_IN"];
const RECAPTCHA_ENTERPRISE_SITE_KEY = "6Lc...";
```

---

## Adım 2 — GitHub'a Push Et → APK Otomatik Gelir

```bash
cd astrowar-capacitor
npm install
git init
git add .
git commit -m "AstrogameWAR ilk commit"
git remote add origin https://github.com/KULLANICI/astrogamewar.git
git push -u origin main
```

GitHub → **Actions** sekmesine git → "Build Android APK" workflow çalışıyor →
Tamamlanınca **Artifacts** bölümünden `app-debug.apk` indir → telefona yükle.

---

## Adım 3 — Telefona Yükleme

1. Android'de **Ayarlar → Güvenlik → Bilinmeyen kaynaklar** aktif et
2. `app-debug.apk` dosyasını telefonuna aktar
3. Dosyaya dokun → Yükle

---

## Web Deploy (Seçimlik)

### Vercel (En kolay):
```bash
npm install -g vercel
npm run build
vercel --prod
```

### Netlify (Sürükle-bırak):
1. `npm run build` çalıştır
2. https://app.netlify.com/drop → `dist/` klasörünü sürükle

### GitHub Pages (Otomatik):
main'e push edince `deploy-web.yml` otomatik çalışır.
GitHub → Settings → Pages → Source: GitHub Actions seç.

---

## Release APK (İmzalı, Play Store için)

GitHub repo → Settings → Secrets → Actions:

```
KEYSTORE_BASE64    = base64 ile encode edilmiş keystore
KEYSTORE_PASSWORD  = keystore şifresi
KEY_ALIAS          = key takma adı
KEY_PASSWORD       = key şifresi
```

Sonra bir versiyon etiketi push et:
```bash
git tag v1.0.0
git push origin v1.0.0
```
→ Actions imzalı `app-release.apk` üretir.

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| APK'da beyaz ekran | `vite.config.js`'de `base: "./"` satırını silme |
| Firebase bağlanmıyor | Admin paneli (⚙) hangi alanın eksik olduğunu gösterir |
| GitHub Actions başarısız | Actions loguna bak, genellikle Java/SDK hatası |
| Telefona yüklenmiyor | Bilinmeyen kaynaklar iznini aç |

---

## Firebase Cloud Functions (REST/HTTP API)

The `functions/` directory contains server-side REST endpoints for the game.
Cloud Functions require the Firebase **Blaze (pay-as-you-go)** plan.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/leaderboard` | Public | Top players sorted by play time |
| `GET`  | `/loadGame` | ****** | Load authenticated user's save |
| `POST` | `/saveGame` | ****** | Save authenticated user's state |
| `POST` | `/battle/resolve` | ****** | Server-side battle computation |

### Deployment

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Log in: `firebase login`
3. Set your project: `firebase use YOUR_PROJECT_ID`
4. Deploy: `firebase deploy --only functions`

Functions deploy automatically on push to `main` via `deploy-functions.yml`
if the `FIREBASE_TOKEN` repository secret is set:

```bash
# Generate token and add as GitHub secret
firebase login:ci
# → paste the token into: Settings → Secrets → FIREBASE_TOKEN
```

### Connecting the game client

After deploying, set `CLOUD_FUNCTIONS_BASE_URL` in `src/AstrogameWAR.jsx`:

```js
const CLOUD_FUNCTIONS_BASE_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net";
```

When set, `saveGame`, `loadGame`, and `leaderboard` calls are routed through
the Cloud Functions instead of direct Firestore. Leave the value as `""` to
keep using direct Firestore (no functions deployment required).
