import { describe, expect, it } from 'vitest'
import {
  IDENTITY_STATUS,
  MAX_FACE_RETRY,
  canAlwaysContinue,
  describeCameraError,
  hasCameraApi,
  retryLeftOf
} from './faceVerifyModel'

/**
 * 这里守的是**一条硬约束**：人脸核验绝不阻断考试（决策 DER-07 / 契约 01 §S3）。
 *
 * <p>写单测的理由很直接：这个性质是「什么都不做」型约束——
 * 后续谁在摄像头失败分支顺手加一句 `return` 或抛错，功能就悄悄退化成硬闸门，
 * 而人工点测很难覆盖「拒绝授权 / 无设备 / 被占用」全部分支。断言在这里钉死。
 */
describe('faceVerifyModel · 核验不阻断（DER-07）', () => {
  it('任何核验结论都允许继续考试', () => {
    // 三种结论全部放行；若哪天有人把这里改成条件判断，这条用例立刻红
    expect(canAlwaysContinue('pass')).toBe(true)
    expect(canAlwaysContinue('fail')).toBe(true)
    expect(canAlwaysContinue('error')).toBe(true)
  })

  it('结论与 identity_status 的映射对齐契约（1通过 / 2不通过 / 3无法核验）', () => {
    expect(IDENTITY_STATUS.pass).toBe(1)
    expect(IDENTITY_STATUS.fail).toBe(2)
    expect(IDENTITY_STATUS.error).toBe(3)
  })

  it('重试次数用尽后剩余次数为 0（此时 UI 只留「继续考试」）', () => {
    // 契约 01 §S3：重试上限 3 次。UI 靠 retryLeft 决定「再试一次」显不显示，
    // 所以这个值不能为负，否则按钮判断会失效
    expect(retryLeftOf(0)).toBe(MAX_FACE_RETRY)
    expect(retryLeftOf(1)).toBe(MAX_FACE_RETRY - 1)
    expect(retryLeftOf(MAX_FACE_RETRY)).toBe(0)
    expect(retryLeftOf(99)).toBe(0)
  })
})

describe('faceVerifyModel · 摄像头错误文案', () => {
  it('拒绝授权给出可操作的指引，而不是只说"失败"', () => {
    const text = describeCameraError({ name: 'NotAllowedError' })
    expect(text).toContain('权限')
    // 必须告诉学员去哪里改，否则他只能干瞪眼
    expect(text).toContain('设置')
  })

  it('无设备 / 被占用 / 安全限制各有专属文案', () => {
    expect(describeCameraError({ name: 'NotFoundError' })).toContain('未检测到')
    expect(describeCameraError({ name: 'NotReadableError' })).toContain('占用')
    expect(describeCameraError({ name: 'SecurityError' })).toContain('安全')
  })

  it('不认识的错误也给出非空原因（空原因会让弹窗只剩一句"无法使用摄像头"）', () => {
    expect(describeCameraError(new Error('boom'))).toBe('boom')
    expect(describeCameraError({})).not.toBe('')
    expect(describeCameraError(null)).not.toBe('')
  })
})

describe('faceVerifyModel · 环境探测', () => {
  it('没有 getUserMedia 时判定为不可用（内网 http 场景）', () => {
    expect(hasCameraApi({})).toBe(false)
    expect(hasCameraApi({ mediaDevices: {} })).toBe(false)
    expect(hasCameraApi({ mediaDevices: { getUserMedia: undefined } })).toBe(false)
  })

  it('有 getUserMedia 时判定为可用', () => {
    expect(hasCameraApi({ mediaDevices: { getUserMedia: () => Promise.resolve() } })).toBe(true)
  })
})
