import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

/**
 * F09 场景准备弹窗结构闸门。
 * <p>
 * 这条 spec 存在的理由：原来的弹窗只有两张说明卡，视觉契约也照样全绿（只量已存在的元素）。
 * 所以这里按契约 01 §F09 的九类信息做**存在性**断言，整块区域漏做时必须失败。
 */

const detail = {
  themeId: 't1',
  themeName: '杰克新销售成套方案演练',
  scenarioId: 's1',
  sortOrder: 1,
  name: '初次拜访：破冰与价值初探',
  status: 'in_progress',
  statusText: '进行中',
  audience: ['0-6个月销售', '新入职销售', '渠道'],
  timeLimitMinutes: 15,
  maxDurationSeconds: 900,
  passScore: 70,
  attemptCount: 2,
  myTrainingCount: 2,
  myExamCount: 0,
  myHighestScore: 87.8,
  myHighestExamScore: null as number | null,
  difficulty: 2,
  difficultyText: '中等',
  startable: true,
  stopReason: null as string | null,
  trainingAction: { enabled: true, reason: null as string | null },
  examAction: { enabled: true, reason: null as string | null },
  practiceMethods: ['case', 'random', 'custom'] as string[],
  unavailableReason: null as string | null,
  businessGoal: '在首次拜访中建立信任',
  businessImpact: '提高转接率',
  failureCost: '线索停滞',
  coreConflict: '销售要快速建立联系 vs 门卫控制进入',
  behaviorGoals: [],
  icebergElements: [],
  commonFailureModes: ['未说清公司和来意'],
  difficulties: ['门卫警惕'],
  forbiddenBehaviors: ['试图绕过门卫'],
  dimensions: [
    {
      id: 'd1',
      name: '需求挖掘',
      weight: 40,
      description: null,
      excellentStandard: null,
      goodStandard: null,
      improveStandard: null,
      sortOrder: 1,
    },
  ],
  cases: [
    {
      caseId: 'c1',
      drillScriptId: 'd1',
      scriptName: '15分钟破冰',
      difficulty: 3,
      difficultyStars: 3,
      actorName: '王总',
      actorPosition: '企业中层管理者',
      actorCompany: '锦程制衣厂',
      actorType: null,
      actorPersonality: null,
      actorCommunicationStyle: null,
      scriptBackground: '某中型服装厂生产总监',
      scriptOpening: '“你好，请进。”',
    },
  ],
  productProfiles: [
    {
      profileId: 'p1',
      profileKey: 'pp1',
      name: '成套智联2.0智能化平台',
      category: null,
      description: '智能化生产运营平台',
    },
  ],
}

const getStudentScenarioDetail = vi.fn(async () => detail)
const preflightAttempt = vi.fn(async () => ({
  allowed: true,
  activeAttemptId: null,
  requiredSteps: [],
  maxDurationSeconds: 900,
  remainingSceneAttempts: null,
  remainingExamAttempts: null,
  checks: [],
}))
const createAttempt = vi.fn(async () => ({ id: 'a1' }))

/**
 * Element Plus 的 mock（与 toast.spec.ts 同款工厂）。
 *
 * <p>为什么必须加：本 spec import 的组件会 `import '@/api/actStudent'`
 * → `request.ts` → `@/utils/toast` → `element-plus`。vitest 配置是 `isolate: false`
 * （同 worker 复用模块注册表），一旦这里把**真实** element-plus 解析进 registry，
 * 之后同 worker 跑的 `toast.spec.ts` 里的 `vi.mock('element-plus')` 就失效，
 * 表现为「时红时绿」（取决于文件执行顺序）——比稳定红更危险。
 *
 * <p>而本 spec 根本不需要真实 element-plus：模板里的 `el-*` 全部被下面的 stubs 替换，
 * 被间接引入的只有 toast 用到的 `ElMessage` 一个导出，所以工厂与 toast.spec.ts 保持一致。
 */
vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))

vi.mock('@/api/actStudent', () => ({
  getStudentScenarioDetail: (...args: unknown[]) => getStudentScenarioDetail(...(args as [])),
  preflightAttempt: (...args: unknown[]) => preflightAttempt(...(args as [])),
  createAttempt: (...args: unknown[]) => createAttempt(...(args as [])),
}))

import ScenarioPrepareDialog from './ScenarioPrepareDialog.vue'

/**
 * Element Plus 在单测里没注册（main.ts 才全量注册），所以这里给用到的控件做最小 stub：
 * 只保留本 spec 断言的 DOM 结构（弹窗三段 slot、按钮文字、提示标题、空态占位），
 * 顺带把两个子弹窗也 stub 掉——它们不在这条 spec 的断言范围里，留着会拖慢并互相污染。
 */
const stubs = {
  teleport: true,
  'el-dialog': {
    template:
      '<div class="el-dialog-stub"><div class="el-dialog__header"><slot name="header" /></div><div class="el-dialog__body"><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div></div>',
  },
  'el-button': { template: '<button type="button"><slot /></button>' },
  'el-alert': {
    props: ['title'],
    template: '<div class="el-alert"><div class="el-alert__title">{{ title }}</div></div>',
  },
  'el-empty': { template: '<div class="el-empty-stub" />' },
  RandomPracticeDialog: true,
  CustomPracticeWizard: true,
  PracticeModeChooser: {
    name: 'PracticeModeChooser',
    props: ['modelValue'],
    template: '<div class="mode-chooser-stub" />',
  },
}

const mountDialog = () =>
  mount(ScenarioPrepareDialog, {
    props: {
      modelValue: true,
      themeId: 't1',
      scenarioId: 's1',
      practiceType: 'case' as const,
      studyMode: 1 as const,
      defaultDifficulty: 2,
      allowCustomDifficulty: true,
    },
    global: { stubs },
  })

describe('ScenarioPrepareDialog（F09）', () => {
  beforeEach(() => {
    getStudentScenarioDetail.mockClear()
  })

  it('九类信息齐备：头部统计、案例卡、产品档案、四段描述、三组列表、评估标准', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    expect(getStudentScenarioDetail).toHaveBeenCalledWith('t1', 's1')

    // 1) 场景名 + 状态徽章 + 人群标签（只取前两个，第三个不挤掉右侧统计）
    expect(wrapper.find('.dm-prep-title').text()).toBe('初次拜访：破冰与价值初探')
    expect(wrapper.find('.dm-prep-status').text()).toContain('进行中')
    expect(wrapper.findAll('.dm-prep-tag').map((tag) => tag.text())).toEqual([
      '0-6个月销售',
      '新入职销售',
    ])

    // 2) 练习次数 + 最高分（训练/考核取较大值）
    const stats = wrapper.findAll('.dm-prep-stat__value').map((item) => item.text())
    expect(stats).toEqual(['2', '87.8'])

    // 3) 实战案例卡：难度星级、角色、标题、背景、开场白原话、开始按钮
    expect(wrapper.findAll('.dm-case-card')).toHaveLength(1)
    const card = wrapper.find('.dm-case-card')
    expect(card.find('.dm-case-card__level').text()).toBe('困难')
    expect(card.find('.dm-case-card__actor-name').text()).toBe('王总')
    expect(card.find('.dm-case-card__title').text()).toBe('15分钟破冰')
    expect(card.find('.dm-case-card__opening').text()).toBe('“你好，请进。”')

    // 4) 涉及产品档案
    expect(wrapper.findAll('.dm-prep-profile').map((tag) => tag.text())).toEqual([
      '成套智联2.0智能化平台',
    ])

    // 5)-6) 分区标题：业务目标/影响/失败代价/核心冲突 + 失败模式/困难挑战/禁止行为 + 评估标准
    const titles = wrapper.findAll('.dm-prep-block__title').map((item) => item.text())
    expect(titles).toEqual([
      '实战案例',
      '涉及产品档案',
      '业务目标',
      '业务影响',
      '失败代价',
      '核心冲突',
      '常见失败模式',
      '困难挑战',
      '禁止行为',
      '评估标准',
    ])

    // 7) 评估维度与权重
    expect(wrapper.find('.dm-prep-dim__name').text()).toBe('需求挖掘')
    expect(wrapper.find('.dm-prep-dim__weight').text()).toBe('40%')

    // 底部左侧限时
    expect(wrapper.find('.dm-prep-actions__left').text()).toContain('限时 15 分钟')
  })

  it('底部按钮按 practiceMethods 动态渲染，不写死三种入口', async () => {
    getStudentScenarioDetail.mockResolvedValueOnce({
      ...detail,
      practiceMethods: ['random', 'custom'],
    })
    const wrapper = mountDialog()
    await flushPromises()
    // 只开随机/自定义时，案例入口不可点（服务端没开 case），底部只出这两个按钮
    expect(wrapper.findAll('.dm-prep-actions button').map((btn) => btn.text())).toEqual([
      '取消',
      '随机练习',
      '+ 自定义练习',
    ])
    const start = wrapper.find('.dm-case-card__start')
    expect(start.attributes('disabled')).toBeDefined()
    expect(start.attributes('title')).toBe('该主题未开启案例练习')
  })

  it('只开启案例时不渲染随机/自定义按钮（说明书 170 行：入口跟随主题设置）', async () => {
    getStudentScenarioDetail.mockResolvedValueOnce({ ...detail, practiceMethods: ['case'] })
    const wrapper = mountDialog()
    await flushPromises()
    expect(wrapper.findAll('.dm-prep-actions button').map((btn) => btn.text())).toEqual(['取消'])
    expect(wrapper.find('.dm-case-card__start').attributes('disabled')).toBeUndefined()
  })

  it('三种练习方式全不可用时直接展示服务端原因，不在前端编理由', async () => {
    getStudentScenarioDetail.mockResolvedValueOnce({
      ...detail,
      startable: false,
      stopReason: '训练主题已暂停',
      practiceMethods: [],
      unavailableReason: '训练主题已暂停',
    })
    const wrapper = mountDialog()
    await flushPromises()
    expect(wrapper.find('.el-alert__title').text()).toBe('训练主题已暂停')
    expect(wrapper.findAll('.dm-prep-actions button').map((btn) => btn.text())).toEqual(['取消'])
  })

  it('点击案例"开始练习"先进入 F10 模式选择，不直接创建 attempt', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('.dm-case-card__start').trigger('click')
    expect(wrapper.findComponent({ name: 'PracticeModeChooser' }).props('modelValue')).toBe(true)
    expect(createAttempt).not.toHaveBeenCalled()
  })

  it('模式选择后执行 preflight + createAttempt 并抛出 created（业务提交逻辑保持不变）', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('.dm-case-card__start').trigger('click')
    wrapper.findComponent({ name: 'PracticeModeChooser' }).vm.$emit('select', 2)
    await flushPromises()
    expect(preflightAttempt).toHaveBeenCalledWith({
      themeId: 't1',
      scenarioId: 's1',
      studyMode: 2,
      practiceType: 'case',
    })
    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        themeId: 't1',
        scenarioId: 's1',
        studyMode: 2,
        practiceType: 'case',
      }),
    )
    expect(wrapper.emitted('created')?.[0]).toEqual(['a1'])
  })
})
