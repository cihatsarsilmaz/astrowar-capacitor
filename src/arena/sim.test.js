import { describe, it, expect } from "vitest";
import { createMatch, step, runMatch, applyTrophies, arenaOf, MATCH_S, OT_S, TICK_HZ } from "./sim.js";

function drain(state) {
  const max = (MATCH_S + OT_S) * TICK_HZ + 2;
  for (let i = 0; i < max && state.phase !== "done"; i++) step(state);
  return state;
}

function places(state, player) {
  return state.events.filter((e) => e.type === "place" && e.player === player);
}

describe("createMatch default = insan vs bot", () => {
  it("bots is [1]", () => {
    expect(createMatch(7).bots).toEqual([1]);
  });

  it("seed 7: P0 place 0, P1 place > 0", () => {
    const s = drain(createMatch(7));
    expect(places(s, 0)).toHaveLength(0);
    expect(places(s, 1).length).toBeGreaterThan(0);
    expect(s.players[0].energySpent).toBe(0);
    expect(s.players[1].energySpent).toBeGreaterThan(0);
  });

  it("opts.bots [0,1] both place", () => {
    const s = drain(createMatch(7, { bots: [0, 1] }));
    expect(places(s, 0).length).toBeGreaterThan(0);
    expect(places(s, 1).length).toBeGreaterThan(0);
  });
});

describe("runMatch", () => {
  it("forces dual-bot and spends both sides", () => {
    const r = runMatch(7);
    expect(r.energySpent[0]).toBeGreaterThan(0);
    expect(r.energySpent[1]).toBeGreaterThan(0);
    expect(r.winner === 0 || r.winner === 1 || r.winner === "draw").toBe(true);
  });
});

describe("ladder", () => {
  it("win +30 / lose -20", () => {
    const t = applyTrophies(0, 100, 100);
    expect(t.after).toEqual([130, 80]);
    expect(t.arena[0]).toBe(arenaOf(130).id);
  });
});
