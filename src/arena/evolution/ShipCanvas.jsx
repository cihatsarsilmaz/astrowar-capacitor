import { useEffect, useRef, useState } from 'react';
import { createShip, keyboardAxes, stepShip } from './shipCore.js';

const WIDTH = 800, HEIGHT = 500;
export default function ShipCanvas() {
  const canvasRef = useRef(null);
  const shipRef = useRef(createShip());
  const keysRef = useRef(new Set());
  const targetRef = useRef(null);
  const [status, setStatus] = useState('Hazır');
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) { setStatus('Canvas desteklenmiyor'); return; }
    let frame = 0, last = 0;
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const onKeyUp = (e) => keysRef.current.delete(e.key.toLowerCase());
    const onBlur = () => keysRef.current.clear();
    const draw = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      shipRef.current = stepShip(shipRef.current, { ...keyboardAxes(keysRef.current), target: targetRef.current }, dt);
      const s = shipRef.current;
      ctx.fillStyle = '#081528';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = '#173653';
      for (let x = 0; x <= WIDTH; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,HEIGHT); ctx.stroke(); }
      for (let y = 0; y <= HEIGHT; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WIDTH,y); ctx.stroke(); }
      if (targetRef.current) {
        ctx.strokeStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(targetRef.current.x * WIDTH, targetRef.current.y * HEIGHT, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(s.x * WIDTH, s.y * HEIGHT);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(0,-15); ctx.lineTo(12,12); ctx.lineTo(0,6); ctx.lineTo(-12,12); ctx.closePath(); ctx.fill();
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  const selectTarget = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    targetRef.current = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
    setStatus('Otomatik hedef seçildi');
    e.currentTarget.focus();
  };
  return <main style={{ background: '#081528', color: '#f8fafc', minHeight: '100vh', padding: 24, fontFamily: 'system-ui' }}>
    <h1>AstroWar Evolution — 2D uçuş prototipi</h1>
    <p>WASD / ok tuşları: manuel uçuş. Canvas üzerine tıkla: otomatik hedef. Manuel giriş önceliklidir.</p>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} role="application"
      aria-label="AstroWar tek gemili 2D uçuş alanı" onPointerDown={selectTarget}
      style={{ display: 'block', width: '100%', maxWidth: WIDTH, height: 'auto', border: '1px solid #2a5670', outlineOffset: 4 }} />
    <p role="status">{status}</p>
    <button type="button" onClick={() => { targetRef.current = null; keysRef.current.clear(); setStatus('Otomatik hedef temizlendi'); }}>Hedefi temizle</button>
  </main>;
}
