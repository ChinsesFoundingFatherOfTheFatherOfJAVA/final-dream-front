import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import FaceVerifyDialog from './FaceVerifyDialog.vue'
import { detectOnce, loadHuman } from '../faceLiveness'
import type { LivenessFrame } from '../faceLiveness'
import type { FaceVerifyResult } from '../faceVerifyModel'

/**
 * FaceVerifyDialog 的**放行闸门**测试（决策 DER-07）。
 *
 * <p>这个 spec 守的不是「活体判定准不准」（那是 `livenessChallenge.spec.ts` 的事），
 * 而是三件组件层面才存在的性质：
 * <ol>
 *   <li>动作完成 → 抓拍 → `pass`（identity_status=1）；</li>
 *   <li>失败/超时/模型加载失败/跳过 → **一定还有「继续考试」按钮**，
 *       且点下去 emit 的结论对得上 identity_status（2 或 3）；</li>
 *   <li>关弹窗/卸载后**不再调 `detectOnce`**（检测 interval 不泄漏）。</li>
 * </ol>
 *
 * <p>第 2 条为什么必须用组件测试守住：`faceVerifyModel.canAlwaysContinue()` 恒为 true，
 * 但真正决定学员能不能开考的是**模板里那个按钮存不存在**。纯函数测不到 DOM，
 * 而「把失败态的按钮删掉」正是最容易被顺手犯下的回归。
 *
 * <h3>关键打桩决策</h3>
 * - `../faceLiveness` 整模块 mock：它静态依赖 TFJS + 2MB 模型，jsdom 里跑不了；
 *   组件用的是**动态 import**，`vi.mock` 同样能拦到（Vitest 拦截模块图，不分静态/动态）。
 * - 摄像头用假的 `getUserMedia`：jsdom 没有 `navigator.mediaDevices`。
 * - `HTMLMediaElement.play` 必须打桩：jsdom 未实现它，返回 `undefined`，
 *   组件里 `await video.play().catch(...)` 会变成对 undefined 取 `.catch` 而抛 TypeError，
 *   整个 openCamera 会误判成「无法使用摄像头」。
 * - canvas `getContext` / `toDataURL` 也要打桩：jsdom 无 canvas 实现，
 *   不打桩则 `grabFrame` 永远返回 null，`pass` 分支根本走不到。
 * - 用 fake timers 并把 `performance` 一起伪造：挑战时限 15 秒，
 *   真实等待会让这个文件跑十几秒；而 `performance.now()` 是状态机的**唯一时钟**，
 *   必须与 `setInterval` 同步推进，否则 deadline 永远到不了。
 */

vi.mock('../faceLiveness', () => ({
  loadHuman: vi.fn(),
  detectOnce: vi.fn(),
  resetHuman: vi.fn(),
}))

const mockedLoadHuman = vi.mocked(loadHuman)
const mockedDetectOnce = vi.mocked(detectOnce)

/** 检测节拍（与组件内 DETECT_INTERVAL_MS 对齐；改组件时这里也要改） */
const TICK_MS = 250

/**
 * el-dialog 的轻量替身。
 *
 * <p>只要把默认插槽和 footer 插槽渲染出来即可：本 spec 断言的是
 * 「某个按钮在不在」「点了 emit 什么」，与弹窗的动画/挂载逻辑无关。
 * `v-model` 需要 `modelValue` + `update:modelValue` 才能被 Vue 识别为组件 v-model。
 */
const DialogStub = {
  props: ['modelValue', 'title', 'width', 'class'],
  emits: ['update:modelValue', 'closed'],
  template: '<div class="dialog-stub"><slot /><slot name="footer" /></div>',
}

/**
 * el-button 的轻量替身。
 *
 * <p>`emits: ['click']` 必须显式声明，理由同 `AnswerSheet.spec.ts`：
 * 不声明时父组件的 `@click` 会同时作为原生监听器落到根 `<button>` 上，
 * 又叠加 stub 自己的 `$emit('click')`，一次点击触发两次。
 */
const ButtonStub = {
  emits: ['click'],
  props: ['disabled', 'loading', 'type'],
  template:
    '<button type="button" class="el-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

const stubs = {
  'el-dialog': DialogStub,
  'el-button': ButtonStub,
}

/** 构造一帧检测结果；默认「正对镜头、睁眼」的正常帧 */
function makeFrame(patch: Partial<LivenessFrame> = {}): LivenessFrame {
  return {
    faceCount: 1,
    yaw: 0,
    roll: 0,
    pitch: 0,
    openLeft: 0.41,
    openRight: 0.41,
    blinkLeftGesture: false,
    blinkRightGesture: false,
    blinkGesture: false,
    // 默认不启用 embedding 模型（6.7MB），比对场景再显式给
    embedding: null,
    error: null,
    ...patch,
  }
}

/** 睁眼帧（0.41，实测值） */
const openFrame = () => makeFrame({ openLeft: 0.41, openRight: 0.41 })
/** 闭眼帧（0.1，低于状态机的 0.2 闭眼判据） */
const closedFrame = () => makeFrame({ openLeft: 0.1, openRight: 0.1 })

const fakeStream = () => ({
  getTracks: () => [{ stop: vi.fn() }],
})

/**
 * 挂载并等到摄像头就绪。
 *
 * <p>组件在 `watch(modelValue, immediate)` 里开摄像头，这个 async 流程不会被
 * `mount()` 等待，所以要 flush 一轮微任务 + `nextTick` 才能看到 `phase === 'ready'`。
 */
async function mountReady(props: Record<string, unknown> = {}) {
  const wrapper = mount(FaceVerifyDialog, {
    props: { modelValue: true, passDelayMs: 0, ...props },
    global: { stubs },
    attachTo: document.body,
  })
  await flushPromises()
  await nextTick()
  return wrapper
}

/** 把视频元素伪装成「已经出画面」：jsdom 的 videoWidth/videoHeight 恒为 0 */
function primeVideo(wrapper: VueWrapper) {
  const video = wrapper.find('video')
  expect(video.exists()).toBe(true)
  const el = video.element as HTMLVideoElement
  for (const [key, value] of [
    ['videoWidth', 480],
    ['videoHeight', 360],
  ] as const) {
    Object.defineProperty(el, key, { value, configurable: true })
  }
}

/** 取当前阶段（defineExpose 暴露的是 ref，经 expose 代理后已解包） */
function phaseOf(wrapper: VueWrapper): string {
  return (wrapper.vm as unknown as { phase: string }).phase
}

/** 按文本找按钮 */
function buttonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))
}

/** 所有按钮文案，失败分支断言「有出口」时用 */
function buttonTexts(wrapper: VueWrapper): string[] {
  return wrapper.findAll('button').map((b) => b.text())
}

/** 推进若干拍检测；`advanceTimersByTimeAsync` 会在定时器之间 flush 微任务 */
async function ticks(wrapper: VueWrapper, count: number) {
  for (let i = 0; i < count; i += 1) {
    await vi.advanceTimersByTimeAsync(TICK_MS)
  }
  await nextTick()
  return wrapper
}

beforeEach(() => {
  // performance 必须一起伪造：状态机唯一的时钟是 performance.now()，
  // 不伪造就会出现「定时器推进了 15 秒，但 deadline 还是真实时间」的错配
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
  })
  vi.spyOn(Math, 'random').mockReturnValue(0) // 0 → 必定抽到「眨眼」
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,ZmFrZQ==',
  )

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
    configurable: true,
  })

  mockedLoadHuman.mockResolvedValue({} as never)
  mockedDetectOnce.mockResolvedValue(openFrame())
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('FaceVerifyDialog · 动作式活体', () => {
  it('动作完成（睁→闭→睁）后进入 pass 并 emit pass', async () => {
    // 序列：2 帧睁眼建立基线 → 1 帧闭眼 → 2 帧睁眼确认，正好满足状态机的三阶段
    mockedDetectOnce
      .mockResolvedValueOnce(openFrame())
      .mockResolvedValueOnce(openFrame())
      .mockResolvedValueOnce(closedFrame())
      .mockResolvedValueOnce(openFrame())
      .mockResolvedValueOnce(openFrame())

    const wrapper = await mountReady()
    primeVideo(wrapper)

    expect(phaseOf(wrapper)).toBe('ready')
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    // 先过 ensureCamera 的 80ms 延时，再等 loadHuman
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(phaseOf(wrapper)).toBe('challenge')
    // 指令文案随挑战类型变化：Math.random→0 抽到眨眼
    expect(wrapper.text()).toContain('请眨一下眼睛')

    await ticks(wrapper, 5)

    expect(phaseOf(wrapper)).toBe('pass')
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    const results = wrapper.emitted('finish')!
    expect(results).toHaveLength(1)
    const result = results[0]![0] as FaceVerifyResult
    expect(result.outcome).toBe('pass')
    expect(result.snapshot).toContain('data:image/jpeg')
    wrapper.unmount()
  })

  it('转头挑战展示「转头」文案，不展示眨眼文案', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 0.99 → turn + 右侧

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(phaseOf(wrapper)).toBe('challenge')
    expect(wrapper.text()).toContain('请向你的右侧转头，再转回来')
    expect(wrapper.text()).not.toContain('请眨一下眼睛')
    wrapper.unmount()
  })

  it('超时后进入 fail，但「继续考试」仍在，点它 emit fail（identity_status=2）', async () => {
    // 一直睁着眼：永远不会满足「闭一次再睁」，只能靠 15 秒超时收尾
    mockedDetectOnce.mockResolvedValue(openFrame())

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    expect(phaseOf(wrapper)).toBe('challenge')

    // 越过 15 秒时限
    await vi.advanceTimersByTimeAsync(16_000)
    await flushPromises()
    await nextTick()

    expect(phaseOf(wrapper)).toBe('fail')
    // 失败原因来自状态机的 failureMessage，而不是组件内再造一份文案
    expect(wrapper.text()).toContain('动作超时')
    // ★ DER-07：失败态必须有出口
    const continueBtn = buttonByText(wrapper, '继续考试')
    expect(continueBtn).toBeTruthy()

    await continueBtn!.trigger('click')
    const results = wrapper.emitted('finish')!
    expect(results).toHaveLength(1)
    expect((results[0]![0] as FaceVerifyResult).outcome).toBe('fail')
    wrapper.unmount()
  })

  it('模型加载失败 → unavailable，且仍能继续考试', async () => {
    mockedLoadHuman.mockRejectedValue(new Error('人脸模型加载失败：facemesh'))

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await nextTick()

    expect(phaseOf(wrapper)).toBe('unavailable')
    expect(wrapper.text()).toContain('人脸模型加载失败')
    expect(buttonByText(wrapper, '继续考试')).toBeTruthy()
    // 模型都没加载上，一次检测都不该发起
    expect(mockedDetectOnce).not.toHaveBeenCalled()

    await buttonByText(wrapper, '继续考试')!.trigger('click')
    const results = wrapper.emitted('finish')!
    expect((results[0]![0] as FaceVerifyResult).outcome).toBe('error')
    wrapper.unmount()
  })

  it('组件卸载后不再调用 detectOnce（interval 不泄漏）', async () => {
    mockedDetectOnce.mockResolvedValue(openFrame())

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await ticks(wrapper, 3)

    const callsBefore = mockedDetectOnce.mock.calls.length
    expect(callsBefore).toBeGreaterThan(0)

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(5_000)
    await flushPromises()

    // 卸载后再推进 5 秒，一次新检测都不能有
    expect(mockedDetectOnce.mock.calls.length).toBe(callsBefore)
  })

  it('弹窗关闭（modelValue→false）后也不再调用 detectOnce', async () => {
    mockedDetectOnce.mockResolvedValue(openFrame())

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await ticks(wrapper, 2)

    const callsBefore = mockedDetectOnce.mock.calls.length
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2_000)

    expect(mockedDetectOnce.mock.calls.length).toBe(callsBefore)
    wrapper.unmount()
  })

  it('检测帧带 error 时不判 no-face（只推进时钟，不冤枉学员）', async () => {
    // emptyFrame 的形状：faceCount=0 + error + openLeft=NaN。
    // 若直接喂给状态机，faceCount=0 会立刻判 no-face（作弊嫌疑），这是不能接受的
    mockedDetectOnce.mockResolvedValue(
      makeFrame({
        faceCount: 0,
        openLeft: Number.NaN,
        openRight: Number.NaN,
        error: '视频尚未就绪',
      }),
    )

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await ticks(wrapper, 5)

    expect(phaseOf(wrapper)).toBe('challenge')
    expect(wrapper.text()).not.toContain('未检测到人脸')
    wrapper.unmount()
  })

  it('检测到多张人脸 → fail，文案说明多人入镜', async () => {
    mockedDetectOnce.mockResolvedValue(makeFrame({ faceCount: 2 }))

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await ticks(wrapper, 1)

    expect(phaseOf(wrapper)).toBe('fail')
    expect(wrapper.text()).toContain('检测到多张人脸')
    expect(buttonByText(wrapper, '继续考试')).toBeTruthy()
    wrapper.unmount()
  })

  it('全程拿不到有效样本的超时记为 unavailable（设备故障不算学员头上）', async () => {
    // 15 秒里每一帧都是 error 帧 → 没有一帧有效样本 → 不能判 fail（会冤枉人）
    mockedDetectOnce.mockResolvedValue(
      makeFrame({
        faceCount: 0,
        openLeft: Number.NaN,
        openRight: Number.NaN,
        error: '模型推理失败',
      }),
    )

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(16_000)
    await flushPromises()
    await nextTick()

    expect(phaseOf(wrapper)).toBe('unavailable')
    expect(buttonByText(wrapper, '继续考试')).toBeTruthy()
    wrapper.unmount()
  })

  it('挑战进行中也能「跳过核验」放行（记 error，不记 pass）', async () => {
    mockedDetectOnce.mockResolvedValue(openFrame())

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    expect(phaseOf(wrapper)).toBe('challenge')

    const skip = buttonByText(wrapper, '跳过核验')
    expect(skip).toBeTruthy()
    await skip!.trigger('click')
    await flushPromises()

    const results = wrapper.emitted('finish')!
    expect(results).toHaveLength(1)
    expect((results[0]![0] as FaceVerifyResult).outcome).toBe('error')
    expect((results[0]![0] as FaceVerifyResult).snapshot).toBeNull()
    wrapper.unmount()
  })

  it('模型加载中（checking）也有跳过出口，不会把学员锁死', async () => {
    // loadHuman 永远不 resolve：模拟 2MB 模型在慢网络上一直下不来
    mockedLoadHuman.mockReturnValue(new Promise(() => undefined) as never)

    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(phaseOf(wrapper)).toBe('checking')
    const skip = buttonByText(wrapper, '跳过核验')
    expect(skip).toBeTruthy()
    await skip!.trigger('click')
    expect(wrapper.emitted('finish')).toHaveLength(1)
    wrapper.unmount()
  })

  it('摄像头不可用（无 getUserMedia）→ unavailable 且可继续', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })

    const wrapper = await mountReady()

    expect(phaseOf(wrapper)).toBe('unavailable')
    expect(wrapper.text()).toContain('不支持摄像头')
    expect(buttonByText(wrapper, '继续考试')).toBeTruthy()
    wrapper.unmount()
  })

  it('每个非通过分支都至少有一个「继续考试」或「跳过核验」出口', async () => {
    mockedDetectOnce.mockResolvedValue(makeFrame({ faceCount: 2 }))
    const wrapper = await mountReady()
    primeVideo(wrapper)
    await buttonByText(wrapper, '开始核验')!.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    await ticks(wrapper, 1)

    const texts = buttonTexts(wrapper)
    const hasExit = texts.some((t) => t.includes('继续考试') || t.includes('跳过核验'))
    expect(hasExit).toBe(true)
    wrapper.unmount()
  })
})
