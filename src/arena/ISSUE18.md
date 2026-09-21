# Issue 18 incremental

Durum 2026-09-21 20:06 TR: kopya HALA JSX icinde. Issue ACIK. Kapatma.

JSX tepesine (tek satir, mevcut react importunun hemen altina):
```
import { fmt, getRank as getRankH, getNext as getNextH, techMul as techMulH, labDisc, storageCap } from "./utils/helpers.js";
```

§3 icindeki su 6 kopyayi SIL, yerlerine wrapper koy:
```
const getRank = xp => getRankH(xp, STAR_RANKS);
const getNext = xp => getNextH(xp, STAR_RANKS);
const techMul = (tech, key) => techMulH(tech, key, TECHS);
```

SILINECEK (tam eslesme):
```
const fmt = n => { if(n>=1e6)return(n/1e6).toFixed(1)+"M"; if(n>=1000)return(n/1000).toFixed(1)+"K"; return Math.floor(n)+""; };
const getRank    = xp => [...STAR_RANKS].reverse().find(r=>xp>=r.min)||STAR_RANKS[0];
const getNext    = xp => STAR_RANKS.find(r=>r.min>xp)||null;
const techMul    = (tech,key) => { const e=TECH_BY_BONUS(key); return e?1+(tech[e[0]]||0)*e[1].per:1; };
const labDisc    = b => Math.max(0.35,1-((b.lab||1)-1)*.10);
const storageCap = b => ({ metal:(b.metalMine||1)*50000*Math.pow(1.4,(b.metalMine||1)-1)+(b.depot||1)*100000, crystal:(b.crystalMine||1)*20000*Math.pow(1.4,(b.crystalMine||1)-1)+(b.depot||1)*40000 });
```

production JSX te kalir. Baska fonksiyon silme. TEST dosyasini bu adimda dokunma.
Issue kapanmaz ta ki bu 6 kopya yok.
