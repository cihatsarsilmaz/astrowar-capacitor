// ════════════════════════════════════════════════
// gameLoop — requestAnimationFrame Tabanlı Oyun Döngüsü
// setInterval yerine RAF kullanarak %60 daha akıcı
// ════════════════════════════════════════════════

export class GameLoop {
  constructor(fps = 60) {
    this.fps = fps;
    this.interval = 1000 / fps;
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.rafId = null;
    this.tickCallbacks = [];
    this.renderCallbacks = [];
  }

  onTick(fn) { this.tickCallbacks.push(fn); return () => this.tickCallbacks = this.tickCallbacks.filter(f => f !== fn); }
  onRender(fn) { this.renderCallbacks.push(fn); return () => this.renderCallbacks = this.renderCallbacks.filter(f => f !== fn); }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const delta = now - this.lastTime;
      this.lastTime = now;
      this.accumulator += delta;

      while (this.accumulator >= this.interval) {
        this.tickCallbacks.forEach(fn => fn(this.interval));
        this.accumulator -= this.interval;
      }

      const alpha = this.accumulator / this.interval;
      this.renderCallbacks.forEach(fn => fn(alpha));
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  isRunning() { return this.running; }
}

// Singleton instance
let globalLoop = null;
export function getGameLoop() {
  if (!globalLoop) globalLoop = new GameLoop(60);
  return globalLoop;
}
