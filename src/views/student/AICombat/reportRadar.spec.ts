import { describe, expect, it } from 'vitest'
import { lastScoresFor, scoredDimensions } from './reportRadar'
import type { LastDimension, ReportDimension } from '@/types/student'

const dim = (name: string, score: number | null): ReportDimension => ({
  dimensionName: name,
  weight: 25,
  score,
  comment: '',
  goodPoints: [],
  improvements: [],
  sortOrder: 0
})

const last = (name: string, score: number): LastDimension => ({ dimensionName: name, score })

describe('scoredDimensions', () => {
  it('剔除本次未参与评分的维度', () => {
    const scored = scoredDimensions([dim('话术一致性', 80), dim('语音语速', null)])
    expect(scored.map((d) => d.dimensionName)).toEqual(['话术一致性'])
  })

  it('入参为空时返回空数组而不是 undefined', () => {
    expect(scoredDimensions(null)).toEqual([])
    expect(scoredDimensions(undefined)).toEqual([])
  })
})

describe('lastScoresFor', () => {
  it('本次维度在上次报告中都有分：按本次顺序返回上次得分', () => {
    const scored = [dim('话术一致性', 80), dim('表达流畅度', 70)]
    const result = lastScoresFor(scored, [last('表达流畅度', 60), last('话术一致性', 90)])
    expect(result.values).toEqual([90, 60])
    expect(result.incomplete).toBe(false)
  })

  it('上次缺少本次某维度：整条对比线不画，且不补 0', () => {
    const scored = [dim('话术一致性', 80), dim('自定义维度', 70)]
    const result = lastScoresFor(scored, [last('话术一致性', 90)])
    expect(result.values).toBeNull()
    expect(result.incomplete).toBe(true)
  })

  it('没有上次报告：不是"数据不全"，不必给出提示', () => {
    const result = lastScoresFor([dim('话术一致性', 80)], null)
    expect(result.values).toBeNull()
    expect(result.incomplete).toBe(false)
  })
})
