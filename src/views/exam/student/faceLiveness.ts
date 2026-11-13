/**
 * 人脸检测原语（PC 浏览器 webcam，DER-07 增强）。
 *
 * <p>本文件**只提供检测原语**：「这一帧里有几张脸、头偏多少、眼睛睁多大」。
 * 动作判定状态机（要求学员先眨眼再转头、超时怎么办、失败怎么降级）属于另一个模块，
 * 刻意不放在这里——状态机是纯逻辑，要能在没有摄像头、没有模型的环境里跑单测；
 * 而本文件依赖 TFJS + 2MB 模型，天生只能集成测。两者混在一起，状态机就再也测不动了。
 *
 * <h3>为什么锁死 @vladmandic/human（v3.3.6，MIT，零运行时依赖）</h3>
 * 它一个库同时给出人脸检测（blazeface）+ 468 点关键点（facemesh）+ 头部欧拉角，
 * 且模型是**随 npm 包一起下发的本地文件**（`node_modules/@vladmandic/human/models/`），
 * 不需要联网拉权重。备选方案里 face-api.js 早已停止维护（TFJS 1.x 时代），
 * MediaPipe 要么走 wasm 全套、要么锁死云端，都不如这个可控。
 *
 * <h3>离线托管（本任务最容易翻车的地方）</h3>
 * human 默认 `modelBasePath = '../models/'`（相对**当前页面路径**，不是相对工程根），
 * 且它会从 `modelBasePath + modelPath` 拼出最终 URL（见依赖源码 `src/tfjs/load.ts:loadModel`
 * 与 `src/util/util.ts:join`）。默认值在 hash 路由下会解析成错误的目录，
 * 更致命的是：**权重加载失败时 human 不抛错，只在 console 打一行 log，
 * 然后照常返回一个没加载成功的 GraphModel**。也就是说「模型 404」在业务侧的表现是
 * 「永远检测不到脸」，学员会以为摄像头坏了。所以这里做两件事：
 * <ol>
 *   <li>`modelBasePath` 显式设成 `/models/`（对应工程 `public/models/`，
 *       构建后原样落到 `dist/models/`，与部署在哪个子路径无关）；</li>
 *   <li>加载完**回头校验** `human.models.stats()` 里 blazeface / facemesh 的 `loaded` 标志，
 *       没真的加载上就抛错——把 human 静默吞掉的失败重新暴露出来。</li>
 * </ol>
 *
 * <h3>只加载必要模型</h3>
 * blazeface（检测框，539KB）+ facemesh（468 点，1.5MB）合计约 2.1MB。
 * 虹膜（iris，2.6MB）、表情、年龄性别、人脸特征（faceres，7MB）、
 * 活体（antispoof/liveness）、body、hand、object、segmentation 全部禁用：
 * 判眨眼/转头只用得到关键点，多加载一个模型就多等几秒，考场里学员只会以为系统卡死。
 *
 * <h3>眼睛开合度：为什么输出「睁眼度」而不是「闭合度」</h3>
 * human **没有** `blink` 数值字段，它对眨眼的表达是 `result.gesture` 里的字符串
 * `'blink left eye'` / `'blink right eye'`。其判据在 `src/gesture/gesture.ts:face`：
 *
 * ```
 * openLeft  = |mesh[374].y - mesh[386].y| / |mesh[443].y - mesh[450].y|
 * openRight = |mesh[145].y - mesh[159].y| / |mesh[223].y - mesh[230].y|
 * if (openLeft  < 0.2) gesture.push('blink left eye')
 * if (openRight < 0.2) gesture.push('blink right eye')
 * ```
 *
 * <p>注意这是**睁眼度**：分母是眼眶上下缘间距（相对稳定），分子是睑缘中点间距
 * （睁眼时张开、闭眼时趋近 0）。所以**数值越小越闭**。
 *
 * <p>我们**原样输出这个比值，不做 `1 - x` 之类的极性翻转**。理由不是懒：
 * human 只保证「< 0.2 算闭」这半条判据成立，**从未保证睁眼时接近 1**。
 * 实测（human 内置 warmup 样例人脸、真浏览器、正对镜头）睁眼时
 * **openLeft = 0.414、openRight = 0.407**——若做 `1 - x` 会得到 0.59 的「闭合度」，
 * 恰好落在状态机 0.6 进入 / 0.3 退出的滞回带里，`eyesArmed` 永远不成立，
 * 诚实学员 100% 超时。把原始比值交出去，下游沿用 human 已验证的 0.2 阈值，
 * 零标定风险。`HUMAN_BLINK_THRESHOLD` 就是这个常数的唯一来源。
 */

import type Human from '@vladmandic/human'

/** 模型目录（相对站点根）。放在 `public/models/`，构建后即 `dist/models/` */
export const MODEL_BASE_PATH = '/models/'

/**
 * human 自带的「闭眼」判据（源码 `src/gesture/gesture.ts`）：睁眼度 < 0.2 即 blink。
 *
 * <p>导出它是为了让下游状态机**引同一个常量**，而不是在自己那边再抄一遍魔数。
 * 抄两份的那天，human 升级改了阈值，状态机的滞回带就会与 gesture 信号打架。
 */
export const HUMAN_BLINK_THRESHOLD = 0.2

/**
 * 「完全睁眼」的参考上界（**仅用于报告与人工排查，不参与任何判定**）。
 *
 * <p>实测数据：human 内置 warmup 样例人脸、Chrome headless、正对镜头、
 * 睁眼时 openLeft = **0.414** / openRight = **0.407**。
 * 真机摄像头因分辨率、距离、光线不同会在这个值附近漂移；
 * 若某天现场发现 openLeft 常态高于 0.9，说明分母（眼眶间距）算小了，
 * 该怀疑关键点质量而不是调阈值。
 *
 * <p>**刻意不拿它做归一化**：一旦用它做除数，就等于重新引入了一次标定猜测，
 * 而这次实测只覆盖了一张样例图、一个人、一种分辨率，不足以支撑标定。
 */
export const OPEN_EYE_REFERENCE = 0.41

/**
 * 懒加载 + 并发去重用的缓存，**按配置分开两份**（plain / embedding）。
 *
 * <p>为什么不能用单个单例：先调无向量版的人会把「没有 embedding 的实例」缓存住，
 * 之后带向量的调用拿到它，表现是「永远算不出特征」且**不报错**，极难排查。
 * 存的是 Promise 而不是实例：若缓存实例，两个并发调用会各自构造一次 Human
 *（各自下载一次模型，显存翻倍）。
 */
const humanPromises = new Map<'plain' | 'embedding', Promise<Human>>()

/** 已完成的实例，供 `detectOnce` 同步取用 */
const humanInstances = new Map<'plain' | 'embedding', Human>()

/**
 * 一次检测的结果——**这是本模块对外的全部契约**。
 */
export interface LivenessFrame {
  /** 本帧检出的人脸数。0 = 没人脸；> 1 = 画面里不止一张脸（可能是替考/围观） */
  faceCount: number
  /** 头部左右转角，**单位弧度**（human 原始单位就是弧度，转度请 × 180 / Math.PI） */
  yaw: number
  /** 头部左右倾斜角，**单位弧度** */
  roll: number
  /** 头部俯仰角，**单位弧度**。转头动作一般只看 yaw，此处留给后续判断「低头看小抄」 */
  pitch: number
  /**
   * 左眼**睁眼度**（human 原始口径，与 `HUMAN_BLINK_THRESHOLD` 直接比较）。
   *
   * <p>**数值越小越闭**：< 0.2 即 human 认定的闭眼，实测睁眼约 0.41。
   * 字段名刻意不叫 `blinkLeft`——那个名字会让人以为是「闭合度 0..1，1=闭」，
   * 极性读反就会让诚实学员全员超时（这是本模块踩过的坑，见文件头）。
   *
   * <p>取不到关键点时是 `NaN`（不是 0，也不是 1）：`NaN < 0.2` 恒为 false，
   * 所以「模型没出 mesh」永远不会被误判成一次眨眼。下游若要显式区分，
   * 用 `Number.isFinite(openLeft)` 判断。
   */
  openLeft: number
  /** 右眼**睁眼度**，口径同 `openLeft` */
  openRight: number
  /** human gesture 命中 `'blink left eye'`（二值兜底信号，与 `openLeft` 同源同阈值） */
  blinkLeftGesture: boolean
  /** human gesture 命中 `'blink right eye'` */
  blinkRightGesture: boolean
  /** 任一眼命中 blink（`blinkLeftGesture || blinkRightGesture`），给「随便眨一下」的挑战用 */
  blinkGesture: boolean
  /**
   * 人脸特征向量（2026-11-13 新增，DER-34）。
   *
   * <p>只有**启用 `description` 模型**（`loadHuman({ withEmbedding: true })`）时才有值；
   * 未启用时为 `null` —— 因为该模型 6.7MB，比现有全部模型还大，
   * 不该让「没录过基准照的学员」也白下载。
   *
   * <p>向量长度由模型决定（faceres 为 1024 维），调用方**不要假设维度**，
   * 比对前先用长度是否相等判断能否比。
   */
  embedding: number[] | null
  /**
   * 本帧的异常说明；正常为 `null`。
   *
   * <p>刻意不抛异常：调用方是逐帧轮询的循环，一帧失败就中断整个挑战是错误的
   * ——摄像头偶发卡顿、模型偶发超时都会让学员白等。所以失败一律降级成
   * `faceCount = 0` + `error` 文案，由状态机决定是重试还是放弃。
   */
  error: string | null
}

/**
 * 空帧（没脸 / 不可用 / 出错时的统一返回）。
 *
 * <p>`openLeft/openRight` 是 **NaN** 而不是 0：0 会被读成「眼睛完全闭上」，
 * 等于免费送一次眨眼成功；NaN 参与任何比较都是 false，永远不会误触发。
 * **注意 `faceCount = 0` 不是「安全」，是「没信息」**，
 * 状态机需要自己决定把「连续多帧 0 张脸」当成学员离开还是当成检测失效。
 */
export function emptyFrame(error: string | null = null): LivenessFrame {
  return {
    faceCount: 0,
    yaw: 0,
    roll: 0,
    pitch: 0,
    openLeft: Number.NaN,
    openRight: Number.NaN,
    blinkLeftGesture: false,
    blinkRightGesture: false,
    blinkGesture: false,
    embedding: null,
    error
  }
}

/** 从关键点取 y 坐标；点缺失时返回 null，避免 `noUncheckedIndexedAccess` 下到处判空 */
function pointY(mesh: { [index: number]: [number, number, number?] } | undefined, index: number): number | null {
  const point = mesh?.[index]
  return point ? point[1] : null
}

/**
 * 用 468 点关键点算一只眼的睁眼度（睑缘间距 / 眼眶间距）。
 *
 * <p>**关键点编号与公式照抄 human `src/gesture/gesture.ts`**（左眼 374/386 与 443/450、
 * 右眼 145/159 与 223/230）。不用自己挑点：自己挑的结果会与 human 的 blink 判定
 * 互相矛盾，那时「human 说眨了、我们算出没眨」，谁对谁错无从判断。
 *
 * <p>分母用「更外圈的眼眶上下缘」而不是同一条睑缘，是因为眼睑中点间距在睁眼时
 * 变化幅度最大、闭眼时趋近 0（正是我们要的信号），而外圈跨度相对稳定，
 * 正好当归一化基准，抵消「离摄像头远近」带来的整体缩放。
 *
 * @returns 睁眼度；关键点缺失或分母为 0 时返回 `NaN`（见 `emptyFrame` 的说明）
 */
export function openRatio(
  mesh: { [index: number]: [number, number, number?] } | undefined,
  upperInner: number,
  lowerInner: number,
  upperOuter: number,
  lowerOuter: number
): number {
  const inner = Math.abs((pointY(mesh, lowerInner) ?? 0) - (pointY(mesh, upperInner) ?? 0))
  const outer = Math.abs((pointY(mesh, lowerOuter) ?? 0) - (pointY(mesh, upperOuter) ?? 0))
  // 分母为 0 → 退化；点缺失时 pointY 返回 null 被兜成 0，同样退化。
  // 两种情况都必须给 NaN，绝不能给 0（0 会被读成「完全闭眼」）
  if (!(outer > 0)) return Number.NaN
  return inner / outer
}

/** 左眼关键点索引（human `meshAnnotations`：leftEyeUpper0 含 386、leftEyeLower0 含 374） */
export const LEFT_EYE_POINTS = { upperInner: 386, lowerInner: 374, upperOuter: 443, lowerOuter: 450 } as const

/** 右眼关键点索引（rightEyeUpper0 含 159、rightEyeLower0 含 145） */
export const RIGHT_EYE_POINTS = { upperInner: 159, lowerInner: 145, upperOuter: 223, lowerOuter: 230 } as const

/** 单帧检测的最小人脸信息（从 human 结果里摘出来，避免调用方依赖 human 类型） */
interface RawFaceLike {
  mesh?: unknown
  rotation?: { angle?: { yaw?: number; roll?: number; pitch?: number } } | null
}

/** human 结果里我们需要的最小形状（gesture 是 `{face|iris|body|hand, gesture}` 联合） */
interface RawResultLike {
  face?: unknown[]
  /** gesture 是 `{face|iris|body|hand, gesture}` 联合，只用到 gesture 字符串 */
  gesture?: { gesture?: string; [key: string]: unknown }[]
}

/**
 * 把一次 human 检测结果摘成 `LivenessFrame`。
 *
 * <p>抽成独立导出的纯函数，是为了**在没有模型、没有摄像头的情况下也能单测**
 * 这段最容易写错的映射（弧度单位、眨眼极性、多脸时的取值策略）。
 * `detectOnce` 只剩「调 human + 兜异常」两件事。
 */
export function frameFromResult(result: RawResultLike | null | undefined): LivenessFrame {
  const faces = (result?.face ?? []) as RawFaceLike[]
  const gestures = result?.gesture ?? []
  const blinkLeftGesture = gestures.some((g) => g?.gesture === 'blink left eye')
  const blinkRightGesture = gestures.some((g) => g?.gesture === 'blink right eye')

  if (faces.length === 0) {
    // 没脸时 gesture 仍可能有值（human 的 iris/body 手势不依赖 face 数组），
    // 但业务上「没脸还报眨眼」毫无意义，且会掩盖掉「学员离开」这个更重要的信号
    return emptyFrame()
  }

  // 多脸时以「主脸」为准输出姿态：human 已按置信度排序，取第 0 张即可。
  // 人脸数仍然如实上报，替考判定由调用方拿 faceCount 决定。
  const primary = faces[0]
  if (!primary) return emptyFrame()

  const mesh = primary.mesh as { [index: number]: [number, number, number?] } | undefined
  // 关键点不足 468（比如只跑通了检测框、mesh 没出结果）时不硬算：
  // 缺失被兜成 0 的话，眼高算 0 → 睁眼度 0 → 直接伪造一次眨眼成功。
  const hasMesh = Array.isArray(mesh) && mesh.length >= 468

  const openLeft = hasMesh
    ? openRatio(mesh, LEFT_EYE_POINTS.upperInner, LEFT_EYE_POINTS.lowerInner, LEFT_EYE_POINTS.upperOuter, LEFT_EYE_POINTS.lowerOuter)
    : Number.NaN
  const openRight = hasMesh
    ? openRatio(mesh, RIGHT_EYE_POINTS.upperInner, RIGHT_EYE_POINTS.lowerInner, RIGHT_EYE_POINTS.upperOuter, RIGHT_EYE_POINTS.lowerOuter)
    : Number.NaN

  const angle = primary.rotation?.angle
  // rotation 只在 mesh 点数 > 200 时由 human 计算（源码 `src/face/face.ts`），
  // 缺失就是 0——「姿态未知」与「姿态回正」共用 0，调用方靠 faceCount 区分有没有脸。
  const yaw = Number.isFinite(angle?.yaw) ? (angle?.yaw as number) : 0
  const roll = Number.isFinite(angle?.roll) ? (angle?.roll as number) : 0
  const pitch = Number.isFinite(angle?.pitch) ? (angle?.pitch as number) : 0

  // gesture 信号只在真的有 mesh 时才采信：human 的 blink 判定完全基于 mesh 关键点，
  // mesh 缺失时它本来也不会产出 blink，这里再挡一道，防止上游塞进构造出来的结果
  const gestureUsable = hasMesh
  return {
    faceCount: faces.length,
    yaw,
    roll,
    pitch,
    openLeft,
    openRight,
    blinkLeftGesture: gestureUsable && blinkLeftGesture,
    blinkRightGesture: gestureUsable && blinkRightGesture,
    blinkGesture: gestureUsable && (blinkLeftGesture || blinkRightGesture),
    // description 未启用时 human 不返回 embedding，这里如实给 null 而不是空数组：
    // 空数组会被 `length === baseline.length` 误判成「维度不匹配」，排查时会绕远路
    embedding: embeddingOf(primary),
    error: null
  }
}

/**
 * 从 human 的人脸对象里取特征向量。
 *
 * <p>human 把 embedding 放在 `face.embedding`（Float32Array）；
 * 这里转成普通数组，因为它要穿过 `JSON.stringify` 传给后端——
 * `Float32Array` 序列化会变成一个对象字典，后端解析必然失败。
 */
function embeddingOf(face: RawFaceLike): number[] | null {
  const raw = (face as { embedding?: unknown }).embedding
  if (!raw || typeof (raw as ArrayLike<number>).length !== 'number') return null
  const arr = Array.from(raw as ArrayLike<number>)
  // 全零/含 NaN 的向量没有比对价值，当成「没算出特征」处理，
  // 否则会拿一个垃圾向量去跟基准比，算出个看似合理的相似度
  if (arr.length === 0) return null
  for (const v of arr) {
    if (!Number.isFinite(v)) return null
  }
  return arr
}

/** 供测试与「重试」场景复位单例；同时丢掉已完成实例的引用 */
export function resetHuman(): void {
  humanPromises.clear()
  humanInstances.clear()
}

/**
 * 本模块要求 human 加载的模型清单（`human.models.stats()` 里的名字）。
 * 与 `HUMAN_CONFIG` 里启用的模型一一对应，改一处必须改另一处。
 */
export const REQUIRED_MODELS = ['blazeface', 'facemesh'] as const

/**
 * human 配置：**只开人脸检测 + 关键点**。
 *
 * <p>每一项禁用都不是随手写的，见文件头「只加载必要模型」。
 * `modelBasePath` 是这里的重点，理由见文件头「离线托管」。
 */
export const HUMAN_CONFIG = {
  modelBasePath: MODEL_BASE_PATH,
  // 模型缓存进 IndexedDB：第二次及以后的核验不用再走网络，考场网络差时的救命项。
  // human 默认就是 true（浏览器），显式写出来是为了让人知道这个行为是故意的。
  cacheModels: true,
  // 不 warmup：warmup 会拿内置样例图完整跑一遍检测，白等 1~2 秒；
  // 核验弹窗一打开就开摄像头，第一帧本身就是最好的预热。
  warmup: 'none' as const,
  face: {
    enabled: true,
    detector: {
      modelPath: 'blazeface.json',
      // 默认 maxDetected=1 会把多张脸裁成 1 张，那样「画面里有两个人在替考」永远发现不了
      maxDetected: 4,
      // 默认 0.2 太松（背景海报上的人脸也算），0.3 在召回与误报之间折中
      minConfidence: 0.3,
      // 每帧都重新框脸：缓存框会让学员转头后框还停在原地，mesh 跟着算错
      skipFrames: 0,
      skipTime: 0
    },
    mesh: { enabled: true, modelPath: 'facemesh.json' },
    // 以下是 human 默认开着但这里**全部关掉**的：每一个都是一个要下载的模型
    iris: { enabled: false },
    attention: { enabled: false },
    emotion: { enabled: false },
    description: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false }
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  segmentation: { enabled: false }
}

/**
 * 校验模型是否**真的**加载成功。
 *
 * <p>存在的唯一理由：human 加载失败会静默（源码 `src/tfjs/load.ts` 里 catch 之后只 log），
 * 业务侧看到的现象是「永远 faceCount=0」，与「摄像头坏了」无法区分。
 * 这里把状态翻出来，让「模型没下下来」变成一个能被 catch 的显式错误。
 *
 * @returns 缺失的模型名；空数组表示全部就绪
 */
export function findMissingModels(stats: {
  modelStats?: { name: string; loaded: boolean }[]
}): string[] {
  const loaded = new Set((stats.modelStats ?? []).filter((m) => m.loaded).map((m) => m.name))
  return REQUIRED_MODELS.filter((name) => !loaded.has(name))
}

/**
 * 懒加载 human 单例。
 *
 * <p>三个必须的行为：
 * <ol>
 *   <li>**并发去重**：缓存的是 Promise 不是实例。若缓存实例，两个并发调用会各自
 *       构造一次 Human（各自下载一次模型，显存翻倍）。</li>
 *   <li>**失败可重试**：失败时把缓存清空，否则一次网络抖动就把这个页面永久废掉，
 *       学员重试多少次都是同一个已 reject 的 Promise。</li>
 *   <li>**模型缺失要报错**：见 `findMissingModels`。</li>
 * </ol>
 *
 * <p>用动态 `import()` 而不是顶层 import：human 打包后约 2MB，
 * 放进主 chunk 会让所有页面（包括压根不考试的）都白背这份体积。
 */
export function loadHuman(): Promise<Human> {
  return loadHumanWith({ withEmbedding: false })
}

/**
 * 按需加载，可选择是否启用人脸特征向量（2026-11-13，DER-34）。
 *
 * <p>**为什么要分开**：`description`（faceres）模型本身 6.7MB，
 * 比现有全部模型（检测 0.6MB + 关键点 1.6MB）加超来还大 3 倍。
 * 它对「动作式活体」毫无帮助，只有「与基准照比对」才需要；
 * 没录过基准照的学员不该为它白下载 6.7MB。
 *
 * <p>**注意：两种配置不共用缓存 Promise**。如果共用，先调无向量版的人
 * 会把「没有 embedding 的实例」缓存住；之后带向量的调用拿到它，
 * 表现是「永远算不出特征」且不报错，极难排查。所以按配置分开缓存。
 */
export function loadHumanWith(options: { withEmbedding: boolean }): Promise<Human> {
  const key = options.withEmbedding ? 'embedding' : 'plain'
  const cached = humanPromises.get(key)
  if (cached) return cached

  const promise = (async () => {
    // 动态 import 让 Vite 把 human 拆成独立 chunk，按需加载
    const { default: Human } = await import('@vladmandic/human')
    const instance = new Human(configFor(options.withEmbedding) as never)
    await instance.load()

    const required = options.withEmbedding ? [...REQUIRED_MODELS, 'faceres'] : [...REQUIRED_MODELS]
    const loaded = new Set(
      (instance.models.stats().modelStats ?? []).filter((m) => m.loaded).map((m) => m.name)
    )
    const missing = required.filter((name) => !loaded.has(name))
    if (missing.length > 0) {
      throw new Error(
        `人脸模型加载失败：${missing.join('、')}。请确认 ${MODEL_BASE_PATH} 下存在对应的 .json 与 .bin 文件` +
          `（json 与同名 bin 必须同目录，且由静态资源服务器直接可访问）`
      )
    }

    humanInstances.set(key, instance)
    return instance
  })()

  humanPromises.set(key, promise)
  // 失败后允许重试：清掉缓存，否则一次网络抖动就把页面永久废掉
  promise.catch(() => {
    humanPromises.delete(key)
    humanInstances.delete(key)
  })
  return promise
}

/** 按需生成的 human 配置：只有比对才开 description */
function configFor(withEmbedding: boolean) {
  if (!withEmbedding) return HUMAN_CONFIG as never
  return {
    ...HUMAN_CONFIG,
    face: {
      ...HUMAN_CONFIG.face,
      /**
       * 人脸特征向量模型（faceres，1024 维）。
       *
       * <p>★ **必须显式把 skipFrames / skipTime 置 0**（2026-11-13 实测踩坑）：
       * human 这两个字段默认是 `skipFrames: 99` / `skipTime: 3000`，含义是
       * 「99 帧内或 3 秒内复用上次结果」。我们的用法是**每张图只跑一帧**
       * （基准照是静态图、核验抓拍也只取一帧），于是每次都命中缓存：
       * 拿到的是空壳/过期向量，表现为大量维度为 0、距离高达 8.65，
       * 同一个人也被算成「完全不同」（相似度 0.10）。
       * 这不是精度问题，是根本没算。
       */
      description: {
        enabled: true,
        modelPath: 'faceres.json',
        skipFrames: 0,
        skipTime: 0
      }
    }
  } as never
}

/** 检测串行化队列：human 的 `detect` 会改写实例内部状态，并发调用会互相踩 */
let detectQueue: Promise<unknown> = Promise.resolve()

/**
 * 对当前帧做一次检测。
 *
 * <p>调用约定（下游状态机照这个写）：
 * <ul>
 *   <li>逐帧轮询，**每次 await**。内部串行化，前一帧没算完时本次调用会排队等待；
 *       不 await 就会堆积调用，画面越卡、排队越长。</li>
 *   <li>`openLeft/openRight` 是 human 原始**睁眼度**（越小越闭），
 *       直接用 `HUMAN_BLINK_THRESHOLD`(0.2) 比较；取不到时是 `NaN`（恒不触发）。</li>
 *   <li>`blinkLeftGesture/blinkRightGesture/blinkGesture` 是 human gesture 的二值兜底，
 *       同源同阈值，可用来交叉验证我们自己算的比值。</li>
 *   <li>`yaw/roll/pitch` 单位是**弧度**。</li>
 *   <li>永不抛异常：视频没就绪、模型没加载、检测内部报错，一律返回 `faceCount = 0`
 *       的帧并用 `error` 说明原因。</li>
 * </ul>
 *
 * @param video 正在出流的 `<video>` 元素（`srcObject` 已接上 MediaStream）
 * @param options.withEmbedding 是否同时算人脸特征向量（需加载额外的 6.7MB 模型，仅比对时用）
 * @returns 本帧检测结果；任何异常都降级为 `emptyFrame(error)`
 */
export async function detectOnce(
  video: HTMLVideoElement | null | undefined,
  options: { withEmbedding?: boolean } = {}
): Promise<LivenessFrame> {
  const withEmbedding = options.withEmbedding === true
  // 视频没就绪就直接返回：此时调 human.detect 会抛
  // 「could not convert input to tensor」，而这一帧本来就是「还没有画面」，
  // 不是错误，不该让调用方的重试逻辑被无意义的异常打断。
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return emptyFrame('视频尚未就绪')
  }

  const run = async (): Promise<LivenessFrame> => {
    try {
      // 按需选实例：带向量版才能算出 embedding，普通版是 6.7MB 模型的零成本路径
      const human = await loadHumanWith({ withEmbedding })
      const result = await human.detect(video)
      if (result?.error) return emptyFrame(result.error)
      return frameFromResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return emptyFrame(message)
    }
  }

  // 串行化：前一次检测完成后再跑这一次，避免 human 内部状态被并发改写
  const task = detectQueue.then(run, run)
  detectQueue = task.then(
    () => undefined,
    () => undefined
  )
  return task
}

/** 已加载的实例（未加载返回 null）。给需要提前知道「模型好没好」的 UI 用 */
export function getLoadedHuman(): Human | null {
  return humanInstances.get('plain') ?? humanInstances.get('embedding') ?? null
}
