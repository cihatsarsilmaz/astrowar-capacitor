import { useEffect, useRef, useState } from "react";
import { createMatch, step, place, UNITS } from "./sim.js";
import { buildReceipt } from "./receipt.js";
import { arenaOf, seasonSoftReset } from "./ladder.js";
import { Q6_N, Q6_P50, Q6_P95, loadLogs, recordLag, resetLogs, summarize } from "./q6.js";
import { LIVE_WAIT_MS, acceptLive, beginSearch, cancelSearch, createQueue, queueLine, tickQueue } from "./matchmaking.js";

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

function hud(s) {
  const me = s.players[0], fo = s.players[1];
  return {
    t: s.t,
    phase: s.phase,
    energy: me.energy,
    hand: [...me.hand],
    me: { core: me.coreHp, satL: me.satL, satR: me.satR },
    foe: { core: fo.coreHp, satL: fo.satL, satR: fo.satR },
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

function draw(ctx, s, selected) {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(34, 211, 238, 0.10)";
  ctx.fillRect(0, H / 2, W, H / 2);
  ctx.fillStyle = "rgba(251, 146, 60, 0.10)";
  ctx.fillRect(0, 0, W, H / 2);
  ctx.strokeStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
  ctx.fillText("RAKIP", 8, 28);
  ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
  ctx.fillText("SEN — alt yariya bas", 8, H - 10);

  const map = (x, y) => [x * W, (1 - y) * H];
  const structs = (p, color) => {
    const pts = [
      [0.28, p.side === 0 ? 0.12 : 0.88, p.satL, 2400, "L"],
      [0.72, p.side === 0 ? 0.12 : 0.88, p.satR, 2400, "R"],
      [0.50, p.side === 0 ? 0.06 : 0.94, p.coreHp, 4200, "C"],
    ];
    for (const [x, y, hp, max, tag] of pts) {
      const [px, py] = map(x, y);
      ctx.fillStyle = hp <= 0 ? "#334155" : color;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(tag, px - 4, py + 4);
      bar(ctx, px - 28, py - 22, 56, 7, hp / max, hp / max < 0.35 ? "#f87171" : color, "#1e293b");
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px sans-serif";
      ctx.fillText(Math.ceil(hp) + "/" + max, px - 28, py - 24);
    }
  };
  structs(s.players[0], "#22d3ee");
  structs(s.players[1], "#fb923c");

  for (const p of s.players) {
    for (const u of p.units) {
      const [px, py] = map(u.x, u.y);
      ctx.fillStyle = p.side === 0 ? "#38bdf8" : "#f87171";
      ctx.fillRect(px - 6, py - 6, 12, 12);
    }
  }

  const e = s.players[0].energy;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(6, H / 2 + 8, 160, 22);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`E ${e.toFixed(1)}/10`, 10, H / 2 + 24);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < Math.floor(e) ? "#22d3ee" : i < e ? "#67e8f9" : "#1e293b";
    ctx.fillRect(78 + i * 8, H / 2 + 14, 6, 10);
  }
  if (selected) {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "12px sans-serif";
    ctx.fillText("secili: " + selected, 174, H / 2 + 24);
  }
}

function q6Line(stats) {
  if (!stats.n) return `Q6 0/${Q6_N} — kart sec, alt yariya bas`;
  const p50 = stats.p50 == null ? "-" : stats.p50.toFixed(0);
  const p95 = stats.p95 == null ? "-" : stats.p95.toFixed(0);
  const flag = !stats.ready ? "OLCUM" : stats.pass ? "GECTI" : "KALDI";
  return `Q6 ${stats.n}/${Q6_N}  p50 ${p50}ms (<${Q6_P50})  p95 ${p95}ms (<=${Q6_P95})  ${flag}`;
}

function pointerToSim(el, e) {
  const rec = el.getBoundingClientRect();
  const src = e.changedTouches?.[0] || e.touches?.[0] || e;
  const px = (src.clientX - rec.left) / Math.max(1, rec.width);
  const py = (src.clientY - rec.top) / Math.max(1, rec.height);
  const x = Math.max(0.05, Math.min(0.95, px));
  let y = 1 - Math.max(0, Math.min(1, py));
  if (y >= OWN_MAX_Y && y < OWN_MAX_Y + 0.06) y = OWN_MAX_Y - 0.01;
  return { x, y, py };
}

export default function ArenaView() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const pendingLag = useRef(null);
  const selectedRef = useRef(null);
  const autoRef = useRef(false);
  const cupsRef = useRef(loadCups());
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [energy, setEnergy] = useState(5);
  const [hp, setHp] = useState({ me: { core: 4200, satL: 2400, satR: 2400 }, foe: { core: 4200, satL: 2400, satR: 2400 } });
  const [cups, setCups] = useState(() => cupsRef.current);
  const [hint, setHint] = useState("Kart sec, kendi yarin (alt) icine bas");
  const [q6, setQ6] = useState(() => summarize(loadLogs().map((x) => x.ms)));
  const [queue, setQueue] = useState(() => createQueue({ cups: cupsRef.current }));
  const [matchKey, setMatchKey] = useState("practice-42");

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { cupsRef.current = cups; }, [cups]);

  useEffect(() => {
    if (queue.status !== "searching") return;
    const id = setInterval(() => {
      setQueue((q) => {
        const next = tickQueue(q);
        if (next.status === "timeout") setHint("Rakip yok — bot sonra");
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [queue.status]);

  useEffect(() => {
    const seed = matchKey.startsWith("live-") ? Number(matchKey.slice(5)) >>> 0 : 42;
    stateRef.current = createMatch(seed);
    const start = hud(stateRef.current);
    setHand(start.hand);
    setEnergy(start.energy);
    setHp({ me: start.me, foe: start.foe });
    setDone(null);
    setReceipt(null);
    let acc = 0;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      const s = stateRef.current;
      if (s && s.phase !== "done") {
        acc += now - last;
        last = now;
        while (acc >= 100 && s.phase !== "done") {
          step(s);
          acc -= 100;
        }
        const snap = hud(s);
        setHand(snap.hand);
        setEnergy(snap.energy);
        setHp({ me: snap.me, foe: snap.foe });
        if (s.phase === "done") {
          setDone(s.winner);
          const rec = buildReceipt(s, [cupsRef.current, 0]);
          setReceipt(rec);
          const next = saveCups(rec.trophies.after[0]);
          cupsRef.current = next;
          setCups(next);
        }
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && s) draw(ctx, s, selectedRef.current);
      if (pendingLag.current != null) {
        const ms = performance.now() - pendingLag.current;
        pendingLag.current = null;
        setQ6(recordLag(ms, { src: autoRef.current ? "auto" : "touch" }));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [matchKey]);

  const tryPlace = (x, y, src) => {
    const sel = selectedRef.current;
    if (!sel) {
      setHint("Once elden bir kart sec");
      return false;
    }
    const s = stateRef.current;
    if (!s || s.phase === "done") return false;
    if (y >= OWN_MAX_Y) {
      setHint("Rakip yari. Alt yariya (senin saha) bas");
      return false;
    }
    const cost = UNITS[sel]?.energy ?? 99;
    if (s.players[0].energy < cost) {
      setHint(`Enerji yetmez (${s.players[0].energy.toFixed(1)}/${cost})`);
      return false;
    }
    pendingLag.current = performance.now();
    autoRef.current = src === "auto";
    const ok = place(s, { tTick: s.tTick, player: 0, type: "place", unitId: sel, x, y });
    if (!ok) {
      pendingLag.current = null;
      setHint("Koyulamadi — alt yari + enerji + eldeki kart");
    } else {
      setHint(sel + " konuldu");
    }
    setHand([...s.players[0].hand]);
    setEnergy(s.players[0].energy);
    return ok;
  };

  const onCanvas = (e) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (!el) return;
    const { x, y } = pointerToSim(el, e);
    tryPlace(x, y, "touch");
  };

  const runAuto = () => {
    let n = 0;
    const tick = () => {
      const s = stateRef.current;
      if (!s || s.phase === "done" || n >= Q6_N) return;
      const id = s.players[0].hand.find((u) => UNITS[u] && s.players[0].energy >= UNITS[u].energy);
      if (!id) {
        setTimeout(tick, 200);
        return;
      }
      selectedRef.current = id;
      setSelected(id);
      const x = 0.2 + (n % 5) * 0.12;
      const y = 0.15 + (n % 3) * 0.08;
      tryPlace(x, y, "auto");
      n += 1;
      setTimeout(tick, 180);
    };
    tick();
  };

  const onSeasonReset = () => {
    const before = cupsRef.current;
    const next = saveCups(seasonSoftReset(before));
    cupsRef.current = next;
    setCups(next);
    const a = arenaOf(next);
    setHint(`Sezon reset ${before} → ${next} · ${a.name} (#${a.id})`);
  };

  const onLiveSearch = () => {
    const liveUrl = typeof window !== "undefined" ? window.__ARENA_LIVE_URL || null : null;
    setQueue(beginSearch(createQueue({ cups: cupsRef.current }), { liveUrl }));
    setHint(liveUrl ? "Canli kuyruk — sunucu" : `Canli kuyruk ${LIVE_WAIT_MS / 1000}s — sunucu yok, bot sonra`);
  };

  const onLiveCancel = () => {
    setQueue(cancelSearch(queue));
    setHint("Kuyruk iptal");
  };

  const onLiveAcceptDemo = () => {
    const seed = (Date.now() ^ (cupsRef.current * 9973)) >>> 0;
    const next = acceptLive(queue.status === "searching" ? queue : beginSearch(createQueue({ cups: cupsRef.current })), {
      seed,
      opponentId: "peer-local",
    });
    setQueue(next);
    setMatchKey("live-" + seed);
    setHint(`Eslesme live seed=${seed} (lokal peer isareti — gercek rakip yok)`);
  };

  const hpRow = (label, pack, color) => (
    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginBottom: 4 }}>
      <span style={{ width: 44, color }}>{label}</span>
      {[["L", pack.satL, 2400], ["R", pack.satR, 2400], ["C", pack.core, 4200]].map(([tag, v, max]) => (
        <span key={tag} style={{ flex: 1 }}>
          <span style={{ opacity: 0.7 }}>{tag} {Math.ceil(v)}</span>
          <span style={{ display: "block", height: 6, background: "#1e293b", borderRadius: 3 }}>
            <span style={{ display: "block", height: 6, width: `${Math.max(0, 100 * v / max)}%`, background: v / max < 0.35 ? "#f87171" : color, borderRadius: 3 }} />
          </span>
        </span>
      ))}
    </div>
  );

  const lig = arenaOf(cups);

  return (
    <div style={{ background: "#020617", color: "#e2e8f0", minHeight: "100vh", padding: 12, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 12, marginBottom: 6 }}>Arena Faz-1 · ?mode=arena</div>
      <div style={{ fontSize: 12, marginBottom: 6, color: "#67e8f9" }}>
        Lig {lig.name} (#{lig.id}) · kupa {cups} · reset max(400, floor(kupa*0.6))
      </div>
      <div style={{ fontSize: 12, marginBottom: 6, color: queue.status === "matched" ? "#4ade80" : queue.status === "timeout" ? "#f87171" : "#94a3b8" }}>
        {queueLine(queue)}
      </div>
      <div style={{ fontSize: 12, marginBottom: 8, color: q6.pass ? "#4ade80" : q6.ready ? "#f87171" : "#94a3b8" }}>
        {q6Line(q6)}
      </div>
      {hpRow("RAKIP", hp.foe, "#fb923c")}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onCanvas}
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: `${W} / ${H}`,
          height: "auto",
          border: "1px solid #334155",
          touchAction: "none",
          display: "block",
        }}
      />
      {hpRow("SEN", hp.me, "#22d3ee")}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 8px", fontSize: 14, fontWeight: 700 }}>
        <span>Enerji {energy.toFixed(1)}/10</span>
        <span style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} style={{
              width: 10, height: 14, borderRadius: 2,
              background: i < Math.floor(energy) ? "#22d3ee" : i < energy ? "#67e8f9" : "#1e293b",
            }} />
          ))}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{hint}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {hand.map((id, i) => {
          const cost = UNITS[id].energy;
          const can = energy >= cost;
          const on = selected === id;
          return (
            <button key={i} onClick={() => setSelected(id)} style={{
              flex: 1, padding: "10px 6px",
              background: on ? "#22d3ee" : "#1e293b",
              color: on ? "#0b1220" : can ? "#e2e8f0" : "#64748b",
              border: can ? "1px solid #334155" : "1px solid #1e293b",
              borderRadius: 8, opacity: can ? 1 : 0.55, fontWeight: 700,
            }}>
              <div style={{ fontSize: 13 }}>{id}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>E {cost}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={runAuto} style={{ padding: "8px 12px", background: "#334155", color: "#e2e8f0", border: 0, borderRadius: 8 }}>Q6 auto x{Q6_N}</button>
        <button onClick={() => setQ6(resetLogs())} style={{ padding: "8px 12px", background: "#1e293b", color: "#94a3b8", border: 0, borderRadius: 8 }}>sifirla</button>
        <button onClick={onSeasonReset} style={{ padding: "8px 12px", background: "#0e7490", color: "#ecfeff", border: 0, borderRadius: 8 }}>sezon reset</button>
        <button onClick={onLiveSearch} style={{ padding: "8px 12px", background: "#14532d", color: "#bbf7d0", border: 0, borderRadius: 8 }}>canli esles</button>
        <button onClick={onLiveCancel} style={{ padding: "8px 12px", background: "#1e293b", color: "#94a3b8", border: 0, borderRadius: 8 }}>iptal</button>
        <button onClick={onLiveAcceptDemo} style={{ padding: "8px 12px", background: "#3f3f46", color: "#e4e4e7", border: 0, borderRadius: 8 }}>lokal peer</button>
      </div>
      {done !== null && (
        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div>Bitti. Kazanan: {String(done)}</div>
          {receipt && (
            <div style={{ marginTop: 6, color: "#94a3b8" }}>
              receipt mode={receipt.mode} seed={receipt.seed} tEnd={receipt.tEnd}
              {" "}kupa {receipt.trophies.before[0]}→{receipt.trophies.after[0]} arena {receipt.trophies.arena[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
