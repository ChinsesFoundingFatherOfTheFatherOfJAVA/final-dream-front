import { describe, expect, it } from 'vitest'
import {
  DASH,
  buildHistoryRows,
  buildMetricCells,
  buildObjectiveNote,
  buildPointScoreRows,
  buildTypeStatViews,
  formatAnswerRange,
  formatRate,
  formatScore,
  formatUsedTime,
  overallCorrectRate,
  parseDateTime,
  resolveStampState,
  usedMinutes
} from './resultModel'
import type { AttemptResult } from '@/types/studentExam'

/** 构造一个已出分的结果，各用例只覆盖自己关心的字段 */
const gradedResult = (patch: Partial<AttemptResult> = {}): AttemptResult => ({
  arrangeId: 'a1',
  attemptId: 'at1',
  name: '默认考试',
  status: 3,
  graded: true,
  passed: 0,
  score: 4,
  totalScore: 18,
  passScore: 10.8,
  objectiveScore: 4,
  objectiveFullScore: 9,
  subjectivePending: 0,
  usedSeconds: 265,
  rankNo: 1,
  submitAt: '2026-11-10 12:49:40',
  answerDetailAvailable: true,
  answerDetailBlockReason: null,
  pointScores: [],
  typeStats: [],
  history: [],
  highestScore: 4,
  ...patch
})

const pendingResult = (patch: Partial<AttemptResult> = {}): AttemptResult =>
  gradedResult({
    status: 2,
    graded: false,
    passed: null,
    score: null,
    subjectivePending: 9,
    rankNo: null,
    ...patch
  })

describe('parseDateTime', () => {
  it('解析契约的 yyyy-MM-dd HH:mm:ss（不依赖原生宽松解析）', () => {
    const d = parseDateTime('2026-11-10 12:49:40')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(10) // 0 基，11 月
    expect(d!.getDate()).toBe(10)
    expect(d!.getHours()).toBe(12)
    expect(d!.getMinutes()).toBe(49)
    expect(d!.getSeconds()).toBe(40)
  })

  it('兼容 ISO 的 T 分隔与缺秒', () => {
    expect(parseDateTime('2026-11-10T12:49')!.getMinutes()).toBe(49)
    expect(parseDateTime('2026-11-10T12:49')!.getSeconds()).toBe(0)
  })

  it('空值与非法值返回 null，不抛错', () => {
    expect(parseDateTime(null)).toBeNull()
    expect(parseDateTime('')).toBeNull()
    expect(parseDateTime('不是时间')).toBeNull()
  })
})

describe('formatUsedTime（批阅列表实测格式）', () => {
  it('不足 1 分钟按秒', () => {
    expect(formatUsedTime(43)).toBe('43秒')
    expect(formatUsedTime(0)).toBe('0秒')
  })

  it('整分钟省略秒段', () => {
    expect(formatUsedTime(240)).toBe('4分')
    expect(formatUsedTime(60)).toBe('1分')
  })

  it('非整分钟拼接两段', () => {
    expect(formatUsedTime(334)).toBe('5分34秒')
  })

  it('空值/负数给 --', () => {
    expect(formatUsedTime(null)).toBe(DASH)
    expect(formatUsedTime(undefined)).toBe(DASH)
    expect(formatUsedTime(-1)).toBe(DASH)
  })
})

describe('usedMinutes（四格只要分钟）', () => {
  it('四舍五入到最近分钟', () => {
    expect(usedMinutes(265)).toBe(4)
    expect(usedMinutes(350)).toBe(6)
  })

  it('59 秒不塌成 0 分（取整会得到 0，这里是 1）', () => {
    expect(usedMinutes(59)).toBe(1)
  })

  it('空值给 null 而不是 0', () => {
    expect(usedMinutes(null)).toBeNull()
  })
})

describe('formatScore / formatRate', () => {
  it('整数不显示 .00', () => {
    expect(formatScore(4)).toBe('4')
    expect(formatScore('4.00')).toBe('4')
  })

  it('小数去掉尾随零', () => {
    expect(formatScore(3.5)).toBe('3.5')
    expect(formatScore(10.8)).toBe('10.8')
  })

  it('空值给 --', () => {
    expect(formatScore(null)).toBe(DASH)
    expect(formatScore('')).toBe(DASH)
  })

  it('比率按小数换算成百分数并四舍五入', () => {
    expect(formatRate(0.22)).toBe('22%')
    expect(formatRate(1)).toBe('100%')
    expect(formatRate(0)).toBe('0%')
    expect(formatRate(0.005)).toBe('1%')
    expect(formatRate(null)).toBe(DASH)
  })
})

describe('formatAnswerRange（起点由交卷时间 − 用时反推）', () => {
  it('12:49:40 交卷、用时 265 秒 → 起点 12:45，与截图一致', () => {
    expect(formatAnswerRange('2026-11-10 12:49:40', 265)).toBe('11-10 12:45 ~ 11-10 12:49')
  })

  it('起点按分钟截断：12:45:35 不能显示成 12:46（会比交卷时间还晚）', () => {
    // 12:49:40 − 245 秒 = 12:45:35
    expect(formatAnswerRange('2026-11-10 12:49:40', 245)).toBe('11-10 12:45 ~ 11-10 12:49')
  })

  it('缺少交卷时间给 --', () => {
    expect(formatAnswerRange(null, 100)).toBe(DASH)
  })

  it('用时为空时起点=终点，不报错', () => {
    expect(formatAnswerRange('2026-11-10 12:49:40', null)).toBe('11-10 12:49 ~ 11-10 12:49')
  })
})

describe('resolveStampState（批阅中不盖章）', () => {
  it('已出分且通过=绿章', () => {
    expect(resolveStampState({ graded: true, passed: 1 })).toBe('passed')
  })

  it('已出分未通过=红章', () => {
    expect(resolveStampState({ graded: true, passed: 0 })).toBe('failed')
  })

  it('批阅中=pending：盖「未通过」会误导学员', () => {
    expect(resolveStampState({ graded: false, passed: null })).toBe('pending')
  })
})

describe('buildMetricCells（四格指标）', () => {
  it('已出分：是否通过 / 分数/总分 / 分钟 / 排名', () => {
    const cells = buildMetricCells(gradedResult())
    expect(cells.map((c) => c.label)).toEqual([
      '是否通过',
      '考试成绩',
      '考试用时',
      '本次考试排名'
    ])
    expect(cells[0]).toMatchObject({ value: '未通过', pending: false })
    expect(cells[1]).toMatchObject({ value: '4', unit: '/18', pending: false })
    expect(cells[2]).toMatchObject({ value: '4', unit: '分', pending: false })
    expect(cells[3]).toMatchObject({ value: '1', pending: false })
  })

  it('批阅中：成绩给客观题分 4/9，不是 4/18（DER-03）', () => {
    const cells = buildMetricCells(pendingResult())
    expect(cells[1]).toMatchObject({ value: '4', unit: '/9', pending: false })
  })

  it('批阅中：是否通过给「批阅中」，不提前判未通过', () => {
    expect(buildMetricCells(pendingResult())[0]).toMatchObject({
      value: '批阅中',
      pending: true
    })
  })

  it('批阅中：排名必须等批阅完成，给 --', () => {
    expect(buildMetricCells(pendingResult())[3]).toMatchObject({ value: DASH, pending: true })
  })

  it('批阅中但没有客观题分时，成绩格退回 -- 而不是 0 或 4/--', () => {
    const cells = buildMetricCells(
      pendingResult({ objectiveScore: null, objectiveFullScore: null })
    )
    expect(cells[1]).toMatchObject({ value: DASH, unit: '', pending: true })
  })

  it('有客观题分但缺满分时不出「4/--」这种残句', () => {
    const cells = buildMetricCells(
      pendingResult({ objectiveScore: 4, objectiveFullScore: null })
    )
    expect(cells[1]).toMatchObject({ value: DASH, unit: '' })
  })

  it('已出分但排名未计算（单人考试）时排名给 --', () => {
    expect(buildMetricCells(gradedResult({ rankNo: null }))[3]).toMatchObject({ value: DASH })
  })

  it('用时为空时用时格给 -- 且不带「分」单位', () => {
    expect(buildMetricCells(gradedResult({ usedSeconds: 0 }))[2]).toMatchObject({ value: '0' })
    expect(buildMetricCells(gradedResult({ usedSeconds: null as unknown as number }))[2]).toMatchObject({
      value: DASH,
      unit: ''
    })
  })
})

describe('buildObjectiveNote（DER-03 提示条）', () => {
  it('批阅中给出客观分 + 主观题待批阅 + 最终成绩口径', () => {
    const note = buildObjectiveNote(pendingResult())
    expect(note).toContain('客观题 4/9 分')
    expect(note).toContain('主观题 9 分待批阅')
    expect(note).toContain('最终成绩以批阅完成为准')
  })

  it('已出分不显示提示条', () => {
    expect(buildObjectiveNote(gradedResult())).toBe('')
  })

  it('没有客观分时不显示提示条', () => {
    expect(
      buildObjectiveNote(pendingResult({ objectiveScore: null, objectiveFullScore: null }))
    ).toBe('')
  })

  it('主观题为 0 待批阅时不写「0 分待批阅」', () => {
    const note = buildObjectiveNote(pendingResult({ subjectivePending: 0 }))
    expect(note).not.toContain('0 分待批阅')
    expect(note).toContain('主观题待批阅')
  })
})

describe('buildHistoryRows（左侧考试历史）', () => {
  it('已出分/批阅中混排，批阅中成绩给 --', () => {
    const rows = buildHistoryRows([
      { attemptId: 'a', score: 4, passed: 0, submitAt: '2026-11-10 13:00:00' },
      { attemptId: 'b', score: null, passed: null, submitAt: '2026-11-10 12:34:00' }
    ])
    expect(rows[0]).toMatchObject({ scoreText: '4', stateText: '未通过', stateKey: 'failed', timeText: '11-10 13:00' })
    expect(rows[1]).toMatchObject({ scoreText: DASH, stateText: '批阅中', stateKey: 'pending', timeText: '11-10 12:34' })
  })

  it('通过态与未通过态配色键不同', () => {
    const rows = buildHistoryRows([{ attemptId: 'a', score: 18, passed: 1, submitAt: '2026-11-10 13:00:00' }])
    expect(rows[0]).toMatchObject({ stateText: '已通过', stateKey: 'passed' })
  })

  it('空列表返回空数组', () => {
    expect(buildHistoryRows(null)).toEqual([])
    expect(buildHistoryRows([])).toEqual([])
  })
})

describe('buildTypeStatViews（本次考试情况分析）', () => {
  it('组合题按一个大题汇总展示（答对 2/5）', () => {
    const [combo] = buildTypeStatViews([
      { type: 5, typeName: '组合题', total: 5, correct: 2, rate: 0.4, rank: 1, rankTotal: 2 }
    ])
    expect(combo).toMatchObject({
      typeName: '组合题',
      rateText: '40%',
      correctText: '答对 2/5',
      rankText: '排名 1/2'
    })
  })

  it('无排名数据时排名给 --', () => {
    const [row] = buildTypeStatViews([
      { type: 0, typeName: '单选题', total: 1, correct: 1, rate: 1, rank: null, rankTotal: null }
    ])
    expect(row!.rankText).toBe(DASH)
  })
})

describe('overallCorrectRate', () => {
  it('按答对数/题数汇总，不是分数占比', () => {
    // 单选 1/1、多选 0/1、判断 1/1、填空 0/1、问答 0/1、组合 2/5 = 4/10
    const rate = overallCorrectRate([
      { type: 0, typeName: '单选题', total: 1, correct: 1, rate: 1, rank: 1, rankTotal: 1 },
      { type: 1, typeName: '多选题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 1 },
      { type: 2, typeName: '判断题', total: 1, correct: 1, rate: 1, rank: 1, rankTotal: 1 },
      { type: 3, typeName: '填空题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 1 },
      { type: 4, typeName: '问答题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 1 },
      { type: 5, typeName: '组合题', total: 5, correct: 2, rate: 0.4, rank: 1, rankTotal: 2 }
    ])
    expect(rate).toBeCloseTo(0.4, 5)
  })

  it('没有题型数据时返回 null，不返回 0（0% 会被读成"全错"）', () => {
    expect(overallCorrectRate([])).toBeNull()
    expect(overallCorrectRate(null)).toBeNull()
  })
})

describe('buildPointScoreRows（考核点得分表）', () => {
  it('照搬后端行，数值统一格式化', () => {
    const rows = buildPointScoreRows([
      { pointId: 'p1', pointName: 'MES的三大核心作用', total: 2, score: 2, rate: 1 }
    ])
    expect(rows[0]).toEqual({
      pointId: 'p1',
      pointName: 'MES的三大核心作用',
      totalText: '2',
      scoreText: '2',
      rateText: '100%'
    })
  })

  it('后端按权限给空数组时前端只显示空态，不自行判断', () => {
    expect(buildPointScoreRows(null)).toEqual([])
  })

  it('考核点名缺失时给 -- 而不是空白单元格', () => {
    const [row] = buildPointScoreRows([
      { pointId: 'p1', pointName: '', total: 2, score: 2, rate: 1 }
    ])
    expect(row!.pointName).toBe(DASH)
  })
})
