import request, { downloadBlob, saveBlob } from './request'

/**
 * 测练中心·考试管理 API（04 接口文档：经网关 /api/exam）。
 * 分类结构与题库/试卷分类同构，只是路径换成 /arrange/catalog。
 */

// ---- 考试分类 ArrangeCatalog（04 §3 API-01~07）----

export interface ArrangeCatalogUser {
  userId: string
  userName: string
  fullname: string
  deptName: string
}

export interface ArrangeCatalogNode {
  id: string
  name: string
  parentId: string
  routingPath: string
  orderIndex?: number
  disabled: number
  /** 该分类下考试数（沿用题库/试卷分类的 libQty 字段名，组件才能复用） */
  libQty?: number
  childCatalogQty?: number
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: ArrangeCatalogUser[] | null
  children: ArrangeCatalogNode[] | null
}

export interface ArrangeCatalogDetail {
  id: string
  name: string
  parentName: string
  libQty: number
  createTime: string
  createFullname: string
  inheritParentAuth: number
  childInheritCurrentAuth: number
  users: ArrangeCatalogUser[]
}

export function getArrangeCatalogTree() {
  return request.get<unknown, ArrangeCatalogNode>('/exam/arrange/catalog/tree')
}

export function getArrangeCatalogDetail(id: string) {
  return request.get<unknown, ArrangeCatalogDetail>(`/exam/arrange/catalog/${id}`)
}

export function createArrangeCatalogBatch(data: {
  parentId: string
  catalogText: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.post<unknown, { createdCount: number; errors: { line: number; reason: string }[] }>(
    '/exam/arrange/catalog',
    data
  )
}

export function updateArrangeCatalog(id: string, data: {
  name: string
  adminUserIds: string[]
  inheritParentAuth: number
  childInheritCurrentAuth: number
}) {
  return request.put<unknown, null>(`/exam/arrange/catalog/${id}`, data)
}

export function moveArrangeCatalog(id: string, targetParentId: string) {
  return request.put<unknown, null>(`/exam/arrange/catalog/${id}/move`, { targetParentId })
}

export function disableArrangeCatalog(id: string, disabled: number) {
  return request.put<unknown, null>(`/exam/arrange/catalog/${id}/disable`, { disabled })
}

export function deleteArrangeCatalog(id: string) {
  return request.delete<unknown, null>(`/exam/arrange/catalog/${id}`)
}

// ---- 考试安排 Arrange（04 §4 API-08~17）----

export interface ArrangePermissions {
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
  canEnd: boolean
}

export interface ArrangeItem {
  id: string
  name: string
  catalogId: string
  catalogName: string
  examType: number
  /** 0 未发布 2 进行中 3 已结束 */
  status: number
  auditStatus: number
  arrangeType: number
  offline: number
  paperId: string
  paperBuildType: number
  entryStartAt: string | null
  entryEndAt: string | null
  createUserId: string
  createFullname: string
  createUserName: string
  createdAt: string
  ownerUserIds: string[]
  ownerNames: string[]
  arrangedQty: number
  submittedQty: number
  passedQty: number
  passRate: number
  permissions: ArrangePermissions
}

export interface ArrangeDetail extends ArrangeItem {
  code: string
  important: number
  secrecy: number
  loopEnabled: number
  requiredType: number
  passScoreType: number
  passScore: number
  passRatio: number | null
  rewardType: number
  rewardCredit: number
  attemptLimit: number
  lateLimitMin: number
  screenSwitchLimit: number
  stepNumber: number
  paperName: string
  paperScore: number
  linkUrl: string
  qrCodeUrl: string
  notifySettings: Record<string, unknown>
  publishSettings: Record<string, unknown>
  advancedSettings: Record<string, unknown>
  publishedAt: string | null
}

export interface ArrangeListQuery {
  /** 0 全部 1 我创建的 2 我负责的 */
  queryType: number
  keyword: string
  catalogId: string
  routingPath: string
  createUserId: string
  /** 多选创建人；非空时后端优先使用 */
  createUserIds?: string[]
  publishStatus: number
  examType: number | null
  /** 安排方式：-1 全部 0 单独安排 1 批量安排 */
  arrangeType?: number | null
}

export interface ArrangeSaveReq {
  name: string
  catalogId: string
  paperId?: string
  paperBuildType?: number
  code?: string
  important?: number
  secrecy?: number
  loopEnabled?: number
  entryStartAt?: string | null
  entryEndAt?: string | null
  requiredType?: number
  passScoreType?: number
  passScore?: number
  passRatio?: number | null
  rewardType?: number
  rewardCredit?: number
  attemptLimit?: number
  lateLimitMin?: number
  screenSwitchLimit?: number
  notifySettings?: string
  publishSettings?: string
  advancedSettings?: string
  ownerUserIds?: string
  ownerNames?: string
  stepNumber?: number
}

export function getArrangeList(
  current: number,
  limit: number,
  orderby: string,
  direction: string,
  data: ArrangeListQuery
) {
  return request.post<unknown, { records: ArrangeItem[]; total: number }>(
    `/exam/arrange/list?current=${current}&limit=${limit}&orderby=${orderby}&direction=${direction}`,
    data
  )
}

export function getArrangeDetail(id: string) {
  return request.get<unknown, ArrangeDetail>(`/exam/arrange/${id}`)
}

export function createArrange(data: ArrangeSaveReq) {
  return request.post<unknown, { id: string }>('/exam/arrange', data)
}

export function updateArrange(id: string, data: ArrangeSaveReq) {
  return request.put<unknown, null>(`/exam/arrange/${id}`, data)
}

export function publishArrange(id: string) {
  return request.post<unknown, null>(`/exam/arrange/${id}/publish`)
}

export function endArrange(id: string) {
  return request.put<unknown, null>(`/exam/arrange/${id}/end`)
}

export function copyArrange(id: string) {
  return request.post<unknown, { id: string }>(`/exam/arrange/${id}/copy`)
}

export function deleteArrange(id: string) {
  return request.delete<unknown, null>(`/exam/arrange/${id}`)
}

export function batchArrange(action: 'delete' | 'end', ids: string[]) {
  return request.post<unknown, null>('/exam/arrange/batch', { action, ids })
}

export interface ArrangeLinkResp {
  token: string
  linkUrl: string
  qrCodeUrl: string
  joinQty: number
}

export function getArrangeLink(id: string) {
  return request.get<unknown, ArrangeLinkResp>(`/exam/arrange/${id}/link`)
}

/** 列表行状态文案：0 未发布 / 2 进行中 / 3 已结束。 */
export const ARRANGE_STATUS_TEXT: Record<number, string> = {
  0: '未发布',
  2: '进行中',
  3: '已结束'
}

/** 考试类型文案（本期只做线上考试）。 */
export const ARRANGE_EXAM_TYPE_TEXT: Record<number, string> = {
  1: '线上考试',
  2: '线下考试'
}

/** 安排方式文案。 */
export const ARRANGE_TYPE_TEXT: Record<number, string> = {
  0: '单独安排',
  1: '批量安排'
}

export interface ArrangeUserOption {
  userId: string
  account: string
  fullname: string
  employeeNo: string | null
  deptName: string
  positionName: string | null
}

export interface ArrangeDepartmentOption {
  id?: string
  deptId?: string
  deptCode: string
  deptName: string
  deptPath: string
  parentPath?: string | null
  deptLevel: number
  userCount?: number
}

/** F3 创建人抽屉：按部门 + 字段（姓名/账号/工号）分页查在职用户。 */
export function searchArrangeUsers(
  keyword: string,
  deptPath = '',
  field: 'name' | 'account' | 'employeeNo' | 'all' = 'name',
  current = 1,
  limit = 20
) {
  return request.get<unknown, { list: ArrangeUserOption[]; total: number; page: number; size: number }>(
    '/exam/arrange/options/users', { params: { keyword, deptPath, field, current, limit } })
}
// ---- 考生管理（04 §5 API-19~30 + 48/49）----

export interface ArrangeStudentItem {
  id: string
  arrangeId: string
  userId: string
  account: string
  fullname: string
  accountStatus: number
  deptId: string
  deptName: string
  positionId: string
  positionName: string
  joinType: number
  /** 加入来源：原站 joinMethod，1 手动添加 */
  joinSource: number | null
  examStatus: number
  passStatus: number
  startAt: string | null
  submitAt: string | null
  firstJoinAt: string | null
  ip: string
  durationSec: number
  score: number
  highestScore: number
  highestAttemptNo: number
  attemptQty: number
  screenSwitchCount: number
  submitType: number | null
  /** 排名：同分同名次；null/0 未上榜 */
  rankNo: number | null
  /** 补考成绩；null 未补考 */
  retakeScore: number | null
  /** 补考通过状态；null 无补考 */
  retakePassStatus: number | null
  /** 参考设备：原站 deviceType */
  referDevice: number | null
  /** 参考次数：原站 attendCount */
  referCount: number | null
  /** 是否一次通过：1 是 */
  oncePassed: number | null
  /** 是否有补考：1 是 */
  hasRetake: number | null
  retakeUsed: number
  currentAttemptId: string | null
  canRetake: boolean
}

export interface ArrangeStudentQuery {
  keyword: string
  examStatus: number
  passStatus: number
  accountStatus: number
  deptIds?: string[]
  positionIds?: string[]
  /** 岗位筛选走名称：平台没有岗位 ID（SysUserDTO 无 positionId） */
  positionNames?: string[]
  /** 加入方式：不传/0 表示全部；1 指派 2 链接 3 导入 */
  joinType?: number
  /** 开考时间起（含），yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss */
  examStartBegin?: string
  /** 开考时间止（含），格式同上 */
  examStartEnd?: string
}

export interface ArrangeCandidateItem {
  userId: string
  account: string
  fullname: string
  deptName: string
  positionName: string
  added: boolean
}

export function getArrangeStudents(arrangeId: string, current: number, limit: number, query: ArrangeStudentQuery) {
  return request.post<unknown, { records: ArrangeStudentItem[]; total: number }>(
    `/exam/arrange/${arrangeId}/student/list?current=${current}&limit=${limit}&orderby=createdAt&direction=desc`,
    query
  )
}

export function getArrangeCandidates(arrangeId: string, deptPath: string, keyword: string, current = 1, limit = 20) {
  return request.get<unknown, { list: ArrangeCandidateItem[]; total: number; selectedCount: number }>(
    `/exam/arrange/${arrangeId}/student/candidates`,
    { params: { deptId: deptPath, keyword, current, limit } }
  )
}

export function addArrangeStudents(arrangeId: string, userIds: string[], joinType = 1) {
  return request.post<unknown, { successCount: number; skippedCount: number; errors: { userId: string; reason: string }[] }>(
    `/exam/arrange/${arrangeId}/student`,
    { userIds, joinType }
  )
}

export function removeArrangeStudents(arrangeId: string, studentIds: string[], force = false) {
  return request.post<unknown, { removedCount: number }>(
    `/exam/arrange/${arrangeId}/student/batch-remove`,
    { studentIds, force }
  )
}

export function retakeArrangeStudent(arrangeId: string, studentId: string) {
  return request.put<unknown, { attemptId: string; attemptNo: number }>(
    `/exam/arrange/${arrangeId}/student/${studentId}/retake`
  )
}

export function syncArrangePaper(arrangeId: string, mode: 'unanswered' | 'all') {
  return request.post<unknown, { affectedCount: number; snapshotId: string }>(
    `/exam/arrange/${arrangeId}/student/sync-paper`,
    { mode }
  )
}

export function analyzeArrange(arrangeId: string) {
  return request.post<unknown, { analysisEnabled: number; analysisTime: string }>(
    `/exam/arrange/${arrangeId}/student/analyze`
  )
}

export function urgeArrangeStudents(arrangeId: string, type: 'exam' | 'grade', studentIds: string[] = []) {
  return request.post<unknown, { sentCount: number }>(
    `/exam/arrange/${arrangeId}/student/urge`,
    { type, studentIds }
  )
}

export interface ArrangeSignatureItem {
  id: string
  account: string
  fullname: string
  signatureUrl: string
  signedAt: string
}

export function getArrangeSignatures(arrangeId: string, current = 1, limit = 10, keyword = '') {
  return request.get<unknown, { records: ArrangeSignatureItem[]; total: number }>(
    `/exam/arrange/${arrangeId}/signature/list`,
    { params: { current, limit, keyword } }
  )
}

/** API-48 部门树（选人抽屉的部门筛选）。 */
export function getArrangeDepartments() {
  return request.get<unknown, { list: ArrangeDepartmentOption[] }>(
    '/exam/arrange/options/departments'
  )
}

/**
 * API-49 岗位候选（考生筛选的「选择岗位」）。
 *
 * <p>岗位在本平台只有名称没有 ID（`SysUserDTO` 无 `positionId`），
 * 所以选项值与后端筛选参数都是岗位名 `position_name`。
 */
export function getArrangePositions(keyword = '', current = 1, limit = 200) {
  return request.get<unknown, { list: { key: string; count: number }[]; total: number }>(
    '/exam/arrange/options/positions', { params: { keyword, current, limit } }
  )
}
/** 考生状态文案：0 未开始 / 1 考试中 / 2 批阅中 / 3 已完成 / 4 重新考试。 */
export const STUDENT_STATUS_TEXT: Record<number, string> = {
  0: '未开始',
  1: '考试中',
  2: '批阅中',
  3: '已完成',
  4: '重新考试'
}

/** 通过状态：0 不通过 / 1 通过 / 2 未知。 */
export const STUDENT_PASS_TEXT: Record<number, string> = {
  0: '不通过',
  1: '通过',
  2: '未知'
}

/**
 * 账号状态：1 已启用 / 2 已禁用 / 3 已删除。
 *
 * <p>取值来自 `exam_arrange_student.account_status` 的建表注释（`1已启用 2已禁用 3已删除`），
 * 原平台列表实测只出现「已启用」。
 */
export const STUDENT_ACCOUNT_STATUS_TEXT: Record<number, string> = {
  1: '已启用',
  2: '已禁用',
  3: '已删除'
}

/**
 * 加入方式：1 指派 / 2 链接 / 3 导入。
 *
 * <p>取值来自 `exam_arrange_student.join_type` 的建表注释；
 * 「指派加入」的文案是原平台列表截图实读（非推测）。
 */
export const STUDENT_JOIN_TYPE_TEXT: Record<number, string> = {
  1: '指派加入',
  2: '链接加入',
  3: '导入加入'
}

/**
 * 加入来源（原站 `joinMethod`）：1 手动添加。
 *
 * <p>只有 1 是原平台截图实读（「手动添加」）；当前后端 `applyUser` 固定写 1，
 * 其他值后端从不下发，所以这里不做猜测枚举，未知值直接回退成原始数字。
 */
export const STUDENT_JOIN_SOURCE_TEXT: Record<number, string> = {
  1: '手动添加'
}

/**
 * 提交方式：1 主动 / 2 超时自动 / 3 管理员。
 *
 * <p>取值来自 04 接口文档 `submitType`（交卷接口）与 `exam_arrange_student.submit_type`
 * 的建表注释（`1主动 2自动 3管理员`），两处一致。
 */
export const STUDENT_SUBMIT_TYPE_TEXT: Record<number, string> = {
  1: '主动提交',
  2: '超时自动',
  3: '管理员强制'
}

/**
 * 参考设备（原站 `deviceType`）：0 未知 / 1 PC / 2 移动。
 *
 * <p>**未经验证**：原平台抓包里 `deviceType` 只有 0（未知）一个样本，
 * 1/2 的语义是按字段名与业务常识定的，接入真数据后需校对。
 */
export const STUDENT_REFER_DEVICE_TEXT: Record<number, string> = {
  0: '未知',
  1: 'PC',
  2: '移动端'
}
// ---- 试题分析与统计（04 §6 API-32~38）----

export interface ArrangeQuestionStat {
  quesId: string
  examQuesId: string
  sourceQuesId: string
  quesType: number
  questionType: number
  summary: string
  levelType: number
  pointName: string
  submitQty: number
  correctQty: number
  correctRate: number
}

export function getArrangeQuestionStats(arrangeId: string, current = 1, limit = 10,
  query: { type: number; levelType: number; keyword: string; pointId?: string }) {
  return request.post<unknown, { records: ArrangeQuestionStat[]; total: number }>(
    `/exam/arrange/${arrangeId}/question/list?current=${current}&limit=${limit}`,
    query
  )
}

export interface ArrangeQuestionView {
  quesId: string
  type: number
  levelType: number
  content: string
  summary: string
  explainText: string
  points: string[]
  questionItems: { itemContent: string; answer: number; orderIndex: number }[]
  judgeAnswer: number | null
  judgeCorrectOptionContent: string | null
  judgeWrongOptionContent: string | null
  answerContent: string | null
  keywords: string | null
  updatedBy: string
  updatedAt: string
}

export function getArrangeQuestionView(arrangeId: string, quesId: string) {
  return request.get<unknown, ArrangeQuestionView>(`/exam/arrange/${arrangeId}/question/${quesId}/view`)
}

export interface ArrangeAnswerDetail {
  quesId: string
  content: string
  summary: string
  type: number
  levelType: number
  explainText: string
  correctRate: number
  submitQty: number
  correctQty: number
  options: { itemContent: string; answer: number; answerQty: number; answerPercent: number }[]
}

export function getArrangeAnswerDetail(arrangeId: string, quesId: string) {
  return request.get<unknown, ArrangeAnswerDetail>(`/exam/arrange/${arrangeId}/question/${quesId}/answer-detail`)
}

export interface ArrangeOverviewBaseInfo {
  name: string
  releaseTime: string
  examName: string
  totalQty: number
  answerQty: number
  passQty: number
  missQty: number
  answerQtyRate: number
  answerPersonTime: number
  answerPersonTimeRate: number
  passRate: number
  oncePassRate: number
  excellentRate: number
  dimensionType: number
}

export function getArrangeAnalysisOverview(arrangeId: string) {
  return request.get<unknown, { baseInfo: ArrangeOverviewBaseInfo }>(
    `/exam/arrange/${arrangeId}/analysis/overview`
  )
}

export interface ArrangeScoreInfo {
  totalScore: number
  passScore: number
  excellenceScore: number
  highestScore: number
  highestScoreUserName: string
  highestScoreFullname: string
  minimumScore: number
  minimumScoreUserName: string
  minimumScoreFullname: string
  averageScore: number
  averageTime: number
}

export function getArrangeAnalysisScore(arrangeId: string) {
  return request.get<unknown, { scoreInfo: ArrangeScoreInfo }>(`/exam/arrange/${arrangeId}/analysis/score`)
}

export interface ArrangeRateItem {
  key: number | string
  value: number
  quesCount: number
}

export function getArrangeCorrectRate(arrangeId: string, dimension: 'type' | 'level' | 'point') {
  return request.get<unknown, { accuracyRate: { quesType: ArrangeRateItem[]; difficulty: ArrangeRateItem[]; point: ArrangeRateItem[] } }>(
    `/exam/arrange/${arrangeId}/analysis/correct-rate`,
    { params: { dimension } }
  )
}
// ---- 导出（04 API-18/27/31/35）：二进制流不能用共享拦截器解包 ----

const download = async (url: string, params: Record<string, unknown>, fallbackName: string) => {
  saveBlob(await downloadBlob(url, { params, timeout: 180_000 }), fallbackName)
}

/** API-18 考试列表导出。 */
export function exportArrangeList(params: {
  keyword?: string
  catalogId?: string
  publishStatus?: number
  /** 0 全部 1 我创建的 2 我负责的 */
  queryType?: number
  createUserId?: string
  /** 逗号拼接的多选创建人 */
  createUserIds?: string
  examType?: number | null
  arrangeType?: number
}) {
  return download('/exam/arrange/export', params, '考试列表.xlsx')
}

/** API-27 考生导出（highest|all|answer）。 */
export function exportArrangeStudents(arrangeId: string, type: 'highest' | 'all' | 'answer') {
  const name = type === 'answer' ? '考生答卷明细.xlsx' : '考生成绩.xlsx'
  return download(`/exam/arrange/${arrangeId}/student/export`, { type }, name)
}

/** API-31 签名记录导出。 */
export function exportArrangeSignatures(arrangeId: string) {
  return download(`/exam/arrange/${arrangeId}/signature/export`, {}, '签名记录.xlsx')
}

/** API-35 试题分析导出。 */
export function exportArrangeQuestions(
  arrangeId: string, params: { type?: number; levelType?: number; keyword?: string } = {}
) {
  return download(`/exam/arrange/${arrangeId}/question/export`, params, '试题分析.xlsx')
}

// ---- 答卷详情（04 §7 API-39/40）----

export interface ArrangeResultView {
  ueId: string
  arrId: string
  arrName: string
  examName: string
  totalScore: number
  passScore: number | null
  usedTime: number
  score: number
  status: number
  submitAt: string
  markerUsers: string[]
  fullname: string
  userName: string
  userNo: string
  deptName: string
  positionName: string
  quesTypeTitles: { type: number; orderIndex: number; alias: string; description: string }[]
  userQues: {
    id: string
    content: string
    quesType: number
    orderIndex: number
    pointNames: string
    submitContent: string
    answerContent: string
    explainText: string
    totalScore: number
    score: number
    checked: number
    choiceItems: { itemContent: string; checked: boolean; answer: number }[] | null
    fillInItems: string[] | null
  }[]
}

export function getArrangeResult(ueId: string) {
  return request.get<unknown, ArrangeResultView>(`/exam/result/${ueId}`)
}

/** API-40 导出答卷 PDF。 */
export async function exportArrangeResultPdf(ueId: string, filename: string) {
  saveBlob(await downloadBlob(`/exam/result/${ueId}/export-pdf`), filename)
}

// ---- 列设置（04 §9 API-46/47）----

export interface ArrangeColumnSetting {
  key: string
  visible: boolean
  order: number
}

export function getStudentColumns() {
  return request.get<unknown, { columns: ArrangeColumnSetting[] }>('/exam/setting/student-columns')
}

export function saveStudentColumns(columns: ArrangeColumnSetting[]) {
  return request.put<unknown, null>('/exam/setting/student-columns', { columns })
}

/**
 * 列显示名（列设置抽屉与表格表头共用）。
 *
 * <p>键与顺序对齐原平台「列设置」面板（2026-11-13 实机 26 项截图人工核对）：
 * 面板标题「请选择需要展示的列」，首项是全选「全部」，下面才是具体列。
 * `highestAttemptNo` 对应原平台「最高分第几次考」——列名确实叫这个，不是写错。
 */
export const STUDENT_COLUMN_LABELS: Record<string, string> = {
  account: '账号',
  fullname: '姓名',
  accountStatus: '账号状态',
  deptName: '部门',
  positionName: '岗位',
  joinType: '加入方式',
  joinSource: '加入来源',
  examStatus: '考试状态',
  startAt: '开考时间',
  submitAt: '交卷时间',
  firstJoinAt: '加入考试时间',
  ip: 'IP地址',
  durationSec: '答题时长',
  score: '成绩',
  highestAttemptNo: '最高分第几次考',
  screenSwitchCount: '切屏次数',
  submitType: '提交方式',
  rankNo: '排名',
  passStatus: '通过状态',
  retakeScore: '补考成绩',
  retakePassStatus: '补考通过状态',
  referDevice: '参考设备',
  referCount: '参考次数',
  oncePassed: '是否一次通过',
  hasRetake: '是否有补考',
  operation: '操作'
}

/** 保留列：不可隐藏（后端也会拦）。 */
export const LOCKED_STUDENT_COLUMNS = ['account', 'fullname', 'operation']

// ---- 变更通知（04 §8 API-41/42/43）----

export interface ArrangeNoticeReq {
  title: string
  content: string
  changedFields: string[]
}

export interface ArrangeNoticePreview {
  title: string
  content: string
  recipientQty: number
}

export interface ArrangeNoticeSendResult {
  noticeId: string
  eventId: string
  recipientQty: number
}

export interface ArrangeNoticeItem {
  id: string
  title: string
  content: string
  changedFields: string[]
  /** 0 草稿（待投递） 1 已发送 2 发送失败 */
  status: number
  recipientQty: number
  createdBy: string
  createdByName: string
  createdAt: string
  sentAt: string | null
}

/** 通知状态文案。 */
export const NOTICE_STATUS_TEXT: Record<number, string> = {
  0: '待投递',
  1: '已发送',
  2: '发送失败',
  3: '已撤销'
}

/** API-41：按变更生成通知预览（后端补默认标题/正文与接收人数）。 */
export function previewArrangeNotice(arrangeId: string, data: Partial<ArrangeNoticeReq>) {
  return request.post<unknown, ArrangeNoticePreview>(
    `/exam/arrange/${arrangeId}/change-notice/preview`, data)
}

/** API-42：发送变更通知（写发送记录 + outbox）。 */
export function sendArrangeNotice(arrangeId: string, data: ArrangeNoticeReq) {
  return request.post<unknown, ArrangeNoticeSendResult>(
    `/exam/arrange/${arrangeId}/change-notice`, data)
}

/** API-43：历史变更通知分页。 */
export function getArrangeNotices(arrangeId: string, current = 1, limit = 10) {
  return request.get<unknown, { records: ArrangeNoticeItem[]; total: number }>(
    `/exam/arrange/${arrangeId}/change-notice`, { params: { current, limit } })
}

/** 撤销一条变更通知（学员端立即不可见；还没投出去的也会被拦住）。 */
export function cancelArrangeNotice(arrangeId: string, noticeId: string) {
  return request.delete<unknown, null>(`/exam/arrange/${arrangeId}/change-notice/${noticeId}`)
}
