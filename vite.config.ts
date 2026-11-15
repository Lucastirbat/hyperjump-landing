import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In dev, /api is proxied to the platform so the past jumpers cards load real data.
// Point it elsewhere with HJ_API=http://localhost:8787 npm run dev
const apiTarget = process.env.HJ_API ?? "https://hyperjump.dev";

// Text pages are their own HTML files (privacy.html, …). Cloudflare serves /privacy from privacy.html;
// this does the same in dev.
const PAGES = ["privacy", "incorporation-guide"];
const pageRoutes: Plugin = {
  name: "page-routes",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split(/[?#]/)[0] ?? "";
      const page = PAGES.find((p) => path === `/${p}`);
      if (page) req.url = `/${page}.html` + req.url!.slice(path.length);
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), pageRoutes],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5180, proxy: { "/api": { target: apiTarget, changeOrigin: true } } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries([["main", "index"], ...PAGES.map((p) => [p, p])].map(([k, f]) => [k, fileURLToPath(new URL(`./${f}.html`, import.meta.url))])),
    },
  },
});
