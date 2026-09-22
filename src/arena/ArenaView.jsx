import { useEffect, useRef, useState } from "react";
import { createMatch, step, place, UNITS, MATCH_S, OT_S, E_DOUBLE_AT } from "./sim.js";
import { buildReceipt } from "./receipt.js";
import { arenaOf, seasonSoftReset } from "./ladder.js";
import { Q6_N, Q6_P50, Q6_P95, deviceProbe, formatReport, loadLogs, recordLag, resetLogs, saveReport, summarize, summarizeTouch } from "./q6.js";
import { LIVE_WAIT_MS, acceptBot, acceptLive, beginSearch, cancelSearch, createQueue, queueLine, tickQueue } from "./matchmaking.js";

const W = 360, H = 560;
const OWN_MAX_Y = 0.5;
const CUP_KEY = "astrowar-arena-trophies";

function loadCups() {
  try {
    const n = Number(localStorage.getItem(CUP_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function saveCups(n) {
  const v = Math.max(0, Math.floor(n));
  try { localStorage.setItem(CUP_KEY, String(v)); } catch { /* playtest */ }
  return v;
}

function coreHot(p) {
  return !!p && p.satL <= 0 && p.satR <= 0 && p.coreHp > 0;
}

function hud(s) {
  const me = s.players[0], fo = s.players[1];
  return {
    t: s.t,
    phase: s.phase,
    energy: me.energy,
    foeEnergy: fo.energy,
    hand: [...me.hand],
    me: { core: me.coreHp, satL: me.satL, satR: me.satR },
    foe: { core: fo.coreHp, satL: fo.satL, satR: fo.satR },
    coreHot: { me: coreHot(me), foe: coreHot(fo) },
  };
}

function bar(ctx, x, y, w, h, ratio, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, w * Math.max(0, Math.min(1, ratio))), h);
  ctx.strokeStyle = "#94a3b8";
  ctx.strokeRect(x, y, w, h);
}

function clockText(s) {
  if (!s) return `0:00 / ${Math.floor(MATCH_S / 60)}:00`;
  if (s.phase === "done") return "BITTI";
  if (s.phase === "ot") {
    const left = Math.max(0, OT_S - (s.t - (s.otStart || MATCH_S)));
    return `OT ${Math.floor(left)}s  x2 enerji`;
  }
  const left = Math.max(0, MATCH_S - s.t);
  const m = Math.floor(left);
  const sec = Math.floor(left % 60).toString().padStart(2, "0");
  const dbl = s.t >= E_DOUBLE_AT ? "  x2" : "";
  return `${Math.floor(left / 60)}:${sec}${dbl}`;
}
