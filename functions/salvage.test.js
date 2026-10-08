import { describe, expect, it } from "vitest";
import salvage from "./salvage.js";

const { salvageForLosses } = salvage;

describe("salvageForLosses", () => {
  it("returns 30% of configured metal cost for lost units", () => {
    const units = {
      lightFighter: { cost: { metal: 3000 } },
      reaper: { cost: { metal: 0 } },
    };

    expect(salvageForLosses({ lightFighter: 2, reaper: 1 }, units)).toBe(1800);
  });

  it("returns zero when a unit has no configured metal cost", () => {
    expect(salvageForLosses({ unknown: 1 }, {})).toBe(0);
  });
});
