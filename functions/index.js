/**
 * AstrogameWAR — Firebase Cloud Functions
 *
 * Endpoints:
 *   GET  /leaderboard     — Top players (public)
 *   POST /saveGame        — Save game state (authenticated)
 *   GET  /loadGame        — Load game state (authenticated)
 *   POST /battle/resolve  — Server-side battle computation (authenticated)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

// ─── helpers ────────────────────────────────────────────────────────────────

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
}

/** Verifies the Firebase ID token from the Authorization header.
 *  Returns the decoded token or sends a 401 and returns null. */
async function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authorization header missing" });
    return null;
  }
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

// ─── Game data (mirrors §2-§4 of AstrogameWAR.jsx) ─────────────────────────

const TECHS = {
  espionage:  { bonus:"intel",  per:.15 },
  computer:   { bonus:"queue",  per:0   },
  weapons:    { bonus:"atk",    per:.10 },
  shielding:  { bonus:"def",    per:.10 },
  armor:      { bonus:"hull",   per:.10 },
  combustion: { bonus:"speed1", per:.05 },
  impulse:    { bonus:"speed2", per:.05 },
  hyperdrive: { bonus:"speed3", per:.05 },
  energy:     { bonus:"energy", per:.03 },
  hypertech:  { bonus:"cargo",  per:.04 },
  graviton:   { bonus:"dm",     per:.05 },
  laser:      { bonus:"crit",   per:.015},
  ion:        { bonus:"def2",   per:.04 },
  plasma:     { bonus:"pierce", per:.08 },
};

const UNITS = {
  lightFighter:  { atk:50,   def:10,  hull:400,   crit:.10, ability:"evasion"    },
  smallCargo:    { atk:5,    def:10,  hull:400,   crit:.02, ability:"cargo"      },
  heavyFighter:  { atk:150,  def:25,  hull:1000,  crit:.12, ability:"overcharge" },
  largeCargo:    { atk:5,    def:25,  hull:1200,  crit:.02, ability:"cargo"      },
  cruiser:       { atk:400,  def:50,  hull:2700,  crit:.12, ability:"overcharge" },
  battleship:    { atk:1000, def:200, hull:6000,  crit:.10, ability:"volley"     },
  battlecruiser: { atk:700,  def:400, hull:7000,  crit:.14, ability:"piercing"   },
  destroyer:     { atk:2000, def:500, hull:11000, crit:.08, ability:"armor_break"},
  reaper:        { atk:3500, def:500, hull:8000,  crit:.30, ability:"stealth"    },
  deathstar:     { atk:5000, def:2000,hull:30000, crit:.20, ability:"nova"       },
};

const FORMATIONS = [
  { id:"standard",  aM:1.00, dM:1.00 },
  { id:"wedge",     aM:1.25, dM:0.80 },
  { id:"turtle",    aM:0.75, dM:1.40 },
  { id:"flank",     aM:1.15, dM:1.10 },
  { id:"berserker", aM:1.60, dM:0.55 },
];

const HEROES = [
  { id:"h1", bonus:{ atk:.15, crit:.05 } },
  { id:"h2", bonus:{ def:.20, hull:.10 } },
  { id:"h3", bonus:{ prod:.25, lab:.15 } },
  { id:"h4", bonus:{ loot:.40, xp:.20 } },
  { id:"h5", bonus:{ titan:.50 }         },
];

const ARTIFACTS = [
  { id:"a1", bonus:{ atk:.10 }            },
  { id:"a2", bonus:{ def:.15 }            },
  { id:"a3", bonus:{ prod:.20 }           },
  { id:"a4", bonus:{ crit:.10 }           },
  { id:"a5", bonus:{ xp:.25 }             },
  { id:"a6", bonus:{ loot:.30, atk:.20 } },
];

const techByBonus = key =>
  Object.entries(TECHS).find(([, t]) => t.bonus === key);

const techMul = (tech, key) => {
  const e = techByBonus(key);
  return e ? 1 + (tech[e[0]] || 0) * e[1].per : 1;
};

const heroBon = (hero, heroes, k) => {
  const h = HEROES.find(h => h.id === hero);
  return h && (heroes || []).includes(hero) ? (h.bonus[k] || 0) : 0;
};

const artBonus = (arts, key) =>
  (arts || []).reduce(
    (s, id) => s + (ARTIFACTS.find(a => a.id === id)?.bonus?.[key] || 0),
    0
  );

/** Mirrors the battle() function from AstrogameWAR.jsx §4. */
function battle(atkFleet, defFleet, tech, form, upgrades, hero, heroes, arts, insuranceOn) {
  const f = FORMATIONS.find(f => f.id === form) || FORMATIONS[0];
  const cB = techMul(tech, "crit") - 1;
  const pierce = techMul(tech, "pierce") - 1;
  const hA = 1 + heroBon(hero, heroes, "atk") + artBonus(arts, "atk");
  const hD = 1 + heroBon(hero, heroes, "def");
  const aC = artBonus(arts, "crit");

  const build = (fl, side, isAtk) =>
    Object.entries(fl).flatMap(([type, cnt]) => {
      if (!UNITS[type] || cnt <= 0) return [];
      const u = UNITS[type];
      const ug = (upgrades || {})[type] || {};
      const aB = 1 + (ug.atk || 0) * 0.05;
      const dB = 1 + (ug.def || 0) * 0.05;
      const hB = 1 + (ug.hull || 0) * 0.05;
      const cU = (ug.crit || 0) * 0.02;
      const fA = isAtk ? f.aM : 1;
      const fD = isAtk ? f.dM : 1;
      return Array.from({ length: cnt }, (_, i) => ({
        id: `${side}-${type}-${i}`,
        type,
        side,
        atk:   u.atk  * techMul(tech, "atk")  * aB * fA * (isAtk ? hA : 1),
        def:   u.def  * techMul(tech, "def")  * dB * fD * (isAtk ? hD : 1),
        hull:  u.hull * techMul(tech, "hull") * hB,
        maxHull: u.hull * techMul(tech, "hull") * hB,
        ability: u.ability,
        critChance: u.crit + cB + cU + aC,
        alive: true,
        broken: false,
      }));
    });

  let atk = build(atkFleet, "atk", true);
  let def = build(defFleet, "def", false);
  if (!atk.length) return { winner:"defender", rounds:[], losses:{}, crits:0, salvage:0 };
  if (!def.length) return { winner:"attacker", rounds:[], losses:{}, crits:0, salvage:0 };

  const alive = a => a.filter(u => u.alive);
  let crits = 0;

  const fireAt = (s, t, evs) => {
    if (t.ability === "stealth"  && Math.random() < 0.25) { evs.push({ type:"miss", src:s.type, tgt:t.type }); return; }
    if (t.ability === "evasion"  && Math.random() < 0.12) { evs.push({ type:"miss", src:s.type, tgt:t.type }); return; }
    const isCrit = Math.random() < s.critChance;
    if (isCrit) crits++;
    let dv = t.broken ? t.def * 0.75 : t.def;
    dv *= (1 - pierce);
    let av = s.atk * (1 + (Math.random() - 0.5) * 0.25) * (isCrit ? 2.2 : 1);
    if (s.ability === "overcharge" && s.hull / s.maxHull < 0.35) av *= 1.3;
    const dmg = Math.max(1, av - dv * 0.22);
    t.hull -= dmg;
    if (s.ability === "armor_break") t.broken = true;
    if (t.hull <= 0) { t.alive = false; evs.push({ type:"kill", src:s.type, tgt:t.type, crit:isCrit }); }
    else if (isCrit) evs.push({ type:"crit", src:s.type, tgt:t.type });
  };

  const volley = (sh, tg, evs) => {
    alive(sh).forEach(s => {
      const ts = alive(tg);
      if (!ts.length) return;
      ts.sort((a, b) => a.hull / a.maxHull - b.hull / b.maxHull);
      fireAt(s, ts[0], evs);
      if (s.ability === "volley" && Math.random() < 0.4) {
        const sec = ts.filter(t => t.alive);
        if (sec.length > 1) fireAt(s, sec[1], evs);
      }
      if (s.ability === "nova") ts.filter(t => t.alive).slice(0, 3).forEach((t, i) => { if (i > 0) fireAt(s, t, evs); });
    });
  };

  const rounds = [];
  for (let r = 1; r <= 25; r++) {
    const evs = [];
    const ba = alive(atk).length;
    const bd = alive(def).length;
    volley(atk, def, evs);
    volley(def, atk, evs);
    const aa = alive(atk).length;
    const ad = alive(def).length;
    rounds.push({ round:r, atkAlive:aa, defAlive:ad, atkLost:ba-aa, defLost:bd-ad, events:evs.slice(0, 5) });
    if (!aa || !ad) break;
  }

  const surv = atk.filter(u => u.alive);
  const winner = surv.length ? "attacker" : "defender";
  const losses = {};
  Object.keys(atkFleet).forEach(t => {
    losses[t] = (atkFleet[t] || 0) - surv.filter(u => u.type === t).length;
  });
  const salvage = insuranceOn
    ? Object.entries(losses).reduce((s, [t, l]) => s + (UNITS[t]?.atk || 0) * l * 0.3, 0)
    : 0;

  return { winner, rounds, losses, crits, salvage };
}

// ─── Endpoint: GET /leaderboard ─────────────────────────────────────────────

exports.leaderboard = onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const db = getFirestore();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const snap = await db
      .collection("users")
      .orderBy("totalPlaySeconds", "desc")
      .limit(limit)
      .get();

    const players = snap.docs.map(d => {
      const data = d.data();
      // Only expose public fields — never expose email or auth tokens
      return {
        uid:              d.id,
        name:             data.name || "Komutan",
        picture:          data.picture || null,
        totalPlaySeconds: data.totalPlaySeconds || 0,
        lastLoginAt:      data.lastLoginAt || 0,
      };
    });

    res.status(200).json({ players });
  } catch (err) {
    console.error("leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Endpoint: POST /saveGame ────────────────────────────────────────────────

exports.saveGame = onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const decoded = await requireAuth(req, res);
  if (!decoded) return;

  const { state } = req.body;
  if (!state || typeof state !== "object") {
    res.status(400).json({ error: "Missing or invalid state object" });
    return;
  }

  // Basic server-side sanity checks to prevent obvious cheating
  if (
    (state.resources?.metal    !== undefined && state.resources.metal    < 0) ||
    (state.resources?.crystal  !== undefined && state.resources.crystal  < 0) ||
    (state.resources?.dm       !== undefined && state.resources.dm       < 0)
  ) {
    res.status(400).json({ error: "Invalid resource values" });
    return;
  }

  try {
    const db = getFirestore();
    await db.collection("saves").doc(decoded.uid).set({
      state:     JSON.stringify(state),
      updatedAt: Date.now(),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("saveGame error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Endpoint: GET /loadGame ─────────────────────────────────────────────────

exports.loadGame = onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  const decoded = await requireAuth(req, res);
  if (!decoded) return;

  try {
    const db = getFirestore();
    const snap = await db.collection("saves").doc(decoded.uid).get();
    if (!snap.exists) {
      res.status(404).json({ state: null });
      return;
    }
    const state = JSON.parse(snap.data().state);
    res.status(200).json({ state });
  } catch (err) {
    console.error("loadGame error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Endpoint: POST /battle/resolve ─────────────────────────────────────────

exports.battleResolve = onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const decoded = await requireAuth(req, res);
  if (!decoded) return;

  const { atkFleet, defFleet, tech, formation, upgrades, hero, heroes, artifacts, insuranceOn } = req.body;

  if (!atkFleet || !defFleet || !tech) {
    res.status(400).json({ error: "Missing required fields: atkFleet, defFleet, tech" });
    return;
  }

  // Validate fleet counts to prevent abuse (no more than 9999 of any unit)
  const validateFleet = (fleet, label) => {
    for (const [type, count] of Object.entries(fleet)) {
      if (!UNITS[type]) return `Unknown unit type in ${label}: ${type}`;
      if (typeof count !== "number" || count < 0 || count > 9999)
        return `Invalid unit count for ${type} in ${label}`;
    }
    return null;
  };
  const atkErr = validateFleet(atkFleet, "atkFleet");
  if (atkErr) { res.status(400).json({ error: atkErr }); return; }
  const defErr = validateFleet(defFleet, "defFleet");
  if (defErr) { res.status(400).json({ error: defErr }); return; }

  try {
    const result = battle(
      atkFleet,
      defFleet,
      tech,
      formation || "standard",
      upgrades || {},
      hero || null,
      heroes || [],
      artifacts || [],
      !!insuranceOn
    );
    res.status(200).json(result);
  } catch (err) {
    console.error("battleResolve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
