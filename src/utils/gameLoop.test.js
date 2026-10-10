import { afterEach, describe, expect, it, vi } from "vitest";
import { GameLoop } from "./gameLoop.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GameLoop", () => {
  it("rejects invalid frame rates", () => {
    expect(() => new GameLoop(0)).toThrow(RangeError);
    expect(() => new GameLoop(Number.NaN)).toThrow(RangeError);
  });

  it("limits catch-up ticks after a long frame pause", () => {
    let frame;
    let id = 0;
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", vi.fn(callback => {
      frame = callback;
      return ++id;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const loop = new GameLoop();
    const tick = vi.fn();
    loop.onTick(tick);
    loop.start();
    frame(10_000);

    expect(tick).toHaveBeenCalledTimes(5);
    loop.stop();
  });
});
