/**
 * AstrogameWAR Arena sim v1 — Faz 1 kesiti
 * scout + gunship + hauler + cruiser + artillery + 3 yapı + bot
 * Deterministik: aynı seed + aynı cmd = aynı receipt
 */
const TICK_HZ = 10;
const DT = 0.1;
const MATCH_S = 180;
const E_MAX = 10;
const E_START = 5;
const E_PER_S = 0.35;
const E_DOUBLE_AT = 120;
const RANGE_SCALE = 0.18;
const SPEED_SCALE = 0.08;

const UNITS = {
  scout:      { energy: 2, atk: 50,   def: 10,  hull: 400,   speed: 3, range: 1.0, hedef: "yakin", yetenek: "kacinma" },
  gunship:    { energy: 4, atk: 150,  def: 25,  hull: 1000,  speed: 3, range: 1.0, hedef: "yakin", yetenek: "asiri_sarj" },
  hauler:     { energy: 3, atk: 5,    def: 10,  hull: 400,   speed: 5, range: 0.8, hedef: "yapi",  yetenek: "kargo_hp" },
  cruiser:    { energy: 5, atk: 400,  def: 50,  hull: 2700,  speed: 2, range: 1.4, hedef: "yakin", yetenek: "asiri_sarj" },
  artillery:  { energy: 6, atk: 620,  def: 200, hull: 6000,  speed: 1, range: 1.8, hedef: "yapi",  yetenek: "salvo" },
};

const TROPHY_WIN = 30;
const TROPHY_LOSS = 20;
const ARENAS = [
  { id: 1, name: "Caylak Yorunge", min: 0, max: 199 },
  { id: 2, name: "Pilot Kusagi", min: 200, max: 399 },
  { id: 3, name: "Kaptan Halkasi", min: 400, max: 699 },
  { id: 4, name: "Komutan Gecidi", min: 700, max: 1099 },
  { id: 5, name: "Amiral Koridoru", min: 1100, max: 1599 },
  { id: 6, name: "Galaktik Hat", min: 1600, max: 2199 },
  { id: 7, name: "Efsane Cukuru", min: 2200, max: 2999 },
  { id: 8, name: "Tanrisal Cekirdek", min: 3000, max: 9999 },
];

function arenaOf(trophies) {
  const t = Math.max(0, trophies);
  return ARENAS.find((a) => t >= a.min && t <= a.max) || ARENAS[ARENAS.length - 1];
}

function applyTrophies(winner, t0 = 0, t1 = 0) {
  let a = t0, b = t1;
  if (winner === 0) { a += TROPHY_WIN; b = Math.max(0, b - TROPHY_LOSS); }
  else if (winner === 1) { b += TROPHY_WIN; a = Math.max(0, a - TROPHY_LOSS); }
  return { before: [t0, t1], after: [a, b], arena: [arenaOf(a).id, arenaOf(b).id] };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function makePlayer(side, rng) {
  const deckFull = shuffle(rng, ["scout", "gunship", "hauler", "cruiser", "artillery", "scout", "gunship", "cruiser"]);
  return {
    side,
    energy: E_START,
    energySpent: 0,
    hand: deckFull.slice(0, 4),
    deck: deckFull.slice(4),
    discard: [],
    coreHp: 4200,
    satL: 2400,
    satR: 2400,
    units: [],
    nextId: 1,
  };
}

function structures(p) {
  return [
    { kind: "satL", x: 0.28, y: p.side === 0 ? 0.12 : 0.88, hp: p.satL, def: 40, atk: 80, range: 1.6 },
    { kind: "satR", x: 0.72, y: p.side === 0 ? 0.12 : 0.88, hp: p.satR, def: 40, atk: 80, range: 1.6 },
    { kind: "core", x: 0.50, y: p.side === 0 ? 0.06 : 0.94, hp: p.coreHp, def: 80, atk: 120, range: 2.0 },
  ];
}

function refillHand(p, rng) {
  if (p.hand.length >= 4) return;
  if (!p.deck.length) {
    p.deck = shuffle(rng, p.discard);
    p.discard = [];
  }
  if (p.deck.length) p.hand.push(p.deck.shift());
}

function place(state, cmd) {
  const p = state.players[cmd.player];
  const reason = (() => {
    if (state.phase === "done") return "done";
    if (cmd.tTick < state.tTick) return "past";
    const idx = p.hand.indexOf(cmd.unitId);
    if (idx < 0) return "not_in_hand";
    const u = UNITS[cmd.unitId];
    if (!u) return "unknown_unit";
    if (p.energy < u.energy) return "energy";
    if (cmd.player === 0 && !(cmd.y >= 0 && cmd.y < 0.5)) return "half";
    if (cmd.player === 1 && !(cmd.y > 0.5 && cmd.y <= 1)) return "half";
    if (cmd.x < 0.05 || cmd.x > 0.95) return "bounds";
    return null;
  })();
  if (reason) {
    state.events.push({ t: state.t, type: "reject", player: cmd.player, reason, unitId: cmd.unitId });
    return false;
  }
  const u = UNITS[cmd.unitId];
  p.energy -= u.energy;
  p.energySpent += u.energy;
  const hi = p.hand.indexOf(cmd.unitId);
  p.hand.splice(hi, 1);
  p.discard.push(cmd.unitId);
  refillHand(p, state.rng);
  p.units.push({
    id: p.nextId++,
    unit: cmd.unitId,
    x: cmd.x,
    y: cmd.y,
    hp: u.hull,
    side: cmd.player,
    lastShot: -99,
    firedOnce: false,
    target: null,
  });
  state.events.push({ t: state.t, type: "place", player: cmd.player, unitId: cmd.unitId, x: cmd.x, y: cmd.y });
  return true;
}

function regenEnergy(p, t) {
  const rate = t >= E_DOUBLE_AT ? E_PER_S * 2 : E_PER_S;
  p.energy = Math.min(E_MAX, p.energy + rate * DT);
}

function enemyOf(state, side) {
  return state.players[side === 0 ? 1 : 0];
}

function acquireTargets(state) {
  for (const p of state.players) {
    const foe = enemyOf(state, p.side);
    const foeStructs = structures(foe).filter((s) => s.hp > 0);
    for (const u of p.units) {
      if (u.hp <= 0) continue;
      const def = UNITS[u.unit];
      const range = def.range * RANGE_SCALE;
      let best = null, bestD = 1e9;
      const preferStruct = def.hedef === "yapi";
      if (preferStruct) {
        for (const s of foeStructs) {
          const d = dist(u, s);
          if (d < bestD) { bestD = d; best = { type: "struct", kind: s.kind, x: s.x, y: s.y }; }
        }
      }
      if (!preferStruct) {
        for (const e of foe.units) {
          if (e.hp <= 0) continue;
          const d = dist(u, e);
          if (d <= range && d < bestD) { bestD = d; best = { type: "unit", ref: e }; }
        }
      }
      if (!best) {
        for (const e of foe.units) {
          if (e.hp <= 0) continue;
          const d = dist(u, e);
          if (d < bestD) { bestD = d; best = { type: "unit", ref: e }; }
        }
      }
      if (!best) {
        for (const s of foeStructs) {
          const d = dist(u, s);
          if (d < bestD) { bestD = d; best = { type: "struct", kind: s.kind, x: s.x, y: s.y }; }
        }
      }
      u.target = best;
    }
  }
}

function moveOrHold(state) {
  for (const p of state.players) {
    for (const u of p.units) {
      if (u.hp <= 0) continue;
      const def = UNITS[u.unit];
      const range = def.range * RANGE_SCALE;
      const tgt = u.target;
      if (tgt) {
        const tx = tgt.ref ? tgt.ref.x : tgt.x;
        const ty = tgt.ref ? tgt.ref.y : tgt.y;
        if (dist(u, { x: tx, y: ty }) <= range) continue;
        const d = dist(u, { x: tx, y: ty }) || 1;
        u.x += ((tx - u.x) / d) * def.speed * SPEED_SCALE * DT;
        u.y += ((ty - u.y) / d) * def.speed * SPEED_SCALE * DT;
      } else {
        u.y += (p.side === 0 ? 1 : -1) * def.speed * SPEED_SCALE * DT;
      }
      u.x = Math.max(0.02, Math.min(0.98, u.x));
      u.y = Math.max(0.02, Math.min(0.98, u.y));
    }
  }
}

function dmgFormula(atk, defv, yetenek, firedOnce, targetIsStruct) {
  let raw = atk;
  if (yetenek === "asiri_sarj" && !firedOnce) raw *= 1.15;
  let useDef = defv;
  if (yetenek === "delici") useDef *= 0.5;
  if (yetenek === "zirh_kir" && targetIsStruct) raw *= 1.25;
  if (yetenek === "salvo" && targetIsStruct) raw *= 1.10;
  return Math.max(1, raw - useDef * 0.25);
}

function fire(state) {
  const hits = [];
  for (const p of state.players) {
    for (const u of p.units) {
      if (u.hp <= 0 || !u.target) continue;
      const def = UNITS[u.unit];
      const period = 1.0 / Math.max(0.4, def.speed * 0.35);
      if (state.t - u.lastShot < period) continue;
      const tgt = u.target;
      const tx = tgt.ref ? tgt.ref.x : tgt.x;
      const ty = tgt.ref ? tgt.ref.y : tgt.y;
      if (dist(u, { x: tx, y: ty }) > def.range * RANGE_SCALE) continue;
      u.lastShot = state.t;
      const isStruct = tgt.type === "struct";
      const tdef = isStruct ? 40 : UNITS[tgt.ref.unit].def;
      const dmg = dmgFormula(def.atk, tdef, def.yetenek, u.firedOnce, isStruct);
      u.firedOnce = true;
      hits.push({ from: u, tgt, dmg, player: p.side });
    }
  }
  return hits;
}

function applyDamage(state, hits) {
  for (const h of hits) {
    if (h.tgt.type === "unit") {
      if (h.tgt.ref.hp > 0) h.tgt.ref.hp -= h.dmg;
    } else {
      const foe = enemyOf(state, h.player);
      if (h.tgt.kind === "satL") foe.satL = Math.max(0, foe.satL - h.dmg);
      if (h.tgt.kind === "satR") foe.satR = Math.max(0, foe.satR - h.dmg);
      if (h.tgt.kind === "core") foe.coreHp = Math.max(0, foe.coreHp - h.dmg);
    }
  }
}

function removeDead(state) {
  for (const p of state.players) p.units = p.units.filter((u) => u.hp > 0);
}

function structureRetaliate(state) {
  const hits = [];
  for (const p of state.players) {
    const foe = enemyOf(state, p.side);
    const satsDown = p.satL <= 0 && p.satR <= 0;
    for (const s of structures(p)) {
      if (s.hp <= 0) continue;
      let atk = s.atk;
      if (s.kind === "core" && satsDown) atk *= 1.3;
      let best = null, bestD = 1e9;
      for (const e of foe.units) {
        const d = dist(s, e);
        if (d <= s.range * RANGE_SCALE && d < bestD) { bestD = d; best = e; }
      }
      if (best) {
        hits.push({ tgt: { type: "unit", ref: best }, dmg: Math.max(1, atk - UNITS[best.unit].def * 0.25), player: p.side });
      }
    }
  }
  applyDamage(state, hits);
}

function checkVictory(state) {
  const [a, b] = state.players;
  if (b.coreHp <= 0 && a.coreHp <= 0) {
    state.phase = "done"; state.winner = "draw"; return;
  }
  if (b.coreHp <= 0) { state.phase = "done"; state.winner = 0; return; }
  if (a.coreHp <= 0) { state.phase = "done"; state.winner = 1; return; }
  if (state.t + 1e-9 >= MATCH_S) {
    state.phase = "done";
    if (a.coreHp !== b.coreHp) state.winner = a.coreHp > b.coreHp ? 0 : 1;
    else {
      const as = a.satL + a.satR, bs = b.satL + b.satR;
      if (as !== bs) state.winner = as > bs ? 0 : 1;
      else state.winner = "draw";
    }
  }
}

function botThink(state, player, delayTicks, errRate) {
  if (state.tTick % delayTicks !== 0) return null;
  if (state.rng() < errRate) return null;
  const p = state.players[player];
  const prefer = state.t < 30
    ? ["scout", "gunship", "hauler"]
    : ["artillery", "cruiser", "gunship", "hauler", "scout"];
  const cycle = prefer.find((id) => p.hand.includes(id));
  if (!cycle) return null;
  if (UNITS[cycle].energy > p.energy) return null;
  const y = player === 0 ? 0.18 + state.rng() * 0.25 : 0.57 + state.rng() * 0.25;
  const x = 0.2 + state.rng() * 0.6;
  return { tTick: state.tTick, player, type: "place", unitId: cycle, x, y };
}

function createMatch(seed) {
  const rng = mulberry32(seed >>> 0);
  return {
    t: 0,
    tTick: 0,
    phase: "main",
    winner: null,
    seed: seed >>> 0,
    rng,
    players: [makePlayer(0, rng), makePlayer(1, rng)],
    events: [],
    extraCmds: [],
  };
}

function step(state) {
  if (state.phase === "done") return state;
  const queued = state.extraCmds.filter((c) => c.tTick === state.tTick);
  for (const c of queued) place(state, c);
  const b0 = botThink(state, 0, 7, 0.25);
  const b1 = botThink(state, 1, 7, 0.25);
  if (b0) place(state, b0);
  if (b1) place(state, b1);
  regenEnergy(state.players[0], state.t);
  regenEnergy(state.players[1], state.t);
  acquireTargets(state);
  moveOrHold(state);
  const hits = fire(state);
  applyDamage(state, hits);
  removeDead(state);
  structureRetaliate(state);
  removeDead(state);
  checkVictory(state);
  state.t = Math.round((state.t + DT) * 1000) / 1000;
  state.tTick += 1;
  return state;
}

function runMatch(seed) {
  const s = createMatch(seed);
  const maxTicks = MATCH_S * TICK_HZ + 2;
  for (let i = 0; i < maxTicks && s.phase !== "done"; i++) step(s);
  if (s.phase !== "done") checkVictory(s);
  return receipt(s);
}

function receipt(s) {
  return {
    seed: s.seed,
    winner: s.winner,
    tEnd: s.t,
    core: [s.players[0].coreHp, s.players[1].coreHp],
    sats: [
      [s.players[0].satL, s.players[0].satR],
      [s.players[1].satL, s.players[1].satR],
    ],
    energySpent: [s.players[0].energySpent, s.players[1].energySpent],
    placements: s.events.filter((e) => e.type === "place").length,
    rejects: s.events.filter((e) => e.type === "reject").length,
    trophies: applyTrophies(s.winner, 0, 0),
    hash: hashReceipt(s),
  };
}

function hashReceipt(s) {
  const raw = `${s.seed}|${s.winner}|${s.t}|${s.players[0].coreHp}|${s.players[1].coreHp}|${s.players[0].energySpent}|${s.players[1].energySpent}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function assertDeterminism(seed) {
  const a = runMatch(seed);
  const b = runMatch(seed);
  return a.hash === b.hash;
}

module.exports = { runMatch, assertDeterminism, createMatch, step, UNITS, applyTrophies, arenaOf, ARENAS };

if (require.main === module) {
  const logs = [];
  for (let i = 0; i < 20; i++) logs.push(runMatch(1000 + i));
  const det = [1, 2, 3, 99, 777].every(assertDeterminism);
  const wins = { 0: 0, 1: 0, draw: 0 };
  logs.forEach((r) => { wins[r.winner] = (wins[r.winner] || 0) + 1; });
  console.log(JSON.stringify({ determinism: det, wins, matches: logs }, null, 2));
}
