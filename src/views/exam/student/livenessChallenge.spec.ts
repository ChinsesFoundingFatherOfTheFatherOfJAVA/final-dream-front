import { describe, expect, it } from 'vitest'
import {
  BLINK_CLOSED_ENTER,
  BLINK_CLOSED_FRAMES,
  BLINK_OPEN_ENTER,
  BLINK_OPEN_FRAMES,
  DEFAULT_TIMEOUT_MS,
  FAILURE_MESSAGES,
  RAD_TO_DEG,
  TURN_HOLD_FRAMES,
  TURN_RETURN_FRAMES,
  TURN_YAW_RETURN_RAD,
  TURN_YAW_THRESHOLD_RAD,
  challengePrompt,
  checkTimeout,
  createChallenge,
  failureMessage,
  feedSample,
  isAnomaly,
  isSatisfied,
  isTerminal,
  type BlinkChallengeState,
  type ChallengeState,
  type LivenessSample,
  type TurnChallengeState,
} from './livenessChallenge'

/**
 * 这里守的是**活体判定的真值表**：动作必须真的做过，没做就超时，
 * 画面异常必须当场判掉。
 *
 * <p>为什么这些用例不可省：状态机的失败模式都是「静默通过」——
 * 少判一次滞回、把 streak 清零写错位置、超时判断放在动作判定之后，
 * 任何一处都会让「拿一张照片怼摄像头」也能过，而人工点测**看不出来**
 * （真人和照片在真机上都能把流程走完，区别只在照片永远不眨眼）。
 * 所以每一条防作弊性质都必须有一条会红的断言。
 */

/**
 * 喂一帧并保留 challenge 的具体类型。
 *
 * <p>`feedSample` 的返回类型是 `ChallengeState` 联合（因为它要覆盖所有状态迁移），
 * 但 `type` 字段在生命周期内**永不改变**（眨眼挑战不会变成转头），所以这里把类型收回去
 * 让用例能直接读 `sawClosed` / `baselineYaw` 这类 subtype 字段，不必每行都写收窄。
 */
function feed<T extends ChallengeState>(state: T, item: LivenessSample, now: number): T {
  return feedSample(state, item, now) as T
}

/** 把一串样本按固定节拍（250ms，与 UI 约定的检测间隔一致）喂进去 */
function feedAll<T extends ChallengeState>(state: T, samples: LivenessSample[], startAt = 0): T {
  const FRAME_MS = 250
  return samples.reduce<T>(
    (current, item, index) => feed(current, item, startAt + index * FRAME_MS),
    state,
  )
}

/** 构造必定抽到「眨眼」的挑战，避免每个用例都写 random 桩 */
function makeBlink(now = 0, timeoutMs = DEFAULT_TIMEOUT_MS): BlinkChallengeState {
  const state = createChallenge({ now, timeoutMs, types: ['blink'], random: () => 0 })
  if (state.type !== 'blink') throw new Error('测试夹具期望抽到眨眼挑战')
  return state
}

/** 构造必定抽到「转头」的挑战 */
function makeTurn(now = 0, timeoutMs = DEFAULT_TIMEOUT_MS): TurnChallengeState {
  const state = createChallenge({ now, timeoutMs, types: ['turn'], random: () => 0 })
  if (state.type !== 'turn') throw new Error('测试夹具期望抽到转头挑战')
  return state
}

/** 单人脸样本；其余字段按需覆盖 */
function sample(patch: Partial<LivenessSample> = {}): LivenessSample {
  return { faceCount: 1, ...patch }
}

/**
 * 全睁：取 **2026-11-12 真机实测的睁眼均值 0.301**（不是 human 样例的 0.41）。
 *
 * <p>为何要用真机值：夹具若用 0.41 这种“过于理想”的数，阈值定错了也测不出来——
 * 我们最初把 `BLINK_OPEN_ENTER` 定成 0.35 就是用样例数据拍的，真机 0.301 直接让它失效。
 * 夹具跟真实分布对齐后，阈值若又调到不合理的高度，测试会立刻报。
 */
const EYES_OPEN = { openLeft: 0.301, openRight: 0.301 }
/**
 * 全闭：取真机实测的**闭眼段最低 0.176**（仍低于 human 的 0.2 闭眼线，原判据成立）。
 *
 * <p>不用 0.05 这种极限值，是因为夹具得反映“真机难看的场景”，否则阈值的下沿余量无从验证。
 */
const EYES_CLOSED = { openLeft: 0.176, openRight: 0.176 }
/** 一次完整眨眼的样本序列：建立睁眼基线 → 闭 → 重新睁开 */
const BLINK_SEQUENCE = [
  sample(EYES_OPEN),
  sample(EYES_OPEN),
  sample(EYES_CLOSED),
  sample(EYES_OPEN),
  sample(EYES_OPEN),
]

describe('createChallenge · 随机性与可复现', () => {
  it('固定随机源下逐字段可复现（两次创建完全相同）', () => {
    const seeded = () => 0.9
    const first = createChallenge({ now: 1234, random: seeded })
    const second = createChallenge({ now: 1234, random: seeded })
    expect(second).toEqual(first)
    // 0.9 → 从两元素池里取下标 1 → 转头
    expect(first.type).toBe('turn')
    expect(first.createdAt).toBe(1234)
    expect(first.deadlineAt).toBe(1234 + DEFAULT_TIMEOUT_MS)
  })

  it('随机源的调用顺序也是确定的（同序列 → 同结果）', () => {
    // 每次创建会按「先类型、后转头方向」的顺序调用两次 random；
    // 同一条序列喂给两次创建，结果必须逐字段相同，否则「可复现」就是口号
    const counter = () => {
      let index = 0
      const sequence = [0.9, 0.1]
      return () => sequence[index++ % sequence.length] ?? 0
    }
    const first = createChallenge({ now: 7, random: counter() })
    const second = createChallenge({ now: 7, random: counter() })
    expect(second).toEqual(first)
    expect(first.type).toBe('turn')
    expect(first.type === 'turn' && first.promptedDirection).toBe('left')
  })

  it('随机源决定抽到哪种挑战（0 → 眨眼，0.99 → 转头）', () => {
    expect(createChallenge({ now: 0, random: () => 0 }).type).toBe('blink')
    expect(createChallenge({ now: 0, random: () => 0.99 }).type).toBe('turn')
  })

  it('随机源写坏（NaN / 负数 / Infinity）时不产生非法状态', () => {
    // 随机源是外部注入的，返回 NaN 时取下标会变成 NaN，必须兜底成合法挑战
    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const state = createChallenge({ now: 0, random: () => bad })
      expect(state.type).toBe('blink')
      expect(state.status).toBe('active')
    }
    // 上界越界（>1）夹到 0.999…，仍然是合法类型，不会越界成 undefined
    expect(['blink', 'turn']).toContain(createChallenge({ now: 0, random: () => 1.5 }).type)
  })

  it('可以收窄挑战池，且空池回退到默认池而不是抛错', () => {
    const only = createChallenge({ now: 0, random: () => 0.99, types: ['blink'] })
    expect(only.type).toBe('blink')
    const empty = createChallenge({ now: 0, random: () => 0.99, types: [] })
    expect(['blink', 'turn']).toContain(empty.type)
  })

  it('时限可配，非法值回退到默认 15 秒', () => {
    expect(createChallenge({ now: 0, timeoutMs: 3000 }).deadlineAt).toBe(3000)
    expect(createChallenge({ now: 0, timeoutMs: 0 }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
    expect(createChallenge({ now: 0, timeoutMs: -5 }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
    expect(createChallenge({ now: 0, timeoutMs: Number.NaN }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('转头挑战的初始进度全部归零、尚无中位', () => {
    const state = makeTurn()
    expect(state.baselineYaw).toBeNull()
    expect(state.sawTurn).toBe(false)
    expect(state.awayStreak).toBe(0)
    expect(state.homeStreak).toBe(0)
    expect(state.samples).toBe(0)
  })
})

describe('眨眼挑战', () => {
  it('睁眼若干帧 → 闭眼 → 睁眼 = 通过', () => {
    // 真实节奏：先几帧确认睁眼（建立基线），眨一下，再回到睁眼
    const state = feedAll(makeBlink(), BLINK_SEQUENCE)
    expect(isSatisfied(state)).toBe(true)
    expect(state.status).toBe('satisfied')
    expect(isTerminal(state)).toBe(true)
  })

  it('闭眼后一帧睁眼即算通过（采样稀疏，不能要求连续多帧）', () => {
    /**
     * 2026-11-12 真机实测驱动出的修改：
     * `detectOnce` 单次耗时约 172ms，加上间隔后实际采样周期约 200~420ms，
     * 而一次眨眼闭眼只持续 100~400ms —— **很可能只采到 1 帧**。
     * 原先要求「重新睁眼连续 2 帧」等于要求睁眼保持 500ms+，
     * 导致眨眼挑战基本无法通过（转头因为持续 1~2 秒反而没问题）。
     * 现改为 1 帧确认：用「闭→睁」的转变本身保证不是误判。
     */
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_CLOSED)])
    state = feed(state, sample(EYES_OPEN), 3000)
    expect(state.status).toBe('satisfied')
  })

  it('一直睁眼不眨，超时判失败', () => {
    let state = makeBlink()
    // 按 250ms 一拍喂到 15 秒（60 帧），全程睁眼
    for (let i = 0; i <= 60; i++) {
      state = feed(state, sample(EYES_OPEN), i * 250)
      if (isTerminal(state)) break
    }
    expect(state.status).toBe('timeout')
    expect(isSatisfied(state)).toBe(false)
    expect(failureMessage(state)).toBe(FAILURE_MESSAGES.timeout)
  })

  it('闭眼之后再也没睁开 = 超时（不能靠「闭一次眼」蒙过）', () => {
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN), sample(EYES_CLOSED)])
    state = feed(state, sample(EYES_CLOSED), 14000)
    expect(state.status).toBe('active')
    state = feed(state, sample(EYES_CLOSED), 15000)
    expect(state.status).toBe('timeout')
  })

  it('开局就闭眼不算眨眼（必须先确认眼睛是睁着的）', () => {
    // 拿一张「闭眼照片」怼镜头时，若不做开局基线就会直接判通过
    let state = makeBlink()
    for (let i = 0; i < 10; i++) {
      state = feed(state, sample(EYES_CLOSED), i * 250)
    }
    expect(state.status).toBe('active')
    expect(state.eyesArmed).toBe(false)
    expect(state.samples).toBe(10)
  })

  it('滞回带内既不推进也不清零，避免抖动把进度抹掉', () => {
    // 带内值由常量推导，不写死：阈值调整后这条测试仍然成立
    const BAND = (BLINK_CLOSED_ENTER + BLINK_OPEN_ENTER) / 2
    // 先建立睁眼基线（OPEN_FRAMES 帧），再给一帧闭眼 → sawClosed=true
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_CLOSED)])
    expect(state.status).toBe('active')
    // 带内帧：既不算睁也不算闭，状态保持不变（不误判为眨眼完成）
    state = feed(state, sample({ openLeft: BAND, openRight: BAND }), 3000)
    expect(state.status).toBe('active')
    expect(state.sawClosed).toBe(true)
    // 带内帧不能把「已闭眼」的记录抹掉
    state = feed(state, sample({ openLeft: BAND, openRight: BAND }), 3250)
    expect(state.status).toBe('active')
    expect(state.sawClosed).toBe(true)
    // 一帧真睁眼即达成
    state = feed(state, sample(EYES_OPEN), 3500)
    expect(state.status).toBe('satisfied')
  })

  it('单眼眨（wink）不算眨眼：两眼取较小闭合度', () => {
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    for (let i = 0; i < 12; i++) {
      state = feed(state, sample({ openLeft: 0.99, openRight: 0.05 }), 1000 + i * 250)
    }
    // 左眼还睁着（openLeft=0.99）→ 取 max 后整体按「睁」算，永远凑不出闭眼帧
    expect(state.status).toBe('active')
    expect(state.sawClosed).toBe(false)
  })

  it('缺少眨眼字段时本帧不推进任何进度（绝不凭空判过）', () => {
    let state = makeBlink()
    state = feed(state, sample(), 0)
    state = feed(state, sample(), 250)
    expect(state.status).toBe('active')
    expect(state.samples).toBe(2)
    expect(state.eyesArmed).toBe(false)
  })

  it('阈值口径：睁眼度恰为 0.2 即算闭眼，且滞回带宽度为正', () => {
    // 恰在阈值上的帧要算命中（<= 而非 <），否则边界值会变成玄学
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    state = feed(
      state,
      sample({ openLeft: BLINK_CLOSED_ENTER, openRight: BLINK_CLOSED_ENTER }),
      1000,
    )
    expect(state.sawClosed).toBe(BLINK_CLOSED_FRAMES === 1)
    // 滞回带必须存在（闭眼阈值严格小于睁眼阈值），否则抖动会把判定变成二值翻转
    expect(BLINK_OPEN_ENTER).toBeGreaterThan(BLINK_CLOSED_ENTER)
  })

  it('眨眼的确认帧数：闭眼 1 帧、重睁 1 帧（真机采样稀疏，不能要求多帧）', () => {
    /**
     * 2026-11-12 真机实测：`detectOnce` 单次约 172ms，加上间隔后采样周期 200~400ms，
     * 而一次眨眼闭眼只持续 100~400ms —— 只能采到 1~2 帧。
     * 要求多帧等于要求学员把眼睛闭住/睁住数百毫秒，诚实学员会被系统性判失败。
     * 抗抖动改由滞回带 + 开局基线承担。
     */
    expect(BLINK_CLOSED_FRAMES).toBe(1)
    expect(BLINK_OPEN_FRAMES).toBe(1)
  })
})

describe('转头挑战', () => {
  it('yaw 偏离 > 阈值后回正 = 通过', () => {
    // 中位取首帧 yaw=0；先转出去 0.62 rad（≈36°），再回到 0.02 rad
    let state = feedAll(makeTurn(), [
      sample({ yaw: 0 }),
      sample({ yaw: 0.62 }),
      sample({ yaw: 0.62 }),
      sample({ yaw: 0.05 }),
      sample({ yaw: 0.02 }),
    ])
    expect(isSatisfied(state)).toBe(true)
    // 反方向转头同样成立：判定只看偏离幅度
    state = feedAll(
      makeTurn(),
      [
        sample({ yaw: 0 }),
        sample({ yaw: -0.62 }),
        sample({ yaw: -0.62 }),
        sample({ yaw: -0.01 }),
        sample({ yaw: 0 }),
      ],
      10_000,
    )
    expect(isSatisfied(state)).toBe(true)
  })

  it('只是转出去但没回正 = 不算通过（要求「转出去再回来」）', () => {
    const state = feedAll(makeTurn(), [
      sample({ yaw: 0 }),
      sample({ yaw: 0.7 }),
      sample({ yaw: 0.7 }),
      sample({ yaw: 0.7 }),
    ])
    expect(state.status).toBe('active')
    expect(state.sawTurn).toBe(true)
    expect(state.baselineYaw).toBe(0)
  })

  it('转头幅度不足（< 阈值）不推进', () => {
    let state = feedAll(makeTurn(), [sample({ yaw: 0 })])
    // 只有 0.2 rad（≈11.5°），低于 0.35 阈值
    for (let i = 0; i < 6; i++) {
      state = feed(state, sample({ yaw: 0.2 }), 1000 + i * 250)
    }
    expect(state.sawTurn).toBe(false)
    expect(state.status).toBe('active')
  })

  it('一直不转，超时判失败', () => {
    let state = makeTurn()
    for (let i = 0; i <= 60; i++) {
      state = feed(state, sample({ yaw: 0.01 }), i * 250)
      if (isTerminal(state)) break
    }
    expect(state.status).toBe('timeout')
  })

  it('回正后只回一帧还不算通过（要连续两帧确认）', () => {
    let state = feedAll(makeTurn(), [
      sample({ yaw: 0 }),
      sample({ yaw: 0.7 }),
      sample({ yaw: 0.7 }),
    ])
    state = feed(state, sample({ yaw: 0.02 }), 3000)
    expect(state.status).toBe('active')
    state = feed(state, sample({ yaw: 0.02 }), 3250)
    expect(state.status).toBe('satisfied')
  })

  it('中位取首帧有效 yaw，之后不再漂移', () => {
    const state = feedAll(makeTurn(), [
      sample({ yaw: 0.1 }),
      sample({ yaw: 0.5 }),
      sample({ yaw: 0.5 }),
    ])
    expect(state.baselineYaw).toBe(0.1)
  })

  it('阈值常量按弧度口径，且回正阈值明显小于转头阈值', () => {
    // 单位假设：弧度。0.35 rad ≈ 20°，落在 17°~29° 的合理区间
    expect(TURN_YAW_THRESHOLD_RAD * RAD_TO_DEG).toBeCloseTo(20.05, 1)
    expect(TURN_YAW_RETURN_RAD * RAD_TO_DEG).toBeCloseTo(6.88, 1)
    expect(TURN_YAW_RETURN_RAD).toBeLessThan(TURN_YAW_THRESHOLD_RAD)
    expect(TURN_HOLD_FRAMES).toBeGreaterThan(1)
    expect(TURN_RETURN_FRAMES).toBeGreaterThan(1)
  })
})

describe('人脸数量守卫（防作弊核心）', () => {
  it('中途 faceCount 变 0 → 立即判 no-face，不再累计', () => {
    const state = feedAll(makeBlink(), [
      sample(EYES_OPEN),
      sample(EYES_OPEN),
      { faceCount: 0 },
      // 后面就算立刻「眨眼」也不能翻盘：状态已终局
      sample(EYES_CLOSED),
      sample(EYES_OPEN),
      sample(EYES_OPEN),
    ])
    expect(state.status).toBe('no-face')
    expect(isAnomaly(state)).toBe(true)
    expect(isSatisfied(state)).toBe(false)
    expect(state.samples).toBe(3)
    expect(failureMessage(state)).toBe(FAILURE_MESSAGES['no-face'])
  })

  it('中途 faceCount 变 2 → 立即判 multi-face，原因与「没人」不同', () => {
    const state = feedAll(makeTurn(), [
      sample({ yaw: 0 }),
      sample({ yaw: 0.7 }),
      { faceCount: 2, yaw: 0.7 },
      sample({ yaw: 0.02 }),
      sample({ yaw: 0.02 }),
    ])
    expect(state.status).toBe('multi-face')
    expect(state.samples).toBe(3)
    // 两种异常文案必须能指导学员改不同的事
    expect(FAILURE_MESSAGES['multi-face']).not.toBe(FAILURE_MESSAGES['no-face'])
    expect(FAILURE_MESSAGES['multi-face']).toContain('多张人脸')
    expect(FAILURE_MESSAGES['no-face']).toContain('未检测到人脸')
  })

  it('人脸数量异常优先于超时：画面不对时先报画面原因', () => {
    // 到点又没人脸，报「没检测到人脸」比报「超时」更能指导学员
    const state = feedSample(makeBlink(), { faceCount: 0 }, DEFAULT_TIMEOUT_MS + 1000)
    expect(state.status).toBe('no-face')
  })

  it('第一帧就没脸也立即判异常（严格口径由 UI 的预热阶段兜住）', () => {
    const state = feedSample(makeBlink(), { faceCount: 0 }, 0)
    expect(state.status).toBe('no-face')
    expect(state.samples).toBe(1)
  })

  it('faceCount 非法（NaN / 缺失）按「没人脸」处理，不静默当 1 张脸', () => {
    expect(feedSample(makeBlink(), { faceCount: Number.NaN }, 0).status).toBe('no-face')
    // 少传字段同样不能被当成正常帧
    expect(feedSample(makeBlink(), {} as LivenessSample, 0).status).toBe('no-face')
  })

  it('终局后再喂异常帧不会改写既有结论', () => {
    const satisfied = feedAll(makeBlink(), BLINK_SEQUENCE)
    expect(satisfied.status).toBe('satisfied')
    expect(feedSample(satisfied, { faceCount: 0 }, 5000)).toBe(satisfied)
    expect(feedSample(satisfied, { faceCount: 3 }, 5000)).toBe(satisfied)
  })
})

describe('睁眼度极性（踩过的坑，必须有回归）', () => {
  it('task-1 实测的睁眼值 0.41 不能被判成闭眼', () => {
    // 收敛这道回归的原因：human 的 openRatio 是「睁眼度，越小越闭」。
    // 早期本模块契约写的是「闭合度 0..1，1=闭」，极性读反会让睁眼被判成闭眼，
    // 结果 eyesArmed 永远不成立 —— 诚实学员 100% 超时。这条用例专门钉住这个方向。
    expect(0.41).toBeGreaterThan(BLINK_OPEN_ENTER)
    expect(0.41).toBeGreaterThan(BLINK_CLOSED_ENTER)
    const state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    expect(state.eyesArmed).toBe(true)
  })

  it('睁眼度越小越闭：0.05 判闭、0.41 判睁', () => {
    // 若哪天有人把 <= / >= 写反，这两条立刻红
    const armed = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    const closed = feed(armed, sample(EYES_CLOSED), 1000)
    expect(closed.sawClosed).toBe(true)
    expect(armed.sawClosed).toBe(false)
  })

  it('睁眼度 >1 不被夹成 1（量纲并非归一化到 0~1）', () => {
    // openRatio 是「睑缘间距/眼眶间距」，真机大距离下可能略超 1，夹到 1 会压缩上沿
    const state = feedAll(makeBlink(), [
      sample({ openLeft: 1.2, openRight: 1.2 }),
      sample({ openLeft: 1.2, openRight: 1.2 }),
    ])
    expect(state.eyesArmed).toBe(true)
  })

  it('两眼取 max：单眼闭（wink）不算闭眼', () => {
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    // 左眼闭到 0.05，右眼仍睁着 0.41 → max=0.41 → 判睁
    state = feed(state, sample({ openLeft: 0.05, openRight: 0.41 }), 1000)
    expect(state.sawClosed).toBe(false)
    // 停在「等闭眼」阶段，进度不因单眼眨而推进
    expect(state.status).toBe('active')
  })

  it('二值 blinkGesture 仅在连续量缺失时兜底', () => {
    // 连续量优先：给了 openLeft=0.41（睁），blinkGesture=true 也不该压过它
    let state = feedAll(makeBlink(), [sample(EYES_OPEN), sample(EYES_OPEN)])
    state = feed(state, { faceCount: 1, openLeft: 0.41, openRight: 0.41, blinkGesture: true }, 1000)
    expect(state.sawClosed).toBe(false)
    // 两眼都缺连续量时才信布尔信号
    const boolClosed = feed(state, { faceCount: 1, blinkGesture: true }, 1250)
    expect(boolClosed.sawClosed).toBe(true)
  })
})

describe('超时判定', () => {
  it('满 15 秒即判超时（边界含等号）', () => {
    const state = makeBlink()
    expect(feedSample(state, sample(EYES_OPEN), DEFAULT_TIMEOUT_MS - 1).status).toBe('active')
    expect(feedSample(state, sample(EYES_OPEN), DEFAULT_TIMEOUT_MS).status).toBe('timeout')
  })

  it('时限之前完成动作仍然算通过（超时判定不能抢在动作判定前）', () => {
    const state = feedAll(makeBlink(), BLINK_SEQUENCE, DEFAULT_TIMEOUT_MS - 2000)
    expect(state.status).toBe('satisfied')
  })

  it('checkTimeout 不需要样本也能推进超时（检测抛错那种帧）', () => {
    const state = makeBlink()
    expect(checkTimeout(state, 1000)).toBe(state)
    const expired = checkTimeout(state, DEFAULT_TIMEOUT_MS + 1)
    expect(expired.status).toBe('timeout')
    // 已终局时幂等
    expect(checkTimeout(expired, DEFAULT_TIMEOUT_MS * 3)).toBe(expired)
  })

  it('now 非法时不误判超时（传错值不能瞬间失败）', () => {
    const state = makeBlink()
    // 非有限时钟一律不动状态：宁可让 UI 继续循环，也不能因为调用方算错 now
    // 就把学员判失败（DER-07 下这会被记成 identity_status=2，属于冤枉人）
    expect(checkTimeout(state, Number.NaN).status).toBe('active')
    expect(checkTimeout(state, Number.POSITIVE_INFINITY).status).toBe('active')
  })

  it('自定义短时限同样生效（可配 N 秒）', () => {
    let state = makeBlink(0, 3000)
    state = feed(state, sample(EYES_OPEN), 2900)
    expect(state.status).toBe('active')
    state = feed(state, sample(EYES_OPEN), 3000)
    expect(state.status).toBe('timeout')
  })
})

describe('纯函数性质', () => {
  it('feedSample 不修改入参状态（返回全新对象）', () => {
    const original = makeBlink()
    const snapshot = JSON.parse(JSON.stringify(original))
    const next = feedSample(original, sample(EYES_OPEN), 0)
    expect(original).toEqual(snapshot)
    expect(next).not.toBe(original)
    expect(original.samples).toBe(0)
    expect(next.samples).toBe(1)
  })

  it('同一帧重复喂入，得到的状态逐字段相同（无隐藏可变状态）', () => {
    const first = feedSample(makeBlink(), sample(EYES_OPEN), 500)
    const second = feedSample(makeBlink(), sample(EYES_OPEN), 500)
    expect(second).toEqual(first)
  })

  it('动作达成后继续喂样本，状态不再变化', () => {
    const satisfied = feedAll(makeBlink(), BLINK_SEQUENCE)
    const after = feedSample(satisfied, sample(EYES_CLOSED), 9000)
    expect(after).toBe(satisfied)
    expect(after.samples).toBe(satisfied.samples)
  })

  it('不引用任何真实时钟：同一 now 序列下结果完全可复现', () => {
    const build = () =>
      feedAll(makeTurn(), [sample({ yaw: 0 }), sample({ yaw: 0.7 }), sample({ yaw: 0 })])
    expect(build()).toEqual(build())
  })
})

describe('文案与展示口径', () => {
  it('进行中 / 已通过时没有失败原因（模板可直接 v-if）', () => {
    expect(failureMessage(makeBlink())).toBe('')
    expect(failureMessage(feedAll(makeBlink(), BLINK_SEQUENCE))).toBe('')
  })

  it('指令文案说明「做什么」，转头还说明方向并提示转回来', () => {
    expect(challengePrompt(makeBlink())).toContain('眨')
    const left = createChallenge({ now: 0, types: ['turn'], random: () => 0 })
    const right = createChallenge({ now: 0, types: ['turn'], random: () => 0.99 })
    expect(left.type === 'turn' && left.promptedDirection).toBe('left')
    expect(right.type === 'turn' && right.promptedDirection).toBe('right')
    expect(challengePrompt(left)).toContain('左')
    expect(challengePrompt(right)).toContain('右')
    // 两句都要提到「转回来」，否则学员会一直扭着头等判定
    expect(challengePrompt(left)).toContain('转回来')
    expect(challengePrompt(right)).toContain('转回来')
  })

  it('三种失败文案互不相同且都不是空串', () => {
    const texts = Object.values(FAILURE_MESSAGES)
    expect(new Set(texts).size).toBe(texts.length)
    texts.forEach((text) => expect(text.length).toBeGreaterThan(0))
  })
})
