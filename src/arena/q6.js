/** Q6 — yerlestirme gecikmesi. Hedef p50 < 100ms, p95 <= 300ms, n >= 30. */

export const Q6_N = 30;
export const Q6_P50 = 100;
export const Q6_P95 = 300;
const KEY = "astro.arena.q6";

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export function summarize(lags) {
  const s = lags.slice().sort((a, b) => a - b);
  const p50 = percentile(s, 50);
  const p95 = percentile(s, 95);
  return {
    n: lags.length,
    p50,
    p95,
    min: s[0] ?? null,
    max: s[s.length - 1] ?? null,
    pass: lags.length >= Q6_N && p50 != null && p95 != null && p50 < Q6_P50 && p95 <= Q6_P95,
    ready: lags.length >= Q6_N,
  };
}

export function loadLogs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLogs(logs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(logs.slice(-200)));
  } catch { /* quota */ }
}

export function recordLag(ms, extra = {}) {
  const logs = loadLogs();
  logs.push({ t: Date.now(), ms: Math.round(ms * 10) / 10, ...extra });
  saveLogs(logs);
  return summarize(logs.map((x) => x.ms));
}

export function resetLogs() {
  saveLogs([]);
  return summarize([]);
}
