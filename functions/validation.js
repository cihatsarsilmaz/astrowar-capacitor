const MAX_GAME_STATE_BYTES = 900 * 1024;
const MAX_BATTLE_FLEET_SIZE = 250;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateGameState(state) {
  if (!isRecord(state)) return "Missing or invalid state object";

  if (state.resources !== undefined) {
    if (!isRecord(state.resources)) return "Invalid resource values";
    for (const key of ["metal", "crystal", "dm"]) {
      const value = state.resources[key];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        return "Invalid resource values";
      }
    }
  }

  const serialized = JSON.stringify(state);
  if (Buffer.byteLength(serialized, "utf8") > MAX_GAME_STATE_BYTES) {
    return "Game state exceeds maximum size";
  }
  return null;
}

function validateBattleFleet(fleet, label, units) {
  if (!isRecord(fleet)) return `Invalid fleet: ${label}`;

  let total = 0;
  for (const [type, count] of Object.entries(fleet)) {
    if (!units[type]) return `Unknown unit type in ${label}: ${type}`;
    if (!Number.isInteger(count) || count < 0) {
      return `Invalid unit count for ${type} in ${label}`;
    }
    total += count;
    if (total > MAX_BATTLE_FLEET_SIZE) {
      return `Fleet exceeds maximum size of ${MAX_BATTLE_FLEET_SIZE}`;
    }
  }
  return null;
}

module.exports = {
  MAX_BATTLE_FLEET_SIZE,
  MAX_GAME_STATE_BYTES,
  isRecord,
  validateBattleFleet,
  validateGameState,
};
