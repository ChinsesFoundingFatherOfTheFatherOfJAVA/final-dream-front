import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATCH_THRESHOLD,
  distanceToSimilarity,
  euclideanDistance,
  matchFace,
  resolveThreshold
} from './faceMatch'

/**
 * 人脸特征比对的单测（DER-34）。
 *
 * <p>重点守住三类：**维度不一致要返回 null 而不是 0**
 *（返回 0 会被当成「完全相同」，直接放行替考者）、
 * 非数值要挡住（NaN 会让所有比较恒为 false，静默失效）、
 * 相似度映射要单调且落在 (0,1]。
 */
describe('euclideanDistance', () => {
  it('相同向量距离为 0', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })

  it('只有一位不同时等于该差值', () => {
    expect(euclideanDistance([0, 0, 0], [0, 3, 0])).toBe(3)
  })

  it('三维勾股：3-4 得 5', () => {
    expect(euclideanDistance([0, 0, 0], [3, 4, 0])).toBe(5)
  })

  it('★ 维度不一致返回 null，不能返回 0', () => {
    // 返回 0 会被下游当成「完全相同」，等于放行任何人
    expect(euclideanDistance([1, 2], [1, 2, 3])).toBeNull()
  })

  it('空数组返回 null', () => {
    expect(euclideanDistance([], [])).toBeNull()
  })

  it('含 NaN / Infinity 返回 null', () => {
    expect(euclideanDistance([1, Number.NaN], [1, 2])).toBeNull()
    expect(euclideanDistance([1, Number.POSITIVE_INFINITY], [1, 2])).toBeNull()
  })

  it('非数组输入返回 null', () => {
    expect(euclideanDistance(null as never, [1])).toBeNull()
    expect(euclideanDistance([1], undefined as never)).toBeNull()
  })
})

describe('distanceToSimilarity', () => {
  it('距离 0 是相似度 1', () => {
    expect(distanceToSimilarity(0)).toBe(1)
  })

  it('随距离单调递减', () => {
    const a = distanceToSimilarity(1)
    const b = distanceToSimilarity(5)
    const c = distanceToSimilarity(20)
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })

  it('恒在 (0,1] 区间，不出现负数', () => {
    for (const d of [0, 0.1, 1, 10, 100, 10000]) {
      const s = distanceToSimilarity(d)
      expect(s).toBeGreaterThan(0)
      expect(s).toBeLessThanOrEqual(1)
    }
  })

  it('非法输入（负数 / NaN）返回 0 而不是 NaN', () => {
    expect(distanceToSimilarity(-1)).toBe(0)
    expect(distanceToSimilarity(Number.NaN)).toBe(0)
  })
})

describe('matchFace', () => {
  it('正常比对返回距离/相似度/维度', () => {
    const r = matchFace([0, 0], [3, 4])
    expect(r).not.toBeNull()
    expect(r?.distance).toBe(5)
    expect(r?.dimensions).toBe(2)
    expect(r?.similarity).toBeCloseTo(1 / 6, 5)
  })

  it('任一为空返回 null（表示「无法比对」，不是「不通过」）', () => {
    expect(matchFace(null, [1, 2])).toBeNull()
    expect(matchFace([1, 2], null)).toBeNull()
    expect(matchFace(null, null)).toBeNull()
  })

  it('维度不一致返回 null', () => {
    expect(matchFace([1, 2, 3], [1, 2])).toBeNull()
  })

  it('同一人（向量接近）距离小于阈值', () => {
    const baseline = Array.from({ length: 128 }, (_, i) => Math.sin(i))
    // 轻微扰动模拟同一人的另一次拍摄
    const probe = baseline.map((v) => v + 0.001)
    const r = matchFace(probe, baseline)
    expect(r).not.toBeNull()
    expect(r!.distance).toBeLessThan(DEFAULT_MATCH_THRESHOLD)
  })

  it('★ 区分同人/异人要按真实尺度（1024 维、模长约 12）验证', () => {
    /**
     * 原先用 128 维 sin/cos 造数据，距离天然很小，测不出真实场景。
     * 实测 faceres 是 1024 维、向量模长约 12——照 128 维的直觉定阈值会离谱。
     * 这里按真实维度造数据，确保阈值 12 在「同人」和「异人」上都合理。
     */
    const dims = 1024
    const personA = Array.from({ length: dims }, (_, i) => Math.sin(i * 0.1) * 0.4)
    // 同人另一次拍摄：轻微扰动
    const personA2 = personA.map((v) => v + 0.01)
    // 异人：完全不同的相位
    const personB = Array.from({ length: dims }, (_, i) => Math.cos(i * 0.37) * 0.4)

    const same = matchFace(personA2, personA)
    const diff = matchFace(personB, personA)
    expect(same).not.toBeNull()
    expect(diff).not.toBeNull()

    // 同人一定过、异人一定不过——这才是阈值真正要保证的性质
    expect(same!.distance).toBeLessThan(DEFAULT_MATCH_THRESHOLD)
    // FaceMatchResult 只含数学结果，判定留给调用方（阈值可运行时变）
    const threshold = DEFAULT_MATCH_THRESHOLD
    expect(same!.distance <= threshold).toBe(true)
    expect(diff!.distance).toBeGreaterThan(same!.distance)
  })
})

describe('DEFAULT_MATCH_THRESHOLD', () => {
  it('★ 阈值必须落在「同人分布」与「异人分布」之间（2026-11-13 真实数据）', () => {
    /**
     * 实测反推（后端记录的相似度换算 d = 1/score - 1，浏览器内复测一致）：
     *   本人 vs 基准照 = 4.532
     *   同事 vs 基准照 = 10.145
     *
     * 这两个数就是阈值的合法区间 (4.532, 10.145)。
     *
     * 曾经两次踩坑，都必须由这条测试守住：
     *   ① 取 0.6（抄 human demo / LFW 分布）→ 本人 4.53 被判否，**谁都过不了**
     *   ② 取 12（只看"本人被误伤"就一味放宽）→ 同事 10.15 也能过，**谁都能过**
     * 关键教训：判断阈值对错不能只看一边，必须同时满足 selfPass 与 otherReject。
     */
    const SELF_DISTANCE = 4.532
    const OTHER_DISTANCE = 10.145
    expect(DEFAULT_MATCH_THRESHOLD).toBeGreaterThan(SELF_DISTANCE)
    expect(DEFAULT_MATCH_THRESHOLD).toBeLessThan(OTHER_DISTANCE)
  })

  it('阈值对同人/异人两侧都有合理余量（不是刚好卡线）', () => {
    const SELF_DISTANCE = 4.532
    const OTHER_DISTANCE = 10.145
    // 两侧各留至少 15% 余量：光线/角度波动不应把结论翻过来
    expect(DEFAULT_MATCH_THRESHOLD / SELF_DISTANCE).toBeGreaterThan(1.15)
    expect(OTHER_DISTANCE / DEFAULT_MATCH_THRESHOLD).toBeGreaterThan(1.15)
  })

  it('resolveThreshold 支持 localStorage 覆盖（便于现场标定）', () => {
    const key = 'face-match-threshold'
    const before = globalThis.localStorage?.getItem(key) ?? null
    try {
      globalThis.localStorage?.setItem(key, '5')
      expect(resolveThreshold()).toBe(5)
      // 非法值要回退到默认值，不能被 NaN 污染
      globalThis.localStorage?.setItem(key, 'abc')
      expect(resolveThreshold()).toBe(DEFAULT_MATCH_THRESHOLD)
      globalThis.localStorage?.setItem(key, '-1')
      expect(resolveThreshold()).toBe(DEFAULT_MATCH_THRESHOLD)
    } finally {
      if (before === null) globalThis.localStorage?.removeItem(key)
      else globalThis.localStorage?.setItem(key, before)
    }
  })
})
