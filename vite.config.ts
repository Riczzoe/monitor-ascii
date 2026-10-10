import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": import.meta.dirname + "/src" } },
  server: { host: "0.0.0.0", proxy: {
    "/api": { target: process.env.MONITOR_HUB || "http://127.0.0.1:9911", changeOrigin: true, ws: true },
  } },
});
