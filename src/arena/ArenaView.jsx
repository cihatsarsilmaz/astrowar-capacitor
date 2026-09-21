import { useEffect, useRef, useState } from "react";
import { createMatch, step, place, UNITS } from "./sim.js";
import { Q6_N, Q6_P50, Q6_P95, loadLogs, recordLag, resetLogs, summarize } from "./q6.js";

const W = 360, H = 560;

function draw(ctx, s, selected) {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(34, 211, 238, 0.07)";
  ctx.fillRect(0, H / 2, W, H / 2);
  ctx.fillStyle = "rgba(251, 146, 60, 0.07)";
  ctx.fillRect(0, 0, W, H / 2);
  ctx.strokeStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  const map = (x, y) => [x * W, (1 - y) * H];
  const structs = (p, color) => {
    const pts = [
      [0.28, p.side === 0 ? 0.12 : 0.88, p.satL, 2400],
      [0.72, p.side === 0 ? 0.12 : 0.88, p.satR, 2400],
      [0.50, p.side === 0 ? 0.06 : 0.94, p.coreHp, 4200],
    ];
    for (const [x, y, hp, max] of pts) {
      const [px, py] = map(x, y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px sans-serif";
      ctx.fillText(Math.ceil(hp) + "/" + max, px - 18, py - 14);
    }
  };
  structs(s.players[0], "#22d3ee");
  structs(s.players[1], "#fb923c");

  for (const p of s.players) {
    for (const u of p.units) {
      const [px, py] = map(u.x, u.y);
      ctx.fillStyle = p.side === 0 ? "#38bdf8" : "#f87171";
      ctx.fillRect(px - 5, py - 5, 10, 10);
    }
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "14px sans-serif";
  ctx.fillText(`t ${s.t.toFixed(1)}   E ${s.players[0].energy.toFixed(1)}/10   ${s.phase}`, 8, 18);
  if (selected) ctx.fillText("secili: " + selected, 8, 32);
}

function q6Line(stats) {
  if (!stats.n) return `Q6 0/${Q6_N} — kart sec, alt yariya bas`;
  const p50 = stats.p50 == null ? "-" : stats.p50.toFixed(0);
  const p95 = stats.p95 == null ? "-" : stats.p95.toFixed(0);
  const flag = !stats.ready ? "OLCUM" : stats.pass ? "GECTI" : "KALDI";
  return `Q6 ${stats.n}/${Q6_N}  p50 ${p50}ms (<${Q6_P50})  p95 ${p95}ms (<=${Q6_P95})  ${flag}`;
}

export default function ArenaView() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const pendingLag = useRef(null);
  const selectedRef = useRef(null);
  const autoRef = useRef(false);
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(null);
  const [q6, setQ6] = useState(() => summarize(loadLogs().map((x) => x.ms)));

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    stateRef.current = createMatch(42);
    setHand([...stateRef.current.players[0].hand]);
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
        setHand([...s.players[0].hand]);
        if (s.phase === "done") setDone(s.winner);
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
  }, []);

  const tryPlace = (x, y, src) => {
    const sel = selectedRef.current;
    if (!sel) return false;
    const s = stateRef.current;
    if (!s || s.phase === "done") return false;
    pendingLag.current = performance.now();
    autoRef.current = src === "auto";
    const ok = place(s, { tTick: s.tTick, player: 0, type: "place", unitId: sel, x, y });
    if (!ok) pendingLag.current = null;
    setHand([...s.players[0].hand]);
    return ok;
  };

  const onCanvas = (e) => {
    const rec = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rec.left) / rec.width;
    const y = 1 - (e.clientY - rec.top) / rec.height;
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

  return (
    <div style={{ background: "#020617", color: "#e2e8f0", minHeight: "100vh", padding: 12, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 12, marginBottom: 6 }}>Arena Faz-1 · ?mode=arena</div>
      <div style={{ fontSize: 12, marginBottom: 8, color: q6.pass ? "#4ade80" : q6.ready ? "#f87171" : "#94a3b8" }}>
        {q6Line(q6)}
      </div>
      <canvas ref={canvasRef} width={W} height={H} onPointerDown={onCanvas} style={{ width: "100%", maxWidth: 360, border: "1px solid #334155", touchAction: "manipulation" }} />
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {hand.map((id, i) => (
          <button key={i} onClick={() => setSelected(id)} style={{
            flex: 1, padding: 8, background: selected === id ? "#22d3ee" : "#1e293b",
            color: selected === id ? "#0b1220" : "#e2e8f0", border: 0, borderRadius: 8,
          }}>
            {id} ({UNITS[id].energy})
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={runAuto} style={{ padding: "8px 12px", background: "#334155", color: "#e2e8f0", border: 0, borderRadius: 8 }}>Q6 auto x{Q6_N}</button>
        <button onClick={() => setQ6(resetLogs())} style={{ padding: "8px 12px", background: "#1e293b", color: "#94a3b8", border: 0, borderRadius: 8 }}>sifirla</button>
      </div>
      {done !== null && <div style={{ marginTop: 12 }}>Bitti. Kazanan: {String(done)}</div>}
    </div>
  );
}
