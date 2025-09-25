import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    fs: {
      // 允许访问项目根目录外的文件
      allow: ['..'],
    },
  },
  // 配置静态资源别名，使前端可以访问 outputs 目录
  resolve: {
    alias: {
      '@outputs': path.resolve(__dirname, '../outputs'),
    },
  },
})
