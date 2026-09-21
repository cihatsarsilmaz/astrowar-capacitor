import { useEffect, useRef, useState } from "react";
import { createMatch, step, place, UNITS } from "./sim.js";

const W = 360, H = 560;

function draw(ctx, s, selected) {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#334155";
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
  ctx.font = "12px sans-serif";
  ctx.fillText(`t ${s.t.toFixed(1)}  E ${s.players[0].energy.toFixed(1)}  ${s.phase}`, 8, 16);
  if (selected) ctx.fillText("secili: " + selected, 8, 32);
}

export default function ArenaView() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(null);
  useEffect(() => {
    stateRef.current = createMatch(42);
    setHand([...stateRef.current.players[0].hand]);
    let acc = 0;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      const s = stateRef.current;
      if (s.phase !== "done") {
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
      if (ctx) draw(ctx, s, selected);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selected]);
  const onCanvas = (e) => {
    if (!selected) return;
    const rec = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rec.left) / rec.width;
    const y = 1 - (e.clientY - rec.top) / rec.height;
    const s = stateRef.current;
    place(s, { tTick: s.tTick, player: 0, type: "place", unitId: selected, x, y });
    setHand([...s.players[0].hand]);
  };
  return (
    <div style={{ background: "#020617", color: "#e2e8f0", minHeight: "100vh", padding: 12, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 12, marginBottom: 8 }}>Arena Faz-1 · ?mode=arena · bot ust yari</div>
      <canvas ref={canvasRef} width={W} height={H} onClick={onCanvas} style={{ width: "100%", maxWidth: 360, border: "1px solid #334155", touchAction: "manipulation" }} />
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
      {done !== null && <div style={{ marginTop: 12 }}>Bitti. Kazanan: {String(done)}</div>}
    </div>
  );
}
