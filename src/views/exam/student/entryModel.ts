/**
 * 入场页的展示口径（契约 01 §S2，接口 04 §11.3）。
 *
 * <p>抽成纯函数的原因同 `examListModel.ts`：入场页的 8 个信息格顺序、`不限` / `--`
 * 这类空值文案、以及「开始考试 / 再次考试」的切换规则都是**容易被顺手改错**的地方，
 * 单独抽出来才能配单测守住。
 *
 * <p>★ 格内顺序不是随意排的：原平台（`stu/examentry`）是 **2 列、行优先**，
 * 左列 试卷总分/试题总数/考试限时/交卷时间，右列 通过分数/优秀分数/考试次数/考生姓名。
 * 所以数组按「行优先」排列，模板里用 `grid-template-columns: 1fr 1fr` 直接铺即可。
 */
import type { StudentExamLastResult, StudentExamEntry } from '@/types/studentExam'
import { formatAttemptTimes } from './examListModel'

/** 入场信息网格的一格 */
export interface EntryInfoCell {
  /** 用于取图标，不是接口字段 */
  key: string
  label: string
  value: string
}

/**
 * 时间只显示到分钟。
 *
 * <p>接口给的是 `yyyy-MM-dd HH:mm:ss`，原平台入场页显示到分钟（实测
 * 「入场时间：2026-11-10 00:00 至 2030-11-30 00:00」）。秒对学员无意义，
 * 一律截掉，避免出现「00:00:00」这种更长的串把整行撑宽。
 */
export function fmtMinute(value: string | null | undefined): string {
  if (!value) return '--'
  const text = String(value)
  // 只处理「日期 时间」形状；纯日期或其它格式原样返回，不猜
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text) ? text.slice(0, 16) : text
}

/**
 * 分数文案：整数不带小数、小数保留必要位（18 / 10.8）。
 *
 * <p>接口用 number 传，18.00 到了前端就是 18，但 10.80 会变 10.8；
 * 这里显式去掉浮点尾巴，避免出现 `10.800000000000001`。
 */
export function fmtScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '--'
  const num = Number(value)
  const text = Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)))
  return `${text}分`
}

/** 时长：0/null 都是不限时，显示「不限」而不是留白（契约 01 §4D） */
export function fmtLimitMinutes(value: number | null | undefined): string {
  if (value == null) return '不限'
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '不限'
  return `${num}分钟`
}

/**
 * 考试次数：`已用/上限`，上限 0 显示「不限」（与列表页同一口径）。
 *
 * <p>直接复用 `examListModel.formatAttemptTimes`，不另写一份：
 * 列表页与入场页的次数文案必须一致，两处各写一份迟早会出现
 * 「列表显示 3/不限、入场页显示 3/0」的口径分裂。
 */
export function fmtAttemptTimes(used: number | null | undefined, limit: number | null | undefined): string {
  return formatAttemptTimes(used == null ? 0 : Number(used), limit == null ? 0 : Number(limit))
}

/**
 * 入场信息 8 格（行优先，2 列）。
 *
 * <p>`入场时间` 不在网格里：原平台把它放在标题正下方单独一行（实测 y232..246），
 * 网格里只有这 8 项。少一项或多一项都会让 2 列网格错行，所以顺序写死。
 */
export function buildEntryInfoCells(entry: StudentExamEntry): EntryInfoCell[] {
  return [
    { key: 'totalScore', label: '试卷总分', value: fmtScore(entry.totalScore) },
    { key: 'passScore', label: '通过分数', value: fmtScore(entry.passScore) },
    { key: 'questionCount', label: '试题总数', value: `${entry.questionCount}题` },
    { key: 'excellentScore', label: '优秀分数', value: fmtScore(entry.excellentScore) },
    { key: 'limitMinutes', label: '考试限时', value: fmtLimitMinutes(entry.limitMinutes) },
    { key: 'usedTimes', label: '考试次数', value: fmtAttemptTimes(entry.usedTimes, entry.attemptLimit) },
    { key: 'submitAt', label: '交卷时间', value: fmtMinute(entry.lastResult?.submitAt) },
    { key: 'fullname', label: '考生姓名', value: entry.fullname || '--' }
  ]
}

/** 标题下方那行「入场时间：A 至 B」 */
export function entryTimeText(entry: StudentExamEntry): string {
  const start = fmtMinute(entry.entryStartAt)
  const end = fmtMinute(entry.entryEndAt)
  if (start === '--' && end === '--') return '入场时间：不限'
  if (start === '--') return `入场时间：${end} 截止`
  if (end === '--') return `入场时间：${start} 起`
  return `入场时间：${start} 至 ${end}`
}

/**
 * 「考试结果」条的状态文案（契约 01 §S2：批阅中 / 已出分）。
 *
 * <p>`passed` 为 null 表示尚未批阅完，绝不能当成「未通过」显示——
 * 那会让学员以为自己已经挂科。
 */
export function lastResultStatusText(last: StudentExamLastResult | null): string {
  if (!last) return '--'
  switch (last.status) {
    case 'grading':
      return '批阅中'
    case 'in_progress':
      return '未交卷'
    case 'invalid':
      return '已作废'
    case 'finished':
      if (last.passed == null) return '批阅中'
      return last.passed === 1 ? '已通过' : '未通过'
    default:
      return '--'
  }
}

/** 已通过时结果条走绿色系、其余走红色系（原平台未通过态实测 `#f5222d` 图标） */
export function lastResultPassed(last: StudentExamLastResult | null): boolean {
  return !!last && last.status === 'finished' && last.passed === 1
}

/** 最近一次得分文案；未出分时给 `--`，与列表页一致 */
export function lastResultScoreText(last: StudentExamLastResult | null): string {
  if (!last || last.score == null) return '--'
  return fmtScore(last.score)
}

/** 主按钮文案：考过为「再次考试」，没考过为「开始考试」（契约 01 §S2） */
export function startButtonText(entry: StudentExamEntry | null): string {
  if (!entry) return '开始考试'
  return entry.lastResult ? '再次考试' : '开始考试'
}

/**
 * 不可开考的原因文案。
 *
 * <p>`blockReason` 由后端给出（考试尚未开始 / 考试已结束 / 考试次数已用完），
 * 前端**如实展示，不改写**；为空时不能硬编一个原因，返回空串让调用方不渲染。
 */
export function blockHint(entry: StudentExamEntry | null): string {
  if (!entry) return ''
  if (entry.canStart) return ''
  return entry.blockReason || '当前不可开始考试'
}

/**
 * 把上传接口返回的 `/api/exam/files/...` 转成契约 §11.5 要求的 `imageUrl`。
 *
 * <p>上传接口返回的 `fileUrl` 带网关前缀 `/api`（浏览器同源直接可访问），
 * 但签名接口的 `imageUrl` 契约写的是 `/exam/files/2026/11/sign-xxx.png`（不带 `/api`）。
 * 两者混用会让后端按错误路径落库，且批阅看抓拍图时 404。
 */
export function normalizeExamFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  const text = String(url).trim()
  if (!text) return ''
  return text.startsWith('/api/') ? text.slice(4) : text
}
