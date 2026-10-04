/** Q6 — yerlestirme gecikmesi. Hedef p50 < 100ms, p95 <= 300ms, n >= 30. */

export const Q6_N = 30;
export const Q6_P50 = 100;
export const Q6_P95 = 300;
const KEY = "astro.arena.q6";
const REPORT_KEY = "astro.arena.q6.report";

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
  try { localStorage.removeItem(REPORT_KEY); } catch { /* playtest */ }
  return summarize([]);
}

export function touchLogs(logs = loadLogs()) {
  return logs.filter((x) => x.src === "touch");
}

export function summarizeTouch(logs = loadLogs()) {
  return summarize(touchLogs(logs).map((x) => x.ms));
}

export function deviceProbe() {
  if (typeof navigator === "undefined") {
    return { kind: "node", touch: false, mobile: false, ua: "node", w: null, h: null };
  }
  const ua = navigator.userAgent || "";
  const touch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in globalThis;
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return {
    kind: mobile ? "phone" : touch ? "touch-desktop" : "desktop",
    touch,
    mobile,
    ua: ua.slice(0, 120),
    w: typeof screen !== "undefined" ? screen.width : null,
    h: typeof screen !== "undefined" ? screen.height : null,
  };
}

export function formatReport({ all, touch, device }) {
  const flag = (s) => (!s.n ? "BOS" : !s.ready ? "OLCUM" : s.pass ? "GECTI" : "KALDI");
  const line = (label, s) => {
    const p50 = s.p50 == null ? "-" : Number(s.p50).toFixed(0);
    const p95 = s.p95 == null ? "-" : Number(s.p95).toFixed(0);
    return `${label} n=${s.n}/${Q6_N} p50=${p50} p95=${p95} ${flag(s)}`;
  };
  const phoneOk = device.mobile && touch.n >= Q6_N;
  return [
    `Q6-REPORT`,
    `device=${device.kind} mobile=${device.mobile} touchCap=${device.touch} ${device.w || "?"}x${device.h || "?"}`,
    line("touch", touch),
    line("all", all),
    phoneOk ? "telefon-ornek=var" : "telefon-ornek=yok",
    "GECTI iddiasi yok; headless/auto telefon sayilmaz",
  ].join("\n");
}

export function saveReport(text) {
  try { localStorage.setItem(REPORT_KEY, text); } catch { /* quota */ }
  return text;
}
