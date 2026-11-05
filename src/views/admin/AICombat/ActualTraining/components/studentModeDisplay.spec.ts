import { describe, expect, it } from 'vitest'
import {
  averageOf,
  formatScore,
  isDualMode,
  practiceCountOf,
  type ModeScoreSource,
} from './studentModeDisplay'

/** 训考一体（mode=3）的三模式口径：台账 R1-2/R1-3/R1-4 的验收核心 */
describe('studentModeDisplay · 训考一体', () => {
  const dual: ModeScoreSource = {
    themeMode: 3,
    averageScore: 51.6,
    trainingAverage: 43.15,
    examAverage: 87.8,
    trainingCount: 2,
    examCount: 1,
    totalPracticeCount: 3,
  }

  it('大号平均分是训练+考核合计均值，不是两者再算一次平均', () => {
    expect(isDualMode(3)).toBe(true)
    // 合计均值由后端 averageScore 给出（不是 (43.15+87.8)/2=65.475）
    expect(averageOf(dual)).toBe(51.6)
  })

  it('练习总次数是训练 + 考核合计', () => {
    expect(practiceCountOf(dual)).toBe(3)
  })

  it('无合计字段时按训练+考核相加，不返回 undefined', () => {
    expect(practiceCountOf({ themeMode: 3, trainingCount: 2, examCount: 1 })).toBe(3)
  })
})

describe('studentModeDisplay · 单模式', () => {
  it('日常训练：大号即训练均分与训练次数，不含考核', () => {
    const src: ModeScoreSource = {
      themeMode: 1,
      averageScore: 51.6,
      trainingAverage: 43.15,
      examAverage: 87.8,
      trainingCount: 2,
      examCount: 1,
    }
    expect(isDualMode(1)).toBe(false)
    expect(averageOf(src)).toBe(43.15)
    expect(practiceCountOf(src)).toBe(2)
  })

  it('通关考核：大号即考核均分与考核次数，不含训练', () => {
    const src: ModeScoreSource = {
      themeMode: 2,
      averageScore: 51.6,
      trainingAverage: 43.15,
      examAverage: 87.8,
      trainingCount: 2,
      examCount: 1,
    }
    expect(isDualMode(2)).toBe(false)
    expect(averageOf(src)).toBe(87.8)
    expect(practiceCountOf(src)).toBe(1)
  })

  it('单模式该模式无样本时回落合计均分，不显示成空', () => {
    expect(averageOf({ themeMode: 1, averageScore: 66, trainingAverage: null })).toBe(66)
    expect(averageOf({ themeMode: 2, averageScore: 66, examAverage: null })).toBe(66)
  })
})

describe('studentModeDisplay · 均分渲染', () => {
  it('去掉 BigDecimal 的无意义尾零（14.40 → 14.4），保留两位小数位', () => {
    expect(formatScore(14.4)).toBe('14.4')
    expect(formatScore(58.03)).toBe('58.03')
  })

  it('无样本显示占位符，不显示 null 分', () => {
    expect(formatScore(null)).toBe('—')
    expect(formatScore(undefined)).toBe('—')
    expect(formatScore(null, '--')).toBe('--')
  })

  it('0 分是有效分数，不应当成空值', () => {
    expect(formatScore(0)).toBe('0')
  })
})
