import React from "react";
import { createRoot } from "react-dom/client";
import AstrogameWAR from "./AstrogameWAR.jsx";
import ArenaView from "./arena/ArenaView.jsx";
import { onBack } from "./nativeBack.js";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[AstrogameWAR] React render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: 20, background: "#160b12", color: "#ffe4e6", fontFamily: "system-ui, sans-serif" }}>
          <h1>AstrogameWAR yüklenemedi</h1>
          <p>Hata ayrıntısını ekran görüntüsüyle paylaşabilirsin.</p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 14px", border: 0, borderRadius: 8 }}>Yeniden yükle</button>
        </main>
      );
    }
    return this.props.children;
  }
}

onBack(() => {
  // Katman yoksa WebView varsayilani: cikis yok, sayfada kal.
});

const arena = new URLSearchParams(window.location.search).get("mode") === "arena";
const root = document.getElementById("root");

if (!root) {
  throw new Error("HTML içinde #root elemanı bulunamadı");
}

createRoot(root).render(
  <AppErrorBoundary>
    <React.StrictMode>
      {arena ? <ArenaView /> : <AstrogameWAR />}
    </React.StrictMode>
  </AppErrorBoundary>
);
