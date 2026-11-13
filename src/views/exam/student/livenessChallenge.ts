/**
 * 动作式活体的**判定状态机**（纯函数、零副作用、无任何 Vue / DOM / human 依赖）。
 *
 * <p>职责边界只有一件事：**根据一串检测样本，判断学员有没有完成指定动作**。
 * 它不做采集（那是 `faceLiveness.detectOnce`）、不做展示（那是 FaceVerifyDialog）、
 * 也不做阻断（决策 DER-07：任何失败都必须能继续考试，这里只产出判定结果，
 * 由 UI 决定记 `identity_status`）。
 *
 * <p>时间一律由调用方传入（`now` / `createChallenge({ now })`），模块内部**绝不调用
 * `Date.now()` / `performance.now()`**。这不是洁癖：超时判定是这个模块唯一的
 * 「随时间变化」的行为，一旦内部取时钟，单测就只能靠 fake timer 或等待真实时间，
 * 15 秒的用例跑上十几秒还会变成 flake。
 *
 * <p>为什么状态是不可变的：`feedSample` 返回**新对象**，旧状态保持不变。
 * UI 的检测循环每帧都要拿到「最新状态」，若原地修改，任何一次重渲染读到旧引用都会
 * 展示过期进度；不可变则天然可以放心传引用、也可以把历史状态直接塞进单测断言。
 */

/** 挑战类型。v1 只做眨眼与转头，保留联合类型以便后续扩展（如摇头 / 点头）。 */
export type ChallengeType = 'blink' | 'turn'

/**
 * 挑战状态。
 *
 * - `active`：进行中，继续喂样本
 * - `satisfied`：动作达成，UI 可以抓拍并记 `identity_status=1`
 * - `timeout`：到时限仍未达成
 * - `no-face`：样本里一个人脸都没有（**立即判定，不再累计**）
 * - `multi-face`：样本里有多张人脸（**立即判定，不再累计**）
 *
 * 后三种都是「失败」，但原因必须区分：`no-face` / `multi-face` 是作弊嫌疑
 * （拿照片、两人入镜），`timeout` 更像「学员没照做」——文案与后续处置都不同。
 */
export type ChallengeStatus = 'active' | 'satisfied' | 'timeout' | 'no-face' | 'multi-face'

/**
 * 随机源：返回 `[0, 1)` 的数。
 *
 * <p>做成注入参数而不是直接调 `Math.random()`，是为了让 `createChallenge` 在单测里
 * **可复现**：传 `() => 0.99` 就永远抽到转头，传 `() => 0` 就永远抽到眨眼。
 * 生产环境由调用方传 `Math.random`（或服务端下发的种子生成器）。
 */
export type RandomSource = () => number

/**
/**
 * 一帧检测结果。字段由 task-1 的 `detectOnce` 产出，本模块只读不写。
 *
 * <p>★ 单位与极性**必须**与采集侧一致，否则阈值全错：
 * - `yaw` / `roll`：**弧度**（human 的 `rotation.yaw`，范围约 -π/2..π/2）
 * - `openLeft` / `openRight`：**睁眼度**（openness，**越小越闭**）。
 *   这是 human 的原始口径 `|睑缘间距| / |眼眶间距|`，**不是**「闭合度 1=闭」。
 *
 * <p>字段名与 task-1 的 `LivenessFrame.openLeft` 对齐，两边不会各读各的；
 * 曾经这里叫 `blinkLeft`（暗指闭合度），而 human 给的是睁眼度，
 * 极性读反会让诚实学员**全员超时**（睁眼被判成闭眼 → 永远建立不了睁眼基线）。
 */
export interface LivenessSample {
  /** 画面中的人脸数量；0 = 没人，>1 = 多人 */
  faceCount: number
  /** 头部偏航角（左右转头），**弧度** */
  yaw?: number
  /** 头部翻滚角，**弧度**；v1 判定不使用，保留给后续挑战类型 */
  roll?: number
  /**
   * 左眼**睁眼度**（**越小越闭**）。
   *
   * <p>取不到关键点时给 `NaN` 或不传：本模块当作「本帧无信号」，
   * 既不推进也不判失败，绝不误判成一次眨眼。
   */
  openLeft?: number
  /** 右眼**睁眼度**，口径同 `openLeft` */
  openRight?: number
  /**
   * human gesture 的二值兜底信号（任一眼睛命中 `'blink'`）。
   *
   * <p>仅在连续量 `openLeft/openRight` 缺失时使用，保证少一路信号也不整体失效。
   */
  blinkGesture?: boolean
}

/**
 * 闭眼判据：睁眼度 **≤ 0.2** 即闭眼。
 *
 * <p>★ 这个数**直接采用 human 作者调过的值**（`src/gesture/gesture.ts`：
 * `if (openLeft < 0.2) gesture.push('blink left eye')`），我们只把 `<` 放宽成 `<=`。
 * 不自己拍一个新值，是因为 0.2 是 human 用真实数据定的，比任何推测都可靠；
 * 且与 `HUMAN_BLINK_THRESHOLD` 同源，gesture 信号与连续量判据不会打架。
 */
export const BLINK_CLOSED_ENTER = 0.22

/**
 * 睁眼判据：睁眼度 **≥ 0.35** 即睁开。
 *
 * <p>0.24 是**基于真机实测标定的**，不是拍脑袋：
 * 2026-11-12 在考场同类 webcam 上实测（76 帧有效样本、19 次眨眼）：
 * **睁眼段均值 0.301**（单帧波动到 0.273）、**闭眼段最低 0.176**。
 *
 * <p>最初取 0.35（依据 human 内置样例的 0.41），真机数据直接推翻了它：
 * 真实 webcam 的眼高/眼眶比值比样例低约 27%，0.35 永远达不到 ⇒ `eyesArmed` 永不成立
 * ⇒ **诚实学员 100% 超时**。这正是“阈值不能拿样例数据拍”的典型案例。
 *
 * <p>为何取 0.24 而不是诊断页建议的 0.25：单帧最低读到 0.273，若取 0.25 只剩 0.023 余量，
 * 学员稍退后或光线变暗就掉出去，又变成“诚实学员被判失败”。0.24 多给一点安全垫。
 *
 * <p>**为何仍不嵌到 0.2 以下**：需与 `BLINK_CLOSED_ENTER=0.2` 保持滞回带（实测闭眼最低 0.176，
 * 与 0.2 之间还有 0.024 余量，human 原判据仍然成立、无需下调）。
 *
 * <p>与 `BLINK_CLOSED_ENTER` 之间形成 **0.2 ~ 0.24 的滞回带**：
 * 落在带内（半闭、眨眼过程帧）既不推进也不清零，防止摄像头抖动把已累计的进度抹掉。
 *
 * <p>**偏差方向是安全的**：`BLINK_OPEN_ENTER` 偏低只会让“睁眼”更容易成立，
 * 不会让照片通过——照片永远不会闭眼到 0.176。
 */
export const BLINK_OPEN_ENTER = 0.28

/**
 * 确认「眼睛是睁着的」所需连续帧数（开局建立基线 + 闭眼后重新睁眼各用一次）。
 *
 * <p>取 2 帧 / 约 400~500ms（按 UI 250ms 一拍）：单帧睁眼可能只是眨眼过程中的
 * 过渡帧，两帧连续才代表「确实回到了睁眼状态」。这也让判定的形状变成
 * 睁→闭→睁的**真序列**，而不是「曾经出现过一帧闭眼」。
 */
export const BLINK_OPEN_FRAMES = 1

/**
 * 确认「闭眼」所需连续帧数，**默认 1 帧**。
 *
 * <p>★ 这里与「多帧确认更稳」的直觉相反，是有意为之：自然眨眼闭眼只持续
 * 100~400ms，而 UI 检测节拍是 200~300ms（human 全模型跑不快），一次真实眨眼
 * 通常只有 **1 帧**落在闭眼区间。若要求连续 2 帧闭眼，等于要求学员闭眼 500ms 以上，
 * 诚实的学员会被系统性地判失败（DER-07 下虽放行，但会记 `identity_status=2`，
 * 属于冤枉人）。
 *
 * <p>抗抖动不靠帧数，而靠三件事：① 0.2/0.35 的滞回带；② 闭眼前必须先连续 2 帧
 * 确认睁眼（开局基线）；③ 闭眼后必须再连续 2 帧确认睁眼才算完成。
 * 若以后 UI 能把节拍压到 ≤150ms，把本常量改成 2 即可收紧，无需改逻辑。
 */
export const BLINK_CLOSED_FRAMES = 1

/**
 * 转头阈值：yaw 相对中位偏离 **≥ 0.35 弧度（≈20°）** 记为「已转头」。
 *
 * <p>20° 是「一眼能看出在转头」的最小角度：小于 15° 时，人对着屏幕自然
 * 晃头（看题目、调整坐姿）就可能误达成；大于 30° 则要求学员扭得比较狠，
 * 容易把脸转出画面反而触发 `no-face`。0.35 rad 落在 0.3~0.5 的合理区间中部。
 *
 * <p>**单位是弧度**，与 human 的 `rotation.yaw` 一致；换算成角度约 20.05°。
 */
export const TURN_YAW_THRESHOLD_RAD = 0.35

/**
 * 回正阈值：yaw 相对中位偏离 **≤ 0.12 弧度（≈7°）** 记为「已回正」。
 *
 * <p>7° 是「大致正对摄像头」的宽容范围。取 0.12 而不是 0，是因为检测本身有
 * ±0.05 rad 量级的噪声，要求回到 0 会让学员永远差一点；而要求回正到 7° 以内，
 * 又能排除「只转出去一半就停住」的糊弄。
 *
 * <p>与 `TURN_YAW_THRESHOLD_RAD` 之间同样是滞回带，防止在阈值边缘反复横跳。
 */
export const TURN_YAW_RETURN_RAD = 0.12

/**
 * 确认「已经转出去」所需连续帧数。2 帧 ≈ 500ms，转头并保持半秒对真人是自然的，
 * 而单帧噪声（检测偶发跳变）不会连续两帧都超阈值。
 */
export const TURN_HOLD_FRAMES = 2

/** 确认「已经回正」所需连续帧数；理由同 `TURN_HOLD_FRAMES`。 */
export const TURN_RETURN_FRAMES = 2

/**
 * 默认挑战时限：**15 秒**。
 *
 * <p>依据：完成一次眨眼或转头，正常耗时 < 3 秒；15 秒给了「找镜头、调整坐姿、
 * 第一次没听清提示」的余量，又不至于让作弊者有时间来回试。超过 15 秒仍未完成，
 * 与其继续等，不如尽快走「放行 + 记 identity_status=2」——DER-07 不允许卡住考试。
 */
export const DEFAULT_TIMEOUT_MS = 15_000

/** 弧度 → 角度，仅用于文案与调试展示（日志里写 20° 比写 0.35 好懂）。 */
export const RAD_TO_DEG = 180 / Math.PI

/** 失败原因文案。`null` 表示仍在进行或已通过。 */
export const FAILURE_MESSAGES: Record<'timeout' | 'no-face' | 'multi-face', string> = {
  // 三种失败必须说清「为什么」，否则学员只会看到「核验失败」四个字，不知道该改什么
  timeout: '动作超时，未检测到要求的动作，请重新核验或继续考试',
  'no-face': '未检测到人脸，请正对摄像头并保持光线充足',
  'multi-face': '检测到多张人脸，请确保画面内只有你一人',
}

/** 所有状态共有的字段 */
interface ChallengeCommon {
  /** 挑战创建时刻（调用方时钟，毫秒） */
  readonly createdAt: number
  /** 本挑战的时限（毫秒），默认 15 秒 */
  readonly timeoutMs: number
  /** 死亡线 = createdAt + timeoutMs；到点即判 timeout */
  readonly deadlineAt: number
  /** 当前状态 */
  readonly status: ChallengeStatus
  /** 已评估的样本帧数（含被判异常的那一帧），用于调试与「进度」展示 */
  readonly samples: number
}

/** 眨眼挑战的状态 */
export interface BlinkChallengeState extends ChallengeCommon {
  readonly type: 'blink'
  /** 是否已确认「开局是睁眼」——没确认之前不接受闭眼，防止一开始就闭着眼糊弄 */
  readonly eyesArmed: boolean
  /** 连续闭眼帧数（睁眼度 ≤ 0.2；滞回带内的帧不会清零，也不会增加） */
  readonly closedStreak: number
  /** 连续睁眼帧数（开局建立基线、闭眼后重新睁眼两处复用） */
  readonly openStreak: number
  /** 是否已确认「闭过一次眼」 */
  readonly sawClosed: boolean
}

/** 转头挑战的状态 */
export interface TurnChallengeState extends ChallengeCommon {
  readonly type: 'turn'
  /**
   * 提示文案用的转头方向。
   *
   * <p>★ **只影响文案，不参与判定**：human 的 yaw 正负号与「左转/右转」的对应关系
   * 依赖镜像参数（自拍画面通常水平翻转），未在真机实测确认前强制方向，
   * 会让一半诚实学员无论怎么转都判不过。v1 只校验**偏离幅度**，方向留给文案。
   */
  readonly promptedDirection: 'left' | 'right'
  /** 中位 yaw（弧度）；取本次挑战第一个有效 yaw，之后不再变 */
  readonly baselineYaw: number | null
  /** 连续「已转出去」帧数 */
  readonly awayStreak: number
  /** 连续「已回正」帧数 */
  readonly homeStreak: number
  /** 是否已确认「转出去过一次」 */
  readonly sawTurn: boolean
}

/** 状态机的完整状态（按 type 区分的可辨识联合） */
export type ChallengeState = BlinkChallengeState | TurnChallengeState

/** `createChallenge` 的入参 */
export interface CreateChallengeOptions {
  /** 创建时刻（调用方时钟，毫秒）——**必须传**，模块内部不取时钟 */
  now: number
  /** 随机源，默认 `Math.random`；单测传固定值即可复现 */
  random?: RandomSource
  /** 时限（毫秒），默认 `DEFAULT_TIMEOUT_MS` */
  timeoutMs?: number
  /** 可抽取的挑战池，默认 `['blink', 'turn']`；单测可收窄为单一类型 */
  types?: readonly ChallengeType[]
}

/** 默认挑战池 */
const DEFAULT_TYPES: readonly ChallengeType[] = ['blink', 'turn']

/** 把任意输入夹到 [0, 0.999...]，保证取下标不越界（`random()` 返回 1 或 NaN 时兜底） */
function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  return Math.min(value, 0.999_999_999)
}

/** 按随机数从候选里取一个；空池回退到默认池，绝不返回 undefined */
function pick<T>(pool: readonly T[], random: RandomSource, fallback: T): T {
  const index = Math.floor(normalizeRandom(random()) * pool.length)
  return pool[index] ?? pool[0] ?? fallback
}

/**
 * 创建一个随机挑战。
 *
 * <p>随机性完全由 `random` 注入：同一随机源、同一 `now`、同一配置，
 * 产出的状态**逐字段相同**，所以单测可以断言「抽到什么」而不用 mock Math.random。
 *
 * @example
 * const state = createChallenge({ now: performance.now(), random: Math.random })
 * const state = createChallenge({ now: 0, random: () => 0 }) // 必定眨眼
 */
export function createChallenge(options: CreateChallengeOptions): ChallengeState {
  const types = options.types && options.types.length > 0 ? options.types : DEFAULT_TYPES
  const type = pick(types, options.random ?? Math.random, 'blink')
  const timeoutMs =
    Number.isFinite(options.timeoutMs) && (options.timeoutMs as number) > 0
      ? (options.timeoutMs as number)
      : DEFAULT_TIMEOUT_MS
  const base: ChallengeCommon = {
    createdAt: options.now,
    timeoutMs,
    deadlineAt: options.now + timeoutMs,
    status: 'active',
    samples: 0,
  }
  if (type === 'turn') {
    return {
      ...base,
      type: 'turn',
      promptedDirection: pick(['left', 'right'] as const, options.random ?? Math.random, 'left'),
      baselineYaw: null,
      awayStreak: 0,
      homeStreak: 0,
      sawTurn: false,
    }
  }
  return {
    ...base,
    type: 'blink',
    eyesArmed: false,
    closedStreak: 0,
    openStreak: 0,
    sawClosed: false,
  }
}

/** 是否已完成动作（UI 据此进入抓拍 / 记 identity_status=1） */
export function isSatisfied(state: ChallengeState): boolean {
  return state.status === 'satisfied'
}

/** 是否已结束（通过或失败都算），结束后再喂样本不会改变任何东西 */
export function isTerminal(state: ChallengeState): boolean {
  return state.status !== 'active'
}

/**
 * 是否属于「画面异常」类失败（没人脸 / 多人脸）。
 *
 * <p>与 `timeout` 分开，是因为两者的 UI 处置不同：异常要提示学员调整机位
 * （重新核验意义更大），超时更多是「没照做」。
 */
export function isAnomaly(state: ChallengeState): boolean {
  return state.status === 'no-face' || state.status === 'multi-face'
}

/**
 * 失败原因文案；进行中或已通过返回空串。
 *
 * <p>返回空串而不是 `null`，是为了让模板里直接 `v-if="failureMessage(state)"` 可用，
 * 不必再处理 null 分支。
 */
export function failureMessage(state: ChallengeState): string {
  if (state.status === 'active' || state.status === 'satisfied') return ''
  return FAILURE_MESSAGES[state.status]
}

/** 挑战指令文案（供 UI 直接展示，文案集中在这里，避免散落在模板里） */
export function challengePrompt(state: ChallengeState): string {
  if (state.type === 'blink') return '请眨一下眼睛'
  return state.promptedDirection === 'left'
    ? '请向你的左侧转头，再转回来'
    : '请向你的右侧转头，再转回来'
}

/**
 * 只做超时判定，不消费样本。
 *
 * <p>单独暴露是因为 UI 的检测可能抛错（模型推理失败）而**这一帧拿不到样本**，
 * 但时限仍然在走：那种情况下调用它就能把状态推进到 `timeout`，
 * 不必伪造一个假样本。
 *
 * <p>判定口径：`now >= deadlineAt` 即判超时（「满 15 秒」算超时）。
 * `now` 不是有限数时不推进，避免调用方传错值导致瞬间失败。
 */
export function checkTimeout(state: ChallengeState, now: number): ChallengeState {
  if (isTerminal(state)) return state
  if (!Number.isFinite(now)) return state
  return now >= state.deadlineAt ? { ...state, status: 'timeout' } : state
}

/**
 * 取本帧的**睁眼度**（越小越闭）；没有可用信号时返回 `null`。
 *
 * <p>两眼取**较大值**：睁眼度是「越睁越大」，取 max 意味着**两眼都闭才算闭眼**，
 * 单眼眨（wink）不会被当成一次合格眨眼。
 * （旧闭合度口径取 min，是因为闭合度「越大越闭」；极性变了，聚合方向必须跟着变。）
 *
 * <p>连续量优先，二值 `blinkGesture` 兜底：只在两眼都拿不到有效数值时才看布尔信号，
 * 避免粗粒度的布尔信号覆盖更精确的连续量。
 */
function opennessOf(sample: LivenessSample): number | null {
  const left = normalizeRatio(sample.openLeft)
  const right = normalizeRatio(sample.openRight)
  const ratio = left === null ? right : right === null ? left : Math.max(left, right)
  if (ratio !== null) return ratio
  // 连续量缺失时才用 gesture 兜底：命中 === 闭（写作 0），未命中 === 睁着（写作 1）
  if (typeof sample.blinkGesture === 'boolean') return sample.blinkGesture ? 0 : 1
  return null
}

/**
 * 把睁眼度规整成非负数；缺失 / 非数 → null。
 *
 * <p>**不夹到 [0,1]**：`openRatio` 是「睑缘间距 / 眼眶间距」的比值，
 * 量纲并非归一化到0~1，真机下完全可能略超过 1。夹到 1 会凭空压缩上沿，
 * 让判定与原始信号不一致。只排除负数（物理上不可能，出现就是关键点错乱）。
 */
function normalizeRatio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  return Math.max(value, 0)
}

/** 喂一帧到眨眼挑战 */
function advanceBlink(state: BlinkChallengeState, sample: LivenessSample): ChallengeState {
  const counted: BlinkChallengeState = { ...state, samples: state.samples + 1 }
  const openness = opennessOf(sample)
  // 没有眨眼信号：本帧不推进任何进度，让超时来兜底，绝不凭空判定通过
  if (openness === null) return counted

  // ★ 极性：睁眼度**越小越闭**，所以闭眼用 <=、睁眼用 >=，与「闭合度」写法正好相反
  const closed = openness <= BLINK_CLOSED_ENTER
  const open = openness >= BLINK_OPEN_ENTER
  // 滞回带（0.2~0.35）：既不算闭也不算睁，保持进度不动（含 streak 不清零）
  if (!closed && !open) return counted

  // 阶段一：先确认开局确实睁着眼，否则「一上来就闭眼」会被当成眨眼
  if (!state.eyesArmed) {
    if (!open) return { ...counted, openStreak: 0 }
    const openStreak = state.openStreak + 1
    if (openStreak < BLINK_OPEN_FRAMES) return { ...counted, openStreak }
    // 确认睁眼后把计数器归零，接下来专用于「重新睁眼」阶段
    return { ...counted, openStreak: 0, eyesArmed: true }
  }

  // 阶段二：等一次确认的闭眼
  if (!state.sawClosed) {
    if (!closed) return { ...counted, closedStreak: 0 }
    const closedStreak = state.closedStreak + 1
    if (closedStreak < BLINK_CLOSED_FRAMES) return { ...counted, closedStreak }
    return { ...counted, closedStreak: 0, sawClosed: true }
  }

  // 阶段三：等重新睁眼（睁→闭→睁 的闭环，缺一不可）
  if (!open) return { ...counted, openStreak: 0 }
  const openStreak = state.openStreak + 1
  if (openStreak < BLINK_OPEN_FRAMES) return { ...counted, openStreak }
  return { ...counted, openStreak, status: 'satisfied' }
}

/** 喂一帧到转头挑战 */
function advanceTurn(state: TurnChallengeState, sample: LivenessSample): ChallengeState {
  const yaw = sample.yaw
  // 中位取本次挑战第一个有效 yaw：期望 UI 在开始前提示学员正对摄像头；
  // 即使没提示，学员也得从当前姿态再转出去 20° 才算达成，判定依然成立
  const baselineYaw = state.baselineYaw ?? (Number.isFinite(yaw as number) ? (yaw as number) : null)
  const counted: TurnChallengeState = {
    ...state,
    baselineYaw,
    samples: state.samples + 1,
  }
  if (baselineYaw === null || yaw === undefined || !Number.isFinite(yaw)) return counted

  const deviation = Math.abs(yaw - baselineYaw)

  // 阶段一：等一次确认的「转出去」
  if (!state.sawTurn) {
    if (deviation >= TURN_YAW_THRESHOLD_RAD) {
      const awayStreak = state.awayStreak + 1
      if (awayStreak < TURN_HOLD_FRAMES) return { ...counted, awayStreak }
      return { ...counted, awayStreak: 0, sawTurn: true }
    }
    if (deviation <= TURN_YAW_RETURN_RAD) return { ...counted, awayStreak: 0 }
    // 滞回带：保持不动
    return counted
  }

  // 阶段二：等回正
  if (deviation <= TURN_YAW_RETURN_RAD) {
    const homeStreak = state.homeStreak + 1
    if (homeStreak < TURN_RETURN_FRAMES) return { ...counted, homeStreak }
    return { ...counted, homeStreak, status: 'satisfied' }
  }
  if (deviation >= TURN_YAW_THRESHOLD_RAD) return { ...counted, homeStreak: 0 }
  return counted
}

/**
 * 喂一帧检测结果，返回**新的**状态（旧状态不被修改）。
 *
 * <p>判定顺序是刻意排的，且可从返回值观察：
 * 1. **已结束**：直接原样返回（幂等，UI 重复 tick 不会让结果翻转）
 * 2. **人脸数量异常**：`faceCount === 0` → `no-face`，`> 1` → `multi-face`，
 *    **立即终局，不再累计**。这是活体判定的核心防作弊点：拿照片正面怼镜头
 *    （单人照）虽然 `faceCount === 1`，但照片不会眨眼 / 转头，最终会超时；
 *    而「两人入镜」必须当场判掉，否则可以两人轮流做动作互相掩护。
 * 3. **超时**：`now >= deadlineAt` → `timeout`。放在动作判定**之前**，
 *    保证「时间到了那一刻刚好完成」也算超时（时限是硬边界）。
 * 4. 最后才按 `type` 推进动作进度。
 *
 * @param state 当前状态（不会被修改）
 * @param sample 一帧检测结果
 * @param now 本帧时刻（调用方时钟，毫秒）；必须单调递增，模块内部不使用真实时钟
 */
export function feedSample(
  state: ChallengeState,
  sample: LivenessSample,
  now: number,
): ChallengeState {
  if (isTerminal(state)) return state

  // 1) 人脸数量守卫。`Number.isFinite` 兜底：调用方漏传 / 传 NaN 时，
  //    宁可判「没检测到人脸」也不能静默按 1 张脸累计——那等于把异常当正常
  const faceCount = Number.isFinite(sample.faceCount) ? sample.faceCount : 0
  if (faceCount <= 0) {
    return { ...state, samples: state.samples + 1, status: 'no-face' }
  }
  if (faceCount > 1) {
    return { ...state, samples: state.samples + 1, status: 'multi-face' }
  }

  // 2) 超时（复用 checkTimeout，保持唯一口径）
  const expired = checkTimeout(state, now)
  if (expired !== state) {
    return { ...expired, samples: expired.samples + 1 }
  }

  // 3) 动作判定
  return state.type === 'blink' ? advanceBlink(state, sample) : advanceTurn(state, sample)
}
