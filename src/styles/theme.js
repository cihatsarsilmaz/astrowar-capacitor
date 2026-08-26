// ════════════════════════════════════════════════
// theme.js v2 — Glassmorphism + Neon Efektler
// ════════════════════════════════════════════════

export const T = {
  bg:       "#020810",
  surface:  "rgba(4, 16, 32, 0.85)",
  surface2: "rgba(8, 24, 48, 0.7)",
  border:   "rgba(0, 168, 255, 0.15)",
  border2:  "rgba(0, 255, 136, 0.2)",
  text:     "#e0eeff",
  muted:    "#8899aa",
  acc:      "#00a8ff",      // Ana mavi
  acc2:     "#00ff88",      // Yeşil
  warn:     "#ffaa00",      // Turuncu
  danger:   "#ff4466",      // Kırmızı
  success:  "#00ff88",
  info:     "#00a8ff",
  gold:     "#ffd700",
  purple:   "#a855f7",
  pink:     "#ec4899",

  // Gradientler
  gradPrimary: "linear-gradient(135deg, #00a8ff, #00ff88)",
  gradDanger:  "linear-gradient(135deg, #ff4466, #ffaa00)",
  gradGold:    "linear-gradient(135deg, #ffd700, #ffaa00)",
  gradPurple:  "linear-gradient(135deg, #a855f7, #ec4899)",

  // Glow efektleri
  glowBlue:   "0 0 20px rgba(0,168,255,0.3)",
  glowGreen:  "0 0 20px rgba(0,255,136,0.3)",
  glowRed:    "0 0 20px rgba(255,68,102,0.3)",
  glowGold:   "0 0 20px rgba(255,215,0,0.3)",
};

export const S = {
  glass: {
    background: T.surface,
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  glassAccent: {
    background: "linear-gradient(135deg, rgba(0,168,255,0.1), rgba(0,255,136,0.05))",
    backdropFilter: "blur(16px)",
    border: `1px solid ${T.border2}`,
    borderRadius: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    background: T.surface2,
    border: `1px solid ${T.border}`,
    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "all 0.2s ease",
    position: "relative",
    overflow: "hidden",
  },
  btnPrimary: {
    background: T.gradPrimary,
    color: "#020810",
    boxShadow: T.glowBlue,
  },
  btnDanger: {
    background: T.gradDanger,
    color: "#fff",
    boxShadow: T.glowRed,
  },
  textGradient: {
    background: T.gradPrimary,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  flexCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  flexBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scrollbar: {
    scrollbarWidth: "thin",
    scrollbarColor: `${T.acc}22 transparent`,
  },
};

// Rarity colors for items/units
export const RARITY = {
  common:    { color: "#8899aa", glow: "none" },
  uncommon:  { color: "#00ff88", glow: "0 0 8px rgba(0,255,136,0.3)" },
  rare:      { color: "#00a8ff", glow: "0 0 12px rgba(0,168,255,0.4)" },
  epic:      { color: "#a855f7", glow: "0 0 16px rgba(168,85,247,0.5)" },
  legendary: { color: "#ffd700", glow: "0 0 20px rgba(255,215,0,0.6)" },
  mythic:    { color: "#ff4466", glow: "0 0 24px rgba(255,68,102,0.6)" },
};
