import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
  server: {
    host: true,
    port: 5173,
    // dev 模式允许任意 Host (ngrok / 局域网 IP / 自定义域名等都能直连),
    // 生产环境的鉴权由后端 9502 的 cookie/token 中间件兜底.
    allowedHosts: true,
    proxy: {
      "/ws": { target: "ws://localhost:9502", ws: true },
      "/api": { target: "http://localhost:9502" },
      "/apps": { target: "http://localhost:9502" }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
