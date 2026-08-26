import { useRef, useCallback, useEffect } from "react";

// ════════════════════════════════════════════════
// useParticles — Canvas Partikül Efekt Sistemi
// ════════════════════════════════════════════════

class Particle {
  constructor(x, y, type = "spark") {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = Math.random() * Math.PI * 2;
    const speed = type === "explosion" ? Math.random() * 6 + 2 : Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = type === "explosion" ? 0.03 : 0.015;
    this.size = type === "explosion" ? Math.random() * 6 + 3 : Math.random() * 3 + 1;
    this.color = type === "explosion" 
      ? `hsl(${Math.random() * 40 + 10}, 100%, 60%)`  // Orange/red
      : `hsl(${Math.random() * 60 + 180}, 100%, 70%)`; // Cyan/blue
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= this.decay;
    this.size *= 0.97;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function useParticles() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);

  const spawn = useCallback((x, y, count = 12, type = "spark") => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(new Particle(x, y, type));
    }
  }, []);

  const burst = useCallback((rect, type = "explosion") => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    spawn(cx, cy, type === "explosion" ? 30 : 15, type);
  }, [spawn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        parts[i].update();
        parts[i].draw(ctx);
        if (parts[i].life <= 0) parts.splice(i, 1);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return { canvasRef, spawn, burst };
}
