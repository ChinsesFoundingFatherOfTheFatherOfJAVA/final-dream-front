/**
 * 学员端 AI实战训练场接口（契约 04 §学生端）
 * <p>
 * 全部走统一 request（JWT + {code,message,data} 拦截）；后端 id 一律 string。
 * attempt 状态机：preparing → ready → in_progress → report_generating → completed / failed / cancelled。
 */

export type AttemptStatus =
  'preparing' | 'ready' | 'in_progress' | 'report_generating' | 'completed' | 'failed' | 'cancelled'

export type StudyMode = 1 | 2
export type PracticeType = 'case' | 'random' | 'custom'

/** 首页主题卡片（GET /api/act/student/home） */
export interface StudentThemeCard {
  themeId: string
  name: string
  description: string | null
  trainingModeEnabled: number
  assessmentModeEnabled: number
  practiceMethods: string | null
  planStartTime: string | null
  planEndTime: string | null
  publishedVersionNo: number | null
  myTrainingCount: number
  /** 已发布版本的场景总数（卡片"N 个场景"与进度分母） */
  scenarioCount: number
  /** 进度百分比 0-100（服务端算好，前端不重算） */
  progress: number
  myPassedScenarios: number
  /** -1 = 不限 */
  myExamRemaining: number
  /** 主题卡状态（契约 F04）：passed | ended | in_progress | not_started */
  status: string
}
/** 更多学习机会（AC-03）：公开未加入且计划期内的已发布主题 */
export function getStudentOpportunities(limit = 6) {
  return request.get<unknown, StudentThemeCard[]>('/act/student/opportunities', {
    params: { limit },
  })
}

/** 主题详情（GET /api/act/student/themes/{themeId}） */
export interface StudentThemeDetail {
  // 分组结构（契约 04 §API-S04），新页面一律用这些
  theme?: StudentThemeHead
  studyPolicy?: StudentStudyPolicy
  evaluationCriteria?: StudentCriteria[]
  productProfiles?: StudentThemeProductProfile[]
  recentRecords?: StudentThemeRecord[]
  // 扁平兼容字段（早期字段，保留以免影响既有调用方）
  themeId: string
  name: string
  description: string | null
  publishedVersionNo: number
  trainingModeEnabled: number
  assessmentModeEnabled: number
  practiceMethods: string | null
  difficulty: number | null
  allowCustomDifficulty: number | null
  planStartTime: string | null
  planEndTime: string | null
  scenarios: StudentScenario[]
  materials: StudentMaterial[]
}

/** 页头：模式、难度、名称、描述、场景数、已通过数、进度 */
export interface StudentThemeHead {
  id: string
  name: string
  description: string | null
  mode: number
  modeText: string
  difficulty: number | null
  difficultyText: string | null
  scenarioCount: number
  passedScenarioCount: number
  progress: number
  examUnlocked: boolean
  planStartTime: string | null
  planEndTime: string | null
  publishedVersionNo: number
  startable: boolean
  stopReason: string | null
}

export interface StudentStudyPolicy {
  trainingEnabled: boolean
  examEnabled: boolean
  dialogModes: string[]
  practiceMethods: string[]
  allowCustomDifficulty: boolean
  minTrainCountToUnlockExam: number | null
  maxExamCount: number | null
}

export interface StudentCriteria {
  passScore: number | null
  dimensions: Array<{ name: string; weight: number }>
}

export interface StudentThemeProductProfile {
  profileKey: string
  name: string
  category: string | null
  description: string | null
  detailMarkdown: string | null
  customFields: Array<{ key: string | null; value: string | null; sortOrder: number | null }>
}

export interface StudentThemeRecord {
  attemptId: string
  scenarioId: string
  scenarioName: string | null
  studyMode: StudyMode
  status: AttemptStatus
  startedAt: string | null
  endedAt: string | null
  totalScore: number | null
  passed: number | null
}

export interface StudentScenario {
  scenarioId: string
  name: string
  sortOrder?: number
  audience?: string[]
  businessGoal: string | null
  timeLimitMinutes: number | null
  passScore: number | null
  dimensions: Array<{ name: string; weight: number }>
  attemptCount?: number
  myTrainingCount: number
  myExamCount: number
  myTrainingPassed: boolean
  myExamPassed?: boolean
  myHighestScore: number | null
  myHighestExamScore?: number | null
  status?: string
  statusText?: string
  nextAction?: string
  nextActionText?: string
  trainingAction?: { enabled: boolean; reason: string | null }
  examAction?: { enabled: boolean; reason: string | null }
}

export interface StudentMaterial {
  materialId: string
  name: string
  fileType: string | null
  renderMode: 'pdf' | 'text' | null
  sourceType: 'act_local' | 'online_classroom' | null
  sourceId: string | null
  previewFileId: string | null
  typeText?: string
}

/** 练习历程条目（GET /api/act/student/history） */
export interface StudentHistoryItem {
  attemptId: string
  themeId: string
  themeName: string | null
  scenarioId: string
  scenarioName: string | null
  studyMode: StudyMode
  practiceType: PracticeType
  status: AttemptStatus
  startedAt: string | null
  endedAt: string | null
  endReason: string | null
  timedOut: number | null
  totalScore: number | null
  passScore: number | null
  passed: number | null
  targetReached: number | null
  /** 用时（秒）：优先取自报告；报告未生成时为 null，前端用 startedAt/endedAt 兜底 */
  durationSeconds?: number | null
}

/** 练习历程页整页数据（GET /api/act/student/practice-records，契约 04 API-S07） */
export interface StudentPracticeStats {
  totalCount: number
  totalHours: number | null
  averageScore: number | null
  themeCount: number
  passedCount: number
  failedCount: number
  inProgressCount: number
}

export interface StudentPracticeRecords {
  stats: StudentPracticeStats
  themes: { themeId: string; themeName: string | null }[]
  records: StudentHistoryItem[]
  total: number
}

/** attempt 响应 */
export interface AttemptResp {
  id: string
  themeId: string
  scenarioId: string
  studyMode: StudyMode
  practiceType: PracticeType
  status: AttemptStatus
  contentVersionNo: number | null
  preparationStage: string | null
  preparationPercent: number
  currentRound: number
  maxRound: number
  targetProgress: number
  maxDurationSeconds: number
  startedAt: string | null
  deadlineAt: string | null
  endedAt: string | null
  endReason: string | null
  timedOut: number | null
  errorCode: string | null
  errorMessage: string | null
  /** 运行态只读上下文（来自 attempt 冻结快照，契约 D07） */
  themeName?: string | null
  scenarioName?: string | null
  sceneNarration?: string | null
  openingLine?: string | null
  businessBackground?: string | null
  businessGoal?: string | null
  actorName?: string | null
  actorDesc?: string | null
  userRoleName?: string | null
  userRoleDesc?: string | null
  behaviorGuidance?: string[] | null
  passScore?: number | null
  dimensions?: Array<{ name: string | null; weight: number | null }> | null
}

/** 报告（GET /api/act/student/attempts/{id}/report） */
export interface StudentReport {
  reportId: string
  attemptId: string
  themeId: string
  scenarioId: string
  studyMode: StudyMode
  practiceType: PracticeType
  passed: number
  targetReached: number
  targetReason: string | null
  timedOut: number
  endReason: string
  totalScore: number
  passScore: number
  durationSeconds: number
  roundCount: number
  summary: string | null
  improvement: Array<{ title: string; detail: string; sampleReply?: string }> | null
  keyDialogues: Array<{ type: string; quote: string; comment: string }> | null
  recommendations: string[] | null
  generatedAt: string
  /** 报告页头部元信息（契约 01 §F18） */
  themeName?: string | null
  scenarioName?: string | null
  studentName?: string | null
  sceneNarration?: string | null
  actorName?: string | null
  userRoleName?: string | null
  /** 完整对话回放（后端 transcriptJson 原样解析） */
  transcript?: Array<{ role: 'user' | 'assistant' | string; text: string }> | null
  dimensions: Array<{
    dimensionKey: string
    dimensionName: string
    score: number
    weight: number
    evidence: string[] | null
    strength: string | null
    improvement: string | null
    reason: string | null
  }>
}

/** 材料查看上下文（GET /api/act/student/materials/{id}/viewer-context） */
export interface MaterialViewerContext {
  id: string
  name: string
  sourceType: 'act_local' | 'online_classroom'
  fileType: string | null
  renderMode?: 'pdf' | 'text' | 'online_classroom'
  previewStatus?: string
  viewerUrl?: string | null
  textUrl?: string | null
  originalUrl?: string | null
  sourceId?: string | null
  notice?: string | null
}

/** 产品档案（GET /api/act/student/product-profiles/{id}） */
export interface StudentProductProfile {
  id: string
  profileKey: string
  profileName: string
  category: string | null
  description: string | null
  customFields: Array<{ key: string; value: string; sortOrder: number }> | null
  detailMarkdown: string | null
}

// ------------------------------------------------------------------ API

import request from './request'

/** 分页形状（ACT 契约：{records,total}，与 actTheme.ActPageResult 同形） */
export interface StudentPageResult<T> {
  records: T[]
  total: number
}

/** 首页聚合（GET /api/act/student/home/summary，契约 04 §3 API-S01） */
export interface StudentHomeSummary {
  user: {
    userId: string
    name: string | null
    departmentName: string | null
    positionName: string | null
    avatar: string | null
  }
  stats: {
    /** 累计学时（小时，2 位小数） */
    totalHours: number | null
    /** 练习次数（正式扣次口径） */
    practiceCount: number
    /** 参与主题数 */
    themeCount: number
    /** 总荣誉分（契约 F02：首期可为 null，前端展示 20） */
    honorScore: number | null
  }
  themes: StudentThemeCard[]
  opportunities: StudentThemeCard[]
  /** 最近 1 条练习（D09：首页只 1 条） */
  recentPractice: StudentHistoryItem | null
}

export function getStudentHomeSummary() {
  return request.get<unknown, StudentHomeSummary>('/act/student/home/summary')
}

/** 首页：我参加的主题 */
export function getStudentHome() {
  return request.get<unknown, { themes: StudentThemeCard[] }>('/act/student/home')
}

/** 加入公开主题（契约 F05"立即加入"） */
export function joinStudentTheme(themeId: string) {
  return request.post<unknown, void>(`/act/student/themes/${themeId}/join`)
}

/** 主题详情（场景 + 材料 + 我的统计） */
export function getStudentThemeDetail(themeId: string) {
  return request.get<unknown, StudentThemeDetail>(`/act/student/themes/${themeId}`)
}

/** 练习历程（attempt 分页 + 报告摘要） */
export function getStudentHistory(params: {
  themeId?: string
  studyMode?: number
  page?: number
  size?: number
}) {
  return request.get<unknown, StudentPageResult<StudentHistoryItem>>('/act/student/history', {
    params,
  })
}

/** 练习历程页整页数据（契约 04 API-S07：统计 + 主题下拉 + 分页记录） */
export function getStudentPracticeRecords(params: {
  status?: 'all' | 'passed' | 'failed' | 'in_progress'
  themeId?: string
  studyMode?: number
  page?: number
  pageSize?: number
}) {
  return request.get<unknown, StudentPracticeRecords>('/act/student/practice-records', { params })
}

/** 练习预检（只读，点开始前调用） */
/** 预检检查项（契约 04 API-A01） */
export interface PreflightCheck {
  code: string
  passed: boolean
  message: string | null
}

/** 预检详情：allowed + requiredSteps + 余量 + checks */
export interface PreflightResp {
  allowed: boolean
  activeAttemptId: string | null
  requiredSteps: string[]
  maxDurationSeconds: number | null
  remainingSceneAttempts: number | null
  remainingExamAttempts: number | null
  checks: PreflightCheck[]
}

export function preflightAttempt(params: {
  themeId: string
  scenarioId: string
  studyMode: number
  practiceType: string
}) {
  return request.get<unknown, PreflightResp>('/act/student/attempts/preflight', {
    params,
  })
}

/** 创建 attempt（案例直接 ready；随机/自定义进 preparing 等脚本生成） */
export function createAttempt(body: {
  themeId: string
  scenarioId: string
  studyMode: number
  practiceType: string
  difficulty?: number
  customConfigJson?: string
}) {
  return request.post<unknown, AttemptResp>('/act/student/attempts', body)
}

/** attempt 详情（轮询准备进度/报告状态） */
export function getAttempt(attemptId: string) {
  return request.get<unknown, AttemptResp>(`/act/student/attempts/${attemptId}`)
}

/** 正式开始（扣次数、写 deadline；幂等） */
export function startAttempt(attemptId: string) {
  return request.post<unknown, AttemptResp>(`/act/student/attempts/${attemptId}/start`)
}

/** 主动结束（出报告但 passed=false） */
export function finishAttempt(attemptId: string) {
  return request.post<unknown, AttemptResp>(`/act/student/attempts/${attemptId}/finish`)
}

/** 报告详情 */
export function getAttemptReport(attemptId: string) {
  return request.get<unknown, StudentReport>(`/act/student/attempts/${attemptId}/report`)
}

/** 材料查看上下文 */
export function getMaterialViewerContext(materialId: string) {
  return request.get<unknown, MaterialViewerContext>(
    `/act/student/materials/${materialId}/viewer-context`,
  )
}

/** 学员产品档案详情 */
export function getStudentProductProfile(profileId: string) {
  return request.get<unknown, StudentProductProfile>(`/act/student/product-profiles/${profileId}`)
}

