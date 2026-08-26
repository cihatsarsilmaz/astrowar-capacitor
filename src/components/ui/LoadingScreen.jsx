import { useState, useEffect } from "react";
import "../styles/animations.css";

// ════════════════════════════════════════════════
// LoadingScreen — Giriş / Yükleme Ekranı
// ════════════════════════════════════════════════

const TIPS = [
  "Filonuzu düzenli olarak güncelleyin...",
  "Teknoloji araştırmaları savaşın kaderini belirler.",
  "Kahramanlar filonuza özel yetenekler katar.",
  "Günlük görevleri tamamlamayı unutmayın!",
  "Formasyonlar düşman türüne göre değiştirilmeli.",
  "Prestige yaparak daha güçlü başlayabilirsiniz.",
];

export default function LoadingScreen({ onStart, progress = 0 }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 4000);
    const d = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 500);
    return () => { clearInterval(t); clearInterval(d); };
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#020810",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, padding: 24, position: "relative", overflow: "hidden"
    }}>
      {/* Starfield background */}
      <div className="starfield">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            width: Math.random() > 0.8 ? 3 : 2,
            height: Math.random() > 0.8 ? 3 : 2,
          }} />
        ))}
      </div>

      {/* Logo */}
      <div className="anim-fadeInScale" style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          width: 120, height: 120, margin: "0 auto 20px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00a8ff, #00ff88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(0,168,255,0.4), 0 0 80px rgba(0,255,136,0.2)",
          animation: "pulseGlow 2s ease-in-out infinite, float 3s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 56 }}>🚀</span>
        </div>
        <h1 style={{
          fontSize: 42, fontWeight: 800, margin: 0,
          background: "linear-gradient(135deg, #00a8ff, #00ff88)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: 2,
        }}>ASTROGAMEWAR</h1>
        <p style={{ color: "#8899aa", margin: "8px 0 0", fontSize: 14 }}>Galaksinin Kaderi Senin Ellerinde</p>
      </div>

      {/* Progress */}
      <div className="anim-fadeInUp" style={{ width: "100%", maxWidth: 320, zIndex: 1 }}>
        <div style={{
          height: 6, borderRadius: 3,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${Math.min(100, progress)}%`,
            background: "linear-gradient(90deg, #00a8ff, #00ff88)",
            borderRadius: 3,
            transition: "width 0.4s ease-out",
            boxShadow: "0 0 12px rgba(0,168,255,0.5)",
          }} />
        </div>
        <p style={{ color: "#667788", fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Yükleniyor{dots} %{Math.round(progress)}
        </p>
      </div>

      {/* Tip */}
      <div className="anim-fadeInUp stagger-2" style={{
        maxWidth: 400, textAlign: "center", zIndex: 1,
        padding: "12px 20px", borderRadius: 12,
        background: "rgba(0,168,255,0.05)",
        border: "1px solid rgba(0,168,255,0.1)",
      }}>
        <p style={{ color: "#00a8ff", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 2 }}>İpucu</p>
        <p style={{ color: "#aabbcc", fontSize: 13, margin: 0, minHeight: 36, transition: "opacity 0.5s" }}>
          {TIPS[tipIndex]}
        </p>
      </div>

      {/* Start Button */}
      {progress >= 100 && (
        <button
          onClick={onStart}
          className="btn-glow anim-fadeInUp"
          style={{
            padding: "14px 48px", borderRadius: 28,
            border: "none",
            background: "linear-gradient(135deg, #00a8ff, #00ff88)",
            color: "#020810", fontSize: 16, fontWeight: 700,
            cursor: "pointer", zIndex: 1,
          }}
        >
          🎮 OYUNA BAŞLA
        </button>
      )}
    </div>
  );
}
