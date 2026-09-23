import request from './request'
import type {
  ConsistencyResp,
  PracticeRecord,
  ReportResp,
  SendMessageResp,
  SendVoiceMessageResp,
  SessionDetailResp,
  SessionMessage,
  StartSessionResp,
  StudentProjectDetail,
  StudentProjectListResp,
  TtsResp
} from '@/types/student'

// ===== 1. 学员项目模块 =====

/** FP-01~04 学员端项目列表 */
export function getStudentProjects(params: {
  page?: number
  pageSize?: number
  status?: 'not_started' | 'ongoing' | 'expired' | 'finished'
  projectType?: number
  keyword?: string
}) {
  return request.get<unknown, StudentProjectListResp>('/student/projects', { params })
}

/** FP-05~09 项目详情（学员视角）；训练页右栏取说明时失败不打扰学员，可静默 */
export function getStudentProjectDetail(projectId: string, opts?: { silent?: boolean }) {
  return request.get<unknown, StudentProjectDetail>(`/student/projects/${projectId}`, {
    silent: opts?.silent
  })
}

// ===== 2. 练习会话模块 =====

/** FP-06 开始练习（创建会话） */
export function startSession(projectId: string) {
  return request.post<unknown, StartSessionResp>(`/student/projects/${projectId}/sessions`, {})
}

/** FP-19 获取会话详情（刷新恢复） */
export function getSession(sessionId: string) {
  return request.get<unknown, SessionDetailResp>(`/student/sessions/${sessionId}`)
}

/** FP-12/20 发送消息（流转判定，后端调 Dify，需较长超时） */
export function sendMessage(sessionId: string, content: string) {
  return request.post<unknown, SendMessageResp>(
    `/student/sessions/${sessionId}/messages`,
    { content },
    { timeout: 60000 }
  )
}

/** FP-13/19 退出训练（会话置未完成） */
export function exitSession(sessionId: string) {
  return request.post<unknown, null>(`/student/sessions/${sessionId}/exit`)
}

// ===== 2.5 语音模块（v1.1 新增，FP-24/28，接口文档第 5 节） =====

/**
 * FP-24/28 学员语音消息（接口 5.2）：录音 WAV 上传 → ASR 转文字 → 流转判定。
 *
 * ⚠️ 不要手写 Content-Type：multipart 的 boundary 必须由浏览器自动补
 *    （见 api/assistant.ts uploadAssistantFile 同源注释）；写死裸 'multipart/form-data'
 *    会让后端收到无法解析的 body，请求直接失败。
 */
export function sendVoiceMessage(sessionId: string, audio: Blob) {
  const fd = new FormData()
  fd.append('audio', audio, 'record.wav')
  // 超时 = ASR（60s 录音实测 2~13s）+ 文字消息同样的 Dify 判定预算，故高于 sendMessage 的 60s
  return request.post<unknown, SendVoiceMessageResp>(
    `/student/sessions/${sessionId}/voice-messages`,
    fd,
    { timeout: 120000 }
  )
}

/** FP-24/28 陪练者消息 TTS 合成（接口 5.1），命中缓存 <200ms。auto 播报失败不打扰学员，故可静默 */
export function getTts(sessionId: string, messageId: string, opts?: { silent?: boolean }) {
  return request.post<unknown, TtsResp>(
    `/student/sessions/${sessionId}/tts`,
    { messageId },
    { timeout: 15000, silent: opts?.silent }
  )
}

// ===== 3. 练习记录模块 =====

/** FP-09 项目练习记录列表 */
export function getPracticeRecords(projectId: string) {
  return request.get<unknown, PracticeRecord[]>(`/student/projects/${projectId}/records`)
}

// ===== 4. 报告模块 =====

/**
 * FP-13/21/22 查询训练报告（含轮询）。
 * 轮询期间单次失败由页面的"连续失败 N 次"逻辑兜底，不弹全局提示，故默认静默。
 */
export function getReport(sessionId: string, opts?: { silent?: boolean }) {
  return request.get<unknown, ReportResp>(`/student/reports/session/${sessionId}`, {
    silent: opts?.silent ?? true
  })
}

/** FP-16 话术一致性详情（逐轮要点命中明细） */
export function getConsistency(reportId: string) {
  return request.get<unknown, ConsistencyResp>(`/student/reports/${reportId}/consistency`)
}

/** FP-17 对话记录（消息列表，后端已过滤 withdrawn） */
export function getReportMessages(sessionId: string) {
  return request.get<unknown, SessionMessage[]>(`/student/reports/session/${sessionId}/messages`)
}

/** FP-17 消息点赞（幂等） */
export function likeMessage(messageId: string) {
  return request.post<unknown, { likeCount: number }>(`/student/messages/${messageId}/like`)
}

/** FP-21 报告重新生成 */
export function regenerateReport(reportId: string) {
  return request.post<unknown, null>(`/student/reports/${reportId}/regenerate`)
}
