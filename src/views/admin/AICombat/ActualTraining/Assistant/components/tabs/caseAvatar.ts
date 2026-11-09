import { resolveAssetUrl } from '@/api/request'

/**
 * artifact 案例上的形象字段（后端 t5 已写入 `cases[].actorAvatarUrl`）。
 *
 * 为什么在这里声明而不是改 `src/types/assistant.ts`：本任务范围限定在
 * `views/admin/AICombat/ActualTraining/**`，共享类型模块不动；字段形状与后端补丁路径
 * `/scenarios/{si}/cases/{ci}/actorAvatarUrl` 一致，后续并入共享类型时删掉这条即可。
 */
export type CaseAvatarField = { actorAvatarUrl?: string | null }

/**
 * 案例形象（L0 上传覆盖）的前端口径（2026-11-05，配 t5 后端接口）。
 *
 * 为什么需要这层纯函数：三处都要用同一套规则，写在组件里会各写一遍并逐渐分叉——
 * 1. 卡片缩略图：artifact 里存的是「不带 /api 前缀」的相对路径（`/avatar/x.png`），
 *    展示时才能被 `resolveAssetUrl` 补成 `/api/avatar/x.png`；直接存 `/api/...` 会变成
 *    `/api/api/...`（实测过的坑）。
 * 2. 保存入参：后端 `PUT /api/act/admin/theme/{themeId}/case-avatar` 只认 `avatarUrl` 字符串，
 *    所以本地文件必须先上传成 URL 再存；blob 预览地址不能落库（换台机器就失效）。
 * 3. 清除覆盖：空串/null = 回落自动定图（L1~L4），不能存 `''` 以外的占位值。
 */

/** 是否是可直接落库、可由 resolveAssetUrl 还原的路径（排除浏览器本地 blob 预览） */
const BLOB_LIKE = /^(blob:|data:)/i

/**
 * 归一化为「artifact 存储口径」。
 *
 * - 空值 → ''（调用方保存时转 null = 清除覆盖）
 * - blob:/data: → ''（本地预览不能落库；调用方应先上传成服务端 URL）
 * - `/api/exam/files/...` 这类网关前缀 → 去掉 `/api`，交给 resolveAssetUrl 统一补
 * - 外链 http(s) → 原样保留（AI 生图若返回外链也可直接显示）
 */
export function toStoredAvatarUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw || BLOB_LIKE.test(raw)) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return raw.replace(/^\/api(?=\/)/i, '')
}

/** 卡片缩略图可用地址（空值返回 ''，调用方据此不渲染 img） */
export function avatarPreviewUrl(stored: string | null | undefined): string {
  return resolveAssetUrl(toStoredAvatarUrl(stored))
}

export interface CaseAvatarInput {
  scriptName?: string | null
  scenarioName?: string | null
  avatarUrl?: string | null
}

export interface CaseAvatarBody {
  scriptName: string | null
  scenarioName: string | null
  /** null = 清除覆盖（发布时回落自动定图） */
  avatarUrl: string | null
}

/**
 * 保存请求体：定位键用 scriptName（持久键），scenarioName 仅在同名多例时消歧。
 * 空串一律转 null——后端把空串当"清除"，前端不要发模糊值。
 */
export function caseAvatarBody(input: CaseAvatarInput): CaseAvatarBody {
  const scriptName = String(input.scriptName ?? '').trim()
  const scenarioName = String(input.scenarioName ?? '').trim()
  const avatarUrl = toStoredAvatarUrl(input.avatarUrl)
  return {
    scriptName: scriptName || null,
    scenarioName: scenarioName || null,
    avatarUrl: avatarUrl || null,
  }
}
