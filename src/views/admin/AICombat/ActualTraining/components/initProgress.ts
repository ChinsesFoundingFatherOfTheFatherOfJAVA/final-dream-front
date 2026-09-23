/**
 * 发布初始化进度的跨实例缓存（FP-41）
 *
 * 为什么需要独立模块：ThemeDetail 在 refreshAll 时会把 loading 置真，导致
 * DetailHeader 被卸载重建（v-if="loading"）。而 <script setup> 内的代码属于
 * setup 作用域、随实例创建而重跑，因此进度状态放在组件里会随重挂载丢失，
 * 表现为「轮询刚跑完、绿色横幅却不出现」。
 * 这里放在真正的模块作用域，按 themeId 共享，重挂载后仍能正确呈现。
 */
import { reactive } from 'vue'
import type { AssistantScriptProgressResp } from '@/types/assistant'

/** themeId → 最近一次 script-progress 结果（响应式，驱动横幅实时更新） */
export const initProgressCache = reactive(new Map<string, AssistantScriptProgressResp>())

/** 已提示过「初始化完成」的 themeId，避免重复弹提示 */
export const initNotified = new Set<string>()

export function readInitProgress(themeId: string): AssistantScriptProgressResp | null {
  return initProgressCache.get(themeId) ?? null
}

export function writeInitProgress(themeId: string, resp: AssistantScriptProgressResp): void {
  initProgressCache.set(themeId, resp)
}

export function clearInitProgress(themeId: string): void {
  initProgressCache.delete(themeId)
  initNotified.delete(themeId)
}