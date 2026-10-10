import { describe, expect, it } from "vitest";
import {
  MAX_BATTLE_FLEET_SIZE,
  MAX_GAME_STATE_BYTES,
  validateBattleFleet,
  validateGameState,
} from "./validation.js";

const units = { fighter: {}, cruiser: {} };

describe("validateGameState", () => {
  it("requires a JSON object and finite non-negative resource values", () => {
    expect(validateGameState([])).toBe("Missing or invalid state object");
    expect(validateGameState({ resources: { metal: -1 } })).toBe("Invalid resource values");
    expect(validateGameState({ resources: { crystal: "10" } })).toBe("Invalid resource values");
    expect(validateGameState({ resources: { dm: 0 } })).toBeNull();
  });

  it("rejects save states larger than the Firestore document budget", () => {
    expect(validateGameState({ payload: "x".repeat(MAX_GAME_STATE_BYTES) })).toBe(
      "Game state exceeds maximum size",
    );
  });
});

describe("validateBattleFleet", () => {
  it("accepts valid integer unit counts within the fleet limit", () => {
    expect(validateBattleFleet({ fighter: 200, cruiser: 50 }, "fleet", units)).toBeNull();
  });

  it("rejects invalid fleet objects, counts, and total size", () => {
    expect(validateBattleFleet([], "fleet", units)).toBe("Invalid fleet: fleet");
    expect(validateBattleFleet({ fighter: 1.5 }, "fleet", units)).toMatch(/Invalid unit count/);
    expect(validateBattleFleet({ fighter: MAX_BATTLE_FLEET_SIZE + 1 }, "fleet", units)).toMatch(
      /maximum size/,
    );
    expect(validateBattleFleet({ unknown: 1 }, "fleet", units)).toMatch(/Unknown unit type/);
  });
});
