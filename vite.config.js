import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

/** Chrome content scripts cannot load Vite `import` chunks. Bundle content.js to IIFE. */
function flattenContentScript() {
  return {
    name: "flatten-content-script",
    apply: "build",
    async writeBundle() {
      const esbuild = await import("esbuild");
      const outfile = resolve(__dirname, "dist/content.js");
      await esbuild.build({
        entryPoints: [outfile],
        bundle: true,
        format: "iife",
        outfile,
        allowOverwrite: true,
        platform: "browser",
        logLevel: "silent",
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [{ src: "src/manifest.json", dest: "." }],
    }),
    flattenContentScript(),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        dbviewer: resolve(__dirname, "db-viewer.html"), // ✅ NEW: full-tab page
        background: resolve(__dirname, "src/background.js"),
        content: resolve(__dirname, "src/content.js"),
      },
      output: {
        entryFileNames: "[name].js",
        // optional but nice: keep chunk/assets stable in dist
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
