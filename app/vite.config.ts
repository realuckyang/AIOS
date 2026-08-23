import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 生产构建输出到 app/dist,app/index.js 托管它。
// 开发模式: npm run dev → :5173，/api 代理到 App :9523。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9523',
        changeOrigin: false,
      },
    },
  },
});
