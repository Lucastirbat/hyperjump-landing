import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev, /api is proxied to the platform so the past jumpers cards load real data.
// Point it elsewhere with HJ_API=http://localhost:8787 npm run dev
const apiTarget = process.env.HJ_API ?? "https://hyperjump.dev";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5180, proxy: { "/api": { target: apiTarget, changeOrigin: true } } },
  build: { outDir: "dist", emptyOutDir: true },
});
