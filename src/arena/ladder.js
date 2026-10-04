/** Kupa merdiveni — sim receipt.trophies ile baglanir. */
export { ARENAS, arenaOf, applyTrophies } from "./sim.js";

export function seasonSoftReset(trophies) {
  return Math.max(400, Math.floor(trophies * 0.6));
}
