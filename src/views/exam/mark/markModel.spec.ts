import { describe, expect, it } from 'vitest'
import {
  buildGradePayload,
  countGradedItems,
  flattenScorableItems,
  needsIdentityCheck,
  sortBySubmitTime
} from './markModel'
import type { GradeDraft, PaperSection } from '@/types/studentExam'

/** 构造一份含组合题子题的 sections，覆盖「父题不该被计入」的分支 */
const sections: PaperSection[] = [
  {
    sectionIndex: 1,
    sectionName: '一、单选题',
    cards: [
      { quesId: 'q1', type: 0, score: 2, content: '单选', userAnswer: ['a'] },
      { quesId: 'q2', type: 1, score: 3, content: '多选', userAnswer: ['a', 'b'] }
    ]
  },
  {
    sectionIndex: 2,
    sectionName: '二、组合题',
    cards: [
      {
        quesId: 'combo',
        type: 5,
        score: 5,
        content: '组合父题干',
        subQuestions: [
          { quesId: 'c1', type: 0, score: 2, content: '子1' },
          { quesId: 'c2', type: 1, score: 2, content: '子2' },
          { quesId: 'c3', type: 3, score: 1, content: '子3' }
        ]
      }
    ]
  }
]

describe('flattenScorableItems', () => {
  it('组合题按子题铺平，父题不产生可评项（DER-02：父题无答案行、不打分）', () => {
    const items = flattenScorableItems(sections)
    expect(items.map((i) => i.quesId)).toEqual(['q1', 'q2', 'c1', 'c2', 'c3'])
  })

  it('组合题子题编号带父序号前缀（1-1 形式），与原平台一致', () => {
    const items = flattenScorableItems(sections)
    const combo = items.filter((i) => i.quesId.startsWith('c'))
    expect(combo.map((i) => i.no)).toEqual(['1-1', '1-2', '1-3'])
  })

  it('普通题编号是大题内序号', () => {
    const items = flattenScorableItems(sections)
    expect(items[0]!.no).toBe('1')
    expect(items[1]!.no).toBe('2')
  })

  it('空 input 返回空数组', () => {
    expect(flattenScorableItems([])).toEqual([])
    expect(flattenScorableItems(null)).toEqual([])
  })
})

describe('countGradedItems', () => {
  const items = flattenScorableItems(sections)

  it('空草稿算 0 已批', () => {
    expect(countGradedItems(items, {})).toBe(0)
  })

  it('只判对错也算已批（批阅人可能只点勾不打分）', () => {
    expect(countGradedItems(items, { q1: { correctFlag: 1, score: null, comment: '' } })).toBe(1)
  })

  it('只给分也算已批', () => {
    expect(countGradedItems(items, { q1: { correctFlag: null, score: 1.5, comment: '' } })).toBe(1)
  })

  it('空草稿对象不算已批', () => {
    expect(
      countGradedItems(items, { q1: { correctFlag: null, score: null, comment: '光写评语' } })
    ).toBe(0)
  })
})

describe('buildGradePayload', () => {
  const items = flattenScorableItems(sections)

  it('只提交动过的题：没碰的题不能出现在 payload 里', () => {
    const grades: Record<string, GradeDraft> = {
      q1: { correctFlag: 1, score: 2, comment: '' }
    }
    const payload = buildGradePayload(items, grades)
    expect(payload).toHaveLength(1)
    expect(payload[0]).toMatchObject({ quesId: 'q1', score: 2, maxScore: 2 })
  })

  it('未判对错但给了分时，按「满分即对、否则错」补 correctFlag', () => {
    const payload = buildGradePayload(items, {
      q2: { correctFlag: null, score: 3, comment: '' }
    })
    expect(payload[0]).toMatchObject({ quesId: 'q2', correctFlag: 1, score: 3 })
  })

  it('给部分分判定为错（满分 3 给 1.5）', () => {
    const payload = buildGradePayload(items, {
      q2: { correctFlag: null, score: 1.5, comment: '' }
    })
    expect(payload[0]).toMatchObject({ correctFlag: 0, score: 1.5 })
  })

  it('空评语转 null，不提交空字符串', () => {
    const payload = buildGradePayload(items, {
      q1: { correctFlag: 1, score: 2, comment: '   ' }
    })
    expect(payload[0]!.comment).toBeNull()
  })

  it('有评语时原样提交', () => {
    const payload = buildGradePayload(items, {
      q1: { correctFlag: 1, score: 2, comment: '回答完整' }
    })
    expect(payload[0]!.comment).toBe('回答完整')
  })

  it('完全没动过时返回空数组（页面据此提示「还没有给任何题目打分」）', () => {
    expect(buildGradePayload(items, {})).toEqual([])
  })

  it('组合题子题各自一条，父题不出现', () => {
    const payload = buildGradePayload(items, {
      c1: { correctFlag: 1, score: 2, comment: '' },
      c2: { correctFlag: 0, score: 0, comment: '' }
    })
    expect(payload.map((p) => p.quesId)).toEqual(['c1', 'c2'])
  })
})

describe('needsIdentityCheck（DER-07）', () => {
  it('2 不通过 / 3 无法核验 需要人工核对', () => {
    expect(needsIdentityCheck(2)).toBe(true)
    expect(needsIdentityCheck(3)).toBe(true)
  })

  it('0 未核验 / 1 通过 不标记', () => {
    expect(needsIdentityCheck(0)).toBe(false)
    expect(needsIdentityCheck(1)).toBe(false)
  })

  it('异常值不标记（避免脏数据把整列刷成警告）', () => {
    expect(needsIdentityCheck(9)).toBe(false)
    expect(needsIdentityCheck(undefined)).toBe(false)
  })
})

describe('sortBySubmitTime', () => {
  it('按提交时间倒序，最新在前', () => {
    const rows = sortBySubmitTime([
      { attemptId: 'a', submitAt: '2026-11-10 12:34:00' },
      { attemptId: 'b', submitAt: '2026-11-10 13:00:00' },
      { attemptId: 'c', submitAt: '2026-11-10 12:49:00' }
    ])
    expect(rows.map((r) => r.attemptId)).toEqual(['b', 'c', 'a'])
  })

  it('null 时间排到最后，不挤掉有效数据', () => {
    const rows = sortBySubmitTime([
      { attemptId: 'a', submitAt: null },
      { attemptId: 'b', submitAt: '2026-11-10 13:00:00' }
    ])
    expect(rows.map((r) => r.attemptId)).toEqual(['b', 'a'])
  })

  it('不修改入参（返回新数组）', () => {
    const input = [
      { attemptId: 'a', submitAt: '2026-11-10 12:00:00' },
      { attemptId: 'b', submitAt: '2026-11-10 13:00:00' }
    ]
    sortBySubmitTime(input)
    expect(input.map((r) => r.attemptId)).toEqual(['a', 'b'])
  })
})
