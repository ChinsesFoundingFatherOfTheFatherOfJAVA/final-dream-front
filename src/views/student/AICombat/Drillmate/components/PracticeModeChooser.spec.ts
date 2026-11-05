import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeModeChooser from './PracticeModeChooser.vue'

/**
 * Element Plus 的 mock（与 toast.spec.ts 同款工厂）。
 *
 * <p>本 spec import 的组件会 `import '@/api/actStudent'`（只为取类型，但 import 图仍会走到）
 * → `request.ts` → `@/utils/toast` → `element-plus`。vitest 是 `isolate: false`
 * （同 worker 复用模块注册表），一旦这里把真实 element-plus 解析进 registry，
 * 之后同 worker 的 `toast.spec.ts` 里 `vi.mock('element-plus')` 就失效，
 * 表现为「时红时绿」，取决于文件执行顺序。
 *
 * <p>组件模板里的 `el-*` 在测试中被 stub 掉，不需要真实 element-plus。
 */
vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))

/**
 * F10 模式选择弹窗结构闸门。
 * <p>
 * 台账 R8 的记录：这里原本缺整个弹窗。这条 spec 按契约 01 §F10 断言两张卡与两个按钮，
 * 并锁住"三种练习方式共用"这一事实（组件不认识 practiceType，可用性全部由 props 传入）。
 */

const stubs = {
  teleport: true,
  'el-dialog': {
    template:
      '<div class="el-dialog-stub"><div class="el-dialog__header"><slot name="header" /></div><div class="el-dialog__body"><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div></div>',
  },
  'el-button': { template: '<button type="button"><slot /></button>' },
}

const mountChooser = (props: Record<string, unknown> = {}) =>
  mount(PracticeModeChooser, {
    props: {
      modelValue: true,
      scenarioName: '初次拜访：破冰与价值初探',
      maxDurationSeconds: 900,
      trainingEnabled: true,
      examEnabled: true,
      ...props,
    },
    global: { stubs },
  })

describe('PracticeModeChooser（F10）', () => {
  it('混合模式：两张卡（日常训练 / 通关考核）+ 两个按钮（开始训练 / 开始考核）', () => {
    const wrapper = mountChooser()
    const cards = wrapper.findAll('.dm-mode-card')
    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.find('.dm-mode-card__title').text())).toEqual([
      '日常训练',
      '通关考核',
    ])
    expect(wrapper.findAll('.dm-mode-actions button').map((btn) => btn.text())).toEqual([
      '开始训练',
      '开始考核',
    ])
    // 训练卡的说明必须包含"教练点评"与"不计入成绩"，考核卡必须是"无 AI 辅助"+"成绩计入记录"
    expect(cards[0]?.text()).toContain('教练点评')
    expect(cards[0]?.text()).toContain('不计入成绩')
    expect(cards[1]?.text()).toContain('无 AI 辅助')
    expect(cards[1]?.text()).toContain('成绩计入记录')
    // 头部限时（契约 F10 要求展示限时）
    expect(wrapper.find('.dm-mode-head__sub').text()).toBe('限时 15 分钟')
  })

  it('考核不可用时只展示服务端原因，不渲染考核按钮', () => {
    const wrapper = mountChooser({ examEnabled: false, examReason: '完成 1 次训练后解锁考核' })
    expect(wrapper.find('.dm-mode-card__reason').text()).toBe('完成 1 次训练后解锁考核')
    expect(wrapper.findAll('.dm-mode-actions button').map((btn) => btn.text())).toEqual([
      '开始训练',
    ])
  })

  it('点击"开始考核"抛出 select=2（本组件不做业务提交）', async () => {
    const wrapper = mountChooser()
    const examBtn = wrapper.findAll('.dm-mode-actions button')[1]
    await examBtn?.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([2])
  })

  it('入口带入考核模式时默认选中考核（详情页"考核"链接）', () => {
    const wrapper = mountChooser({ defaultMode: 2 })
    expect(wrapper.findAll('.dm-mode-card')[1]?.classes()).toContain('is-active')
  })
})
