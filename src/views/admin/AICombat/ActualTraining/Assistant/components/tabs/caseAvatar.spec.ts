import { describe, expect, it } from 'vitest'
import { caseAvatarBody, toStoredAvatarUrl, avatarPreviewUrl } from './caseAvatar'

/**
 * 案例形象（L0 上传覆盖）的口径闸门（2026-11-05，配 t5 后端接口）。
 *
 * 为什么测纯函数而不是挂载 ScenarioUnitsTab：那个组件 import 了 element-plus 与
 * useAssistantStore（Pinia + WS transport），挂载代价高且会把真实 EP 写进模块注册表；
 * 真正会出错的规则其实是 URL 归一化与请求体形状，抽成纯函数后在这里锁死。
 */
describe('caseAvatar · 存储口径', () => {
  it('已经带 /api 前缀的地址要脱掉，否则展示时会被 resolveAssetUrl 二次补成 /api/api/…', () => {
    expect(toStoredAvatarUrl('/api/exam/files/2026/11/a.png')).toBe('/exam/files/2026/11/a.png')
    expect(toStoredAvatarUrl('/avatar/m-A3-04.webp')).toBe('/avatar/m-A3-04.webp')
  })

  it('blob / data 预览地址不能落库（换台机器就失效）', () => {
    expect(toStoredAvatarUrl('blob:http://localhost:3000/abc')).toBe('')
    expect(toStoredAvatarUrl('data:image/png;base64,AAA')).toBe('')
  })

  it('外链原样保留（AI 生图若返回外链也要能存）', () => {
    expect(toStoredAvatarUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
  })

  it('空值统一成空串，由调用方决定是否转 null', () => {
    expect(toStoredAvatarUrl(null)).toBe('')
    expect(toStoredAvatarUrl(undefined)).toBe('')
    expect(toStoredAvatarUrl('   ')).toBe('')
  })

  it('展示地址补 /api 前缀；无图返回空串（调用方据此不渲染 img）', () => {
    expect(avatarPreviewUrl('/avatar/m-A3-04.webp')).toBe('/api/avatar/m-A3-04.webp')
    expect(avatarPreviewUrl('/api/exam/files/2026/11/a.png')).toBe('/api/exam/files/2026/11/a.png')
    expect(avatarPreviewUrl('')).toBe('')
  })
})

describe('caseAvatar · 保存请求体', () => {
  it('定位键用 scriptName；scenarioName 为空时传 null（后端只在同名多例才需要它）', () => {
    expect(
      caseAvatarBody({
        scriptName: '门卫拦截：合规开场争取转接',
        avatarUrl: '/avatar/m-A3-04.webp',
      }),
    ).toEqual({
      scriptName: '门卫拦截：合规开场争取转接',
      scenarioName: null,
      avatarUrl: '/avatar/m-A3-04.webp',
    })
  })

  it('带场景名时原样传给后端消歧', () => {
    expect(
      caseAvatarBody({
        scriptName: '门卫拦截：合规开场争取转接',
        scenarioName: '陌生拜访：门卫拦截下自报家门',
        avatarUrl: '/avatar/m-A3-04.webp',
      }).scenarioName,
    ).toBe('陌生拜访：门卫拦截下自报家门')
  })

  it('清空形象 = avatarUrl 传 null（后端据此清除覆盖、发布回落自动定图）', () => {
    expect(caseAvatarBody({ scriptName: 'a', avatarUrl: '' }).avatarUrl).toBeNull()
    expect(caseAvatarBody({ scriptName: 'a', avatarUrl: '   ' }).avatarUrl).toBeNull()
  })

  it('本地 blob 预览不会被误当成有效地址提交', () => {
    expect(caseAvatarBody({ scriptName: 'a', avatarUrl: 'blob:http://x/abc' }).avatarUrl).toBeNull()
  })

  it('上传接口返回的 /api/avatar/... 落库前脱前缀', () => {
    expect(
      caseAvatarBody({ scriptName: 'a', avatarUrl: '/api/avatar/a.png' }).avatarUrl,
    ).toBe('/avatar/a.png')
  })
})
