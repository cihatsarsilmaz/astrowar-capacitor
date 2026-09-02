// Extracted from AstrogameWAR.jsx (§3 HESAPLAMA YARDIMCILARI)
// NOTE: temporary duplication — AstrogameWAR.jsx still defines its own copies.
// Full de-duplication is part of the v11 modularization, done incrementally
// so the running game is never broken mid-refactor.

// STAR_RANKS and TECHS remain in the main file until gameData.js is extracted.
// These helpers will be wired after data module lands.

export const fmt = n => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return Math.floor(n) + "";
};

export const getRank = (xp, STAR_RANKS) => [...STAR_RANKS].reverse().find(r => xp >= r.min) || STAR_RANKS[0];

export const getNext = (xp, STAR_RANKS) => STAR_RANKS.find(r => r.min > xp) || null;

export const techMul = (tech, key, TECHS) => {
  const e = Object.entries(TECHS).find(([, t]) => t.bonus === key);
  return e ? 1 + (tech[e[0]] || 0) * e[1].per : 1;
};

export const labDisc = b => Math.max(0.35, 1 - ((b.lab || 1) - 1) * 0.10);

export const storageCap = b => ({
  metal: (b.metalMine || 1) * 50000 * Math.pow(1.4, (b.metalMine || 1) - 1) + (b.depot || 1) * 100000,
  crystal: (b.crystalMine || 1) * 20000 * Math.pow(1.4, (b.crystalMine || 1) - 1) + (b.depot || 1) * 40000,
});

// sc = shorthand used by tests/game code for "storageCap" in some call sites
export const sc = storageCap;
