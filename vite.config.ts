import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In dev, /api is proxied to the platform so the past jumpers cards load real data.
// Point it elsewhere with HJ_API=http://localhost:8787 npm run dev
const apiTarget = process.env.HJ_API ?? "https://hyperjump.dev";

// /privacy is its own page (privacy.html). Cloudflare serves /privacy from privacy.html; this does the same in dev.
const privacyRoute: Plugin = {
  name: "privacy-route",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/privacy" || req.url?.startsWith("/privacy?")) req.url = "/privacy.html" + req.url.slice("/privacy".length);
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), privacyRoute],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5180, proxy: { "/api": { target: apiTarget, changeOrigin: true } } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: { main: fileURLToPath(new URL("./index.html", import.meta.url)), privacy: fileURLToPath(new URL("./privacy.html", import.meta.url)) } },
  },
});
