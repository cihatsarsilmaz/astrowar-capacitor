/** Canli eslesme kuyrugu — bot sonra. Sunucu yoksa yerel bekler, timeout bot acmaz. */
export const LIVE_WAIT_MS = 8000;

export function createQueue({ cups = 0 } = {}) {
  return {
    status: "idle",
    cups,
    startedAt: null,
    seed: null,
    opponent: null,
    waitMs: 0,
    liveUrl: null,
  };
}

export function beginSearch(q, { now = Date.now(), liveUrl = null } = {}) {
  return {
    ...q,
    status: "searching",
    startedAt: now,
    seed: null,
    opponent: null,
    waitMs: 0,
    liveUrl: liveUrl || null,
  };
}

export function tickQueue(q, now = Date.now()) {
  if (q.status !== "searching") return q;
  const waitMs = Math.max(0, now - (q.startedAt || now));
  if (waitMs >= LIVE_WAIT_MS) return { ...q, waitMs, status: "timeout" };
  return { ...q, waitMs };
}

export function acceptLive(q, { seed, opponentId }) {
  const n = Number(seed);
  const safe = Number.isFinite(n) ? (n >>> 0) : (Date.now() >>> 0);
  return {
    ...q,
    status: "matched",
    seed: safe,
    opponent: { kind: "live", id: String(opponentId || "peer") },
    waitMs: q.waitMs || 0,
  };
}

export function cancelSearch(q) {
  return { ...q, status: "canceled", seed: null, opponent: null, waitMs: 0 };
}

export function queueLine(q) {
  if (!q || q.status === "idle") return "Canli eslesme kapali — bot sonra";
  if (q.status === "searching") return `Kuyruk ${Math.floor((q.waitMs || 0) / 1000)}s / ${LIVE_WAIT_MS / 1000}s`;
  if (q.status === "matched") return `Eslesme live seed=${q.seed} vs ${q.opponent?.id || "peer"}`;
  if (q.status === "timeout") return "Rakip yok — bot sonra";
  if (q.status === "canceled") return "Kuyruk iptal";
  return String(q.status);
}
