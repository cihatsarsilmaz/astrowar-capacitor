import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createShip, stepShip, keyboardAxes } from './shipCore.js';
const root = new URL('../../../', import.meta.url);

describe('AW-EVO-01 existing behavior guardrails', () => {
  it('keeps default game and arena query routing', () => {
    const main = readFileSync(new URL('src/main.jsx', root), 'utf8');
    expect(main).toMatch(/get\("mode"\) === "arena"/);
    expect(main).toMatch(/arena \? <ArenaView \/> : <AstrogameWAR \/>/);
  });
  it('keeps existing arena simulation entrypoints and timing', () => {
    const sim = readFileSync(new URL('src/arena/sim.js', root), 'utf8');
    for (const name of ['createMatch', 'step', 'place', 'runMatch']) expect(sim).toMatch(new RegExp('export function ' + name + '\\b'));
    expect(sim).toMatch(/MATCH_S = 180/);
    expect(sim).toMatch(/OT_S = 60/);
  });
});

describe('AW-EVO-01 isolated hybrid ship core', () => {
  it('creates exactly one ship and does not mutate state', () => {
    const ship = createShip();
    const next = stepShip(ship, { horizontal: 1 }, 0.1);
    expect(next.x).toBeGreaterThan(ship.x);
    expect(ship.x).toBe(0.5);
  });
  it('normalizes diagonal movement', () => {
    const ship = createShip();
    const a = stepShip(ship, { horizontal: 1 }, 0.1);
    const b = stepShip(ship, { horizontal: 1, vertical: 1 }, 0.1);
    expect(Math.hypot(b.x - ship.x, b.y - ship.y)).toBeCloseTo(a.x - ship.x, 9);
  });
  it('manual control overrides automatic steering and preserves position', () => {
    const ship = createShip();
    const manual = stepShip(ship, { horizontal: 1, target: { x: 0, y: 0 } }, 0.1);
    const automatic = stepShip(manual, { target: { x: 0, y: 0 } }, 0.1);
    expect(manual.x).toBeGreaterThan(ship.x);
    expect(automatic.x).toBeLessThan(manual.x);
  });
  it('stops at target and respects arena bounds', () => {
    expect(stepShip(createShip(), { target: { x: 0.51, y: 0.5 } }, 0.2).x).toBe(0.51);
    const edge = stepShip(createShip({ x: 0.98, y: 0.02 }), { horizontal: 1, vertical: -1 }, 0.25);
    expect(edge.x).toBeLessThanOrEqual(0.975);
    expect(edge.y).toBeGreaterThanOrEqual(0.025);
  });
  it('maps WASD/arrows and rejects invalid input', () => {
    expect(keyboardAxes(['W', 'ArrowRight'])).toEqual({ horizontal: 1, vertical: -1 });
    expect(keyboardAxes(['a', 'd'])).toEqual({ horizontal: 0, vertical: 0 });
    expect(() => stepShip(createShip(), {}, 1)).toThrow(RangeError);
    expect(() => createShip({ x: NaN })).toThrow(TypeError);
  });
});
