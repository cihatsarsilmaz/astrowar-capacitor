import React from "react";
import { createRoot } from "react-dom/client";
import AstrogameWAR from "./AstrogameWAR.jsx";
import { onBack } from "./nativeBack.js";

onBack(() => {
  // Katman yoksa WebView varsayilani: cikis yok, sayfada kal.
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AstrogameWAR />
  </React.StrictMode>
);
