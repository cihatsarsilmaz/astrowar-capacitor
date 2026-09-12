import { describe, it, expect } from "vitest";
import { fmt, getRank, techMul } from "../utils/helpers.js";
import { RESEARCH_CATS, TECHS, UNITS } from "../data/gameData.js";

describe("Helpers", () => {
  describe("fmt()", () => {
    it("formats 1000 as 1.0K", () => {
      expect(fmt(1000)).toBe("1.0K");
    });
    it("formats 1000000 as 1.0M", () => {
      expect(fmt(1000000)).toBe("1.0M");
    });
  });

  describe("getRank()", () => {
    it("returns rank for XP 0", () => {
      expect(getRank(0)).toBeDefined();
    });
  });

  describe("techMul()", () => {
    it("returns 1.0 for level 0", () => {
      expect(techMul(0)).toBe(1.0);
    });
    it("increases with level", () => {
      expect(techMul(5)).toBeGreaterThan(techMul(0));
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
