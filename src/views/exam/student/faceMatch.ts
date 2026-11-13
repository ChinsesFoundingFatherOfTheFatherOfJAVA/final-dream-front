/**
 * 人脸特征向量比对（2026-11-13，DER-34）。
 *
 * <p>**能力边界（必须先读）**：这里的比对只能检测「这次与上次录入不是同一人」，
 * **不是身份认证**。因为基准照是学员自己拍的，首次就可能是别人。
 * 真正能卡住替考的是「官方基准照」（管理员/HR 当面采集），不是更强的算法。
 *
 * <p>本模块只做数学：给定两个向量算距离/相似度。**不做判定阈值裁决**——
 * 阈值由调用方传，因为不同摄像头/光照下同一阈值表现不同，集中在调用侧便于调整。
 */

/** 比对结果 */
export interface FaceMatchResult {
  /** 欧氏距离（越小越像） */
  distance: number
  /** 归一化相似度 0..1（1 = 完全相同），便于展示与设阈值 */
  similarity: number
  /** 向量维度；维度不一致时为 0（无法比较） */
  dimensions: number
}

/**
 * 欧氏距离。
 *
 * <p>human 的 faceres 产出的是**未归一化**的特征向量，官方示例就是用欧氏距离，
 * 所以这里保持一致，不擅自改成余弦相似度（两者在未归一化向量上结论可能不同）。
 *
 * @returns 维度不一致或含非法值时返回 `null`
 */
export function euclideanDistance(a: number[], b: number[]): number | null {
  if (!Array.isArray(a) || !Array.isArray(b)) return null
  if (a.length === 0 || a.length !== b.length) return null
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    // 下标访问在 noUncheckedIndexedAccess 下是 possibly undefined，
    // 先收窄再判：直接 `Number.isFinite(av)` 不会被当成类型守卫
    const av = a[i] as number | undefined
    const bv = b[i] as number | undefined
    if (av === undefined || bv === undefined) return null
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return null
    const d = av - bv
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * 把距离映射成 0..1 的相似度，便于人读与展示。
 *
 * <p>**为什么用这个映射**：faceres 的典型距离范围是 0（同一张图）到 20 上下（完全不同的人）。
 * 用 `1 / (1 + d)` 而不是 `1 - d/max`：后者需要知道 max 上界，
 * 而距离实际上没有硬上界（不同模型维度下范围不同），一旦估错就会算出负数。
 * `1 / (1 + d)` 单调、恒在 (0, 1]、且不需要任何先验。
 *
 * <p>**注意：相似度只是展示用**，判定请直接用 `distance` 与阈值比较——
 * 多一层映射就多一个可能读错的地方。
 */
export function distanceToSimilarity(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) return 0
  return 1 / (1 + distance)
}

/**
 * 比对两组特征向量。
 *
 * @returns 维度不一致/含非法值时返回 `null`（调用方据此记「无法比对」而不是「不通过」）
 */
export function matchFace(probe: number[] | null, baseline: number[] | null): FaceMatchResult | null {
  if (!probe || !baseline) return null
  const distance = euclideanDistance(probe, baseline)
  if (distance === null) return null
  return {
    distance,
    similarity: distanceToSimilarity(distance),
    dimensions: probe.length
  }
}

/**
 * 默认判定阈值（欧氏距离）。
 *
 * <p>**这个值是初始猜测，必须用真实样本重标**：
 * human 官方 demo 在 faceres 上常用 0.5~0.6 作为「同一人」的粗线，
 * 但那个数字来自 LFW 类数据集（正脸、光照均匀），考场 webcam 的分布会不同。
 *
 * <p>**偏差方向是安全的**：阈值取得偏大 → 更容易判「同一人」→ 只会少报，
 * 不会把诚实的学员判成替考；反之才会误伤。所以宁可先宽后紧。
 *
 * <p>**当前值 8：基于 2026-11-13 两轮真实数据定的，样本量小（n=2），仍需更多数据复核。**
 *
 * <p>反推自后端记录的相似度（`d = 1/score - 1`）：
 * <table>
 * <tr><th>场景</th><th>相似度</th><th>距离</th></tr>
 * <tr><td>本人（10:26 那次）</td><td>0.1791</td><td><b>4.58</b></td></tr>
 * <tr><td>同事（10:56 那次）</td><td>0.0883</td><td><b>10.33</b></td></tr>
 * </table>
 *
 * <p>**为什么不是 0.6**（human demo 的经验值）：那是 LFW 数据集的正脸分布，
 * 与 faceres 在考场 webcam 上的输出差一个数量级，用 0.6 会把本人也判否（实测 4.58）。
 *
 * <p>**为什么曾误设成 12**：上一轮只看到「本人 4.58 被判否」，就一味放宽，
 * 结果 12 大于同事的 10.33——**比误伤更糟，变成谁都能过**。
 * 教训：阈值必须卡在「同人分布」与「异人分布」**之间**，不能只看一边。
 *
 * <p>**余量警告**：8 距离本人 4.58 有 3.4 余量、距同事 10.33 有 2.3 余量，
 * 相较 n=2 的样本量偏乐观。光线差、戴眼镜、角度偏都可能让同人距离上浮，
 * 建议后续收到 ≥10 组样本后重新标定。
 *
 * <p>标定方法：收 ≥10 组同人/异人样本，算两组距离分布，取交界处。
 * 用 {@link resolveThreshold} 可现场试不同值，不必改代码。
 */
export const DEFAULT_MATCH_THRESHOLD = 8

/**
 * 取实际使用的阈值：`localStorage` 有合法值就用它，否则用默认值。
 *
 * <p>为什么做成运行时可调：标定阈值必须用真实样本反复试，
 * 若每次都改代码 + 重新构建，一天试不了几轮。现场可直接在控制台
 * `localStorage.setItem('face-match-threshold', '5')` 然后重试。
 */
export function resolveThreshold(): number {
  try {
    const raw = globalThis.localStorage?.getItem('face-match-threshold')
    if (raw) {
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
  } catch {
    // localStorage 不可用（隐私模式等）时静默用默认值
  }
  return DEFAULT_MATCH_THRESHOLD
}
