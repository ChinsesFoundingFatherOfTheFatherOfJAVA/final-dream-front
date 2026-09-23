import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * 单元测试配置：与被 vitest 自动忽略的 vite.config.ts 保持同一套插件与别名，
 * 差别只在测试环境用 jsdom（toast / 弹窗组件要操作 DOM）。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
    /**
     * Windows 下默认的 forks 池起 worker 会超时（实测 5 个测试文件全部 "Timeout waiting for worker"），
     * 换 threads 池；jsdom 环境较重，跨文件复用 worker（isolate:false + 串行）可省掉约 45s 重复启动。
     */
    pool: 'threads',
    fileParallelism: false,
    isolate: false
  }
})
