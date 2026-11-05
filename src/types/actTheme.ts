/**
 * AI实战训练场（管理端）类型定义
 * 对应接口文档 03；所有 id / versionNo 均为字符串（防 JS 长整型精度丢失）
 */

// ---------- 枚举映射 ----------

/** 发布状态：0草稿 1发布中 2发布失败 3已发布 4已暂停 5已结束 */
export type ActThemeStatus = 0 | 1 | 2 | 3 | 4 | 5
/** 主题模式：1日常训练 2通关考核 3训考一体 */
export type ActThemeMode = 1 | 2 | 3
/** 分配模式：1指定分配 2全体学员 */
export type ActAssignMode = 1 | 2
/** 难度：1简单 2正常 3困难 */
export type ActDifficulty = 1 | 2 | 3
/** 加入方式：1仅指派 2指派+完全公开 */
export type ActJoinMode = 1 | 2
/** AI 响应模式：1专家 2快速 */
export type ActAiResponseMode = 1 | 2
/** 场景通过类型：1累计达标 2连续达标 */
export type ActScenePassType = 1 | 2
/** 练习方式：case 案例练习 / custom 自定义练习 / random 随机练习 */
export type ActPracticeMethod = 'case' | 'custom' | 'random'

export const ACT_STATUS_TEXT: Record<number, string> = {
  0: '草稿', 1: '发布中', 2: '发布失败', 3: '已发布', 4: '已暂停', 5: '已结束'
}
export const ACT_THEME_MODE_TEXT: Record<number, string> = {
  1: '日常训练', 2: '通关考核', 3: '训考一体'
}
export const ACT_ASSIGN_MODE_TEXT: Record<number, string> = {
  1: '指定分配', 2: '全体学员'
}
export const ACT_DIFFICULTY_TEXT: Record<number, string> = {
  1: '简单', 2: '正常', 3: '困难'
}
/** 难度星级（1~3 星） */
export function difficultyStars(difficulty: number): string {
  const n = Math.min(3, Math.max(1, difficulty))
  return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n)
}
export const ACT_SOURCE_TYPE_TEXT: Record<number, string> = {
  1: '单独安排', 2: '项目安排'
}
export const ACT_PRACTICE_METHOD_TEXT: Record<string, string> = {
  case: '案例练习', custom: '自定义练习', random: '随机练习'
}

// ---------- 列表 ----------

export interface ActThemeListReq {
  page?: number
  pageSize?: number
  status?: number
  themeMode?: number
  keyword?: string
  /** 占位字段：归属（本次前端不传） */
  jurisdictionType?: number
  /** 占位字段：来源（本次前端不传） */
  sourceType?: number
}

export interface ActThemeCard {
  id: string
  themeName: string
  themeDesc: string | null
  status: number
  themeMode: number
  sourceType: number | null
  participantCount: number
  updatedAt: string | null
}

export interface ActPageResult<T> {
  total: number
  records: T[]
}

// ---------- 详情 ----------

export interface ActThemeStats {
  passRate: number
  passUserCount: number
  participantCount: number
  avgScore: number
  totalTrainingCount: number
  /** 练习总次数（训练 + 考核，后端按报告表聚合） */
  totalPracticeCount?: number | null
  trainingCount?: number | null
  examCount?: number | null
  /** 训练均分 / 考核均分，无样本时为 null */
  trainingAverage?: number | null
  examAverage?: number | null
}

export interface ActThemeDetail {
  id: string
  themeName: string
  themeDesc: string | null
  status: number
  themeMode: number
  assignMode: number
  difficulty: number
  currentVersionNo: string
  createdAt: string | null
  updatedAt: string | null
  stats: ActThemeStats
  scenarioUnitCount: number
  versionCount: number
}

// ---------- 场景单元 ----------

export interface ActEvaluationDimension {
  id: string
  dimensionName: string
  weight: number
  dimensionDesc: string | null
  excellentStandard: string | null
  goodStandard: string | null
  improveStandard: string | null
  sortOrder: number
}

export interface ActScenarioUnit {
  id: string
  sortOrder: number
  unitName: string
  audience: string | null
  timeLimitMinutes: number | null
  businessGoal: string | null
  icebergElements: string[]
  businessImpact: string | null
  failureCost: string | null
  coreConflict: string | null
  commonFailureModes: string[]
  difficulties: string[]
  forbiddenBehaviors: string[]
  passScore: number
  dimensions: ActEvaluationDimension[]
}

// ---------- 主题设置 ----------

export interface ActBasicSetting {
  themeName: string
  themeDesc: string | null
  ownerUserId: string
  planStartTime: string | null
  planEndTime: string | null
}

export interface ActAccessSetting {
  totalDrillCount: number
  remainingEnterpriseCapacity: number
  perSceneLimit: number | null
  joinMode: number
  guestAccessEnabled: boolean
}

export interface ActAntiCheat {
  faceCheckEnabled: boolean
  faceCheckStage: string | null
  screenSwitchMode: string
  screenSwitchLimit: number
}

export interface ActStrategySetting {
  aiResponseMode: number
  trainingModeEnabled: boolean
  assessmentModeEnabled: boolean
  coachReviewEnabled: boolean
  suggestionEnabled: boolean
  practiceMethods: string[]
  difficulty: number
  allowCustomDifficulty: boolean
  antiCheat: ActAntiCheat
}

export interface ActPassStandardSetting {
  scenePassType: number
  scenePassCount: number
}

export interface ActContentOverview {
  scenarioUnitCount: number
  customerProfileCount: number
  icebergElementCount: number
  evaluationDimensionCount: number
}

export interface ActThemeSettings {
  versionNo: string
  basic: ActBasicSetting
  access: ActAccessSetting
  strategy: ActStrategySetting
  passStandard: ActPassStandardSetting
  contentOverview: ActContentOverview
}

/** 保存请求（注意：不传 ownerUserId 占位字段） */
export interface ActBasicSettingSave {
  themeName: string
  themeDesc: string | null
  planStartTime: string | null
  planEndTime: string | null
}

export interface ActThemeSettingsSaveReq {
  basic: ActBasicSettingSave
  access: Omit<ActAccessSetting, 'remainingEnterpriseCapacity'>
  strategy: ActStrategySetting
  passStandard: ActPassStandardSetting
}

export interface ActThemeSettingsSaveResp {
  id: string
  versionNo: string
  themeMode: number
  assignMode: number
}

// ---------- 版本 ----------

export interface ActVersionItem {
  versionNo: string
  current: boolean
  createdAt: string | null
  usedUserCount: number
  completedCount: number
  inProgressCount: number
  creator: string
}

// ---------- 数据分析（FP-20，真实统计） ----------

/** 统计范围四档：首次 / 最近一次 / 全部记录 / 个人最高 */
export type ActAnalysisScope = 'first' | 'last' | 'all' | 'max'
/** 维度掌握变化的对比终点：最近一次 / 最高 */
export type ActCompareEnd = 'last' | 'max'

/** 分布单位：person=人（first/last/max）· percent=百分比（all） */
export type ActAnalysisUnit = 'person' | 'percent'

export interface ActAnalysisOverview {
  practiced: number
  totalUser: number
  participantCount: number
  totalCount: number
  passCount: number
  passRate: number
}

export interface ActAnalysisSegment {
  range: string
  value: number
  /** 与首次相比的增减；首次口径为 null（不显示） */
  delta: number | null
}

export interface ActAnalysisDistribution {
  unit: ActAnalysisUnit
  /** 无数据为 null */
  avg: number | null
  segments: ActAnalysisSegment[]
}

export interface ActAnalysisMastery {
  dimensionId: string
  dimensionName: string
  weight: number | null
  /** 无数据为 null */
  avg: number | null
  low: number
  mid: number
  high: number
  unit: ActAnalysisUnit
  /** 是否暂无练习数据（avg=null）；用它判空，不要用 0 判空 */
  empty: boolean
}

export interface ActAnalysisChange {
  dimensionName: string
  /** 无数据为 null */
  firstScore: number | null
  lastScore: number | null
  maxScore: number | null
  delta: number | null
  /** 主题内没有任何学员练过两次 */
  notSecondTime: boolean
}

export interface ActAnalysisDimension {
  id: string
  dimensionName: string
  weight: number | null
  dimensionDesc: string | null
  sortOrder: number
}

/** FP-20 数据分析响应（GET /act/admin/theme/{id}/analysis） */
export interface ActThemeAnalysis {
  themeId: string
  sceneUnitId: string | null
  scope: ActAnalysisScope
  compareEnd: ActCompareEnd
  studyMode: number | null
  overview: ActAnalysisOverview
  distribution: ActAnalysisDistribution
  mastery: ActAnalysisMastery[]
  change: ActAnalysisChange[]
  dimensions: ActAnalysisDimension[]
}

// ---------- 状态操作 ----------

export interface ActThemeStatusResp {
  id: string
  status: number
}

export interface ActRollbackResp {
  id: string
  currentVersionNo: string
}
