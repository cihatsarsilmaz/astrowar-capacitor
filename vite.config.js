import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Build sirasinda src/AstrogameWAR.jsx icindeki "BURAYA_..." yer tutucularini
// .env degerleriyle degistirir. .env bos ise hicbir sey degismez.
const PLACEHOLDERS = {
  BURAYA_API_KEY: "VITE_FIREBASE_API_KEY",
  "BURAYA_PROJE.firebaseapp.com": "VITE_FIREBASE_AUTH_DOMAIN",
  BURAYA_PROJECT_ID: "VITE_FIREBASE_PROJECT_ID",
  "BURAYA_PROJE.appspot.com": "VITE_FIREBASE_STORAGE_BUCKET",
  BURAYA_SENDER_ID: "VITE_FIREBASE_SENDER_ID",
  BURAYA_APP_ID: "VITE_FIREBASE_APP_ID",
  BURAYA_SENIN_ADMIN_UID_IN: "VITE_ADMIN_UID",
  BURAYA_RECAPTCHA_ENTERPRISE_SITE_KEY: "VITE_RECAPTCHA_SITE_KEY",
};

function envPlaceholders(env) {
  return {
    name: "env-placeholders",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("AstrogameWAR.jsx")) return null;
      let out = code;
      for (const [placeholder, key] of Object.entries(PLACEHOLDERS)) {
        const val = env[key];
        if (val) out = out.split(`"${placeholder}"`).join(JSON.stringify(val));
      }
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), envPlaceholders(env)],
    // GitHub Pages icin /repo-name/, APK icin ./
    base: process.env.BASE_URL || "./",
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.js"],
      reporters: process.env.CI ? ["dot"] : ["default"],
    },
  };
});
