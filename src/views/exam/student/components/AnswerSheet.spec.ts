import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnswerSheet from './AnswerSheet.vue'
import type { AnswerDraft } from '@/types/studentExam'
import type { SheetSection } from '../attemptModel'

/**
 * 答题卡结构闸门（契约 01 §S4、02 §8B.4）。
 *
 * <p>为什么单独给答题卡写组件测试：`attemptModel.spec.ts` 只守住了纯计算，
 * 而「图例四项」「状态由 answers 派生」「组合题子题各占一个题号」这三条是**渲染层**的事实，
 * 纯函数测不到。答题卡是学员跳题的唯一入口，题号状态错一格就会跳错题。
 *
 * <p>stub 掉 el-button：本组件只用到它渲染「提交考试」，不需要真实 Element Plus。
 */

const stubs = {
  /**
   * el-button 的轻量替身。
   *
   * <p>必须显式声明 `emits: ['click']`：否则父组件的 `@click` 会**同时**作为原生监听器
   * 落到根 `<button>` 上，又叠加 stub 自己的 `$emit('click')`，一次点击触发两次 submit
   * （实测 emitted('submit') 长度为 2）。真实 el-button 声明了 click 事件，
   * 不会有这个重复，所以这里必须声明才能与真实行为对齐。
   */
  'el-button': {
    emits: ['click'],
    props: ['disabled', 'loading', 'type'],
    template:
      '<button type="button" class="el-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}

const draft = (answer: string[], marked = 0): AnswerDraft => ({ answer, attach: [], marked })

/** 两个大题：单选 1 题 + 组合题 2 个子题（子题各自编 1、2） */
const sections: SheetSection[] = [
  {
    sectionIndex: 0,
    sectionName: '一、单选题',
    items: [{ quesId: 'a', type: 0, no: 1 }],
  },
  {
    sectionIndex: 1,
    sectionName: '二、组合题',
    items: [
      { quesId: 'c1', type: 0, no: 1 },
      { quesId: 'c2', type: 3, no: 2 },
    ],
  },
]

const mountSheet = (props: Record<string, unknown> = {}) =>
  mount(AnswerSheet, {
    props: {
      sections,
      total: 3,
      answeredCount: 0,
      currentQuesId: 'a',
      answers: {},
      ...props,
    },
    global: { stubs },
  })

describe('AnswerSheet 图例四项', () => {
  it('图例恰好是未做 / 已做 / 当前 / 标记四项，不多不少', () => {
    const labels = mountSheet()
      .findAll('.sheet__legend-text')
      .map((n) => n.text())
    expect(labels).toEqual(['未做', '已做', '当前', '标记'])
  })

  it('图例色块带各自的状态类，样式靠它们区分（不是靠文字）', () => {
    const classes = mountSheet()
      .findAll('.sheet__swatch')
      .map((n) => n.classes().join(' '))
    expect(classes[0]).toContain('sheet__swatch--todo')
    expect(classes[1]).toContain('sheet__swatch--done')
    expect(classes[2]).toContain('sheet__swatch--current')
    expect(classes[3]).toContain('sheet__swatch--flag')
  })

  it('标记图例里内嵌红旗 SVG，而不是纯色块', () => {
    const flag = mountSheet().find('.sheet__swatch--flag')
    expect(flag.find('svg').exists()).toBe(true)
  })
})

describe('AnswerSheet 状态派生（不额外存状态，全部来自 answers）', () => {
  it('有作答的题打 is-done', () => {
    const wrapper = mountSheet({ answers: { a: draft(['opt-1']) } })
    // 第一个题号是 'a'
    expect(wrapper.findAll('.sheet__num')[0]?.classes()).toContain('is-done')
  })

  it('当前题打 is-current，且只打一个', () => {
    const wrapper = mountSheet({ currentQuesId: 'c2' })
    const current = wrapper.findAll('.sheet__num').filter((n) => n.classes().includes('is-current'))
    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('2')
  })

  it('marked=1 的题打 is-marked 并渲染角标红旗', () => {
    const wrapper = mountSheet({ answers: { a: draft(['opt-1'], 1) } })
    const first = wrapper.findAll('.sheet__num')[0]
    expect(first?.classes()).toContain('is-marked')
    expect(first?.find('.sheet__num-flag svg').exists()).toBe(true)
  })

  it('填空只填了部分空也算已做（与 isAnswered 口径一致）', () => {
    const wrapper = mountSheet({ answers: { c2: draft(['', '第二空']) } })
    // c2 是第三个题号
    expect(wrapper.findAll('.sheet__num')[2]?.classes()).toContain('is-done')
  })

  it('空草稿不算已做', () => {
    const wrapper = mountSheet({ answers: { a: draft([]) } })
    expect(wrapper.findAll('.sheet__num')[0]?.classes()).not.toContain('is-done')
  })

  it('未做 / 已做 / 当前 / 标记四态可以同时存在于不同题上', () => {
    const wrapper = mountSheet({
      answers: { a: draft(['opt-1'], 1) },
      currentQuesId: 'c1',
    })
    const numbers = wrapper.findAll('.sheet__num')
    expect(numbers[0]?.classes()).toEqual(expect.arrayContaining(['is-done', 'is-marked']))
    expect(numbers[1]?.classes()).toContain('is-current')
    // c2 未做：既无 is-done 也无 is-marked 也无 is-current
    expect(numbers[2]?.classes()).not.toContain('is-done')
    expect(numbers[2]?.classes()).not.toContain('is-marked')
  })
})

describe('AnswerSheet 题号与跳题', () => {
  it('按大题分组渲染，组标题来自 sectionName', () => {
    const titles = mountSheet()
      .findAll('.sheet__group-title')
      .map((n) => n.text())
    expect(titles).toEqual(['一、单选题', '二、组合题'])
  })

  it('题号用后端给的 no，不在前端重排（组合题子题各自从 1 起）', () => {
    const numbers = mountSheet()
      .findAll('.sheet__num')
      .map((n) => n.text())
    // 第二组是 1、2，证明用的是每组的 no 而不是全局连续下标
    expect(numbers).toEqual(['1', '1', '2'])
  })

  it('点题号 emit jump 并带上 quesId（分页跳题与平铺滚动都靠它）', async () => {
    const wrapper = mountSheet()
    await wrapper.findAll('.sheet__num')[2]?.trigger('click')
    expect(wrapper.emitted('jump')).toEqual([['c2']])
  })

  it('题号按钮带 aria-label，读屏能听出题号与状态', () => {
    const wrapper = mountSheet({ answers: { a: draft(['opt-1'], 1) }, currentQuesId: 'a' })
    const label = wrapper.findAll('.sheet__num')[0]?.attributes('aria-label')
    expect(label).toContain('第 1 题')
    expect(label).toContain('已做')
    expect(label).toContain('已标记')
    expect(label).toContain('当前题')
  })
})

describe('AnswerSheet 进度与倒计时', () => {
  it('进度显示「已答/总数」，并按比例给填充宽度', () => {
    const wrapper = mountSheet({ answeredCount: 1, total: 3 })
    expect(wrapper.find('.sheet__progress-num').text()).toBe('1')
    // 1/3 ≈ 33%
    expect(wrapper.find('.sheet__progress-fill').attributes('style')).toContain('width: 33%')
  })

  it('总题数为 0 时进度不出现 NaN', () => {
    const wrapper = mountSheet({ sections: [], total: 0, answeredCount: 0 })
    const style = wrapper.find('.sheet__progress-fill').attributes('style')
    expect(style).not.toContain('NaN')
    expect(style).toContain('width: 0%')
  })

  it('不限时（countdownText 为空）时整行倒计时不渲染', () => {
    expect(mountSheet().find('.sheet__countdown').exists()).toBe(false)
  })

  it('限时显示倒计时文本，紧急态加 is-urgent', () => {
    const wrapper = mountSheet({ countdownText: '00:03:00', urgent: true })
    expect(wrapper.find('.sheet__countdown-value').text()).toBe('00:03:00')
    expect(wrapper.find('.sheet__countdown-value').classes()).toContain('is-urgent')
  })
})

describe('AnswerSheet 提交', () => {
  it('提交按钮默认文案「提交考试」', () => {
    expect(mountSheet().find('.sheet__submit').text()).toBe('提交考试')
  })

  it('已交卷后按钮变成「已交卷」且禁用', () => {
    const wrapper = mountSheet({ submitted: true })
    expect(wrapper.find('.sheet__submit').text()).toBe('已交卷')
  })

  it('点提交 emit submit', async () => {
    const wrapper = mountSheet()
    await wrapper.find('.sheet__submit').trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })
})
