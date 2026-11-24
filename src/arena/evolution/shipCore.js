/** AW-EVO-01: isolated, deterministic 2D ship movement core. No side effects or game integration. */
export const SHIP_DEFAULTS = Object.freeze({ x: 0.5, y: 0.5, speed: 0.35, radius: 0.025 });
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function createShip(overrides = {}) {
  const ship = { ...SHIP_DEFAULTS, ...overrides };
  if (![ship.x, ship.y, ship.speed, ship.radius].every(finite) || ship.speed < 0 || ship.radius < 0 || ship.radius >= 0.5) {
    throw new TypeError('Invalid ship parameters');
  }
  return { ...ship, x: clamp(ship.x, ship.radius, 1 - ship.radius), y: clamp(ship.y, ship.radius, 1 - ship.radius) };
}

/** Hybrid: manual WASD/arrow input has priority; otherwise steer toward a selected point. */
export function stepShip(ship, { horizontal = 0, vertical = 0, target = null } = {}, dt = 0) {
  if (!finite(dt) || dt < 0 || dt > 0.25) throw new RangeError('dt must be between 0 and 0.25 seconds');
  if (![horizontal, vertical].every(finite)) throw new TypeError('Invalid manual input');
  let dx = clamp(horizontal, -1, 1), dy = clamp(vertical, -1, 1);
  if (dx === 0 && dy === 0 && target !== null) {
    if (!finite(target.x) || !finite(target.y)) throw new TypeError('Invalid target');
    dx = target.x - ship.x;
    dy = target.y - ship.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.001) return { ...ship };
    const maxStep = ship.speed * dt;
    if (distance <= maxStep) return { ...ship, x: clamp(target.x, ship.radius, 1 - ship.radius), y: clamp(target.y, ship.radius, 1 - ship.radius) };
  }
  const magnitude = Math.hypot(dx, dy);
  if (magnitude === 0) return { ...ship };
  const distance = ship.speed * dt / Math.max(1, magnitude);
  return {
    ...ship,
    x: clamp(ship.x + dx * distance, ship.radius, 1 - ship.radius),
    y: clamp(ship.y + dy * distance, ship.radius, 1 - ship.radius),
  };
}

export function keyboardAxes(keys = []) {
  const held = new Set(Array.from(keys, k => String(k).toLowerCase()));
  return {
    horizontal: Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft')),
    vertical: Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup')),
  };
}
