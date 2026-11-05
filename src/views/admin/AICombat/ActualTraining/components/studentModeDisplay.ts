/**
 * 主题模式与统计口径（台账 R1-2/R1-3/R1-4）。
 *
 * 为什么单独成文件：训考一体 / 单模式的口径差异同时出现在
 * 「学员管理列表」「主题详情统计卡」「学员详情抽屉」三处，
 * 写在组件里会各写一遍并逐渐分叉；这里只放纯函数，便于单测锁定口径。
 *
 * 数据来源是后端 ThemeDetailResp.stats 与 AD01 学员卡的 training/exam 字段，
 * 均已按 quotaDeducted 正式计数（试练不计入）。
 */

/** 主题模式：1 日常训练 · 2 通关考核 · 3 训考一体 */
export type ThemeMode = number

export interface ModeScoreSource {
  themeMode: ThemeMode
  /** 报告均分（训练+考核合计） */
  averageScore?: number | null
  trainingAverage?: number | null
  examAverage?: number | null
  trainingCount?: number | null
  examCount?: number | null
  /** 后端合计练习次数（仅主题统计有，学员卡无此字段） */
  totalPracticeCount?: number | null
  totalTrainingCount?: number | null
}

/** 训考一体：均分与次数要同时给出训练、考核两套口径 */
export const isDualMode = (mode: ThemeMode): boolean => mode === 3

/**
 * 练习次数：训考一体 = 训练 + 考核；
 * 单模式只算该模式（否则日常训练主题会把考核次数也加进来，与原平台不符）。
 */
export function practiceCountOf(src: ModeScoreSource): number {
  if (src.themeMode === 1) return src.trainingCount ?? src.totalTrainingCount ?? 0
  if (src.themeMode === 2) return src.examCount ?? 0
  return src.totalPracticeCount ?? (src.trainingCount ?? 0) + (src.examCount ?? 0)
}

/**
 * 大号平均分：训考一体 = 训练+考核合计均值；单模式 = 该模式均分。
 * 单模式下该模式无样本时回落合计均值，避免整卡显示成「--」而掩盖已有数据。
 */
export function averageOf(src: ModeScoreSource): number | null {
  if (src.themeMode === 1) return src.trainingAverage ?? src.averageScore ?? null
  if (src.themeMode === 2) return src.examAverage ?? src.averageScore ?? null
  return src.averageScore ?? null
}

/**
 * 后端均分是 2 位小数 BigDecimal，序列化后是 number（14.40 → 14.4）。
 * 这里统一按数值渲染，null/undefined 显示占位符，不显示 "null 分"。
 */
export function formatScore(value: number | null | undefined, empty = '—'): string {
  if (value === null || value === undefined) return empty
  return String(Number(value))
}

/**
 * 学员列表表头（台账 R1-2：训考一体多出「训练均分 / 考核均分」两列；单模式不出，避免同一数值出现两次）。
 * 抽成纯函数的原因：列集合是模板里的条件渲染，只有把它变成可枚举的数据，
 * 才能在不挂载 Element Plus 的前提下锁定"单模式不会多列"这一验收点。
 */
export const STUDENT_COLUMNS_BASE = [
  '学员姓名',
  '部门',
  '来源',
  '状态',
  '场景通过',
  '练习次数',
  '平均得分'
] as const

export const STUDENT_COLUMNS_DUAL_EXTRA = ['训练均分', '考核均分'] as const

/** 表头顺序与 Actions 列收尾 */
export function studentTableHeaders(mode: ThemeMode): string[] {
  return [
    ...STUDENT_COLUMNS_BASE,
    ...(isDualMode(mode) ? STUDENT_COLUMNS_DUAL_EXTRA : []),
    '操作'
  ]
}
