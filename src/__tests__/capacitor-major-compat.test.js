import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));

function major(spec) {
  const match = String(spec ?? '').match(/(?:^|[^0-9])(\\d+)\\./);
  return match ? Number(match[1]) : null;
}

test('Capacitor Android, Core and CLI use the same major version', () => {
  const android = major(pkg.dependencies['@capacitor/android']);
  const core = major(pkg.dependencies['@capacitor/core']);
  const cli = major(pkg.devDependencies['@capacitor/cli']);
  expect(android).not.toBeNull();
  expect(core).toBe(android);
  expect(cli).toBe(android);
});

test('Capacitor package lock root matches package.json', () => {
  for (const [name, spec] of Object.entries({
    '@capacitor/android': pkg.dependencies['@capacitor/android'],
    '@capacitor/core': pkg.dependencies['@capacitor/core'],
    '@capacitor/cli': pkg.devDependencies['@capacitor/cli'],
  })) {
    const root = lock.packages[''];
    expect(root.dependencies?.[name] ?? root.devDependencies?.[name]).toBe(spec);
  }
});
