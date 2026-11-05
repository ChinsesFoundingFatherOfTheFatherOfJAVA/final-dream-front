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
     * 换 threads 池；jsdom 环境较重，跨文件复用 worker（串行）可省掉约 45s 重复启动。
     */
    pool: 'threads',
    fileParallelism: false,
    /**
     * 必须保持 isolate:true（默认值）。
     *
     * 曾经的配置是 isolate:false + 复用模块注册表，省下约 45s；但它让
     * `src/utils/toast.spec.ts` 变成**顺序依赖的 flake**：该 spec 用
     * `vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))` 打桩，而在共享注册表里，
     * 任意一个先执行、import 了真实 element-plus 的 spec（组件挂载类）会把真模块写进 registry，
     * 之后 toast 的 mock 就不再生效 → 4 个用例全红。
     *
     * 实测（同一份代码、同一命令）：`isolate:false` 时 2 轮里 1 轮失败；`isolate:true`
     * （本配置 + `--isolate`）连跑 3 轮全绿。**确定性比 45 秒重要**：一个时红时绿的闸门
     * 等于没有闸门，还会让人误判成业务回归。
     *
     * 注意：组件 spec 本身已经避免了 `StudentPanel.spec.ts` 那种"挂载整个组件"的写法
     * （见该文件头注释），但 toeast 这类 mock 与文件执行顺序耦合的问题，只有隔离才能根治。
     */
    isolate: true
  }
})
