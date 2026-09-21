# Issue 18 incremental

Durum 2026-09-21 22:25 TR: Issue ACIK. Kapatma.

f18559e `src/AstrogameWAR.jsx` icerigini `PLACEHOLDER_DO_NOT_USE` yapti (2099 satir silindi). Oyun dosyasi kirik.

6 helper kopyasi main JSX te YOK cunku dosya yok; bu kapanis degil. Onceki saglam blob: `8aaa52e` / `04b619bb71d4d3438bc56fff16066405413c47c2`.

`production` JSX te kalacak. TEST dosyasina dokunma.

## Sonraki tek adim (kuyruk 1 devam)
8aaa52e JSX ini geri yaz + tepesine helpers.js import + §3 6 kopyayi wrapper ile degistir.

```
import { fmt, getRank as getRankH, getNext as getNextH, techMul as techMulH, labDisc, storageCap } from "./utils/helpers.js";
const getRank = xp => getRankH(xp, STAR_RANKS);
const getNext = xp => getNextH(xp, STAR_RANKS);
const techMul = (tech, key) => techMulH(tech, key, TECHS);
```
