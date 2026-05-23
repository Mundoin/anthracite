import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// Tauri v2 + Vite config.
// Fixed port + strict so Tauri can talk to dev server reliably on Windows.
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows"
        ? "chrome105"
        : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      // V1BE-A — keep Babylon in its own chunk so the main shell bundle
      // does not carry it. The HardwareKitPreview lazy import is the only
      // module that pulls Babylon, so this chunk is only fetched on the
      // ?preview=hardware-kit route.
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes("node_modules/@babylonjs/")) {
            return "babylon";
          }
          return undefined;
        },
      },
    },
  },
}));
