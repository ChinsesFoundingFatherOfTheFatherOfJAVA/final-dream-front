import { describe, expect, it } from 'vitest'
import {
  blockHint,
  buildEntryInfoCells,
  entryTimeText,
  fmtAttemptTimes,
  fmtLimitMinutes,
  fmtMinute,
  fmtScore,
  lastResultPassed,
  lastResultScoreText,
  lastResultStatusText,
  normalizeExamFileUrl,
  startButtonText
} from './entryModel'
import type { StudentExamEntry, StudentExamLastResult } from '@/types/studentExam'

/**
 * 入场页展示口径（契约 01 §S2）。
 *
 * <p>重点守三件容易改错的事：
 * 1. 8 个信息格的**顺序**（2 列行优先，错一格就整行错位）；
 * 2. `不限` / `--` 这类空值文案（留白会让学员以为页面没加载完）；
 * 3. 「批阅中」不能被当成「未通过」（否则学员以为自己挂科了）。
 */
const baseEntry = (patch: Partial<StudentExamEntry> = {}): StudentExamEntry => ({
  arrangeId: 'a1',
  name: '默认考试',
  totalScore: 18,
  questionCount: 10,
  limitMinutes: null,
  passScore: 10.8,
  excellentScore: null,
  usedTimes: 3,
  attemptLimit: 0,
  entryStartAt: '2026-11-10 00:00:00',
  entryEndAt: '2030-11-30 00:00:00',
  fullname: '管理员',
  account: 'admin',
  signatureConfirm: 1,
  preExamDeclare: 0,
  faceVerify: 0,
  canStart: true,
  blockReason: null,
  lastResult: null,
  ...patch
})

describe('entryModel · 数值文案', () => {
  it('分数整数不带小数、小数去掉多余尾零', () => {
    expect(fmtScore(18)).toBe('18分')
    expect(fmtScore(10.8)).toBe('10.8分')
    // 浮点尾巴必须被修掉，否则页面会出现 10.800000000000001
    expect(fmtScore(10.800000001)).toBe('10.8分')
    expect(fmtScore(0)).toBe('0分')
    expect(fmtScore(null)).toBe('--')
  })

  it('限时 0 / null 都是「不限」，不留白', () => {
    expect(fmtLimitMinutes(null)).toBe('不限')
    expect(fmtLimitMinutes(0)).toBe('不限')
    expect(fmtLimitMinutes(60)).toBe('60分钟')
  })

  it('次数上限 0 显示「不限」', () => {
    expect(fmtAttemptTimes(3, 0)).toBe('3/不限')
    expect(fmtAttemptTimes(1, 2)).toBe('1/2')
    expect(fmtAttemptTimes(null, null)).toBe('0/不限')
  })

  it('时间只到分钟；空值给 --', () => {
    expect(fmtMinute('2026-11-10 00:00:00')).toBe('2026-11-10 00:00')
    expect(fmtMinute(null)).toBe('--')
    // 非「日期 时间」形状原样返回，不猜格式
    expect(fmtMinute('2026-11-10')).toBe('2026-11-10')
  })
})

describe('entryModel · 信息网格', () => {
  it('固定 8 格，且顺序是 2 列行优先（错一格整行错位）', () => {
    const cells = buildEntryInfoCells(baseEntry())
    expect(cells.map((c) => c.label)).toEqual([
      // 第一行：左 试卷总分 / 右 通过分数
      '试卷总分',
      '通过分数',
      // 第二行：左 试题总数 / 右 优秀分数
      '试题总数',
      '优秀分数',
      // 第三行：左 考试限时 / 右 考试次数
      '考试限时',
      '考试次数',
      // 第四行：左 交卷时间 / 右 考生姓名
      '交卷时间',
      '考生姓名'
    ])
  })

  it('「入场时间」不进网格（它在标题下方单独一行）', () => {
    const cells = buildEntryInfoCells(baseEntry())
    expect(cells.some((c) => c.label === '入场时间')).toBe(false)
  })

  it('值取自接口字段，缺值走统一占位', () => {
    const cells = buildEntryInfoCells(
      baseEntry({ excellentScore: null, limitMinutes: null, lastResult: null })
    )
    const byKey = Object.fromEntries(cells.map((c) => [c.key, c.value]))
    expect(byKey.totalScore).toBe('18分')
    expect(byKey.passScore).toBe('10.8分')
    expect(byKey.questionCount).toBe('10题')
    expect(byKey.excellentScore).toBe('--')
    expect(byKey.limitMinutes).toBe('不限')
    expect(byKey.usedTimes).toBe('3/不限')
    expect(byKey.submitAt).toBe('--')
    expect(byKey.fullname).toBe('管理员')
  })

  it('交卷时间取自最近一次作答的提交时间', () => {
    const last: StudentExamLastResult = {
      attemptId: 't1',
      status: 'finished',
      score: 4,
      passed: 0,
      submitAt: '2026-11-10 13:00:00',
      answerDetailAvailable: true,
      answerDetailBlockReason: null
    }
    const cells = buildEntryInfoCells(baseEntry({ lastResult: last }))
    expect(cells.find((c) => c.key === 'submitAt')?.value).toBe('2026-11-10 13:00')
  })
})

describe('entryModel · 入场时间行', () => {
  it('两端都有时间时用「A 至 B」', () => {
    expect(entryTimeText(baseEntry())).toBe('入场时间：2026-11-10 00:00 至 2030-11-30 00:00')
  })

  it('只有一端时说明是哪一端，不硬拼成「至 --」', () => {
    expect(entryTimeText(baseEntry({ entryStartAt: '' }))).toBe(
      '入场时间：2030-11-30 00:00 截止'
    )
    expect(entryTimeText(baseEntry({ entryEndAt: '' }))).toBe('入场时间：2026-11-10 00:00 起')
  })
})

describe('entryModel · 考试结果', () => {
  const last = (patch: Partial<StudentExamLastResult>): StudentExamLastResult => ({
    attemptId: 't1',
    status: 'finished',
    score: 4,
    passed: 0,
    submitAt: '2026-11-10 13:00:00',
    answerDetailAvailable: true,
    answerDetailBlockReason: null,
    ...patch
  })

  it('批阅未完成时显示「批阅中」，绝不能显示「未通过」', () => {
    // passed=null 表示还没批阅完；当成未通过会让学员误以为已经挂科
    expect(lastResultStatusText(last({ passed: null }))).toBe('批阅中')
    expect(lastResultPassed(last({ passed: null }))).toBe(false)
  })

  it('已出分时区分通过 / 未通过', () => {
    expect(lastResultStatusText(last({ passed: 1 }))).toBe('已通过')
    expect(lastResultPassed(last({ passed: 1 }))).toBe(true)
    expect(lastResultStatusText(last({ passed: 0 }))).toBe('未通过')
  })

  it('未交卷 / 已作废各自有文案', () => {
    expect(lastResultStatusText(last({ status: 'in_progress', passed: null }))).toBe('未交卷')
    expect(lastResultStatusText(last({ status: 'invalid' }))).toBe('已作废')
  })

  it('从未考过时结果区整体不渲染（调用方判 null）', () => {
    expect(lastResultStatusText(null)).toBe('--')
    expect(lastResultScoreText(null)).toBe('--')
  })

  it('未出分时最高分为 --，不显示 0 分', () => {
    expect(lastResultScoreText(last({ score: null }))).toBe('--')
    expect(lastResultScoreText(last({ score: 4 }))).toBe('4分')
  })
})

describe('entryModel · 主按钮与阻断原因', () => {
  it('考过是「再次考试」，没考过是「开始考试」', () => {
    expect(startButtonText(baseEntry())).toBe('开始考试')
    expect(
      startButtonText(
        baseEntry({
          lastResult: {
            attemptId: 't1',
            status: 'finished',
            score: 4,
            passed: 0,
            submitAt: '2026-11-10 13:00:00',
            answerDetailAvailable: true,
            answerDetailBlockReason: null
          }
        })
      )
    ).toBe('再次考试')
  })

  it('可开考时不给任何提示', () => {
    expect(blockHint(baseEntry({ canStart: true }))).toBe('')
  })

  it('不可开考时如实展示后端原因，不改写', () => {
    // 后端给什么就显示什么：前端硬编文案会与真实原因脱节
    expect(blockHint(baseEntry({ canStart: false, blockReason: '考试尚未开始' }))).toBe(
      '考试尚未开始'
    )
    expect(blockHint(baseEntry({ canStart: false, blockReason: '考试次数已用完' }))).toBe(
      '考试次数已用完'
    )
  })

  it('后端没给原因时给一句兜底，不留空白', () => {
    expect(blockHint(baseEntry({ canStart: false, blockReason: null }))).toBe('当前不可开始考试')
  })

  it('entry 为 null 时按钮文案安全降级', () => {
    expect(startButtonText(null)).toBe('开始考试')
    expect(blockHint(null)).toBe('')
  })
})

describe('entryModel · 文件 URL 规整', () => {
  it('上传接口的 /api 前缀要剥掉，对齐契约 §11.5 的 imageUrl', () => {
    // 混用会让后端按错误路径落库，批阅看抓拍图时 404
    expect(normalizeExamFileUrl('/api/exam/files/2026/11/sign-1.png')).toBe(
      '/exam/files/2026/11/sign-1.png'
    )
  })

  it('已经是不带前缀的形状时原样返回', () => {
    expect(normalizeExamFileUrl('/exam/files/2026/11/a.png')).toBe('/exam/files/2026/11/a.png')
  })

  it('空值返回空串而不是 "null"', () => {
    expect(normalizeExamFileUrl(null)).toBe('')
    expect(normalizeExamFileUrl('')).toBe('')
  })
})
