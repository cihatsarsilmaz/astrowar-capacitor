# Issue 18 incremental

Durum 2026-09-22 00:09 TR: Issue ACIK. Kapatma.

Main onceki: `07ad6e9` / `b3d2466` — helpers import + wrapper, production JSX te.
fmt/labDisc/storageCap govde kopyasi yok.

Bu tur (kuyruk 2): ArenaView el/enerji/HP HUD + alt yari dokunus.
- canvas aspect-ratio kilit
- sim y = 1 - ekranY (alt = kendi saha)
- orta cizgi ±0.06 kendi yarina cekilir
- reject ipucu (kart/enerji/rakip yari)

Issue govdesi hâlâ eski snippet + `@Collaborators addpeople` basligi.
Playtest: `npm run dev ?mode=arena`. Test dosyasina dokunulmadi.

## Sonraki tek adim (kuyruk 3)
`battle/resolve` `mode=arena` receipt (sunucu varsa).
