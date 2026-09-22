import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages için /repo-name/, APK için ./
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
});
