/**
 * 结果页 / 答卷详情页的取数与文案口径（契约 `01` §S6、§S7；接口 `04` §11.12、§11.13）。
 *
 * <p>抽成纯函数而不是写在组件里，理由同 `examListModel.ts`：这里的几条口径都是
 * "看起来可以顺手简化、简化了就错"的地方——
 * - **批阅中不等于什么都没有**（DER-03）：要先给客观题分，但总分/通过/排名仍等批阅；
 * - **答题时间要由「交卷时间 − 用时」反推**，接口只给 submitAt 和 usedSeconds；
 * - **正确率 = 答对数/题数**，不是「得分/总分」，两者在主观题上会分叉。
 * 有了单测，后面谁想改口径都得先改断言。
 */
import type {
  AttemptResult,
  ExamHistoryRow,
  PointScoreRow,
  TypeStatRow
} from '@/types/studentExam'

/** 未出分、无数据时统一的占位符；原平台一律用 `--`（半角两个减号） */
export const DASH = '--'

/** 补零：`7` → `07`，用于 `MM-DD HH:mm` 这类不可省略前导零的格式 */
const pad2 = (n: number): string => String(n).padStart(2, '0')

/**
 * 解析后端时间字符串。
 *
 * <p>不直接 `new Date('2026-11-10 12:49:40')`：Safari / 部分 jsdom 对
 * "空格分隔 + 无时区" 的解析结果不一致（可能得到 Invalid Date），
 * 所以先按契约的 `yyyy-MM-dd HH:mm:ss` 手工拆分，拆不出来再退回原生解析。
 */
export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) return null
  const matched = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (matched) {
    const [, y, mo, d, h, mi, s] = matched.map((v) => v ?? '')
    const date = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s || 0)
    )
    return Number.isNaN(date.getTime()) ? null : date
  }
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** `Date` → `MM-DD HH:mm`（原平台结果页与考试历史都用这个短格式） */
export function formatMonthDayMinute(date: Date | null): string {
  if (!date) return DASH
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/**
 * 秒 → 「43秒 / 4分 / 5分34秒 / --」（原平台批阅列表实测格式）。
 *
 * <p>大于 1 分钟时**秒数为 0 就省略秒段**：`240` 是「4分」而不是「4分0秒」。
 */
export function formatUsedTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(Number(seconds)) || seconds < 0) return DASH
  const total = Math.round(Number(seconds))
  if (total < 60) return `${total}秒`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`
}

/**
 * 四格「考试用时」只要分钟数。
 *
 * <p>用四舍五入而不是取整：原平台 265 秒（4分25秒）显示「4 分」，
 * 350 秒显示「6 分」——按"实际花了多少分钟"给人看，取整会把 59 秒看成 0 分。
 */
export function usedMinutes(seconds: number | null | undefined): number | null {
  if (seconds == null || Number.isNaN(Number(seconds)) || seconds < 0) return null
  return Math.max(0, Math.round(Number(seconds) / 60))
}

/**
 * 分数文案：去掉整数后面多余的 `.00`。
 *
 * <p>后端 `score` 是 decimal，JSON 里常是 `4` 或 `4.00`；原平台显示「4」而不是「4.00」。
 */
export function formatScore(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return DASH
  const n = Number(value)
  if (Number.isNaN(n)) return DASH
  if (Number.isInteger(n)) return String(n)
  // 最多两位小数，再去掉尾随 0：3.50 → 3.5，3.05 → 3.05
  return String(Number(n.toFixed(2)))
}

/** 比率 0.22 → 「22%」；接口已按 0~1 给小数（非 22 这种百分数） */
export function formatRate(rate: number | string | null | undefined): string {
  if (rate === null || rate === undefined || rate === '') return DASH
  const n = Number(rate)
  if (Number.isNaN(n)) return DASH
  return `${Math.round(n * 100)}%`
}

/**
 * 「答题时间：11-10 12:45 ~ 11-10 12:49」。
 *
 * <p>契约只给 `submitAt` + `usedSeconds`，起点必须反推：
 * 原平台实测 12:49:40 交卷、用时 265 秒 → 显示 12:45（**按分钟截断，不四舍五入**，
 * 否则 12:45:35 会显示成 12:46，比交卷时间还晚）。
 */
export function formatAnswerRange(
  submitAt: string | null | undefined,
  usedSeconds: number | null | undefined
): string {
  const end = parseDateTime(submitAt)
  if (!end) return DASH
  const used = usedSeconds == null ? 0 : Math.max(0, Math.round(Number(usedSeconds)))
  const start = new Date(end.getTime() - used * 1000)
  return `${formatMonthDayMinute(start)} ~ ${formatMonthDayMinute(end)}`
}

/** 印章状态：只有「已出分」才敢盖章，批阅中盖「未通过」会误导学员 */
export type StampState = 'passed' | 'failed' | 'pending'

export function resolveStampState(result: Pick<AttemptResult, 'graded' | 'passed'>): StampState {
  if (!result.graded) return 'pending'
  return result.passed === 1 ? 'passed' : 'failed'
}

/** 四格指标的一格 */
export interface MetricCell {
  key: 'pass' | 'score' | 'used' | 'rank'
  label: string
  /** 主数值（大字） */
  value: string
  /** 跟在主数值后的小字，如分数的 `/18`、用时的 `分`；没有则为空串 */
  unit: string
  /** 未出分：整格弱化，避免学员把占位当成真实成绩 */
  pending: boolean
}

/**
 * 四格指标。顺序固定「是否通过 / 考试成绩 / 考试用时 / 本次考试排名」（契约 §S6）。
 *
 * <p>**驳回了文档里「批阅中四格全 `--`」的说法**：2026-11-10 复核原平台截图，
 * 批阅中「考试成绩」格显示的是 `4/18`（分数/总分），不是 `--`。
 * 我方在此基础上按 DER-03 再进一步——批阅中显示**客观题分**（如 `4/9`）并注明主观题待批阅，
 * 因为「4/18」会让学员以为最终只有 4 分。
 */
export function buildMetricCells(
  result: Pick<
    AttemptResult,
    | 'graded'
    | 'passed'
    | 'score'
    | 'totalScore'
    | 'objectiveScore'
    | 'objectiveFullScore'
    | 'usedSeconds'
    | 'rankNo'
  >
): MetricCell[] {
  const graded = result.graded
  const passValue = graded ? (result.passed === 1 ? '已通过' : '未通过') : '批阅中'

  // 客观题分与其满分同给同无：只有客观题分而没满分时，绝不显示成「4/--」
  const hasObjective =
    result.objectiveScore != null && result.objectiveFullScore != null
  const scoreCell: MetricCell = graded
    ? { key: 'score', label: '考试成绩', value: formatScore(result.score), unit: `/${formatScore(result.totalScore)}`, pending: false }
    : hasObjective
      ? { key: 'score', label: '考试成绩', value: formatScore(result.objectiveScore), unit: `/${formatScore(result.objectiveFullScore)}`, pending: false }
      : { key: 'score', label: '考试成绩', value: DASH, unit: '', pending: true }

  const minutes = usedMinutes(result.usedSeconds)

  return [
    { key: 'pass', label: '是否通过', value: passValue, unit: '', pending: !graded },
    scoreCell,
    {
      key: 'used',
      label: '考试用时',
      value: minutes == null ? DASH : String(minutes),
      unit: minutes == null ? '' : '分',
      pending: minutes == null
    },
    {
      // 排名必须等批阅完成：同一场考试在批阅期间排名会变，提前给一个数字等于给错
      key: 'rank',
      label: '本次考试排名',
      value: graded && result.rankNo != null ? String(result.rankNo) : DASH,
      unit: '',
      pending: !graded || result.rankNo == null
    }
  ]
}

/**
 * DER-03 的补充说明文案：批阅中要讲清「这是客观题分，最终成绩以批阅完成为准」。
 *
 * <p>没有客观题分或已出分时返回空串，页面据此不渲染提示条。
 */
export function buildObjectiveNote(
  result: Pick<
    AttemptResult,
    'graded' | 'objectiveScore' | 'objectiveFullScore' | 'subjectivePending'
  >
): string {
  if (result.graded) return ''
  if (result.objectiveScore == null || result.objectiveFullScore == null) return ''
  const head = `客观题 ${formatScore(result.objectiveScore)}/${formatScore(result.objectiveFullScore)} 分`
  const tail =
    result.subjectivePending != null && Number(result.subjectivePending) > 0
      ? `，主观题 ${formatScore(result.subjectivePending)} 分待批阅`
      : '，主观题待批阅'
  return `${head}${tail}；最终成绩以批阅完成为准`
}

/** 考试历史一条的展示态 */
export interface HistoryRowView {
  attemptId: string
  /** 成绩：已出分给分数，批阅中给 `--` */
  scoreText: string
  /** 状态文案：未通过 / 已通过 / 批阅中 / 已作废 */
  stateText: string
  /** 状态配色用的键，避免在模板里写一堆 v-if */
  stateKey: 'failed' | 'passed' | 'pending' | 'invalid'
  /** 时间：`MM-DD HH:mm` */
  timeText: string
}

export function buildHistoryRows(rows: ExamHistoryRow[] | null | undefined): HistoryRowView[] {
  return (rows ?? []).map((row) => {
    // submitted 但 score 为空 → 批阅中；有分才是已出分
    const pending = row.score == null
    const stateKey: HistoryRowView['stateKey'] = pending
      ? 'pending'
      : row.passed === 1
        ? 'passed'
        : 'failed'
    return {
      attemptId: row.attemptId,
      scoreText: pending ? DASH : formatScore(row.score),
      stateText: pending ? '批阅中' : row.passed === 1 ? '已通过' : '未通过',
      stateKey,
      timeText: formatMonthDayMinute(parseDateTime(row.submitAt))
    }
  })
}

/** 分题型统计的一行（组合题后端已按一个大题汇总，前端不再拆子题） */
export interface TypeStatView {
  type: number
  typeName: string
  rateText: string
  /** 「答对 1/1」 */
  correctText: string
  /** 「排名 1/2」；未计算排名时为 `--` */
  rankText: string
}

export function buildTypeStatViews(rows: TypeStatRow[] | null | undefined): TypeStatView[] {
  return (rows ?? []).map((row) => ({
    type: row.type,
    typeName: row.typeName,
    rateText: formatRate(row.rate),
    correctText: `答对 ${row.correct}/${row.total}`,
    rankText: row.rank == null || row.rankTotal == null ? DASH : `排名 ${row.rank}/${row.rankTotal}`
  }))
}

/**
 * 总体正确率 = 所有题型答对数之和 / 题数之和。
 *
 * <p>不用「得分/总分」：主观题给部分分时两者会分叉，而原平台这一格标的是「正确率」。
 * 无题可算时返回 null（页面显示 `--`），不返回 0——0% 会被读成"全错"。
 */
export function overallCorrectRate(rows: TypeStatRow[] | null | undefined): number | null {
  const list = rows ?? []
  let total = 0
  let correct = 0
  for (const row of list) {
    total += Number(row.total) || 0
    correct += Number(row.correct) || 0
  }
  return total > 0 ? correct / total : null
}

/**
 * 考核点表格行。
 *
 * <p>契约里 `pointScores` 已受 `answerView.viewPointScore` 控制，不可见时后端给空数组，
 * 前端只需按空数组显示空态，**不要**自己判断权限。
 */
export interface PointScoreView {
  pointId: string
  pointName: string
  totalText: string
  scoreText: string
  rateText: string
}

export function buildPointScoreRows(rows: PointScoreRow[] | null | undefined): PointScoreView[] {
  return (rows ?? []).map((row) => ({
    pointId: row.pointId,
    pointName: row.pointName || DASH,
    totalText: formatScore(row.total),
    scoreText: formatScore(row.score),
    rateText: formatRate(row.rate)
  }))
}

/**
 * 答卷详情右栏「考试成绩」文案。
 *
 * <p>注意与结果页四格分开：这里原平台实测是 **`#F5222D` 24px**，
 * 四格「考试成绩」是 **`#262626` 32px**（`观察素材` §9.6），两个页面的同一个词配色不同，
 * 但文案口径一致：未出分给 `--`。
 */
export function formatPaperScore(score: number | string | null | undefined): string {
  return score == null || score === '' ? DASH : formatScore(score)
}
