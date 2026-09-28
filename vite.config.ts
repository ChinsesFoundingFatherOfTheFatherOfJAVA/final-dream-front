import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    // 同源代理（AI助手WS接入说明 §2.1）：网关不支持 WS upgrade，故 WS 直连后端 8082，其余 HTTP 走网关 8080。
    // 浏览器只访问前端自己的源，由这里转发，避免跨域与生产 HTTPS 下的混合内容阻断。
    proxy: {
      // WS 必须写在前面：同一前缀下先匹配更具体的规则
      '/api/act/ws': {
        target: 'ws://localhost:8082',
        ws: true, // 关键：显式开启才会转发 Upgrade 握手
        changeOrigin: true,
      },
      // 用户与权限中心可单独指向 StaffManagement；未配置时仍与其余请求一起走网关
      '/api/sm': {
        target: process.env.VITE_SM_PROXY_TARGET || process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
      // 其余 HTTP 仍走网关
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
