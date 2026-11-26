import { defineConfig } from "vite";

// Root index.html, output to dist. Pip owns index.html and src/**; the console route is lazy-loaded
// with a dynamic import() so it becomes its own chunk (initial JS budget 70 KB gzipped).
// Secrets must never use VITE_ prefixes: Vite inlines those into the bundle (netlify-env-secrets).
export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
  },
  server: { port: 5173 },
});
