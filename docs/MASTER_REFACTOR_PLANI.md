# 🛠️ ASTROGAMEWAR v11 — MASTER REFACTOR PLANI

## Mevcut Durum Analizi

| Sorun | Siddet | Cozum | Dosya |
|-------|--------|-------|-------|
| 1,908 satir tek dosya | Kritik | 12 module ayir | src/AstrogameWAR.jsx |
| 8 setInterval, cleanup yok | Kritik | RAF + cleanup | useGameState.ts |
| 0% test | Kritik | 50+ unit test | tests/ |
| JavaScript (tip yok) | Yuksek | TypeScript | .ts/.tsx |
| 0 analytics | Yuksek | Firebase Analytics | analytics.ts |
| Offline calismiyor | Yuksek | Service Worker | sw.ts |
| Debug APK | Orta | Release signed | build.gradle |
| Erisilebilirlik yok | Orta | ARIA | tum UI |
| Ses yok | Dusuk | Web Audio | SoundSystem.ts |
| Partikul yok | Dusuk | Canvas 2D | ParticleSystem.ts |

## 1. BILESEN AYRISTIRMA (12 Modul)

```
src/
├── AstrogameWAR.tsx              # Ana container (200 satir)
├── core/
│   ├── GameState.ts              # Zustand store
│   ├── GameLoop.ts               # RAF oyun dongusu
│   └── SaveManager.ts            # Local + Cloud sync
├── features/
│   ├── auth/
│   │   ├── AuthScreen.tsx        # Giris ekrani
│   │   └── useAuth.ts            # Auth hook
│   ├── fleet/
│   │   ├── FleetScreen.tsx       # Filo yonetimi
│   │   ├── FleetCard.tsx         # Gemi karti
│   │   └── useFleet.ts           # Filo hook
│   ├── battle/
│   │   ├── BattleScreen.tsx      # Savas ekrani
│   │   ├── BattleAnimation.tsx   # Savas animasyonu
│   │   ├── BattleLog.tsx         # Savas logu
│   │   └── useBattle.ts          # Savas hook
│   ├── research/
│   │   ├── ResearchScreen.tsx    # Arastirma
│   │   ├── TechTree.tsx          # Tech agaci
│   │   └── useResearch.ts        # Arastirma hook
│   ├── economy/
│   │   ├── EconomyScreen.tsx     # Ekonomi
│   │   ├── ResourceBar.tsx       # Kaynak cubugu
│   │   └── useEconomy.ts         # Ekonomi hook
│   ├── heroes/
│   │   ├── HeroScreen.tsx        # Kahramanlar
│   │   ├── HeroCard.tsx          # Kahraman karti
│   │   └── useHeroes.ts          # Kahraman hook
│   ├── missions/
│   │   ├── MissionScreen.tsx     # Gorevler
│   │   ├── MissionCard.tsx       # Gorev karti
│   │   └── useMissions.ts        # Gorev hook
│   ├── raid/
│   │   ├── RaidScreen.tsx        # Baskin
│   │   └── useRaids.ts           # Baskin hook
│   ├── admin/
│   │   ├── AdminScreen.tsx       # Admin paneli
│   │   └── useAdmin.ts           # Admin hook
│   └── settings/
│       ├── SettingsScreen.tsx    # Ayarlar
│       └── useSettings.ts        # Ayar hook
├── ui/
│   ├── components/
│   │   ├── Button.tsx            # Buton
│   │   ├── Card.tsx              # Kart
│   │   ├── ProgressBar.tsx       # Ilerleme cubugu
│   │   ├── Modal.tsx             # Modal
│   │   ├── Toast.tsx             # Toast bildirim
│   │   ├── Stars.tsx             # Yildiz animasyonu
│   │   ├── Particles.tsx         # Partikul canvas
│   │   └── LoadingScreen.tsx     # Yukeleme ekrani
│   ├── hooks/
│   │   ├── useSound.ts           # Ses hook
│   │   ├── useParticles.ts       # Partikul hook
│   │   ├── useAnimation.ts       # Animasyon hook
│   │   └── useLocalStorage.ts    # LocalStorage hook
│   └── theme/
│       ├── colors.ts             # Renkler
│       ├── animations.css        # CSS animasyonlar
│       └── index.ts              # Tema export
├── engine/
│   ├── BattleEngine.ts           # Savasc motoru
│   ├── EconomyEngine.ts          # Ekonomi motoru
│   └── ProgressionEngine.ts      # Ilerleme motoru
├── data/
│   ├── units.ts                  # Birim verileri
│   ├── technologies.ts           # Teknoloji verileri
│   ├── heroes.ts                 # Kahraman verileri
│   ├── enemies.ts                # Dusman verileri
│   ├── missions.ts               # Gorev verileri
│   └── formations.ts             # Formasyon verileri
├── network/
│   ├── firebase.ts               # Firebase config
│   ├── auth.ts                   # Auth servisi
│   ├── database.ts               # Database servisi
│   └── sync.ts                   # Sync servisi
├── utils/
│   ├── formatters.ts             # Formatlayicilar
│   ├── validators.ts             # Dogrulayicilar
│   ├── math.ts                   # Matematik yardimcilari
│   └── constants.ts              # Sabitler
└── types/
    ├── game.ts                   # Oyun tipleri
    ├── user.ts                   # Kullanici tipleri
    └── api.ts                    # API tipleri
```

## 2. TYPESCRIPT GECISI

### Ornek: GameState Tipi

```typescript
// types/game.ts
export interface Fleet {
  [unitId: string]: number;
}

export interface Resources {
  energy: number;
  matter: number;
  credits: number;
  crystals: number;
}

export interface Technology {
  id: string;
  level: number;
  maxLevel: number;
}

export interface Hero {
  id: string;
  name: string;
  level: number;
  xp: number;
  skills: Skill[];
  isActive: boolean;
}

export interface GameState {
  version: number;
  fleet: Fleet;
  resources: Resources;
  technologies: Record<string, Technology>;
  heroes: Hero[];
  missions: Mission[];
  planets: Planet[];
  buildings: Building[];
  artifacts: string[];
  medals: string[];
  skin: string;
  ownedSkins: string[];
  formation: string;
  autoBattle: boolean;
  stats: PlayerStats;
  lastTick: number;
  createdAt: number;
}

export interface PlayerStats {
  xp: number;
  level: number;
  battlesWon: number;
  battlesLost: number;
  totalDamage: number;
  playTime: number;
  prestigeCount: number;
}
```

### Ornek: Zustand Store

```typescript
// core/GameState.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, BattleResult } from '../types/game';

interface GameActions {
  buyUnit: (type: string, amount?: number) => void;
  sellUnit: (type: string, amount?: number) => void;
  upgradeTech: (id: string) => boolean;
  upgradeBuilding: (id: string) => boolean;
  launchBattle: (enemyId: number) => Promise<BattleResult>;
  claimMission: (id: string) => void;
  claimDaily: () => void;
  prestige: () => void;
  reset: () => void;
}

const initialState: GameState = {
  version: 11,
  fleet: {},
  resources: { energy: 0, matter: 0, credits: 0, crystals: 0 },
  technologies: {},
  heroes: [],
  missions: [],
  planets: [],
  buildings: [],
  artifacts: [],
  medals: [],
  skin: 'sk0',
  ownedSkins: ['sk0'],
  formation: 'balanced',
  autoBattle: false,
  stats: { xp: 0, level: 1, battlesWon: 0, battlesLost: 0, totalDamage: 0, playTime: 0, prestigeCount: 0 },
  lastTick: Date.now(),
  createdAt: Date.now(),
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      buyUnit: (type, amount = 1) => {
        const state = get();
        const unit = UNITS[type];
        if (!unit) return;

        const cost = unit.cost * amount;
        if (state.resources.credits < cost) {
          notify('Yetersiz kredi!', 'error');
          return;
        }

        set((prev) => ({
          resources: { ...prev.resources, credits: prev.resources.credits - cost },
          fleet: { ...prev.fleet, [type]: (prev.fleet[type] || 0) + amount },
        }));

        playSound('buy');
      },

      launchBattle: async (enemyId) => {
        const state = get();
        const enemy = ENEMIES[enemyId];
        if (!enemy) throw new Error('Gecersiz dusman');

        const result = BattleEngine.simulate(state, enemy);

        set((prev) => ({
          stats: {
            ...prev.stats,
            battlesWon: prev.stats.battlesWon + (result.won ? 1 : 0),
            battlesLost: prev.stats.battlesLost + (result.won ? 0 : 1),
            totalDamage: prev.stats.totalDamage + result.damageDealt,
            xp: prev.stats.xp + result.xpGained,
          },
          resources: {
            ...prev.resources,
            credits: prev.resources.credits + result.creditsLoot,
            energy: prev.resources.energy + result.energyLoot,
          },
        }));

        playSound(result.won ? 'win' : 'lose');
        return result;
      },

      // ... diger actions

      reset: () => {
        if (!confirm('Tum ilerlemeniz silinecek. Emin misiniz?')) return;
        set(initialState);
        localStorage.removeItem('astrowar-save');
      },
    }),
    {
      name: 'astrowar-v11',
      version: 11,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fleet: state.fleet,
        resources: state.resources,
        technologies: state.technologies,
        heroes: state.heroes,
        missions: state.missions,
        planets: state.planets,
        buildings: state.buildings,
        artifacts: state.artifacts,
        medals: state.medals,
        skin: state.skin,
        ownedSkins: state.ownedSkins,
        formation: state.formation,
        autoBattle: state.autoBattle,
        stats: state.stats,
        lastTick: state.lastTick,
      }),
    }
  )
);
```

## 3. RAF GAME LOOP

```typescript
// core/GameLoop.ts
export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private tickRate = 1000 / 60; // 60 FPS
  private isRunning = false;
  private tickCallbacks: Set<(dt: number) => void> = new Set();
  private renderCallbacks: Set<(alpha: number) => void> = new Set();

  onTick(fn: (dt: number) => void): () => void {
    this.tickCallbacks.add(fn);
    return () => this.tickCallbacks.delete(fn);
  }

  onRender(fn: (alpha: number) => void): () => void {
    this.renderCallbacks.add(fn);
    return () => this.renderCallbacks.delete(fn);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta;

    // Fixed timestep updates
    while (this.accumulator >= this.tickRate) {
      this.tickCallbacks.forEach(fn => fn(this.tickRate));
      this.accumulator -= this.tickRate;
    }

    // Interpolated render
    const alpha = this.accumulator / this.tickRate;
    this.renderCallbacks.forEach(fn => fn(alpha));

    this.rafId = requestAnimationFrame(this.loop);
  };
}

// Singleton
export const gameLoop = new GameLoop();
```

## 4. TEST SUITE

```typescript
// tests/unit/BattleEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BattleEngine } from '../../src/engine/BattleEngine';
import type { GameState, Enemy } from '../../src/types/game';

describe('BattleEngine', () => {
  let state: GameState;
  let enemy: Enemy;

  beforeEach(() => {
    state = createMockState({
      fleet: { fighter: 10, cruiser: 5 },
      technologies: { laser: { level: 3 }, shield: { level: 2 } },
    });
    enemy = createMockEnemy({ units: { fighter: 8 }, difficulty: 1 });
  });

  it('should win against weaker enemy', () => {
    const result = BattleEngine.simulate(state, enemy);
    expect(result.won).toBe(true);
    expect(result.xpGained).toBeGreaterThan(0);
  });

  it('should calculate damage correctly with tech bonuses', () => {
    const result = BattleEngine.simulate(state, enemy);
    const baseDamage = 10 * 5; // 5 cruisers
    const techMultiplier = 1 + (3 * 0.1); // laser level 3
    expect(result.damageDealt).toBeCloseTo(baseDamage * techMultiplier);
  });

  it('should handle empty fleet', () => {
    state.fleet = {};
    const result = BattleEngine.simulate(state, enemy);
    expect(result.won).toBe(false);
    expect(result.damageDealt).toBe(0);
  });

  it('should apply formation bonus', () => {
    state.formation = 'aggressive';
    const aggressive = BattleEngine.simulate(state, enemy);

    state.formation = 'defensive';
    const defensive = BattleEngine.simulate(state, enemy);

    expect(aggressive.damageDealt).toBeGreaterThan(defensive.damageDealt);
  });
});

// tests/unit/EconomyEngine.test.ts
describe('EconomyEngine', () => {
  it('should calculate production with building bonuses', () => {
    const buildings = { mine: { level: 5 }, power: { level: 3 } };
    const prod = EconomyEngine.calculateProduction(buildings);
    expect(prod.energy).toBe(3 * 10); // power level 3
    expect(prod.matter).toBe(5 * 8);  // mine level 5
  });

  it('should cap resources at storage limit', () => {
    const resources = { energy: 95, matter: 100 };
    const cap = { energy: 100, matter: 100 };
    const prod = { energy: 10, matter: 5 };

    const result = EconomyEngine.tick(resources, prod, cap);
    expect(result.energy).toBe(100); // capped
    expect(result.matter).toBe(100); // capped
  });
});

// tests/integration/GameFlow.test.tsx
describe('Game Flow', () => {
  it('should complete full battle cycle', async () => {
    render(<AstrogameWAR />);

    // Buy units
    fireEvent.click(screen.getByText('Fighter Al'));
    expect(screen.getByText('Fighter: 1')).toBeInTheDocument();

    // Select enemy
    fireEvent.click(screen.getByText('Dusman 1'));

    // Launch battle
    fireEvent.click(screen.getByText('Savas!'));

    // Wait for animation
    await waitFor(() => {
      expect(screen.getByText(/Kazan[dt]i/)).toBeInTheDocument();
    });

    // Check rewards
    expect(screen.getByText(/XP: \+\d+/)).toBeInTheDocument();
  });
});
```

## 5. CI/CD PIPELINE

```yaml
# .github/workflows/v11-ci.yml
name: v11 CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  build-apk:
    needs: [test, e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: 17, distribution: temurin }
      - uses: android-actions/setup-android@v3
      - run: npm ci && npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: android/app/build/outputs/apk/release/*.apk
```

## 6. OFFLINE-FIRST MIMARI

```typescript
// network/SyncService.ts
export class SyncService {
  private db: IDBDatabase;
  private queue: SyncQueue[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => this.isOnline = false);
    this.initDB();
  }

  async save(key: string, data: unknown): Promise<void> {
    // 1. Local'a yaz
    await this.db.put('gameState', data, key);

    // 2. Queue'ya ekle
    this.queue.push({ key, data, timestamp: Date.now() });

    // 3. Online ise sync et
    if (this.isOnline) {
      await this.sync();
    }
  }

  async load(key: string): Promise<unknown> {
    // 1. Local'dan oku
    const local = await this.db.get('gameState', key);
    if (local) return local;

    // 2. Yoksa cloud'dan oku
    if (this.isOnline) {
      const cloud = await firebaseLoadGame(key);
      if (cloud) {
        await this.db.put('gameState', cloud, key);
        return cloud;
      }
    }

    return null;
  }

  private async sync(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const batch = this.queue.splice(0, 10); // 10'lu gruplar
    try {
      await firebaseBatchSave(batch);
    } catch (e) {
      // Basarisizlari queue'ya geri ekle
      this.queue.unshift(...batch);
    }
  }
}
```

## 7. MONETIZASYON SERVISLERI

```typescript
// monetization/AdService.ts
export class AdService {
  private rewardedAd: any;
  private interstitialAd: any;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.initialize({ appId: 'ca-app-pub-xxx' });

    this.rewardedAd = await AdMob.prepareRewardVideoAd({
      adId: 'ca-app-pub-xxx/rewarded',
    });
  }

  async showRewardedAd(reward: () => void): Promise<boolean> {
    if (!this.rewardedAd) return false;

    try {
      await this.rewardedAd.show();
      reward();
      return true;
    } catch {
      return false;
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.interstitialAd) return;
    await this.interstitialAd.show();
  }
}

// monetization/IAPService.ts
export class IAPService {
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const { InAppPurchase } = await import('@capacitor-community/in-app-purchase');
    await InAppPurchase.initialize();
  }

  async buyCrystals(amount: number): Promise<boolean> {
    const products = {
      100: 'crystal_100',
      550: 'crystal_550',
      1200: 'crystal_1200',
    };

    const productId = products[amount];
    if (!productId) return false;

    try {
      const result = await InAppPurchase.buy({ productId });
      if (result.transactionReceipt) {
        useGameStore.getState().addCrystals(amount);
        return true;
      }
    } catch {
      return false;
    }
  }
}
```

## 8. ANALYTICS & A/B TEST

```typescript
// analytics/AnalyticsService.ts
export class AnalyticsService {
  static track(event: string, params?: Record<string, unknown>): void {
    // Firebase Analytics
    if (typeof firebase !== 'undefined') {
      firebase.analytics().logEvent(event, params);
    }

    // Custom events
    console.log(`[Analytics] ${event}`, params);
  }

  static trackBattle(result: BattleResult): void {
    this.track('battle_complete', {
      won: result.won,
      enemy_level: result.enemyLevel,
      duration: result.duration,
      damage_dealt: result.damageDealt,
    });
  }

  static trackPurchase(item: string, price: number): void {
    this.track('purchase', {
      item,
      price,
      currency: 'USD',
    });
  }

  static trackRetention(day: number): void {
    this.track(`retention_d${day}`);
  }
}

// A/B Test
export class ABTestService {
  private static variants: Record<string, string> = {};

  static init(userId: string): void {
    // Kullanici ID'sine gore varyant ata
    const hash = this.hash(userId);
    this.variants = {
      'ui_theme': hash % 2 === 0 ? 'neon' : 'minimal',
      'tutorial': hash % 3 === 0 ? 'interactive' : 'static',
      'pricing': hash % 2 === 0 ? 'discount' : 'standard',
    };
  }

  static getVariant(experiment: string): string {
    return this.variants[experiment] || 'control';
  }

  private static hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
}
```

## 9. CIKARIM

Bu refactor plani, AstrogameWAR'i teknik olarak saglam, olceklenebilir ve pazara hazir bir urun haline getirmek icin kapsamli bir yol haritasidir.

**Tahmini Sure:** 3 ay (1 kisi, tam zamanli)  
**Tahmini Maliyet:** 0$ (acik kaynak araclar)  
**Beklenen Getiri:** Ay 6'da $5K/ay, Ay 12'de $20K/ay

**Baslangic noktasi:** Bu hafta setInterval cleanup + bilesen ayristirma
