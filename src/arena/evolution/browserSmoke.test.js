import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const root = new URL('../../../', import.meta.url);

describe('AW-EVO-02 isolated browser entry contracts', () => {
  it('exposes a standalone page without changing the original entry', () => {
    const html = readFileSync(new URL('evolution.html', root), 'utf8');
    expect(html).toContain('src/arena/evolution/main.jsx');
    expect(html).toContain('id="root"');
    const main = readFileSync(new URL('src/main.jsx', root), 'utf8');
    expect(main).not.toContain('ShipCanvas');
  });
  it('provides Canvas, pointer targeting, keyboard controls and cleanup', () => {
    const src = readFileSync(new URL('src/arena/evolution/ShipCanvas.jsx', root), 'utf8');
    for (const token of ['<canvas', 'onPointerDown={selectTarget}', 'keyboardAxes(keysRef.current)', "window.addEventListener('keydown'", "window.removeEventListener('keydown'", 'cancelAnimationFrame(frame)', 'role="status"']) {
      expect(src).toContain(token);
    }
  });
});
