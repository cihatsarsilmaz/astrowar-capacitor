import { describe, it, expect } from "vitest";
import {
  createMatch, step, place, runMatch, applyTrophies, arenaOf,
  UNITS, MATCH_S, OT_S, TICK_HZ, E_MAX, E_START, E_DOUBLE_AT,
} from "./sim.js";
import { runHeadlessQ6 } from "./playtest.js";
import { Q6_N, summarize } from "./q6.js";

function drain(state) {
  const max = (MATCH_S + OT_S) * TICK_HZ + 2;
  for (let i = 0; i < max && state.phase !== "done"; i++) step(state);
  return state;
}

function places(state, player) {
  return state.events.filter((e) => e.type === "place" && e.player === player);
}

describe("sabitler", () => {
  it("180sn + 60sn OT + enerji 0-10 + 8 birim", () => {
    expect(MATCH_S).toBe(180);
    expect(OT_S).toBe(60);
    expect(E_MAX).toBe(10);
    expect(E_START).toBe(5);
    expect(E_DOUBLE_AT).toBe(120);
    expect(Object.keys(UNITS)).toHaveLength(8);
  });
});

describe("createMatch / place — gercek sim", () => {
  it("default bots [1]", () => {
    expect(createMatch(7).bots).toEqual([1]);
  });

  it("seed 7 drain: P0 place 0, P1 place > 0", () => {
    const s = drain(createMatch(7));
    expect(places(s, 0)).toHaveLength(0);
    expect(places(s, 1).length).toBeGreaterThan(0);
    expect(s.players[0].energySpent).toBe(0);
    expect(s.players[1].energySpent).toBeGreaterThan(0);
    expect(s.phase).toBe("done");
  });

  it("P0 rakip yariya koyamaz", () => {
    const s = createMatch(1);
    const id = s.players[0].hand[0];
    expect(place(s, { tTick: 0, player: 0, type: "place", unitId: id, x: 0.5, y: 0.8 })).toBe(false);
    expect(s.events.some((e) => e.reason === "half")).toBe(true);
  });

  it("P0 kendi yarina koyar", () => {
    const s = createMatch(1);
    const id = s.players[0].hand[0];
    const e0 = s.players[0].energy;
    expect(place(s, { tTick: 0, player: 0, type: "place", unitId: id, x: 0.4, y: 0.2 })).toBe(true);
    expect(s.players[0].energy).toBe(e0 - UNITS[id].energy);
    expect(s.players[0].hand).toHaveLength(4);
    expect(s.players[0].units).toHaveLength(1);
  });
});

describe("runMatch — cift bot gercek mac", () => {
  it.each([7, 11, 42, 99, 2026])("seed %s biter, iki taraf enerji harcar", (seed) => {
    const r = runMatch(seed);
    expect(r.energySpent[0]).toBeGreaterThan(0);
    expect(r.energySpent[1]).toBeGreaterThan(0);
    expect(r.winner === 0 || r.winner === 1 || r.winner === "draw").toBe(true);
    expect(r.tEnd).toBeGreaterThan(0);
    expect(r.tEnd).toBeLessThanOrEqual(MATCH_S + OT_S + 1);
  });
});

describe("kupa", () => {
  it("kazan +30 / kaybet -20", () => {
    const t = applyTrophies(0, 100, 100);
    expect(t.after).toEqual([130, 80]);
    expect(t.arena[0]).toBe(arenaOf(130).id);
  });
  it("beraberlik kupa degistirmez", () => {
    expect(applyTrophies("draw", 50, 50).after).toEqual([50, 50]);
  });
});

describe("dodge / kargo_hp — gercek sim", () => {
  it("en az 1 seedde dodge veya kargo_hp event (cift bot, extraCmds yok)", () => {
    const seeds = [1, 7, 11, 42, 99, 2026];
    const hits = [];
    for (const seed of seeds) {
      const s = drain(createMatch(seed, { bots: [0, 1] }));
      const dodge = s.events.filter((e) => e.type === "dodge");
      const kargo = s.events.filter((e) => e.type === "kargo_hp");
      if (dodge.length + kargo.length > 0) hits.push({ seed, dodge: dodge.length, kargo: kargo.length });
      for (const e of dodge) {
        expect(e.unitId).toBe("scout");
        expect(e.player === 0 || e.player === 1).toBe(true);
      }
      for (const e of kargo) {
        expect(e.unitId).toBe("hauler");
        expect(e.heal).toBeGreaterThan(0);
        expect(e.player === 0 || e.player === 1).toBe(true);
      }
    }
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("headless Q6 — sim.place (telefon degil)", () => {
  it("n=30 olcum dolar", () => {
    const r = runHeadlessQ6({ seed: 42, n: Q6_N });
    expect(r.n).toBe(Q6_N);
    expect(r.src).toBe("sim.place");
    expect(r.device).toBe("headless-node");
    const s = summarize(r.lags);
    expect(s.n).toBe(Q6_N);
    expect(s.ready).toBe(true);
  });
});
