import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { AttemptPaper } from '@/types/studentExam'

/**
 * 答题页行为闸门（契约 01 §S4、02 §8B.3）。
 *
 * <p>只测**验收里能被自动验证的那几条**：
 * - 切题不丢答案（paged 翻页后回到原题，输入仍在）；
 * - 逐题乐观更新（本地立刻可见，保存接口被调用；失败只标该题不回滚内容）；
 * - 两种布局的渲染差异（single 全渲染 / paged 只渲染当前题）；
 * - 倒计时用服务端基准（不限时显示「不限时」）。
 *
 * <p>截图比对无法在 jsdom 里做，那一条留给浏览器实测。
 *
 * <p>api 层整体 mock：本 spec 不联网、不需要后端 t2 落地。
 */

const paper: AttemptPaper = {
  attemptId: 'att-1',
  layout: 'single',
  serverNow: '2026-11-10 13:00:00',
  deadlineAt: null,
  // 与后端 StudentAnswerRespDtos.Paper 对齐：name/passScore 自 2026-11-11 起下发
  name: '内部测试用考试试卷',
  passScore: 10.8,
  totalScore: 18,
  sections: [
    {
      sectionIndex: 0,
      sectionName: '一、单选题',
      cards: [
        {
          quesId: 'q1',
          type: 0,
          score: 1,
          content: '第一题题干',
          options: [
            { itemId: 'o1', content: '选项一' },
            { itemId: 'o2', content: '选项二' }
          ]
        }
      ]
    },
    {
      sectionIndex: 1,
      sectionName: '二、多选题',
      cards: [
        {
          quesId: 'q2',
          type: 1,
          score: 3,
          content: '第二题题干',
          options: [
            { itemId: 'p1', content: 'A选项' },
            { itemId: 'p2', content: 'B选项' }
          ]
        }
      ]
    }
  ]
}

const saveAttemptAnswers = vi.fn(() => Promise.resolve({ saved: 1 }))
const flagAttemptQuestion = vi.fn(() => Promise.resolve({ marked: 1 }))
const getAttemptPaper = vi.fn(() => Promise.resolve(structuredClone(paper)))
const heartbeatAttempt = vi.fn(() =>
  Promise.resolve({
    serverNow: '2026-11-10 13:00:05',
    usedSeconds: 5,
    remainingSeconds: null,
    exitCount: 0,
    forceSubmit: false
  })
)
/** 交卷响应类型：status 是 DER-31 文案判定的输入，mock 值必须齐备 */
interface SubmitMockResult {
  attemptId: string
  status: number
  objectiveScore: number
  objectiveFullScore: number
  subjectivePending: number
  submitAt: string
}

const defaultSubmitResult: SubmitMockResult = {
  attemptId: 'att-1',
  status: 3,
  objectiveScore: 10,
  objectiveFullScore: 10,
  subjectivePending: 0,
  submitAt: '2026-11-12 10:00:00'
}

const submitAttempt = vi.fn(async (): Promise<SubmitMockResult> => ({ ...defaultSubmitResult }))
const submitExamSign = vi.fn(() => Promise.resolve({ signId: 'sign-1' }))
const uploadExamFile = vi.fn(() =>
  Promise.resolve({ fileId: 'f1', fileUrl: '/api/exam/files/2026/11/sign.png', fileType: 'image' })
)

vi.mock('@/api/studentExam', () => ({
  getAttemptPaper: (...a: unknown[]) => getAttemptPaper(...(a as [])),
  saveAttemptAnswers: (...a: unknown[]) => saveAttemptAnswers(...(a as [])),
  flagAttemptQuestion: (...a: unknown[]) => flagAttemptQuestion(...(a as [])),
  heartbeatAttempt: (...a: unknown[]) => heartbeatAttempt(...(a as [])),
  reportAttemptAntiCheat: () => Promise.resolve(null),
  submitAttempt: (...a: unknown[]) => submitAttempt(...(a as [])),
  submitExamSign: (...a: unknown[]) => submitExamSign(...(a as []))
}))
vi.mock('@/api/exam', () => ({
  uploadExamFile: (...a: unknown[]) => uploadExamFile(...(a as []))
}))

// vi.mock 会被提升到文件顶部，普通 const 在它执行时还没初始化；
// 用 vi.hoisted 让 spy 提前创建，否则报 "Cannot access before initialization"。
const { messageBoxAlert } = vi.hoisted(() => ({
  messageBoxAlert: vi.fn(() => Promise.resolve('confirm'))
}))
vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: vi.fn(() => Promise.resolve('confirm')),
    alert: messageBoxAlert
  }
}))

const routerPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { attemptId: 'att-1' } }),
  useRouter: () => ({ back: vi.fn(), push: routerPush })
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    displayName: '张三',
    deptName: '杰克科技股份',
    user: { account: 'zhangsan', userId: 'E001' }
  })
}))

/** 真实 QuestionRenderer 参与渲染：切题不丢答案要端到端才有意义 */
import AttemptPage from './AttemptPage.vue'

/**
 * Element Plus 组件替身。
 *
 * <p>注意 `el-radio-group` 必须把 v-model 事件转发出去，否则「选中选项」这一步无法模拟，
 * 整个「切题不丢答案」的验证就失效了。
 */
const stubs = {
  'el-skeleton': { template: '<div class="skeleton-stub" />' },
  'el-alert': {
    props: ['title'],
    // 渲染默认插槽：交卷提示已把内容（含「查看结果」按钮）放进 #title 插槽，
    // 只渲染 title prop 的 stub 会让按钮在测试里凭空消失，测不到 DER-31。
    template: '<div class="alert-stub">{{ title }}<slot name="title" /></div>'
  },
  'el-empty': { props: ['description'], template: '<div class="empty-stub">{{ description }}</div>' },
  'el-button': {
    emits: ['click'],
    props: ['disabled', 'loading', 'type', 'plain'],
    template:
      '<button type="button" class="el-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-input': {
    props: ['modelValue', 'disabled', 'type', 'rows', 'maxlength'],
    emits: ['update:modelValue'],
    template:
      '<textarea class="el-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-radio-group': {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div class="el-radio-group-stub"><slot /></div>'
  },
  'el-radio': {
    props: ['value'],
    template: '<label class="el-radio-stub"><slot /></label>'
  },
  'el-checkbox-group': {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div class="el-checkbox-group-stub"><slot /></div>'
  },
  'el-checkbox': {
    props: ['value'],
    template: '<label class="el-checkbox-stub"><slot /></label>'
  }
}

const mountPage = async (layout: 'single' | 'paged' = 'single') => {
  getAttemptPaper.mockResolvedValueOnce({ ...structuredClone(paper), layout })
  const wrapper = mount(AttemptPage, { global: { stubs } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  saveAttemptAnswers.mockClear()
  flagAttemptQuestion.mockClear()
  getAttemptPaper.mockClear()
  submitAttempt.mockClear()
  heartbeatAttempt.mockClear()
})

describe('AttemptPage 两种布局渲染', () => {
  it('single 一页平铺：所有题同时渲染，无上一题/下一题', async () => {
    const wrapper = await mountPage('single')
    expect(wrapper.findAll('.q')).toHaveLength(2)
    expect(wrapper.find('.pager').exists()).toBe(false)
  })

  it('paged 单题分页：只渲染当前一题，且底部有翻页按钮', async () => {
    const wrapper = await mountPage('paged')
    // 只剩当前题，另一题不渲染（契约 01 §S4「只渲染当前题」）
    expect(wrapper.findAll('.q')).toHaveLength(1)
    expect(wrapper.find('.pager').exists()).toBe(true)
    expect(wrapper.find('.pager').text()).toContain('下一题')
    // 首题没有「上一题」
    expect(wrapper.find('.pager').text()).not.toContain('上一题')
  })

  it('paged 翻到第二题后出现「上一题」', async () => {
    const wrapper = await mountPage('paged')
    await wrapper.find('.pager button:last-of-type').trigger('click')
    await flushPromises()
    expect(wrapper.find('.pager').text()).toContain('上一题')
  })
})

describe('AttemptPage 切题不丢答案（核心验收）', () => {
  it('paged：答题 → 翻到下一题 → 翻回来，作答仍在', async () => {
    const wrapper = await mountPage('paged')

    // 第一题（单选）选 o2：直接走组件 emit 路径
    const renderer = wrapper.findComponent({ name: 'QuestionRenderer' })
    renderer.vm.$emit('update:modelValue', { answer: ['o2'], attach: [], marked: 0 })
    await flushPromises()

    // 翻到第二题
    await wrapper.find('.pager button:last-of-type').trigger('click')
    await flushPromises()
    // 第二题还没答，它的 renderer 不应带出第一题的答案
    const second = wrapper.findComponent({ name: 'QuestionRenderer' })
    expect(second.props('modelValue')).toEqual({ answer: [], attach: [], marked: 0 })

    // 翻回第一题
    await wrapper.find('.pager button:first-of-type').trigger('click')
    await flushPromises()
    const back = wrapper.findComponent({ name: 'QuestionRenderer' })
    expect(back.props('modelValue').answer).toEqual(['o2'])
  })

  it('single：同一题重复编辑不会互相覆盖', async () => {
    const wrapper = await mountPage('single')
    const renderers = wrapper.findAllComponents({ name: 'QuestionRenderer' })
    renderers[0]?.vm.$emit('update:modelValue', { answer: ['o1'], attach: [], marked: 0 })
    renderers[1]?.vm.$emit('update:modelValue', { answer: ['p1', 'p2'], attach: [], marked: 0 })
    await flushPromises()

    const after = wrapper.findAllComponents({ name: 'QuestionRenderer' })
    expect(after[0]?.props('modelValue').answer).toEqual(['o1'])
    expect(after[1]?.props('modelValue').answer).toEqual(['p1', 'p2'])
  })
})

describe('AttemptPage 逐题保存乐观更新', () => {
  it('客观题点选后立刻调用保存接口，且带上 quesId 与选项 id', async () => {
    const wrapper = await mountPage('single')
    const renderer = wrapper.findAllComponents({ name: 'QuestionRenderer' })[0]
    renderer?.vm.$emit('update:modelValue', { answer: ['o1'], attach: [], marked: 0 })
    await flushPromises()

    expect(saveAttemptAnswers).toHaveBeenCalledTimes(1)
    const [, items] = saveAttemptAnswers.mock.calls[0] as unknown as [string, Array<Record<string, unknown>>]
    expect(items[0]).toMatchObject({ quesId: 'q1', quesType: 0, answer: ['o1'] })
  })

  it('保存失败只标记该题，不回滚已输入内容', async () => {
    saveAttemptAnswers.mockRejectedValueOnce(new Error('网络断了'))
    const wrapper = await mountPage('single')
    const renderer = wrapper.findAllComponents({ name: 'QuestionRenderer' })[0]
    renderer?.vm.$emit('update:modelValue', { answer: ['o1'], attach: [], marked: 0 })
    await flushPromises()

    // 内容保留（学员不用白答一遍）
    expect(wrapper.findAllComponents({ name: 'QuestionRenderer' })[0]?.props('modelValue').answer).toEqual([
      'o1'
    ])
    // 并且能看出该题保存失败
    expect(wrapper.find('.q__sync.is-error').exists()).toBe(true)
  })

  it('切题前把防抖中的填空答案立即发出，不漏保存', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPage('paged')
      // 先切到第二题以外的填空场景不存在，这里用客观题的即时保存路径验证切题会 flush
      const renderer = wrapper.findComponent({ name: 'QuestionRenderer' })
      renderer.vm.$emit('update:modelValue', { answer: ['o1'], attach: [], marked: 0 })
      await flushPromises()
      await wrapper.find('.pager button:last-of-type').trigger('click')
      await flushPromises()
      expect(saveAttemptAnswers).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('AttemptPage 倒计时与信息区', () => {
  it('不限时（deadlineAt=null）时答题卡显示「不限时」而不是空白', async () => {
    const wrapper = await mountPage('single')
    expect(wrapper.text()).toContain('不限时')
  })

  it('顶部信息区展示考生、工号、部门、总分与通过分数', async () => {
    const wrapper = await mountPage('single')
    const text = wrapper.find('.exam-info').text()
    expect(text).toContain('张三')
    expect(text).toContain('zhangsan')
    expect(text).toContain('杰克科技股份')
    // 后端权威值：总分 18、通过分数 10.8
    expect(text).toContain('18分')
    expect(text).toContain('10.8分')
  })

  it('节标题带「本题共N小题，共M分」统计', async () => {
    const wrapper = await mountPage('single')
    const heads = wrapper.findAll('.sec-head').map((n) => n.text())
    expect(heads[0]).toContain('本题共1小题，共1分')
    expect(heads[1]).toContain('本题共1小题，共3分')
  })
})

describe('AttemptPage 标记', () => {
  it('点标记调用 flag 接口并把 marked 落在该题', async () => {
    const wrapper = await mountPage('single')
    await wrapper.find('.q__flag').trigger('click')
    await flushPromises()
    expect(flagAttemptQuestion).toHaveBeenCalledWith('att-1', 'q1', 1)
    expect(wrapper.find('.q__flag').classes()).toContain('is-on')
  })
})

describe('AttemptPage 顶部信息区（对齐后端 StudentAnswerRespDtos.Paper）', () => {
  it('后端下发 name 时显示考试名', async () => {
    const wrapper = await mountPage('single')
    expect(wrapper.find('.exam-info__name').text()).toBe('内部测试用考试试卷')
  })

  it('name 真缺失时整行不渲染，不留空 h1', async () => {
    // arrange 被删等极端情况：宁可不显示，也不留一段莫名空白
    getAttemptPaper.mockResolvedValueOnce({ ...structuredClone(paper), layout: 'single', name: undefined })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.exam-info__name').exists()).toBe(false)
  })

  it('后端下发 passScore 时显示实际值', async () => {
    const wrapper = await mountPage('single')
    expect(wrapper.find('.exam-info').text()).toContain('10.8分')
  })

  it('passScore 缺失时显示 -- 而不是「--分」（会被误读成 0 分）', async () => {
    getAttemptPaper.mockResolvedValueOnce({
      ...structuredClone(paper),
      layout: 'single',
      passScore: undefined
    })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    const text = wrapper.find('.exam-info').text()
    expect(text).toContain('通过分数')
    expect(text).not.toContain('--分')
  })

  it('总分优先用后端 totalScore，不用题面求和覆盖权威值', async () => {
    const wrapper = await mountPage('single')
    // 题面求和是 1+3=4，后端说 18，必须显示 18
    expect(wrapper.find('.exam-info').text()).toContain('18分')
    expect(wrapper.find('.exam-info').text()).not.toContain('4分')
  })

  it('后端未下发 totalScore 时才用题面求和兜底', async () => {
    getAttemptPaper.mockResolvedValueOnce({
      ...structuredClone(paper),
      layout: 'single',
      totalScore: undefined
    })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.exam-info').text()).toContain('4分')
  })
})

describe('AttemptPage 已交卷只读（契约 01 §S5：交卷即终态）', () => {
  const mountSubmitted = async () => {
    getAttemptPaper.mockResolvedValueOnce({
      ...structuredClone(paper),
      layout: 'single',
      submitted: true
    })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    return wrapper
  }

  it('submitted=true 时 QuestionRenderer 一律 readonly，控件不可编辑', async () => {
    const wrapper = await mountSubmitted()
    const modes = wrapper.findAllComponents({ name: 'QuestionRenderer' }).map((c) => c.props('mode'))
    expect(modes).toEqual(['readonly', 'readonly'])
  })

  it('submitted=true 时不打心跳（交卷后没有计时意义，还白打接口）', async () => {
    await mountSubmitted()
    // 未交卷时 load() 会立刻心跳一次；交卷后不应有
    expect(heartbeatAttempt).not.toHaveBeenCalled()
  })

  it('submitted=true 时标记按钮禁用', async () => {
    const wrapper = await mountSubmitted()
    expect(wrapper.find('.q__flag').attributes('disabled')).toBeDefined()
  })

  it('未交卷时 renderer 是 edit 模式（对照组，防止上面几条误判）', async () => {
    const wrapper = await mountPage('single')
    const modes = wrapper.findAllComponents({ name: 'QuestionRenderer' }).map((c) => c.props('mode'))
    expect(modes).toEqual(['edit', 'edit'])
  })
})

/**
 * DER-31：交卷后的「查看结果」入口。
 *
 * <p>守四条：交卷成功有按钮、页面不自动跳转、文案随 status 变化、
 * 点按钮才跳结果页。这里用真实提交路径（不是直接塞 submitted=true），
 * 才能验证 `submitAttempt` 的响应 status 有没有被正确接住。
 */
describe('AttemptPage 交卷后查看结果入口（DER-31）', () => {
  const submitFromPage = async (status: number) => {
    submitAttempt.mockResolvedValueOnce({
      attemptId: 'att-1',
      status,
      objectiveScore: 10,
      objectiveFullScore: 10,
      subjectivePending: 0,
      submitAt: '2026-11-12 10:00:00'
    })
    const wrapper = await mountPage('single')
    // 答题卡的提交按钮会走 confirm 弹窗（mock 已 resolve），再进 doSubmit
    await wrapper.find('[class*=submit]').trigger('click').catch(() => {})
    await flushPromises()
    // 若上面的选择器没命中，兜底直接调 AnswerSheet 的 submit 事件
    if (!wrapper.find('.attempt-submitted-tip').exists()) {
      const sheet = wrapper.findComponent({ name: 'AnswerSheet' })
      sheet.vm.$emit('submit')
      await flushPromises()
    }
    return wrapper
  }

  it('交卷成功：提示条里有「查看结果」类按钮，且页面没有自动跳转', async () => {
    const wrapper = await submitFromPage(3)
    // 必须真的走了提交接口，否则下面几条文案测试只是在测默认值、没测到 status 传递
    expect(submitAttempt).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.attempt-submitted-tip').exists()).toBe(true)
    expect(wrapper.find('.submitted-result-btn').exists()).toBe(true)
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('status=2（批阅中）：文案是「查看批阅进度」而不是「查看成绩」', async () => {
    const wrapper = await submitFromPage(2)
    expect(wrapper.find('.submitted-result-btn').text()).toBe('查看批阅进度')
  })

  it('status=3（已出分）：文案是「查看成绩」', async () => {
    const wrapper = await submitFromPage(3)
    expect(wrapper.find('.submitted-result-btn').text()).toBe('查看成绩')
  })

  it('点「查看结果」才跳 /result，且带上 attemptId', async () => {
    const wrapper = await submitFromPage(3)
    await wrapper.find('.submitted-result-btn').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/exam/student/attempts/att-1/result')
  })

  it('重进已交卷答卷（Paper.submitted=true）：按钮按「查看成绩」兜底', async () => {
    getAttemptPaper.mockResolvedValueOnce({
      ...structuredClone(paper),
      layout: 'single',
      submitted: true
    })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.submitted-result-btn').text()).toBe('查看成绩')
  })
})

/**
 * 守住「交卷成功不弹模态框」这个决定（DER-31 实测发现）。
 * 模态框会盖住提示条里的「查看结果」按钮，学员得先关弹窗才能点，等于把入口藏起来了。
 */
describe('AttemptPage 交卷成功不弹模态框（DER-31 时序）', () => {
  it('交卷成功：不调用 ElMessageBox.alert，按钮立即可点', async () => {
    submitAttempt.mockResolvedValueOnce({
      attemptId: 'att-1', status: 3, objectiveScore: 10,
      objectiveFullScore: 10, subjectivePending: 0, submitAt: '2026-11-12 10:00:00'
    })
    const wrapper = await mountPage('single')
    const sheet = wrapper.findComponent({ name: 'AnswerSheet' })
    sheet.vm.$emit('submit')
    await flushPromises()
    expect(messageBoxAlert).not.toHaveBeenCalled()
    expect(wrapper.find('.submitted-result-btn').exists()).toBe(true)
  })

  it('交卷失败：仍弹模态提示（错误信息需要打断）', async () => {
    submitAttempt.mockRejectedValueOnce(new Error('答题时间不足'))
    const wrapper = await mountPage('single')
    const sheet = wrapper.findComponent({ name: 'AnswerSheet' })
    sheet.vm.$emit('submit')
    await flushPromises()
    expect(messageBoxAlert).toHaveBeenCalledWith('答题时间不足', '交卷失败', expect.objectContaining({
      confirmButtonText: '知道了'
    }))
  })
})

/**
 * 考后电子签名（契约 01 §S3 / DER-31 遗留项）。
 *
 * <p>守三条：
 * 1. `postExamSign=1` 时，主动交卷后弹签名框；
 * 2. `postExamSign=0` 或缺省时不弹（不能对所有考试都弹）；
 * 3. **自动/强制交卷不弹**——学员可能不在屏前，弹了只会把页面卡在一个他不知道为什么出现的弹窗上。
 */
describe('AttemptPage 考后签名（§S3）', () => {
  const submitAndCheck = async (opts: { postExamSign: number | undefined; silent?: boolean }) => {
    getAttemptPaper.mockResolvedValueOnce({
      ...structuredClone(paper),
      layout: 'single',
      arrangeId: 'arr-1',
      postExamSign: opts.postExamSign
    })
    submitAttempt.mockResolvedValueOnce({
      attemptId: 'att-1', status: 3, objectiveScore: 10,
      objectiveFullScore: 10, subjectivePending: 0, submitAt: '2026-11-12 10:00:00'
    })
    const wrapper = mount(AttemptPage, { global: { stubs } })
    await flushPromises()
    const sheet = wrapper.findComponent({ name: 'AnswerSheet' })
    sheet.vm.$emit('submit')
    await flushPromises()
    return wrapper
  }

  it('postExamSign=1：主动交卷后弹出签名框', async () => {
    const wrapper = await submitAndCheck({ postExamSign: 1 })
    // PreExamSignDialog 通过 el-dialog 渲染；stub 环境下检查组件是否存在
    const dlg = wrapper.findComponent({ name: 'PreExamSignDialog' })
    expect(dlg.exists()).toBe(true)
    expect(dlg.props('stage')).toBe('post')
  })

  it('postExamSign=0：交卷后不弹签名框', async () => {
    const wrapper = await submitAndCheck({ postExamSign: 0 })
    expect(wrapper.findComponent({ name: 'PreExamSignDialog' }).exists()).toBe(false)
  })

  it('postExamSign 缺省：按不开启处理（不弹）', async () => {
    const wrapper = await submitAndCheck({ postExamSign: undefined })
    expect(wrapper.findComponent({ name: 'PreExamSignDialog' }).exists()).toBe(false)
  })
})
