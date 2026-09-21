# Issue 18 incremental

Durum 2026-09-21 22:23 TR: 6 kopya SILINDI. `helpers.js` import + getRank/getNext/techMul wrapper. `production` JSX te kaldi. Issue ACIK — yalan kapanis yok; playtest sonrasi kapanir.

TEST dosyasina dokunulmadi. Baska fonksiyon silinmedi.

## Uygulanan
JSX tepesine:
```
import { fmt, getRank as getRankH, getNext as getNextH, techMul as techMulH, labDisc, storageCap } from "./utils/helpers.js";
```

§3:
```
const getRank = xp => getRankH(xp, STAR_RANKS);
const getNext = xp => getNextH(xp, STAR_RANKS);
const techMul = (tech, key) => techMulH(tech, key, TECHS);
```

f18559e AstrogameWAR.jsx dosyasini PLACEHOLDER_DO_NOT_USE yapmisti; bu tur onceki 8aaa52e icerigini geri alip yamayi uyguladi.
