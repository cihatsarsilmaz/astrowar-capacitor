import { describe, it, expect } from "vitest";
import { fmt, getRank, getNext, techMul, labDisc, storageCap } from "../utils/helpers.js";

const STAR_RANKS = [
  { min: 0, name: "Caylak" },
  { min: 100, name: "Pilot" },
  { min: 400, name: "Kaptan" },
];

const TECHS = {
  laser: { bonus: "atk", per: 0.1 },
  plate: { bonus: "def", per: 0.05 },
};

describe("fmt", () => {
  it("1000 -> 1.0K", () => expect(fmt(1000)).toBe("1.0K"));
  it("1e6 -> 1.0M", () => expect(fmt(1e6)).toBe("1.0M"));
  it("floor under 1000", () => expect(fmt(42.9)).toBe("42"));
});

describe("getRank / getNext", () => {
  it("xp 0 -> Caylak", () => expect(getRank(0, STAR_RANKS).name).toBe("Caylak"));
  it("xp 100 -> Pilot", () => expect(getRank(100, STAR_RANKS).name).toBe("Pilot"));
  it("next after 0 is Pilot", () => expect(getNext(0, STAR_RANKS).name).toBe("Pilot"));
  it("top has no next", () => expect(getNext(400, STAR_RANKS)).toBeNull());
});

describe("techMul", () => {
  it("empty tech -> 1", () => expect(techMul({}, "atk", TECHS)).toBe(1));
  it("laser 5 -> 1.5 atk", () => expect(techMul({ laser: 5 }, "atk", TECHS)).toBeCloseTo(1.5));
  it("unknown bonus -> 1", () => expect(techMul({ laser: 5 }, "speed", TECHS)).toBe(1));
});

describe("labDisc / storageCap", () => {
  it("lab 1 -> 1", () => expect(labDisc({ lab: 1 })).toBe(1));
  it("floor 0.35", () => expect(labDisc({ lab: 99 })).toBe(0.35));
  it("caps grow with mine+depot", () => {
    const a = storageCap({ metalMine: 1, crystalMine: 1, depot: 1 });
    const b = storageCap({ metalMine: 3, crystalMine: 3, depot: 2 });
    expect(b.metal).toBeGreaterThan(a.metal);
    expect(b.crystal).toBeGreaterThan(a.crystal);
  });
});
