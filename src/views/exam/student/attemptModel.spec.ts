/**
 * 答题页纯逻辑单测（对应 `attemptModel.ts`）。
 *
 * <p>只测纯函数，不挂载组件：这三类计算是答题页**唯一会被悄悄改错**的地方——
 * 「哪些题算已做」（填空部分作答）、「题号怎么排」（组合题子题各占一个号）、
 * 「剩余时间怎么算」（服务端基准而非本地自减）。挂载测试守不住它们，纯函数测试能。
 */
import { describe, expect, it } from 'vitest'
import type { AnswerDraft, PaperCard, PaperSection } from '@/types/studentExam'
import {
  COMBO_TYPE,
  buildSaveItem,
  buildSheetSections,
  countAnswered,
  countUnanswered,
  flattenQuestions,
  formatCountdown,
  formatScore,
  isAnswered,
  normalizeDrafts,
  parseServerTime,
  remainingSeconds,
  resolveServerOffset,
  sectionScore
} from './attemptModel'

const draft = (answer: string[], marked = 0): AnswerDraft => ({ answer, attach: [], marked })

const card = (over: Partial<PaperCard> & { quesId: string; type: number }): PaperCard => ({
  content: '题干',
  score: 1,
  ...over
})

const section = (sectionIndex: number, name: string, cards: PaperCard[]): PaperSection => ({
  sectionIndex,
  sectionName: name,
  cards
})

describe('isAnswered', () => {
  it('客观题有任一选项即已做', () => {
    expect(isAnswered(draft(['opt-1']), 0)).toBe(true)
    expect(isAnswered(draft([]), 0)).toBe(false)
    expect(isAnswered(undefined, 0)).toBe(false)
  })

  it('填空只填了部分空也算已做', () => {
    // 先填第 3 空时数组是 ['', '', 'x']，长度非 0 但只有一空有内容
    expect(isAnswered(draft(['', '', 'x']), 3)).toBe(true)
    expect(isAnswered(draft(['', '']), 3)).toBe(false)
    expect(isAnswered(draft([]), 3)).toBe(false)
  })

  it('问答只有一个元素，空串或纯空白算未做', () => {
    expect(isAnswered(draft(['有内容']), 4)).toBe(true)
    expect(isAnswered(draft(['   ']), 4)).toBe(false)
    expect(isAnswered(draft(['']), 4)).toBe(false)
  })
})

describe('flattenQuestions', () => {
  it('组合题子题各自占一个题号，父题不占', () => {
    const sections = [
      section(0, '一、单选题', [card({ quesId: 'a', type: 0 })]),
      section(1, '二、组合题', [
        card({
          quesId: 'combo',
          type: COMBO_TYPE,
          score: 9,
          subQuestions: [
            card({ quesId: 'c1', type: 0 }),
            card({ quesId: 'c2', type: 3 }),
            card({ quesId: 'c3', type: 4 })
          ]
        })
      ])
    ]
    const flats = flattenQuestions(sections)
    expect(flats.map((f) => f.quesId)).toEqual(['a', 'c1', 'c2', 'c3'])
    // 题号按大题各自从 1 起：单选题只有 1 题，组合题 3 个子题编 1/2/3
    expect(flats.map((f) => f.no)).toEqual([1, 1, 2, 3])
    // 子题要能带出父题干，否则单题分页时没有上下文
    expect(flats[1]?.parentQuesId).toBe('combo')
    expect(flats[1]?.parentContent).toBe('题干')
    expect(flats[0]?.parentQuesId).toBeNull()
  })

  it('空 sections 返回空数组，不抛错', () => {
    expect(flattenQuestions(undefined)).toEqual([])
    expect(flattenQuestions([])).toEqual([])
  })
})

describe('buildSheetSections', () => {
  it('按大题分组并按摊平后的题号编号，且过滤空分组', () => {
    const sections = [
      section(0, '一、单选题', [card({ quesId: 'a', type: 0 })]),
      section(1, '二、空分组', []),
      section(2, '三、组合题', [
        card({
          quesId: 'combo',
          type: COMBO_TYPE,
          subQuestions: [card({ quesId: 'c1', type: 0 }), card({ quesId: 'c2', type: 1 })]
        })
      ])
    ]
    const groups = buildSheetSections(sections)
    expect(groups.map((g) => g.sectionName)).toEqual(['一、单选题', '三、组合题'])
    expect(groups[1]?.items.map((i) => i.no)).toEqual([1, 2])
  })
})

describe('countAnswered / countUnanswered', () => {
  it('未作答题数用于交卷提示，部分填空算已做', () => {
    const flats = flattenQuestions([section(0, '一', [
      card({ quesId: 'a', type: 0 }),
      card({ quesId: 'b', type: 3 }),
      card({ quesId: 'c', type: 4 })
    ])])
    const answers: Record<string, AnswerDraft> = {
      a: draft(['opt']),
      b: draft(['第一空', '']),
      c: draft([''])
    }
    expect(countAnswered(flats, answers)).toBe(2)
    expect(countUnanswered(flats, answers)).toBe(1)
  })

  it('全未答时未答数等于总题数（N=0 也要提示一次，故不能返回负数）', () => {
    const flats = flattenQuestions([section(0, '一', [card({ quesId: 'a', type: 0 })])])
    expect(countUnanswered(flats, {})).toBe(1)
    expect(countAnswered(flats, {})).toBe(0)
  })
})

describe('parseServerTime / resolveServerOffset', () => {
  it('接受契约的「空格分隔」时间格式', () => {
    expect(parseServerTime('2026-11-10 13:34:02')).toBe(
      Date.parse('2026-11-10T13:34:02')
    )
    expect(parseServerTime(null)).toBeNull()
    expect(parseServerTime('')).toBeNull()
    expect(parseServerTime('不是时间')).toBeNull()
  })

  it('偏移 = 服务端时间 − 本地时间', () => {
    const localNow = Date.parse('2026-11-10T13:00:00')
    const offset = resolveServerOffset('2026-11-10 13:00:30', localNow)
    expect(offset).toBe(30_000)
  })

  it('服务端时间缺失时偏移为 0，不退化成随机值', () => {
    expect(resolveServerOffset(null, 1_000)).toBe(0)
    expect(resolveServerOffset('', 1_000)).toBe(0)
  })
})

describe('remainingSeconds / formatCountdown', () => {
  it('不限时返回 null（对应接口 remainingSeconds=null）', () => {
    expect(remainingSeconds(null, 1_000)).toBeNull()
  })

  it('已超时钳到 0，不返回负数', () => {
    expect(remainingSeconds(1_000, 5_000)).toBe(0)
  })

  it('正常倒计时按秒向下取整', () => {
    expect(remainingSeconds(10_000, 1_000)).toBe(9)
  })

  it('格式化为 HH:MM:SS，超过 24 小时不截断', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
    expect(formatCountdown(61)).toBe('00:01:01')
    expect(formatCountdown(3661)).toBe('01:01:01')
    expect(formatCountdown(90_000)).toBe('25:00:00')
  })
})

describe('formatScore', () => {
  it('收敛 BigDecimal 的两种序列化形态', () => {
    expect(formatScore(3)).toBe('3')
    expect(formatScore(3.0)).toBe('3')
    expect(formatScore(10.8)).toBe('10.8')
  })

  it('削掉浮点尾巴：BigDecimal 转 number 常带 1e-15 级误差', () => {
    // 0.1 + 0.2 这类误差若原样显示，答题页会出现「10.800000000000001分」
    expect(formatScore(10.800000000000001)).toBe('10.8')
    expect(formatScore(18.000000000000004)).toBe('18')
  })

  it('空值显示 -- 而不是 NaN', () => {
    expect(formatScore(null)).toBe('--')
    expect(formatScore(undefined)).toBe('--')
    expect(formatScore(Number.NaN)).toBe('--')
  })
})

describe('sectionScore', () => {
  it('合计本节分值，组合题按父题分值计', () => {
    expect(sectionScore([card({ quesId: 'a', type: 0, score: 1 }), card({ quesId: 'b', type: 1, score: 3 })])).toBe('4')
    expect(sectionScore([])).toBe('0')
    expect(sectionScore(undefined)).toBe('0')
  })
})

describe('normalizeDrafts', () => {
  // 契约 §11.7 把作答内联在题卡上，但 PaperCard 类型里没有该字段，
  // 故测试用 unknown 转换构造这种「契约形态」的响应，模拟后端按契约实现的情形。
  const cardWithInlineAnswer = (
    over: Partial<PaperCard> & { quesId: string; type: number },
    inline: AnswerDraft
  ) => card({ ...over, answer: inline } as unknown as PaperCard)

  it('认契约 §11.7 的内联 answer 形态（含 marked）', () => {
    const sections = [
      section(0, '一', [
        cardWithInlineAnswer({ quesId: 'a', type: 0 }, draft(['opt-1'], 1)),
        card({
          quesId: 'combo',
          type: COMBO_TYPE,
          subQuestions: [cardWithInlineAnswer({ quesId: 'c1', type: 0 }, draft(['opt-2']))]
        })
      ])
    ]
    const drafts = normalizeDrafts(sections)
    expect(Object.keys(drafts).sort()).toEqual(['a', 'c1'])
    expect(drafts.a?.marked).toBe(1)
    expect(drafts.c1?.answer).toEqual(['opt-2'])
  })

  it('也认类型的 userAnswer 形态（两种后端实现都不丢答案）', () => {
    const drafts = normalizeDrafts([
      section(0, '一', [card({ quesId: 'a', type: 0, userAnswer: ['opt-9'] })])
    ])
    expect(drafts.a?.answer).toEqual(['opt-9'])
  })

  it('缺 answer 字段时给空草稿，模板不必到处判空', () => {
    const drafts = normalizeDrafts([section(0, '一', [card({ quesId: 'a', type: 0 })])])
    expect(drafts.a).toEqual({ answer: [], attach: [], marked: 0 })
  })
})

describe('buildSaveItem', () => {
  it('按契约 04 §11.8 组装逐题保存请求体', () => {
    const flats = flattenQuestions([section(0, '一', [card({ quesId: 'a', type: 1 })])])
    const item = buildSaveItem(flats[0]!, draft(['opt-1', 'opt-2'], 1), 1_794_282_263_082)
    expect(item).toEqual({
      quesId: 'a',
      quesType: 1,
      answer: ['opt-1', 'opt-2'],
      attach: [],
      marked: 1,
      lastSubmitTime: 1_794_282_263_082
    })
  })
})
