/** Kupa merdiveni — sim receipt.trophies ile bağlanır. */
const { ARENAS, arenaOf, applyTrophies } = require("./sim");

function seasonSoftReset(trophies) {
  return Math.max(400, Math.floor(trophies * 0.6));
}

module.exports = { ARENAS, arenaOf, applyTrophies, seasonSoftReset };
