import request, { downloadBlob } from './request'

/**
 * 测练中心·题库管理 API（03 接口文档：经网关 /api/exam）。
 * FP-03 分类 + FP-04 题库（后续 FP 随实施扩展）。
 */

// ---- 分类 Catalog（03 §1）----

export interface CatalogAdminUser {
  userId: string
  userName: string
  fullname: string
  deptName: string
}

export interface CatalogTreeNode {
  id: string
  name: string
  parentId: string
  routingPath: string
  orderIndex?: number
  disabled: number
  libQty?: number
  childCatalogQty?: number
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: CatalogAdminUser[] | null
  children: CatalogTreeNode[] | null
}

export interface CatalogDetail {
  id: string
  name: string
  parentName: string
  libQty: number
  createTime: string
  createFullname: string
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: CatalogAdminUser[]
}

export function getCatalogTree() {
  return request.get<unknown, CatalogTreeNode>('/exam/catalog/tree')
}

export function getCatalogDetail(id: string) {
  return request.get<unknown, CatalogDetail>(`/exam/catalog/${id}`)
}

export function createCatalogBatch(data: {
  parentId: string
  catalogText: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.post<unknown, { createdCount: number; errors: { line: number; reason: string }[] }>(
    '/exam/catalog',
    data
  )
}

export function updateCatalog(id: string, data: {
  name: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.put<unknown, null>(`/exam/catalog/${id}`, data)
}

export function moveCatalog(id: string, targetParentId: string) {
  return request.put<unknown, null>(`/exam/catalog/${id}/move`, { targetParentId })
}

export function disableCatalog(id: string, disabled: number) {
  return request.put<unknown, null>(`/exam/catalog/${id}/disable`, { disabled })
}

export function deleteCatalog(id: string) {
  return request.delete<unknown, null>(`/exam/catalog/${id}`)
}

// ---- 题库 Lib（03 §2）----

export interface LibPermissions {
  canDelete: boolean
  canEdit: boolean
}

export interface LibItem {
  id: string
  name: string
  catalogId: string
  catalogName: string
  secrecy: number
  defaultLib: number
  disabled: number
  pointQty: number
  totalQuesQty: number
  createUserId: string
  createFullname: string
  createUserName?: string
  updateFullname?: string
  updateTime: string
  shared: number
  permissions: LibPermissions
}

export interface LibDetail extends LibItem {
  catDisabled: number
}

export interface LibListQuery {
  queryType: number
  keyword: string
  catalogId: string
  routingPath: string
  creatorUserId: string
  disabled: number
}

export function getLibList(
  current: number,
  limit: number,
  orderby: string,
  direction: string,
  data: LibListQuery
) {
  return request.post<unknown, { records: LibItem[]; total: number }>(
    `/exam/lib/list?current=${current}&limit=${limit}&orderby=${orderby}&direction=${direction}`,
    data
  )
}

export function getLibDetail(id: string) {
  return request.get<unknown, LibDetail>(`/exam/lib/${id}`)
}

export function createLib(data: { name: string; catalogId: string; secrecy: number }) {
  return request.post<unknown, { id: string }>('/exam/lib', data)
}

export function updateLib(id: string, data: { name: string; catalogId: string; secrecy: number }) {
  return request.put<unknown, null>(`/exam/lib/${id}`, data)
}

export function disableLib(id: string, disabled: number) {
  return request.put<unknown, null>(`/exam/lib/${id}/disable`, { disabled })
}

export function deleteLib(id: string) {
  return request.delete<unknown, null>(`/exam/lib/${id}`)
}

export function getLibShare(id: string) {
  return request.get<unknown, {
    libId: string
    shares: { targetType: number; targetId: string; targetName: string }[]
  }>(`/exam/lib/${id}/share`)
}

export function saveLibShare(id: string, shares: { targetType: number; targetId: string }[]) {
  return request.put<unknown, null>(`/exam/lib/${id}/share`, { shares })
}

export function transferLib(id: string, toUserId: string) {
  return request.put<unknown, null>(`/exam/lib/${id}/transfer`, { toUserId })
}

export function changeLibCatalog(id: string, catalogId: string) {
  return request.put<unknown, null>(`/exam/lib/${id}/catalog`, { catalogId })
}

export function batchLib(action: 'delete' | 'transfer' | 'changeCatalog',
                         libIds: string[], toUserId?: string, catalogId?: string) {
  return request.post<unknown, null>('/exam/lib/batch', {
    action,
    libIds,
    toUserId: toUserId || '',
    catalogId: catalogId || ''
  })
}

// ---- 试题 Ques（03 §3）----

export interface QuesItem {
  id: string
  summary: string
  type: number
  levelType: number
  disabled: number
  duplicate: number
  isMultiMediaType: number
  mainPointName: string
  pointNames: string
  createFullname: string
  createUserName: string
  createTime: string
  updateFullname: string
  updateTime: string
  subQuesQty: number
}

export interface QuesListQuery {
  libId: string
  keyword: string
  type: number
  levelType: number
  disabled: number
  pointId: string
  isDuplicate: number
  /** 试卷管理页跳转定位单题用（题库 07 §9 增量） */
  quesId?: string
}

export function getQuesList(
  current: number,
  limit: number,
  orderby: string,
  direction: string,
  data: QuesListQuery
) {
  return request.post<unknown, { records: QuesItem[]; total: number }>(
    `/exam/ques/list?current=${current}&limit=${limit}&orderby=${orderby}&direction=${direction}`,
    data
  )
}

/** 试题详情（编辑页/查看抽屉共用）。媒体字段后端回的是 JSON 节点。 */
export interface QuesDetail {
  id: string
  libId: string
  libName: string
  parentId: string | null
  type: number
  levelType: number
  content: string
  summary: string
  disabled: number
  duplicate: number
  stemPlay: unknown
  explainText: string
  explainPlay: unknown
  questionItems: {
    id: string
    itemContent: string
    answer: number
    orderIndex: number
    itemPlay: unknown
  }[]
  judgeAnswer: number | null
  judgeCorrectOptionContent: string | null
  judgeWrongOptionContent: string | null
  answerContent: string | null
  answerPlay: unknown
  answerKeywords: { keyword: string; scoreRatio: number }[]
  noOrderMark: number
  /** 填空题按空得分开关：1=开启，每空可自定义分值 */
  blankScoreMark: number
  points: { pointId: string; name: string; orderIndex: number }[]
  /** 组合题子题（仅 type=5 有值）。 */
  subQuestions: QuesDetail[]
}

/** 选项草稿（主子题共用）。 */
export interface QuesOptionDraft {
  itemContent: string
  answer: number
  orderIndex: number
}

export interface QuesKeywordDraft {
  keyword: string
  scoreRatio: number
}

/** 题干/选项/答案这一层（与题型无关的公共部分），主子题共用同一个表单组件。 */
export interface QuesBodyDraft {
  content: string
  options: QuesOptionDraft[]
  judgeCorrect: string
  judgeWrong: string
  judgeAnswer: number
  answerContent: string
  keywords: QuesKeywordDraft[]
  /** 填空题专用：1 = 多个空之间的答案不分先后（与库字段 no_order_mark 同义） */
  noOrderMark?: number
  /** 填空题专用：1 = 开启按空得分，每空可自定义分值（与库字段 blank_score_mark 同义） */
  blankScoreMark?: number
  /** 填空题每空分值，下标从 0 开始对应第 1、2… 个空；仅开启按空得分时有效 */
  blankScoreValues?: number[]
  explainText: string
}

/** 组合题子题请求体（无 libId/points/subQuestions）。 */
export interface QuesSubReq extends Omit<QuesSaveReq, 'libId' | 'points' | 'subQuestions'> {}

/** 新建/编辑请求体（无 id/审计字段）。 */
export interface QuesSaveReq {
  libId: string
  type: number
  levelType: number
  content: string
  summary: string
  stemPlay?: string | null
  explainText?: string
  explainPlay?: string | null
  questionItems?: { id?: string; itemContent: string; answer: number; orderIndex: number; itemPlay?: string | null }[]
  judgeAnswer?: number | null
  judgeCorrectOptionContent?: string | null
  judgeWrongOptionContent?: string | null
  answerContent?: string | null
  answerPlay?: string | null
  answerKeywords?: { keyword: string; scoreRatio: number }[]
  noOrderMark?: number
  /** 填空题按空得分开关：1=开启（仅填空有效） */
  blankScoreMark?: number
  points?: { pointId: string; name?: string; orderIndex: number }[]
  /** 组合题（type=5）子题。 */
  subQuestions?: QuesSubReq[]
}

export function getQuesDetail(id: string) {
  return request.get<unknown, QuesDetail>(`/exam/ques/${id}`)
}

export function createQues(data: QuesSaveReq) {
  return request.post<unknown, { id: string }>('/exam/ques', data)
}

export function updateQues(id: string, data: QuesSaveReq) {
  return request.put<unknown, null>(`/exam/ques/${id}`, data)
}

export function deleteQues(id: string) {
  return request.delete<unknown, null>(`/exam/ques/${id}`)
}

/** 批量操作（FP-15）：delete / disable / changeLib / setPoint。 */
export function batchQues(
  action: 'delete' | 'disable' | 'changeLib' | 'setPoint',
  quesIds: string[],
  options: { libId?: string; disabled?: number; pointIds?: string[] } = {}
) {
  return request.post<unknown, null>('/exam/ques/batch', {
    action,
    quesIds,
    libId: options.libId || '',
    disabled: options.disabled ?? 0,
    pointIds: options.pointIds || []
  })
}

// ---- 考核点 Point（03 §4）----

export interface PointItem {
  id: string
  name: string
  defaultPoint: number
}

export function getPointList(libId: string) {
  return request.get<unknown, PointItem[]>('/exam/point/list', { params: { libId } })
}

export function savePointBatch(libId: string, points: { id?: string; name: string }[]) {
  return request.post<unknown, null>('/exam/point/batch', { libId, points })
}

// ---- AI 建题（03 §7）----

export interface AiGenCounts {
  single: number
  multi: number
  judge: number
  fill: number
  answer: number
}

export interface AiGenDraft {
  type: number
  levelType: number
  stem: string
  options: string[]
  answer: string
  keywords: { keyword: string; scoreRatio: number }[]
  /** 填空题：1 = 多个空之间的答案不分先后（AI 建题也可带） */
  noOrderMark?: number
  analysis: string
}

export function aiGenerateQues(materialText: string, counts: AiGenCounts) {
  return request.post<unknown, { questions: AiGenDraft[] }>('/exam/ques/ai-generate', {
    materialText,
    counts
  }, {
    // 全局 axios 超时只有 15s，而 AI 出题（尤其题量多时）会超过它——
    // 这就是"前端报超时、Dify 日志却显示调用成功"的原因。这里单独放宽到 180s
    //（后端 Dify 读超时 120s，留出余量）。
    timeout: 180_000
  })
}

export function parseQuesFile(file: File, onProgress?: (percent: number) => void) {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, { text: string }>('/exam/file/parse', form, {
    // 大文件上传 + Tika 解析同样可能超过 15s
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
}
// ---- 媒体上传（03 §8.1）----

export interface ExamFileInfo {
  fileId: string
  /** 形如 /api/exam/files/2026/10/uuid.mp4，浏览器同源可直接访问（网关白名单已放行） */
  fileUrl: string
  fileType: 'image' | 'video' | 'audio' | 'file' | string
}

/** 题干/选项/解析的图片、视频、音频都走这一个接口。 */
export function uploadExamFile(file: File, onProgress?: (percent: number) => void) {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, ExamFileInfo>('/exam/file/upload', form, {
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
}
// ---- 查重（03 §3.8 / §2.10）----

/** 1 = 该题型已执行过查重（对应 exam_lib.duplicate_condition 的位标记）。 */
export interface DuplicateCondition {
  singleStatus: number
  multiStatus: number
  judgeStatus: number
  fillStatus: number
  answerStatus: number
}

/** 对某题库的某题型执行查重：持久化 duplicate 标记，返回被判为重复的题数。 */
export function checkQuesDuplicate(libId: string, type: number) {
  return request.post<unknown, { duplicateCount: number }>('/exam/ques/duplicate/check', { libId, type })
}

/** 进详情页时加载查重条件位，回填「试题查重」下拉状态。 */
export function getDuplicateCondition(libId: string) {
  return request.get<unknown, DuplicateCondition>(`/exam/lib/${libId}/duplicate/condition`)
}
// ---- 导出（03 §6.3）----

/**
 * 导出试题文件流。
 *
 * <p>刻意不用共享的 request 实例：那个拦截器按 `{code,message,data}` 解包，
 * 而导出返回的是二进制流（responseType: blob），code 恒为 undefined 会被误判成失败。
 * 这里单独发一次带 token 的请求拿 blob。
 */
export async function exportQuesFile(
  format: 'excel' | 'word',
  params: Record<string, string | number>
): Promise<Blob> {
  return downloadBlob('/exam/ques/export', { params: { format, ...params } })
}
// ---- 导入（03 §6.1/6.2）----

export interface ImportResult {
  successCount: number
  failCount: number
  errors: { line: number; reason: string }[]
}

/** 6.1 下载导入模板（与导出列结构一致，后端就地生成）。 */
export async function downloadQuesTemplate(format: 'excel' | 'word'): Promise<Blob> {
  return downloadBlob('/exam/ques/import/template', { params: { format } })
}

/** 6.2 导入试题：逐行校验，错误行不影响其它行。 */
export function importQuesFile(file: File, libId: string, onProgress?: (percent: number) => void) {
  const form = new FormData()
  form.append('file', file)
  form.append('libId', libId)
  return request.post<unknown, ImportResult>('/exam/ques/import', form, {
    timeout: 180_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
}
