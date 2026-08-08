# AGENTS.md — AstrogameWAR Capacitor

## Repository Overview

**AstrogameWAR** is a browser-based space strategy game built with React + Vite, packaged as an Android app via Capacitor. The single main game component lives in `src/AstrogameWAR.jsx`. Firebase (Firestore + Auth + App Check) is loaded dynamically at runtime.

## Project Structure

```
astrowar-capacitor/
├── src/
│   ├── AstrogameWAR.jsx        # Entire game UI + logic (single component)
│   ├── main.jsx                # React entry point
│   └── __tests__/
│       └── helpers.test.js     # Vitest unit tests for helper functions
├── android/                    # Capacitor-generated Android project
├── public/
│   ├── icons/                  # App icons (192px, 512px)
│   └── manifest.json           # PWA manifest
├── .github/workflows/
│   ├── build-apk.yml           # CI: build debug/release APK on push/tag
│   ├── deploy-web.yml          # CI: deploy web build (GitHub Pages)
│   └── publish.yml             # CI: publish npm package
├── vite.config.js              # Vite config (base: "./" required for Capacitor)
├── capacitor.config.json       # Capacitor app config
├── vercel.json                 # Vercel deploy config
├── netlify.toml                # Netlify deploy config
└── package.json
```

## Tech Stack

| Layer | Tool |
|-------|------|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Mobile wrapper | Capacitor 6 (Android) |
| Backend | Firebase (Auth, Firestore, App Check) |
| Testing | Vitest |
| Deployment | GitHub Actions, Vercel, Netlify, GitHub Pages |

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Build web assets → dist/
npm test             # Run Vitest tests
```

## Android / Capacitor

```bash
npm run android:sync   # Build + sync web assets into Android project
npm run android:open   # Open Android Studio
npm run android:build  # Build debug APK directly (no Android Studio needed)
```

> **Important:** `vite.config.js` must keep `base: "./"`. Changing it to `/` will produce a blank white screen in the APK because the app runs over `file://`.

## Firebase Configuration

Before running, fill in the placeholders at the top of `src/AstrogameWAR.jsx`:

```js
const FIREBASE_CONFIG = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
const ADMIN_UIDS = ["YOUR_FIREBASE_UID"];
const RECAPTCHA_ENTERPRISE_SITE_KEY = "6Lc...";
```

The app provides a built-in admin panel (⚙ icon) that reports which config fields are still missing.

## CI / GitHub Actions

| Workflow | Trigger | Output |
|----------|---------|--------|
| `build-apk.yml` | push to `main` or `v*` tag | `app-debug.apk` (always); `app-release.apk` (tags only) |
| `deploy-web.yml` | push to `main` | Web deploy (GitHub Pages) |
| `publish.yml` | push to `main` | npm package publish to GitHub Packages |

### Required Secrets for Signed APK

Set these in **GitHub → Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `KEYSTORE_BASE64` | Base64-encoded `.keystore` file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

Then push a version tag to trigger the release build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Testing

Tests live in `src/__tests__/helpers.test.js` and cover the pure helper functions (`fmt`, `getRank`, `techMul`, `production`, `sc`) and game data exports (`RESEARCH_CATS`, `TECHS`, `UNITS`).

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

## Code Style & Conventions

- All game logic lives in `src/AstrogameWAR.jsx` in clearly delimited sections (`§1`–`§10`, searchable with Ctrl+F).
- Inline style objects that are used more than once are extracted to the `S` constants object near the top of the component.
- Theme colours are stored in the `T` object.
- Do not change `base: "./"` in `vite.config.js`.
- Do not commit real Firebase credentials — use the `BURAYA_*` placeholder convention for examples.
