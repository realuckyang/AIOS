// 前端在 ui/,产物出到 ui/dist —— server/index.js 就去那儿找静态文件。
//
// dev 时把 /api 代到 9521:这样开发和上线是同一套前端代码,
// 不用在代码里写「开发时用哪个地址」那种分支。
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'ui',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 9520,
    proxy: { '/api': 'http://127.0.0.1:9522' },
  },
});
