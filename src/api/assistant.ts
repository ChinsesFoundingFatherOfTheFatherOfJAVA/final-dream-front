/**
 * AI 设计助手 HTTP 接口封装
 * 严格对齐 03-接口文档.md §2：网关 /api/act/** → AtualCombatTraining(8082)
 *
 * 后端 AI 助手模块已实现（AssistantController / WsChatHandler），故默认走真实接口。
 * 离线开发（后端未启动）时把 ASSISTANT_USE_MOCK 置为 true，即切到本地 Mock
 * （含假 WS 帧序列，见 Assistant/mock/assistantMock.ts），组件与 store 无需改动。
 */
import request from './request'
import {
  mockAsr,
  mockCreateSession,
  mockGetMessages,
  mockGetArtifact,
  mockPublish,
  mockResetProgress,
  mockScriptProgress,
  mockUploadFile,
  MOCK_DELAY_MS
} from '@/views/admin/AICombat/ActualTraining/Assistant/mock/assistantMock'
import type {
  AssistantArtifactSnapshot,
  AssistantAsrResp,
  AssistantFileResp,
  AssistantMaterialListResp,
  AssistantMessagesResp,
  AssistantPublishResp,
  AssistantScriptProgressResp,
  AssistantSessionResp
} from '@/types/assistant'

export const ASSISTANT_USE_MOCK = false

/** Mock 统一包 Promise，模拟网络延迟 */
function mockInvoke<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, MOCK_DELAY_MS)
  })
}

/**
 * §2.1 建立/查找会话
 * themeId 非空且已有会话 → 复用（isNew=false）；themeId 可空 = 新建。
 */
export function createAssistantSession(themeId?: string): Promise<AssistantSessionResp> {
  if (ASSISTANT_USE_MOCK) return mockInvoke(() => mockCreateSession(themeId))
  return request.post('/act/assistant/sessions', themeId ? { themeId } : {})
}

/** §2.2 历史消息（cursor 分页，照线上语义） */
export function getAssistantMessages(
  sessionId: string,
  limit = 1000,
  cursor = ''
): Promise<AssistantMessagesResp> {
  if (ASSISTANT_USE_MOCK) return mockInvoke(() => mockGetMessages())
  return request.get(`/act/assistant/sessions/${sessionId}/messages`, { params: { limit, cursor } })
}

/** §2.2b 当前 artifact（右面板兜底刷新；无产物返回 null） */
export function getAssistantArtifact(sessionId: string): Promise<AssistantArtifactSnapshot | null> {
  if (ASSISTANT_USE_MOCK) return mockInvoke(() => mockGetArtifact())
  return request.get(`/act/assistant/sessions/${sessionId}/artifact`)
}

/**
 * §2.3 文件上传（multipart，字段名 file）
 *
 * 必须带当前会话 ID（AI助手WS接入说明 §4a）：后端据此异步解析材料并推
 * biz-common-parse-file 两态事件（status 0 解析中 → 1 完成），材料同时进入 artifact.materials；
 * 不带 sessionId 只落盘返回 fileId（旧行为，仅返回文件不触发解析）。
 */
export function uploadAssistantFile(file: File, sessionId: string): Promise<AssistantFileResp> {
  if (ASSISTANT_USE_MOCK) {
    return mockInvoke(() => mockUploadFile(file.name, fileTypeOf(file.name), file.size, sessionId))
  }
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/act/assistant/files', formData, {
    params: { sessionId },
    // ⚠️ 不要手写 Content-Type：multipart 的 Content-Type 必须由浏览器自动补 boundary
    //    （multipart/form-data; boundary=----WebKitFormBoundary...）。写死成裸的 'multipart/form-data'
    //    会让后端收到无法解析的 body，浏览器侧只报 "Network Error"（实测踩到）。
    timeout: 120000
  })
}

/** §2.4 语音识别（multipart，字段名 audio，16kHz WAV） */
export function recognizeAssistantSpeech(audio: Blob): Promise<AssistantAsrResp> {
  if (ASSISTANT_USE_MOCK) return mockInvoke(() => ({ text: mockAsr() }))
  const formData = new FormData()
  formData.append('audio', audio, 'speech.wav')
  return request.post('/act/assistant/asr', formData, {
    // 同上传：不要手写 Content-Type，multipart 的 boundary 必须交给浏览器补（见 uploadAssistantFile 注释）
    timeout: 60000
  })
}

/** §2.6 发布主题（校验有 confirmed 内容且状态允许） */
export function publishAssistantTheme(id: string): Promise<AssistantPublishResp> {
  if (ASSISTANT_USE_MOCK) {
    mockResetProgress()
    return mockInvoke(() => mockPublish())
  }
  return request.post(`/act/admin/theme/${id}/publish`)
}

/** §2.6 初始化进度（status=1 时前端 5s 轮询，变为 3 停止） */
export function getScriptProgress(id: string): Promise<AssistantScriptProgressResp> {
  if (ASSISTANT_USE_MOCK) return mockInvoke(() => mockScriptProgress())
  return request.get(`/act/admin/theme/${id}/script-progress`)
}

/** §2.6 仅失败项重试 */
export function retryScriptInit(id: string): Promise<AssistantPublishResp> {
  if (ASSISTANT_USE_MOCK) {
    mockResetProgress()
    return mockInvoke(() => mockPublish())
  }
  return request.post(`/act/admin/theme/${id}/publish/retry`)
}

/**
 * §2.6 会话材料解析结果（"文件解析完成"卡片展开时按需拉取）。
 * 返回每条材料的提取文本前 2000 字（preview）与全文长度（extractLength）；
 * mock 模式没有真实解析产物，直接返回空列表（展开区提示"没有可展示的解析内容"）。
 */
export function getSessionMaterials(sessionId: string): Promise<AssistantMaterialListResp> {
  if (ASSISTANT_USE_MOCK) return Promise.resolve({ materials: [] })
  return request.get(`/act/assistant/sessions/${sessionId}/materials`)
}

/** 从文件名取扩展名（小写，无扩展名返回空串） */
export function fileTypeOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : ''
}

/** 前端前置拦截：仅允许 ppt/pptx/doc/docx/pdf/txt/md（§1 枚举） */
export const ASSISTANT_ALLOWED_EXT = ['ppt', 'pptx', 'doc', 'docx', 'pdf', 'txt', 'md']

export function isAllowedAssistantFile(name: string): boolean {
  return ASSISTANT_ALLOWED_EXT.includes(fileTypeOf(name))
}