# Issue 18 incremental

Durum 2026-09-22 07:17 TR: Issue ACIK. Kapatma.

Main: helpers import + ArenaView HUD + receipt + Q6 notu + 8 birim sim + lig UI + canli kuyruk + timeout bot + headless playtest.
fmt/labDisc/storageCap govde kopyasi yok. production JSX te.

Bu tur (kuyruk 9): Playtest olcum.
- `src/arena/playtest.js` — `sim.place` n=30 headless
- `npm run arena:q6`
- Headless p50/p95 ~0ms (CPU). Telefon touch p95 bilinmiyor. GECTI yok.
Playtest: `npm run dev` sonra `/?mode=arena`. Test dosyasina dokunulmadi.

## Sonraki tek adim
Telefon touch Q6 kayit (kullanici, n>=30).
