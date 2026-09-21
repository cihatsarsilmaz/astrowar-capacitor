/** Arena mac receipt — sim bittiğinde üretilir, sunucu mode=arena ile damgalar. */

import { applyTrophies } from "./sim.js";

export function buildReceipt(state, trophiesBefore = [0, 0]) {
  const t0 = Number(trophiesBefore[0]) || 0;
  const t1 = Number(trophiesBefore[1]) || 0;
  const winner = state.winner;
  return {
    mode: "arena",
    seed: state.seed >>> 0,
    winner,
    tEnd: state.t,
    core: [state.players[0].coreHp, state.players[1].coreHp],
    energySpent: [state.players[0].energySpent, state.players[1].energySpent],
    trophiesBefore: [t0, t1],
    trophies: applyTrophies(winner === 0 || winner === 1 ? winner : "draw", t0, t1),
  };
}

/**
 * POST battle/resolve mode=arena.
 * url yoksa local receipt döner (playtest kırılmaz).
 */
export async function postArenaReceipt(receipt, { url, token } = {}) {
  if (!url) return { ok: false, local: true, receipt, reason: "no_url" };
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(receipt) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, local: false, receipt, error: body.error || res.status };
  return { ok: true, local: false, receipt: body };
}
