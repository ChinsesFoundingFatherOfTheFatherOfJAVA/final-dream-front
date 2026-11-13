import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuestionRenderer from './QuestionRenderer.vue'
import type { AnswerDraft, PaperCard } from '@/types/studentExam'

/**
 * 题型渲染器的填空空数闸门（契约 01 §S4、02 §8B.4）。
 *
 * <p>只守一条最容易错的事实：**填空题按后端 `blankCount` 渲染 N 个输入框**。
 *
 * <p>为什么这条必须自动化：答题态接口按契约 §11.7 不下发标准答案，
 * 所以「从 answerContent 数空」的旧实现会永远退化成 1 个框，
 * 多空填空题在界面上直接答不了——而人眼点测一道单空填空根本发现不了。
 */

const stubs = {
  'el-input': {
    props: ['modelValue', 'disabled', 'type', 'rows', 'maxlength'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-radio-group': { props: ['modelValue', 'disabled'], template: '<div><slot /></div>' },
  'el-radio': { props: ['value'], template: '<label><slot /></label>' },
  'el-checkbox-group': { props: ['modelValue', 'disabled'], template: '<div><slot /></div>' },
  'el-checkbox': { props: ['value'], template: '<label><slot /></label>' }
}

const draft = (answer: string[] = []): AnswerDraft => ({ answer, attach: [], marked: 0 })

const card = (over: Partial<PaperCard>): PaperCard => ({
  quesId: 'q1',
  type: 3,
  score: 3,
  content: '请填空：___ 与 ___ 与 ___',
  ...over
})

const mountRenderer = (c: PaperCard, modelValue = draft()) =>
  mount(QuestionRenderer, {
    props: { card: c, modelValue, mode: 'edit' as const },
    global: { stubs }
  })

describe('填空按空渲染', () => {
  it('后端 blankCount=3 就渲染 3 个输入框（不是 1 个 textarea）', () => {
    const wrapper = mountRenderer(card({ blankCount: 3 }))
    expect(wrapper.findAll('.qr__blank-row')).toHaveLength(3)
  })

  it('blankCount=1 时渲染 1 个框', () => {
    expect(mountRenderer(card({ blankCount: 1 })).findAll('.qr__blank-row')).toHaveLength(1)
  })

  it('答题态没有 answerContent 也必须是 3 个框——这是旧实现会退化成 1 个的真 bug', () => {
    // 契约 §11.7：答题态不下发标准答案，answerContent 恒为 undefined
    const wrapper = mountRenderer(card({ blankCount: 3, answerContent: undefined }))
    expect(wrapper.findAll('.qr__blank-row')).toHaveLength(3)
  })

  it('后端没给 blankCount 时，回落到学员已答的空数（不倒退成 0）', () => {
    const wrapper = mountRenderer(card({ blankCount: undefined }), draft(['a', 'b']))
    expect(wrapper.findAll('.qr__blank-row')).toHaveLength(2)
  })

  it('完全没有空数信息时至少渲染 1 个框，不给空白区域', () => {
    const wrapper = mountRenderer(card({ blankCount: undefined }), draft([]))
    expect(wrapper.findAll('.qr__blank-row')).toHaveLength(1)
  })

  it('每个空位带序号 1. 2. 3.', () => {
    const labels = mountRenderer(card({ blankCount: 3 }))
      .findAll('.qr__blank-no')
      .map((n) => n.text())
    expect(labels).toEqual(['1.', '2.', '3.'])
  })

  it('第 3 空输入后 emit 的答案数组保留前两空位置（不塌缩）', async () => {
    const wrapper = mountRenderer(card({ blankCount: 3 }))
    await wrapper.findAll('.el-input-stub')[2]?.setValue('第三空')
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0] as AnswerDraft
    expect(emitted.answer).toEqual(['', '', '第三空'])
  })
})

describe('其他题型不受影响（对照组）', () => {
  it('单选渲染 radio 组、不渲染填空框', () => {
    const wrapper = mountRenderer(
      card({
        type: 0,
        blankCount: undefined,
        options: [
          { itemId: 'o1', content: 'A' },
          { itemId: 'o2', content: 'B' }
        ]
      })
    )
    expect(wrapper.find('.qr__blank-row').exists()).toBe(false)
    expect(wrapper.findAll('.qr__opt').length).toBeGreaterThan(0)
  })

  it('问答渲染 textarea 而不是多个填空框', () => {
    const wrapper = mountRenderer(card({ type: 4, blankCount: undefined }))
    expect(wrapper.find('.qr__blank-row').exists()).toBe(false)
    expect(wrapper.find('.el-input-stub').exists()).toBe(true)
  })
})
