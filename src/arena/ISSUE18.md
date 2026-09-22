# Issue 18 incremental

Durum 2026-09-22 05:17 TR: Issue ACIK. Kapatma.

Main: helpers import + ArenaView HUD + receipt + Q6 notu + 8 birim sim + lig UI + canli kuyruk.
fmt/labDisc/storageCap govde kopyasi yok. production JSX te.

Bu tur (kuyruk 7): Canli eslesme (bot sonra).
- `src/arena/matchmaking.js` idle/searching/matched/timeout
- ArenaView: canli esles / iptal / lokal peer
- Timeout bot acmaz. Sunucu URL yok.

Issue govdesi hâlâ eski snippet + `@Collaborators addpeople` basligi.
Playtest: `npm run dev` sonra `/?mode=arena`. Test dosyasina dokunulmadi.

## Sonraki tek adim
Bot eslesme (timeout sonrasi).
