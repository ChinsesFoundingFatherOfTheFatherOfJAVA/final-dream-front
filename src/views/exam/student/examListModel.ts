/**
 * 学员考试列表的分组 / 统计 / 排序口径（契约 01 §S1）。
 *
 * <p>抽成纯函数而不是写在组件里：这三条口径是本次施工里**最容易被"顺手简化"**的地方
 * （比如把次数用尽的未通过记录从列表里过滤掉），单独抽出来配单测才守得住。
 */
import type { ExamCardGroup, StudentExamItem } from '@/types/studentExam'

/** 左侧统计栏：契约明确只放三项，不加「已通过」「已作废」等第四项 */
export interface ExamStatBuckets {
  /** 待考：从未作答，或已作答但都还能再考 */
  notStarted: number
  /** 进行中：有未交卷答卷（studentStatus=in_progress） */
  inProgress: number
  /** 已完成：已交卷（含批阅中与已出分），即学员已经考过了 */
  finished: number
}

/**
 * 卡片分档。
 *
 * <p>判定顺序刻意是 passed 优先：
 * - `passed=1` → 已通过，无论状态如何都归「已通过」组；
 * - 否则若学员**已经考过**（有交卷时间，或状态为 grading/finished）→ 「未通过」组。
 *   **不看次数是否用完**：次数用尽的未通过记录必须留在列表里可查看成绩，
 *   只是入场页会说明不可再考（契约 01 §S1 第 3 条验收）。
 * - 其余（从未考过 / 只在进行中）→ 「未开始」组。
 */
export function resolveCardGroup(exam: StudentExamItem): ExamCardGroup {
  if (exam.passed === 1) return 'passed'
  const hasAttempted =
    exam.lastSubmitAt != null ||
    exam.studentStatus === 'grading' ||
    exam.studentStatus === 'finished'
  return hasAttempted ? 'failed' : 'not_started'
}

/** 左侧三项统计。批阅中算「已完成」——学员的动作已经做完了。 */
export function buildStatBuckets(list: StudentExamItem[]): ExamStatBuckets {
  const buckets: ExamStatBuckets = { notStarted: 0, inProgress: 0, finished: 0 }
  for (const exam of list) {
    if (exam.studentStatus === 'in_progress') {
      buckets.inProgress += 1
    } else if (exam.studentStatus === 'grading' || exam.studentStatus === 'finished') {
      buckets.finished += 1
    } else {
      buckets.notStarted += 1
    }
  }
  return buckets
}

/**
 * 分组内排序（契约 01 §S1）：
 * - 未开始 / 未通过：按入场结束时间**升序**（快截止的排前面，学员优先处理）；
 * - 已通过：按提交时间**倒序**（最近考过的排前面）。
 *
 * <p>时间为空时排到该组末尾，避免 null 把有效数据挤走。
 */
export function sortGroup(group: ExamCardGroup, list: StudentExamItem[]): StudentExamItem[] {
  const asc = (a: string | null, b: string | null) => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    return a.localeCompare(b)
  }
  const rows = [...list]
  if (group === 'passed') {
    rows.sort((x, y) => asc(y.lastSubmitAt, x.lastSubmitAt))
  } else {
    rows.sort((x, y) => asc(x.entryEndAt, y.entryEndAt))
  }
  return rows
}

/** 三组的展示顺序与标题（契约 01 §S1：未开始 / 未通过（可重考） / 已通过） */
export const EXAM_GROUP_META: { key: ExamCardGroup; label: string }[] = [
  { key: 'not_started', label: '未开始' },
  { key: 'failed', label: '未通过（可重考）' },
  { key: 'passed', label: '已通过' }
]

/** 「3/不限」这种次数文案：上限 0 视为不限次 */
export function formatAttemptTimes(used: number, limit: number): string {
  return `${used}/${limit > 0 ? limit : '不限'}`
}

/** 有效期文案；两端都有时间时用「A 至 B」，与原平台入场页一致 */
export function formatEntryRange(startAt: string | null, endAt: string | null): string {
  if (!startAt && !endAt) return '不限时间'
  if (!startAt) return `截止 ${endAt}`
  if (!endAt) return `${startAt} 起`
  return `${startAt} 至 ${endAt}`
}

/** 卡片状态徽标文案；进行中要能一眼看出「还没交卷」 */
export function statusText(exam: StudentExamItem): string {
  switch (exam.studentStatus) {
    case 'in_progress':
      return '进行中'
    case 'grading':
      return '批阅中'
    case 'finished':
      return exam.passed === 1 ? '已通过' : '未通过'
    case 'invalid':
      return '已作废'
    default:
      return '待考'
  }
}
