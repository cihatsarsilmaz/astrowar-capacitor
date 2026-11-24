import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 4179;
const server = spawn('npm', ['run', 'preview', '--', '--config', 'vite.evolution.config.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Preview server exited');
    try { const r = await fetch('http://127.0.0.1:' + port + '/evolution.html'); if (r.ok) return; } catch {}
    await sleep(500);
  }
  throw new Error('Preview server not ready');
}
async function position(page) {
  return page.locator('canvas').evaluate(canvas => {
    const c = canvas.getContext('2d');
    const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (data[i] > 15 && data[i] < 70 && data[i+1] > 170 && data[i+2] > 200) { sx += x; sy += y; n++; }
    }
    assert(n > 20, 'Ship pixels not found');
    return { x: sx / n, y: sy / n };
  });
}
try {
  await ready();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/evolution.html');
  await page.getByRole('heading', { name: /AstroWar Evolution/ }).waitFor();
  await page.waitForTimeout(200);
  const before = await position(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(450);
  await page.keyboard.up('d');
  const afterManual = await position(page);
  assert(afterManual.x > before.x + 25, 'D key did not move ship right');
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 100, y: 100 } });
  await page.waitForTimeout(450);
  const afterTarget = await position(page);
  assert(afterTarget.x < afterManual.x - 10, 'Click target did not steer ship left');
  await page.getByRole('button', { name: 'Hedefi temizle' }).click();
  await page.getByRole('status').getByText('Otomatik hedef temizlendi').waitFor();
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await page.goto('http://127.0.0.1:' + port + '/');
  assert(!page.url().includes('evolution.html'), 'Original route changed');
  console.log('PASS: Canvas render, WASD movement, pointer steering, target clearing, default route');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
