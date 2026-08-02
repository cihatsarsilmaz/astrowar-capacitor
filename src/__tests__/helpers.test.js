import { describe, it, expect } from "vitest";
import { fmt, getRank, techMul, RESEARCH_CATS, TECHS, UNITS } from "../AstrogameWAR.jsx";

describe("Helpers", () => {
  describe("fmt()", () => {
    it("formats 1000 as 1.0K", () => {
      expect(fmt(1000)).toBe("1.0K");
    });
    it("formats 1000000 as 1.0M", () => {
      expect(fmt(1000000)).toBe("1.0M");
    });
    it("formats 1500 as 1.5K", () => {
      expect(fmt(1500)).toBe("1.5K");
    });
  });

  describe("getRank()", () => {
    it("returns rank for XP 0", () => {
      expect(getRank(0)).toBeDefined();
    });
    it("returns Çaylak for XP 0", () => {
      expect(getRank(0).label).toBe("Çaylak");
    });
  });

  describe("techMul()", () => {
    it("returns 1.0 for level 0", () => {
      expect(techMul({}, "nonexistent")).toBe(1);
    });
    it("increases with level", () => {
      expect(techMul({ weapons: 5 }, "atk")).toBeGreaterThan(1);
    });
  });
});

describe("Game Data", () => {
  it("has research categories", () => {
    expect(RESEARCH_CATS.length).toBeGreaterThan(0);
  });
  it("has tech definitions", () => {
    expect(Object.keys(TECHS).length).toBeGreaterThan(0);
  });
  it("has unit definitions", () => {
    expect(Object.keys(UNITS).length).toBeGreaterThan(0);
  });
});
