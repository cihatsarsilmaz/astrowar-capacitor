# Issue 18 incremental

Durum 2026-09-22 04:27 TR: Issue ACIK. Kapatma.

Main: helpers import + ArenaView HUD + receipt + Q6 notu + 8 birim sim + lig UI.
fmt/labDisc/storageCap govde kopyasi yok. production JSX te.

Bu tur (kuyruk 6): Lig sezon reset ladder.js UI bag.
- ArenaView `arenaOf` + `seasonSoftReset` import
- kupa `localStorage` astrowar-arena-trophies
- receipt trophiesBefore = kayitli kupa
- buton: max(400, floor(kupa*0.6))

Issue govdesi hâlâ eski snippet + `@Collaborators addpeople` basligi.
Playtest: `npm run dev` sonra `/?mode=arena`. Test dosyasina dokunulmadi.

## Sonraki tek adim
Canli eslesme (bot sonra).
