import request from '@/api/request'

/**
 * 案例形象（L0 上传覆盖）的前端接口层（2026-11-05）。
 *
 * 为什么放在 tabs 目录而不是 `src/api/actStudent.ts`：本任务的范围限定在
 * `src/views/admin/AICombat/ActualTraining/**`，不改共享 api 模块；请求仍然走统一的
 * `@/api/request` 实例（拦截器、401/403、gateway `/api` 前缀口径一致），只是封装就近。
 * 若后续要收敛到 `src/api/actTheme.ts`，把本文件三个函数原样搬过去即可。
 */

/** 设置案例形象响应（对齐后端 CaseAvatarResp） */
export interface CaseAvatarResp {
  themeId: string
  /** 实际命中的场景名（后端回填，不是入参回显） */
  scenarioName: string | null
  /** 实际命中的案例标题 */
  scriptName: string
  avatarUrl: string | null
  artifactVersionNo: number | null
  /** 本次同步更新的 act_case_script 行数；0 不是失败（案例还没确认落库） */
  columnUpdated: number | null
}

/**
 * 设置/清除某案例的陪练者形象（后端 API-AD13，PUT 幂等）。
 *
 * `avatarUrl` 传 null = 清除覆盖，发布时回落 L1~L4 自动定图。
 * 定位键用 scriptName（持久键）；scenarioName 仅在同主题同名案例消歧时传。
 */
export function saveCaseAvatar(
  themeId: string,
  body: {
    scriptName: string | null
    scenarioName: string | null
    avatarUrl: string | null
  },
) {
  return request.put<unknown, CaseAvatarResp>(`/act/admin/theme/${themeId}/case-avatar`, body)
}

/** 上传本地图片 → 返回可直接落库的 URL（去掉 `/api` 前缀，与 artifact 口径一致） */
export interface UploadedImage {
  /** 形如 `/api/exam/files/2026/11/xxx.png`（网关白名单放行，img 标签可直接拉） */
  fileUrl: string
}

/**
 * 图片上传（本地上传走后端已有的媒体上传接口）。
 *
 * 为什么用 ExamService 的 `/exam/file/upload`（跨模块）：
 * ACT 自己的 `/act/assistant/files` 白名单只收 ppt/doc/pdf/txt（材料解析用），公开出口里
 * **没有"图片 → URL"的接口**；而 exam 的这个接口正是为富文本图片准备的，网关已白名单
 * `/api/exam/files/**`（img 标签带不了 Authorization 头），实测 `200 image/png` 可直接显示。
 * 待 ACT 补齐专用头像上传接口后，这里换成那个端点即可（函数签名不变）。
 */
export function uploadAvatarImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, UploadedImage>('/exam/file/upload', form, {
    // 不要手写 Content-Type：multipart 的 boundary 必须由浏览器补（见 api/assistant.ts 同源注释）
    timeout: 120_000,
  })
}
