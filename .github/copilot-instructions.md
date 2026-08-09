# AstrogameWAR — Copilot Instructions

## Project Overview

**AstrogameWAR** is a browser-based space strategy game (React + Vite) packaged as an Android app via Capacitor. Players manage a fleet, research technologies, engage in battles, and compete on a leaderboard. Game state is persisted in Firebase Firestore with Google Sign-In authentication and optional App Check (reCAPTCHA Enterprise).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 (single `.jsx` file + extracted modules) |
| Build | Vite 5 (`base: "./"` required for Capacitor APK) |
| Mobile | Capacitor 6 → Android |
| Backend | Firebase 10 (Auth, Firestore, App Check) loaded via dynamic CDN imports |
| Tests | Vitest |
| CI/CD | GitHub Actions (build APK, deploy web, publish npm package) |

## Repository Structure

```
src/
  AstrogameWAR.jsx       # Main game component (single large file, ~§1-§10 sections)
  main.jsx               # React entry point
  __tests__/
    helpers.test.js      # Unit tests for helpers and game data
android/                 # Capacitor Android project
.github/
  workflows/
    build-apk.yml        # Push to main → build debug + release APK artifacts
    deploy-web.yml       # Push to main → GitHub Pages deploy
    publish.yml          # Tag push → publish npm package
vite.config.js           # base: "./" is mandatory — removing it breaks APK
capacitor.config.json    # Capacitor app ID and web dir
```

## Key Conventions

- **`AstrogameWAR.jsx` is organized into numbered sections** (§1–§10) marked by banner comments. Use `Ctrl+F §N` to navigate.
- **Firebase is loaded lazily** via dynamic `import()` from the Firebase CDN. No npm Firebase package is used.
- **Config placeholders**: `FIREBASE_CONFIG`, `ADMIN_UIDS`, and `RECAPTCHA_ENTERPRISE_SITE_KEY` at the top of `AstrogameWAR.jsx` must be replaced with real values before deployment. Fields starting with `"BURAYA"` are detected as unconfigured.
- **`base: "./"` in `vite.config.js`** must not be removed — Capacitor serves assets over `file://` inside the APK.
- **Inline styles** use the `S` (shared style constants) and `T` (color theme) objects defined in §6 of `AstrogameWAR.jsx`. Prefer these over one-off inline style objects.

## Common Commands

```bash
npm run dev            # Local dev server
npm run build          # Production build → dist/
npm test               # Run Vitest unit tests
npm run android:sync   # Build then sync to Android
npm run android:build  # Full debug APK build
```

## Testing

Tests live in `src/__tests__/`. Run with `npm test` (Vitest). Tests import helpers and game-data modules; keep exports from those modules stable.

## CI / Deployment

- **Debug APK**: Push to `main` → `build-apk.yml` builds and uploads `app-debug.apk` artifact.
- **Release APK**: Push a version tag (`v*`) → same workflow builds a signed `app-release.apk` using repository secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
- **Web**: Push to `main` → `deploy-web.yml` deploys `dist/` to GitHub Pages.

## Firebase Setup Checklist (for contributors)

1. Fill in all fields of `FIREBASE_CONFIG` in `AstrogameWAR.jsx`.
2. Set `ADMIN_UIDS` to the Firebase UID(s) that should have admin access.
3. Optionally set `RECAPTCHA_ENTERPRISE_SITE_KEY` for App Check.
4. Enable Google Sign-In in the Firebase console.
5. Create a Firestore database and set appropriate security rules.
