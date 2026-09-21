# Issue 18 incremental

JSX tepesine:
```
import { fmt, getRank as getRankH, getNext as getNextH, techMul as techMulH, labDisc, storageCap } from "./utils/helpers.js";
```

§3 kopya fmt/getRank/getNext/techMul/labDisc/storageCap sil.
Wrapper:
```
const getRank = xp => getRankH(xp, STAR_RANKS);
const getNext = xp => getNextH(xp, STAR_RANKS);
const techMul = (tech, key) => techMulH(tech, key, TECHS);
```
production JSX te kalir. Issue kapanmaz ta ki kopya yok.
