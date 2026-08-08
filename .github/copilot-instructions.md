# GitHub Copilot Instructions — AstrogameWAR Capacitor

## Project Context

This is **AstrogameWAR**, a single-page React space strategy game packaged for Android with Capacitor and deployed as a PWA/web app via Vite. The entire game lives in one large component (`src/AstrogameWAR.jsx`) with clearly labelled sections §1–§10.

## Key Conventions

- **`base: "./"`** in `vite.config.js` is mandatory for Capacitor and must never be changed to `/`.
- Firebase credentials are placeholders (`BURAYA_*`). Never suggest hardcoding real credentials; always refer to environment variables or the README setup steps.
- Shared inline style objects live in the `S` constant near the top of `AstrogameWAR.jsx`. Reuse them instead of duplicating inline style objects.
- Theme colours are in the `T` constant. Use `T.*` for any new colour values.
- New UI sections inside the component follow the `§N SECTION NAME` comment header pattern.

## Code Generation Guidelines

- **React**: Use functional components and React hooks. No class components.
- **Styling**: Inline styles only (no CSS modules, no Tailwind). Reuse `S.*` and `T.*`.
- **Firebase**: Always load Firebase modules via the dynamic `loadFirebase()` helper; never import Firebase at the top level (it must remain optional when config is missing).
- **Tests**: Pure helper functions go in `src/utils/helpers.js`; add corresponding Vitest tests in `src/__tests__/`.
- **No new dependencies** without a very strong reason; the project intentionally keeps its dependency footprint minimal.

## File Locations

| What | Where |
|------|-------|
| Game component | `src/AstrogameWAR.jsx` |
| Entry point | `src/main.jsx` |
| Unit tests | `src/__tests__/helpers.test.js` |
| Vite config | `vite.config.js` |
| Capacitor config | `capacitor.config.json` |
| CI workflows | `.github/workflows/` |

## Build & Test

```bash
npm run dev      # local dev server
npm run build    # production build → dist/
npm test         # run Vitest suite
```

## Android

```bash
npm run android:sync   # build + sync into Android project
npm run android:build  # compile debug APK
```

## CI Secrets (for signed APK)

`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` — set in GitHub repository secrets before pushing a `v*` tag.
