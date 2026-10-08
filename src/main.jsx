import React from "react";
import { createRoot } from "react-dom/client";
import AstrogameWAR from "./AstrogameWAR.jsx";
import ArenaView from "./arena/ArenaView.jsx";
import { onBack } from "./nativeBack.js";

onBack(() => {
  // Katman yoksa WebView varsayilani: cikis yok, sayfada kal.
});

const arena = new URLSearchParams(window.location.search).get("mode") === "arena";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {arena ? <ArenaView /> : <AstrogameWAR />}
  </React.StrictMode>
);
