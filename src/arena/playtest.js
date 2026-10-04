/** Headless Q6 — sim.place CPU. Telefon touch p95 degil. */
import { createMatch, place, step, UNITS } from "./sim.js";
import { Q6_N, summarize } from "./q6.js";

export function runHeadlessQ6({ seed = 42, n = Q6_N } = {}) {
  let s = createMatch(seed);
  const lags = [];
  let tries = 0;
  while (lags.length < n && tries < n * 80) {
    tries += 1;
    if (s.phase === "done") s = createMatch((seed + lags.length + 17) >>> 0);
    const p = s.players[0];
    p.energy = 10;
    const id = p.hand.find((u) => UNITS[u]) || "scout";
    if (!p.hand.includes(id)) p.hand.unshift(id);
    const x = 0.2 + (lags.length % 5) * 0.12;
    const y = 0.15 + (lags.length % 3) * 0.08;
    const t0 = performance.now();
    const ok = place(s, { tTick: s.tTick, player: 0, type: "place", unitId: id, x, y });
    const ms = performance.now() - t0;
    if (ok) lags.push(Math.round(ms * 10) / 10);
    step(s);
  }
  return {
    device: "headless-node",
    src: "sim.place",
    seed,
    ...summarize(lags),
    lags,
  };
}

if (typeof process !== "undefined" && process.argv[1] && /playtest\.js$/.test(process.argv[1])) {
  const r = runHeadlessQ6();
  console.log(JSON.stringify({
    device: r.device,
    src: r.src,
    seed: r.seed,
    n: r.n,
    p50: r.p50,
    p95: r.p95,
    min: r.min,
    max: r.max,
    pass: r.pass,
    ready: r.ready,
    note: "telefon p95 bilinmiyor",
  }));
}
