import request, { downloadBlob, saveBlob } from './request'

/**
 * 测练中心·试卷管理 API（07 接口文档：经网关 /api/exam）。
 * 试卷分类与题库分类 100% 同构，只是路径换成 /exam/paper/catalog；试卷本体见 §2。
 */

// ---- 试卷分类 PaperCatalog（07 §1）----

export interface PaperCatalogAdminUser {
  userId: string
  userName: string
  fullname: string
  deptName: string
}

export interface PaperCatalogTreeNode {
  id: string
  name: string
  parentId: string
  routingPath: string
  orderIndex?: number
  disabled: number
  /** 该分类下挂载的试卷数（沿用题库分类树的 libQty 字段名，前端组件才能完全复用） */
  libQty?: number
  childCatalogQty?: number
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: PaperCatalogAdminUser[] | null
  children: PaperCatalogTreeNode[] | null
}

export interface PaperCatalogDetail {
  id: string
  name: string
  parentName: string
  libQty: number
  createTime: string
  createFullname: string
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: PaperCatalogAdminUser[]
}

export function getPaperCatalogTree() {
  return request.get<unknown, PaperCatalogTreeNode>('/exam/paper/catalog/tree')
}

export function getPaperCatalogDetail(id: string) {
  return request.get<unknown, PaperCatalogDetail>(`/exam/paper/catalog/${id}`)
}

export function createPaperCatalogBatch(data: {
  parentId: string
  catalogText: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.post<unknown, { createdCount: number; errors: { line: number; reason: string }[] }>(
    '/exam/paper/catalog',
    data
  )
}

export function updatePaperCatalog(id: string, data: {
  name: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.put<unknown, null>(`/exam/paper/catalog/${id}`, data)
}

export function movePaperCatalog(id: string, targetParentId: string) {
  return request.put<unknown, null>(`/exam/paper/catalog/${id}/move`, { targetParentId })
}

export function disablePaperCatalog(id: string, disabled: number) {
  return request.put<unknown, null>(`/exam/paper/catalog/${id}/disable`, { disabled })
}

export function deletePaperCatalog(id: string) {
  return request.delete<unknown, null>(`/exam/paper/catalog/${id}`)
}

// ---- 试卷 Paper（07 §2）----

export interface PaperPermissions {
  canDelete: boolean
  canEdit: boolean
}

export interface PaperItem {
  id: string
  name: string
  catalogId: string
  catalogName: string
  /** 0 固定出卷 1 随机出卷 */
  buildType: number
  /** 0 已保存 4 已发布（仅两态） */
  status: number
  disabled: number
  secrecy: number
  totalScore: number
  totalQuesQty: number
  usedQty: number
  createUserId: string
  createFullname: string
  createUserName: string
  updateTime: string
  permissions: PaperPermissions
}

export interface PaperDetail extends PaperItem {
  /** 抽题方式 0题型+难度 1题型 2难度 3数量 */
  quesMode: number
}

export interface PaperListQuery {
  queryType: number
  keyword: string
  catalogId: string
  routingPath: string
  creatorUserId: string
  buildType: number
  disabled: number
  status: number
}

export function getPaperList(
  current: number,
  limit: number,
  orderby: string,
  direction: string,
  data: PaperListQuery
) {
  return request.post<unknown, { records: PaperItem[]; total: number }>(
    `/exam/paper/list?current=${current}&limit=${limit}&orderby=${orderby}&direction=${direction}`,
    data
  )
}

export function getPaperDetail(id: string) {
  return request.get<unknown, PaperDetail>(`/exam/paper/${id}`)
}

export function createPaper(data: { name: string; catalogId: string; buildType: number; secrecy: number }) {
  return request.post<unknown, { id: string }>('/exam/paper', data)
}

export function updatePaper(id: string, data: { name: string; catalogId: string; buildType: number; secrecy: number }) {
  return request.put<unknown, null>(`/exam/paper/${id}`, data)
}

export function disablePaper(id: string, disabled: number) {
  return request.put<unknown, null>(`/exam/paper/${id}/disable`, { disabled })
}

export function deletePaper(id: string) {
  return request.delete<unknown, null>(`/exam/paper/${id}`)
}

export function transferPaper(id: string, toUserId: string) {
  return request.put<unknown, null>(`/exam/paper/${id}/transfer`, { toUserId })
}

export function changePaperCatalog(id: string, catalogId: string) {
  return request.put<unknown, null>(`/exam/paper/${id}/catalog`, { catalogId })
}

/** 2.4 批量操作：删除 / 转移 / 修改分类（07 §2.4）。 */
export function batchPaper(action: 'delete' | 'transfer' | 'changeCatalog',
                           paperIds: string[], toUserId?: string, catalogId?: string) {
  return request.post<unknown, null>('/exam/paper/batch', {
    action,
    paperIds,
    toUserId: toUserId || '',
    catalogId: catalogId || ''
  })
}
// ---- 固定卷题目（07 §4）----

export interface PaperQuesCard {
  quesId: string
  type: number
  content: string
  summary: string
  levelType: number
  score: number
  missScore: number
  missScoreType: number
  orderIndex: number
  libId: string
  libName: string
  questionItems: { itemContent: string; answer: number; orderIndex: number }[]
  judgeAnswer: number | null
  judgeCorrectOptionContent: string | null
  judgeWrongOptionContent: string | null
  answerContent: string | null
  answerKeywords: { keyword: string; scoreRatio: number }[]
  explainText: string
  noOrderMark: number
  points: { pointId: string; name: string }[]
  /** 组合题：小题列表（非组合题为空） */
  subQuestions?: PaperSubQues[]
  /** 组合题：各小题分值（与 subQuestions 同序） */
  subScores?: PaperSubScore[]
  /** 填空题每空分值（仅开启按空得分时有值） */
  blankScores?: PaperBlankScore[]
  /** 多选题各选项分值（仅 missScoreType=3 时有值） */
  optionScores?: PaperOptionScore[]
}

/** 填空题每空分值：blankIndex 从 1 开始对应题干 _(n)_。 */
export interface PaperBlankScore {
  blankIndex: number
  score: number
}

/** 多选题每个选项的分值（自定义各选项得分）：option 为选项字母。 */
export interface PaperOptionScore {
  option: string
  score: number
}

/** 组合题小题。 */
export interface PaperSubQues {
  quesId: string
  type: number
  levelType?: number
  content: string
  summary: string
  explainText: string
  questionItems: { itemContent: string; answer: number; orderIndex: number }[]
  judgeAnswer: number | null
  judgeCorrectOptionContent: string | null
  judgeWrongOptionContent: string | null
  answerContent: string | null
  answerKeywords: { keyword: string; scoreRatio: number }[]
}

/** 组合题小题分值（与小题同序）。 */
export interface PaperSubScore {
  score: number
  missScore: number
  missScoreType: number
}

export interface PaperSection {
  sectionIndex: number
  quesList: PaperQuesCard[]
}

export interface PaperEditCanvas {
  sections: PaperSection[]
  /** status=4 时非空：已发布卷只允许改这些字段 */
  editableFields: string[] | null
}

export interface PaperQuesItem {
  quesId: string
  summary: string
  type: number
  levelType: number
  score: number
  libId: string
  libName: string
  mainPointName: string
  createFullname: string
  createTime: string
}

/** 4.2 编辑页画布 */
export function getPaperEditCanvas(paperId: string) {
  return request.get<unknown, PaperEditCanvas>(`/exam/paper/${paperId}/edit`)
}

/** 4.1 管理页试题列表 */
export function getPaperQuesList(paperId: string, current: number, limit: number,
                                 type: number, levelType: number, keyword: string) {
  return request.get<unknown, { records: PaperQuesItem[]; total: number }>(`/exam/paper/${paperId}/questions`, {
    params: { current, limit, type, levelType, keyword }
  })
}

/** 只读考试回看页：按当前筛选导出试卷试题列表。 */
export async function exportPaperQuestions(
  paperId: string,
  params: { type?: number; levelType?: number; keyword?: string } = {}
) {
  saveBlob(
    await downloadBlob(`/exam/paper/${paperId}/questions/export`, { params }),
    '试卷试题.xlsx'
  )
}

/** 4.3 添加题目（同源写入） */
export function addPaperQuestion(paperId: string, data: {
  sectionIndex: number
  score: number
  missScore?: number
  missScoreType?: number
  subScores?: PaperSubScore[]
  /** 填空题按空得分：各空之和须等于 score（后端校验） */
  blankScores?: PaperBlankScore[]
  /** 多选题自定义各选项得分：仅 missScoreType=3 时提交 */
  optionScores?: PaperOptionScore[]
  libId: string
  question: unknown
}) {
  return request.post<unknown, { quesId: string; orderIndex: number }>(`/exam/paper/${paperId}/question`, data)
}

/** 4.4 从题库选题（只建关联） */
export function pickPaperQuestions(paperId: string, items: {
  quesId: string
  score: number
  sectionIndex: number
}[]) {
  return request.post<unknown, { addedCount: number }>(`/exam/paper/${paperId}/question/pick`, { items })
}

/** 4.5 编辑关联/题目 */
export function updatePaperQuestion(paperId: string, quesId: string, data: Record<string, unknown>) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/question/${quesId}`, data)
}

/** 4.6 移除关联（不删题库试题） */
export function removePaperQuestion(paperId: string, quesId: string) {
  return request.delete<unknown, null>(`/exam/paper/${paperId}/question/${quesId}`)
}

/** 4.7 拖拽排序（含跨大题） */
export function sortPaperQuestions(paperId: string, moves: {
  quesId: string
  sectionIndex: number
  orderIndex: number
}[]) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/question/sort`, { moves })
}

/** 4.8 快速设置全部分数 */
export function batchPaperScore(paperId: string, scores: {
  sectionIndex: number
  score: number
  missScore?: number
  missScoreType?: number
}[]) {
  return request.post<unknown, null>(`/exam/paper/${paperId}/question/batch-score`, { scores })
}

/** 5 概览统计 */
export interface PaperOverview {
  total: number
  byType: { name: string; count: number }[]
  byPoint: { name: string; count: number }[]
  byLevel: { name: string; count: number }[]
}

export function getPaperOverview(paperId: string) {
  return request.get<unknown, PaperOverview>(`/exam/paper/${paperId}/stat/overview`)
}

// ---- 发布 / 共享 / 引用 / 分值配置（07 §2.5/2.6/2.7/7）----

export function releasePaper(paperId: string) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/release`)
}

export interface PaperShareInfo {
  libId: string
  shares: { targetType: number; targetId: string; targetName: string }[]
}

export function getPaperShare(paperId: string) {
  return request.get<unknown, PaperShareInfo>(`/exam/paper/${paperId}/share`)
}

export function savePaperShare(paperId: string, shares: { targetType: number; targetId: string }[]) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/share`, { shares })
}

export interface PaperUseItem {
  id: string
  refName: string
  sourceType: number
  creatorName: string
  status: string
  createdAt: string
}

export function getPaperUseList(paperId: string) {
  return request.get<unknown, PaperUseItem[]>(`/exam/paper/${paperId}/use`)
}

export interface ScoreConfigItem {
  type: number
  levelType: number
  score: number
  missScore: number
  missScoreType: number
}

export function getScoreConfig() {
  return request.get<unknown, ScoreConfigItem[]>('/exam/score-config')
}

export function saveScoreConfig(items: ScoreConfigItem[]) {
  return request.put<unknown, null>('/exam/score-config', { items })
}

// ---- 随机卷策略（07 §3）----

export interface StrategyCell {
  levelType: number
  [key: string]: number
}

export interface StrategyItem {
  libId: string
  libName: string
  /** 按考核点来源时该行对应的考核点（按题库来源为空） */
  indicatorId?: string | null
  pointName?: string | null
  selectedSourceType: string
  selectedSourceTypeValue: number
  selectedPointIds: string
  catalogName: string
  quesQty: number
  settingCount: StrategyCell[]
}

export interface StrategySummary {
  quesQty: number
  totalScore: number
}

export function getPaperStrategy(paperId: string) {
  return request.get<unknown, StrategyItem[]>(`/exam/paper/${paperId}/strategy`)
}

export function setPaperStrategySource(paperId: string, data: {
  sourceType: number
  libs: { libId: string; pointIds: string[] }[]
}) {
  return request.post<unknown, null>(`/exam/paper/${paperId}/strategy/source`, data)
}

export function updateStrategyCell(paperId: string, data: {
  libId: string
  indicatorId?: string
  levelType: number
  field: string
  value: number
}) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/strategy/cell`, data)
}

/** 3.4 批量单元格更新：聚合模式下"一次改一片"需要多个槽位一起写。 */
export function batchStrategyCell(paperId: string, cells: {
  libId: string
  indicatorId?: string
  levelType: number
  field: string
  value: number
}[]) {
  return request.post<unknown, null>(`/exam/paper/${paperId}/strategy/batch-cell`, { cells })
}

export function getStrategySummary(paperId: string) {
  return request.get<unknown, StrategySummary>(`/exam/paper/${paperId}/strategy/summary`)
}
/** 2.4 切换抽题方式（随机卷）。 */
export function updatePaperQuesMode(paperId: string, quesMode: number) {
  return request.put<unknown, null>(`/exam/paper/${paperId}/ques-mode`, { quesMode })
}
/** 试卷列表导出 Excel（按当前筛选条件；二进制流不能用共享拦截器解包）。 */
export async function exportPaperList(query: PaperListQuery): Promise<Blob> {
  return downloadBlob('/exam/paper/export', { method: 'POST', data: query })
}

// ---- 快速出卷导入（07 §6）----

/** 逐行导入结果：errors 带 sheet+row，定位到具体 Sheet 的具体行。 */
export interface PaperImportResult {
  successCount: number
  failCount: number
  errors: { sheet: string; row: number; reason: string }[]
  paperId: string
}

/** 6.1 下载导入模板（后端 classpath 静态资源，与解析器同源）。 */
export async function downloadPaperTemplate(): Promise<Blob> {
  return downloadBlob('/exam/paper/import/template')
}

/** 6.2 快速出卷导入：一份 Excel 生成一整张固定卷。 */
export function importPaperFile(
  file: File,
  libId: string,
  catalogId: string,
  secrecy: number,
  onProgress?: (percent: number) => void,
  /** 传入则追加题目到该试卷（固定卷编辑页的导入），不传则新建一张卷 */
  paperId?: string
) {
  const form = new FormData()
  form.append('file', file)
  form.append('libId', libId)
  form.append('catalogId', catalogId)
  form.append('secrecy', String(secrecy))
  if (paperId) form.append('paperId', paperId)
  return request.post<unknown, PaperImportResult>('/exam/paper/import', form, {
    timeout: 180_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
}
