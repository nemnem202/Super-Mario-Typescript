// vite.config.ts
import { defineConfig } from "vite";
import compression from "vite-plugin-compression";

export default defineConfig({
  build: {
    target: "es2020",
    assetsInlineLimit: 4096,
    minify: "esbuild",
  },

  plugins: [compression()],
});
