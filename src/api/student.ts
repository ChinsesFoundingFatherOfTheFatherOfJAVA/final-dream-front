import request from './request'
import type {
  ConsistencyResp,
  PracticeRecord,
  ReportResp,
  SendMessageResp,
  SessionDetailResp,
  SessionMessage,
  StartSessionResp,
  StudentProjectDetail,
  StudentProjectListResp
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

/** FP-05~09 项目详情（学员视角） */
export function getStudentProjectDetail(projectId: string) {
  return request.get<unknown, StudentProjectDetail>(`/student/projects/${projectId}`)
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

// ===== 3. 练习记录模块 =====

/** FP-09 项目练习记录列表 */
export function getPracticeRecords(projectId: string) {
  return request.get<unknown, PracticeRecord[]>(`/student/projects/${projectId}/records`)
}

// ===== 4. 报告模块 =====

/** FP-13/21/22 查询训练报告（含轮询） */
export function getReport(sessionId: string) {
  return request.get<unknown, ReportResp>(`/student/reports/session/${sessionId}`)
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
