/**
 * `faceLiveness` 的单测。
 *
 * <p>这里守的是两类东西，都是**肉眼点测发现不了**的：
 * <ol>
 *   <li>**眨眼极性不能反**。`openLeft/openRight` 是 human 的**睁眼度**（越小越闭）。
 *       如果哪天有人「顺手」把它折成 `1 - x` 或改名为 `blinkLeft`，
 *       睁眼就会被读成闭眼，诚实学员 100% 超时——而开发机上看着一切正常。
 *       所以这里**用实测的真值（睁眼 0.414 / 0.407）直接断言极性**，
 *       不是只断言「返回了一个数」。</li>
 *   <li>**失败不能炸**。检测抛错、模型没加载、视频没就绪，都必须降级成
 *       `faceCount = 0` 的帧。抛出去的话调用方的逐帧循环会中断，摄像头画面卡死，
 *       学员只会看到弹窗不动。</li>
 * </ol>
 *
 * <p>human 库整体被 mock：它为 2MB 模型 + WebGL 后端，jsdom 里跑不起来；
 * 而本模块真正要测的是「human 的结果 → LivenessFrame」这段映射，不是 human 自己。
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * human 源码里的闭眼判据（`src/gesture/gesture.ts`）：睁眼度 < 0.2 即 blink。
 * 状态机与 gesture 信号共用这一个阈值，所以测试也引它，而不是再写一遍 0.2。
 */
const HUMAN_BLINK_THRESHOLD = 0.2

/**
 * 实测睁眼值（真浏览器 + human 内置 warmup 样例人脸，正对镜头）：
 * openLeft = 0.414、openRight = 0.407。
 * 这两个数是**实测出来的**，不是估的——它们是「极性断言」的基准。
 */
const MEASURED_OPEN_LEFT = 0.414
const MEASURED_OPEN_RIGHT = 0.407

// human 实例在测试里的假身：`models.stats()` 要能被 loadHuman 的完整性校验读到
const mockStats = vi.fn()
const mockDetect = vi.fn()
const mockLoad = vi.fn()
const mockConstructor = vi.fn()

vi.mock('@vladmandic/human', () => {
  // 用 class 而不是箭头函数：`new Human()` 必须可用
  class MockHuman {
    models = { stats: mockStats }
    detect = mockDetect
    load = mockLoad
    constructor(config: unknown) {
      mockConstructor(config)
    }
  }
  return { default: MockHuman }
})

import {
  HUMAN_BLINK_THRESHOLD as EXPORTED_THRESHOLD,
  HUMAN_CONFIG,
  LEFT_EYE_POINTS,
  MODEL_BASE_PATH,
  OPEN_EYE_REFERENCE,
  REQUIRED_MODELS,
  RIGHT_EYE_POINTS,
  detectOnce,
  emptyFrame,
  findMissingModels,
  frameFromResult,
  getLoadedHuman,
  loadHuman,
  openRatio,
  resetHuman
} from './faceLiveness'

/** 构造 468 个关键点，只有我们关心的 8 个点有真实坐标，其余用 (0,0) 填充 */
type Mesh = [number, number, number?][]

/**
 * 造一套眼睛关键点。
 *
 * <p>参数是「睑缘间距 / 眼眶间距」，也就是 human 源码里的 openRatio 分子分母。
 * 直接给比值而不是给坐标，是为了让用例读起来就是「这只眼睁眼度 0.1」，
 * 而不用在测试里做一遍坐标加减。
 */
function buildMesh(options: { leftOpen: number; rightOpen: number }): Mesh {
  const mesh = Array.from({ length: 468 }, () => [0, 0, 0] as [number, number, number?])
  const outer = 40 // 眼眶间隙固定 40px，只改睑缘间距来表达开合
  const lid = (ratio: number) => ratio * outer

  // 左眼：内层睑缘 386(上) / 374(下)，外层眼眶 443(上) / 450(下)
  mesh[386] = [0, 0]
  mesh[374] = [0, lid(options.leftOpen)]
  mesh[443] = [-10, -5]
  mesh[450] = [-10, -5 + outer]
  // 右眼：内层睑缘 159(上) / 145(下)，外层眼眶 223(上) / 230(下)
  mesh[159] = [10, 0]
  mesh[145] = [10, lid(options.rightOpen)]
  mesh[223] = [20, -5]
  mesh[230] = [20, -5 + outer]
  return mesh
}

/** 一张完整的人脸结果（姿态角度是弧度，与 human 一致） */
function face(options: {
  leftOpen?: number
  rightOpen?: number
  yaw?: number
  roll?: number
  pitch?: number
  mesh?: Mesh | undefined
}) {
  return {
    boxScore: 0.9,
    mesh:
      'mesh' in options
        ? options.mesh
        : buildMesh({ leftOpen: options.leftOpen ?? 0.41, rightOpen: options.rightOpen ?? 0.41 }),
    rotation: {
      angle: {
        yaw: options.yaw ?? 0,
        roll: options.roll ?? 0,
        pitch: options.pitch ?? 0
      }
    }
  }
}

beforeEach(() => {
  resetHuman()
  vi.clearAllMocks()
  // 默认：模型「真的」加载成功了（loadHuman 会校验这两个名字）
  mockStats.mockReturnValue({
    modelStats: [
      { name: 'blazeface', loaded: true },
      { name: 'facemesh', loaded: true }
    ]
  })
  mockLoad.mockResolvedValue(undefined)
  mockDetect.mockResolvedValue({ face: [], gesture: [], error: null })
})

describe('faceLiveness · 人脸数量', () => {
  it('画面里没人时 faceCount = 0，且不报错', () => {
    const frame = frameFromResult({ face: [], gesture: [] })
    expect(frame.faceCount).toBe(0)
    // 没脸不是错误，状态机会自己决定是「学员离开」还是「再等等」
    expect(frame.error).toBeNull()
  })

  it('画面里有多张脸时如实上报，不裁成 1', () => {
    // human 默认 maxDetected=1 会把多脸裁掉，那样替考就永远发现不了；
    // 这里断言「有几个报几个」
    const frame = frameFromResult({ face: [face({}), face({}), face({})], gesture: [] })
    expect(frame.faceCount).toBe(3)
    expect(frame.faceCount).toBeGreaterThan(1)
  })

  it('结果为空 / 形状异常时按无脸处理，不抛', () => {
    expect(frameFromResult(null).faceCount).toBe(0)
    expect(frameFromResult(undefined).faceCount).toBe(0)
    expect(frameFromResult({}).faceCount).toBe(0)
  })
})

describe('faceLiveness · 眨眼极性（这条反了功能就整体失效）', () => {
  it('睁眼时 openLeft/openRight 与实测值一致，且明显高于闭眼阈值', () => {
    const frame = frameFromResult({
      face: [face({ leftOpen: MEASURED_OPEN_LEFT, rightOpen: MEASURED_OPEN_RIGHT })],
      gesture: []
    })
    expect(frame.openLeft).toBeCloseTo(MEASURED_OPEN_LEFT, 3)
    expect(frame.openRight).toBeCloseTo(MEASURED_OPEN_RIGHT, 3)
    // 睁眼必须「不触发眨眼」：睁眼度必须远大于 0.2
    expect(frame.openLeft).toBeGreaterThan(HUMAN_BLINK_THRESHOLD)
    expect(frame.openRight).toBeGreaterThan(HUMAN_BLINK_THRESHOLD)
  })

  it('openLeft 越小越闭：闭眼值低于阈值，睁眼值高于阈值（单调性）', () => {
    const closed = frameFromResult({ face: [face({ leftOpen: 0.08, rightOpen: 0.08 })], gesture: [] })
    const open = frameFromResult({ face: [face({ leftOpen: 0.45, rightOpen: 0.45 })], gesture: [] })
    // 极性断言：闭眼的值必须 **更小**。若哪天改成输出 `1 - x`，这条立刻红
    expect(closed.openLeft).toBeLessThan(open.openLeft)
    expect(closed.openLeft).toBeLessThan(HUMAN_BLINK_THRESHOLD)
    expect(open.openLeft).toBeGreaterThan(HUMAN_BLINK_THRESHOLD)
  })

  it('输出里没有 blinkLeft/blinkRight 这类会误导下游的闭合度字段', () => {
    // 曾经的接口叫 blinkLeft（0..1，1=闭），语义与 openLeft 完全相反。
    // 两个都留着迟早有人拿错，所以这里显式断言旧字段不存在。
    const frame = frameFromResult({ face: [face({})], gesture: [] })
    expect('blinkLeft' in frame).toBe(false)
    expect('blinkRight' in frame).toBe(false)
    expect(frame).toHaveProperty('openLeft')
    expect(frame).toHaveProperty('openRight')
  })

  it('左右眼分别取值，不等同于取平均（单眼眨也要能识别）', () => {
    const frame = frameFromResult({ face: [face({ leftOpen: 0.05, rightOpen: 0.41 })], gesture: [] })
    expect(frame.openLeft).toBeLessThan(HUMAN_BLINK_THRESHOLD)
    expect(frame.openRight).toBeGreaterThan(HUMAN_BLINK_THRESHOLD)
  })

  it('关键点索引与 human 源码一致（改成别的点会与 gesture 信号矛盾）', () => {
    // 源码 src/gesture/gesture.ts：左 374/386 与 443/450，右 145/159 与 223/230
    expect(LEFT_EYE_POINTS).toEqual({ upperInner: 386, lowerInner: 374, upperOuter: 443, lowerOuter: 450 })
    expect(RIGHT_EYE_POINTS).toEqual({ upperInner: 159, lowerInner: 145, upperOuter: 223, lowerOuter: 230 })
  })

  it('导出的阈值与 human 源码的 0.2 一致（下游引同一个常量，不抄魔数）', () => {
    expect(EXPORTED_THRESHOLD).toBe(HUMAN_BLINK_THRESHOLD)
    // 实测睁眼值要显著高于阈值，否则阈值本身在某些摄像头上会失准
    expect(OPEN_EYE_REFERENCE).toBeGreaterThan(HUMAN_BLINK_THRESHOLD * 1.5)
  })
})

describe('faceLiveness · 眼睛数据的降级（缺数据绝不能伪造眨眼）', () => {
  it('关键点不足 468 时 openLeft/openRight 是 NaN，不是 0', () => {
    // 这是最危险的 bug 形态：mesh 缺失 → 坐标当 0 → 睑缘间距 0 → 睁眼度 0
    // → 「< 0.2 算闭」→ 白送一次眨眼成功。
    // 用 NaN 是因为 `NaN < 0.2` 恒为 false，任何比较都不会误触发。
    const shortMesh = Array.from({ length: 100 }, () => [0, 0, 0] as [number, number, number?])
    const frame = frameFromResult({ face: [face({ mesh: shortMesh })], gesture: [] })
    expect(Number.isNaN(frame.openLeft)).toBe(true)
    expect(Number.isNaN(frame.openRight)).toBe(true)
    expect(frame.openLeft < HUMAN_BLINK_THRESHOLD).toBe(false)
    expect(frame.openRight < HUMAN_BLINK_THRESHOLD).toBe(false)
  })

  it('没有 mesh 字段时同样是 NaN，不会算出 0', () => {
    const frame = frameFromResult({ face: [face({ mesh: undefined })], gesture: [] })
    expect(Number.isNaN(frame.openLeft)).toBe(true)
    expect(Number.isNaN(frame.openRight)).toBe(true)
  })

  it('眼眶间距为 0（除零）时返回 NaN，不是 Infinity 也不是 0', () => {
    const degenerate: Mesh = Array.from({ length: 468 }, () => [0, 0, 0] as [number, number, number?])
    // 上下眼眶重合 → 分母 0
    degenerate[443] = [0, 0]
    degenerate[450] = [0, 0]
    expect(Number.isNaN(openRatio(degenerate, 386, 374, 443, 450))).toBe(true)
  })

  it('emptyFrame 的眼睛字段是 NaN，不是 0（0 等于免费送一次眨眼）', () => {
    const frame = emptyFrame('boom')
    expect(Number.isNaN(frame.openLeft)).toBe(true)
    expect(Number.isNaN(frame.openRight)).toBe(true)
    expect(frame.openLeft < HUMAN_BLINK_THRESHOLD).toBe(false)
    expect(frame.faceCount).toBe(0)
    expect(frame.blinkGesture).toBe(false)
    expect(frame.error).toBe('boom')
  })
})

describe('faceLiveness · gesture 二值兜底信号', () => {
  it('human 报 blink left eye 时 blinkLeftGesture / blinkGesture 为 true', () => {
    const frame = frameFromResult({
      face: [face({ leftOpen: 0.05, rightOpen: 0.41 })],
      gesture: [{ face: 0, gesture: 'blink left eye' }]
    })
    expect(frame.blinkLeftGesture).toBe(true)
    expect(frame.blinkRightGesture).toBe(false)
    expect(frame.blinkGesture).toBe(true)
  })

  it('human 报 blink right eye 时只命中右侧', () => {
    const frame = frameFromResult({
      face: [face({ leftOpen: 0.41, rightOpen: 0.05 })],
      gesture: [{ face: 0, gesture: 'blink right eye' }]
    })
    expect(frame.blinkLeftGesture).toBe(false)
    expect(frame.blinkRightGesture).toBe(true)
    expect(frame.blinkGesture).toBe(true)
  })

  it('没有 blink gesture 时三个字段都是 false（facing center 不等于眨眼）', () => {
    const frame = frameFromResult({
      face: [face({})],
      gesture: [{ face: 0, gesture: 'facing center' }, { face: 0, gesture: 'mouth 3% open' }]
    })
    expect(frame.blinkLeftGesture).toBe(false)
    expect(frame.blinkRightGesture).toBe(false)
    expect(frame.blinkGesture).toBe(false)
  })

  it('没脸时即使 gesture 里有 blink 也不采信（避免掩盖「学员离开」）', () => {
    const frame = frameFromResult({ face: [], gesture: [{ face: 0, gesture: 'blink left eye' }] })
    expect(frame.faceCount).toBe(0)
    expect(frame.blinkGesture).toBe(false)
  })

  it('mesh 缺失时不采信 blink gesture（无关键点的眨眼判定不可信）', () => {
    const shortMesh = Array.from({ length: 100 }, () => [0, 0, 0] as [number, number, number?])
    const frame = frameFromResult({
      face: [face({ mesh: shortMesh })],
      gesture: [{ face: 0, gesture: 'blink left eye' }]
    })
    expect(frame.blinkGesture).toBe(false)
  })
})

describe('faceLiveness · 头部姿态', () => {
  it('yaw / roll / pitch 原样透传，单位是弧度不是角度', () => {
    // human 的 rotation.angle 就是弧度（demo 里 *180/Math.PI 才成像样的度数）。
    // 下游如果把弧度当角度用，转头阈值会差 57 倍，所以这里钉死单位。
    const frame = frameFromResult({ face: [face({ yaw: 0.5, roll: -0.25, pitch: 0.125 })], gesture: [] })
    expect(frame.yaw).toBeCloseTo(0.5, 6)
    expect(frame.roll).toBeCloseTo(-0.25, 6)
    expect(frame.pitch).toBeCloseTo(0.125, 6)
    // 0.5 弧度 ≈ 28.6°，是「明显转头」的量级；若误当角度看只有 0.5°，判据会完全失效
    expect((frame.yaw * 180) / Math.PI).toBeCloseTo(28.65, 1)
  })

  it('缺少 rotation（mesh 点数不足时 human 不算角度）时归零，不产出 NaN', () => {
    const frame = frameFromResult({
      face: [{ boxScore: 0.9, mesh: buildMesh({ leftOpen: 0.41, rightOpen: 0.41 }) }],
      gesture: []
    })
    expect(frame.yaw).toBe(0)
    expect(frame.roll).toBe(0)
    expect(frame.pitch).toBe(0)
    expect(Number.isNaN(frame.yaw)).toBe(false)
  })
})

describe('faceLiveness · loadHuman 单例与失败处理', () => {
  it('并发调用只构造一次 Human（模型不会重复下载）', async () => {
    const [a, b, c] = await Promise.all([loadHuman(), loadHuman(), loadHuman()])
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    expect(b).toBe(c)
    // 单例被复用后，第二次调用不应再走 load
    await loadHuman()
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('配置里 modelBasePath 指向本地 /models/，不是默认的相对路径', async () => {
    await loadHuman()
    // 默认值 '../models/' 在 hash 路由下会解析到错误目录，必须显式覆盖
    expect(MODEL_BASE_PATH).toBe('/models/')
    const config = mockConstructor.mock.calls[0]?.[0] as { modelBasePath: string }
    expect(config.modelBasePath).toBe('/models/')
  })

  it('模型没真的加载上时抛错，而不是让业务侧「永远检测不到脸」', async () => {
    // human 加载失败只打 log 不抛错，这是它最坑的行为
    mockStats.mockReturnValue({
      modelStats: [
        { name: 'blazeface', loaded: true },
        { name: 'facemesh', loaded: false }
      ]
    })
    await expect(loadHuman()).rejects.toThrow(/facemesh/)
  })

  it('加载失败后允许重试（不会把页面永久废在同一个 rejected Promise 上）', async () => {
    mockStats.mockReturnValue({ modelStats: [] })
    await expect(loadHuman()).rejects.toThrow()

    // 网络恢复后重试应当真的再试一次，而不是直接返回上次的失败
    mockStats.mockReturnValue({
      modelStats: [
        { name: 'blazeface', loaded: true },
        { name: 'facemesh', loaded: true }
      ]
    })
    const human = await loadHuman()
    expect(human).toBeTruthy()
    expect(mockConstructor.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('getLoadedHuman 在加载前为 null，加载后可取到实例', async () => {
    expect(getLoadedHuman()).toBeNull()
    await loadHuman()
    expect(getLoadedHuman()).not.toBeNull()
  })

  it('findMissingModels 只报告必需模型，不把没启用的模型算成缺失', () => {
    expect(findMissingModels({ modelStats: [] })).toEqual([...REQUIRED_MODELS])
    expect(
      findMissingModels({
        modelStats: [
          { name: 'blazeface', loaded: true },
          { name: 'facemesh', loaded: true },
          // iris 没启用、也不该被要求
          { name: 'iris', loaded: false }
        ]
      })
    ).toEqual([])
  })
})

describe('faceLiveness · detectOnce 永不抛异常', () => {
  /** 造一个「已就绪」的 video 元素替身：只要有尺寸和 readyState 就够 human 判定输入可用 */
  const readyVideo = () => ({ readyState: 4, videoWidth: 640, videoHeight: 480 }) as HTMLVideoElement

  it('检测正常时返回帧', async () => {
    mockDetect.mockResolvedValue({ face: [face({ yaw: 0.3 })], gesture: [{ face: 0, gesture: 'facing center' }], error: null })
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(1)
    expect(frame.yaw).toBeCloseTo(0.3, 6)
    expect(frame.error).toBeNull()
  })

  it('没有脸时返回 faceCount = 0（不抛）', async () => {
    mockDetect.mockResolvedValue({ face: [], gesture: [], error: null })
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(0)
    expect(frame.error).toBeNull()
  })

  it('多脸时返回 faceCount > 1', async () => {
    mockDetect.mockResolvedValue({ face: [face({}), face({})], gesture: [], error: null })
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(2)
  })

  it('检测内部抛错时返回空帧 + 原因，绝不向上抛', async () => {
    // 调用方是逐帧轮询的循环，一抛整个画面就卡死
    mockDetect.mockRejectedValue(new Error('tensor boom'))
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(0)
    expect(frame.error).toBe('tensor boom')
  })

  it('抛出的不是 Error 实例时也能拿到可读原因', async () => {
    mockDetect.mockRejectedValue('plain string failure')
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(0)
    expect(frame.error).toBe('plain string failure')
  })

  it('human 在结果里带 error 时按空帧返回（human 自己不抛，用 error 字段表示失败）', async () => {
    mockDetect.mockResolvedValue({ face: [], gesture: [], error: 'could not convert input to tensor' })
    const frame = await detectOnce(readyVideo())
    expect(frame.faceCount).toBe(0)
    expect(frame.error).toBe('could not convert input to tensor')
  })

  it('视频没就绪时直接返回，不调用 human（避免拿空画面去检测）', async () => {
    const notReady = { readyState: 0, videoWidth: 0, videoHeight: 0 } as HTMLVideoElement
    const frame = await detectOnce(notReady)
    expect(frame.faceCount).toBe(0)
    expect(frame.error).toBe('视频尚未就绪')
    expect(mockDetect).not.toHaveBeenCalled()

    // null / undefined 同样安全（组件卸载后 ref 会变成 null）
    expect((await detectOnce(null)).faceCount).toBe(0)
    expect((await detectOnce(undefined)).faceCount).toBe(0)
  })
})

describe('faceLiveness · 配置取舍（体积与加载时间是硬约束）', () => {
  it('只启用检测与关键点，重型模型全部关闭', () => {
    // 每多开一个模型就多下载几 MB、多等几秒。考场里学员只会以为系统卡死。
    // 这条用例挡的是「顺手把 iris/emotion 打开看看效果」这类改动。
    expect(HUMAN_CONFIG.face.enabled).toBe(true)
    expect(HUMAN_CONFIG.face.mesh.enabled).toBe(true)
    expect(HUMAN_CONFIG.face.iris.enabled).toBe(false)
    expect(HUMAN_CONFIG.face.attention.enabled).toBe(false)
    expect(HUMAN_CONFIG.face.emotion.enabled).toBe(false)
    expect(HUMAN_CONFIG.face.description.enabled).toBe(false)
    expect(HUMAN_CONFIG.face.antispoof.enabled).toBe(false)
    expect(HUMAN_CONFIG.face.liveness.enabled).toBe(false)
    expect(HUMAN_CONFIG.body.enabled).toBe(false)
    expect(HUMAN_CONFIG.hand.enabled).toBe(false)
    expect(HUMAN_CONFIG.object.enabled).toBe(false)
    expect(HUMAN_CONFIG.segmentation.enabled).toBe(false)
  })

  it('允许多张脸（替考检测的前提）且每帧重新框脸', () => {
    expect(HUMAN_CONFIG.face.detector.maxDetected).toBeGreaterThan(1)
    // 缓存框会让转头后 mesh 算在旧框上，姿态角度跟着错
    expect(HUMAN_CONFIG.face.detector.skipFrames).toBe(0)
    expect(HUMAN_CONFIG.face.detector.skipTime).toBe(0)
  })
})
