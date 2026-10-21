import { describe, expect, it } from 'vitest'
import { resolveRouteAccess, type AuthLike, type RouteLike } from './routeAccess'

const makeAuth = (over: Partial<AuthLike> = {}): AuthLike => {
  const permissions = over.permissions ?? []
  const superAdmin = over.isSuperAdmin === true
  return {
    isAuthenticated: true,
    identityLoaded: true,
    isSuperAdmin: superAdmin,
    permissions,
    loadMe: () => Promise.resolve(),
    logout: () => {},
    hasPermission: (code: string) =>
      superAdmin || permissions.includes('*') || permissions.includes(code),
    ...over
  }
}

const route = (meta: RouteLike['meta'], fullPath = '/x'): RouteLike => ({ meta, fullPath })

describe('resolveRouteAccess', () => {
  it('public 路由直接放行', async () => {
    const auth = makeAuth({ isAuthenticated: false })
    expect(await resolveRouteAccess(route({ public: true }), auth)).toBe(true)
  })

  it('未登录跳登录并带 redirect', async () => {
    const auth = makeAuth({ isAuthenticated: false })
    expect(await resolveRouteAccess(route({}, '/exam/paper'), auth))
      .toEqual({ path: '/login', query: { redirect: '/exam/paper' } })
  })

  it('meta.permission 精确匹配', async () => {
    const auth = makeAuth({ permissions: ['exam:queslib'] })
    expect(await resolveRouteAccess(route({ permission: 'exam:queslib' }), auth)).toBe(true)
    expect(await resolveRouteAccess(route({ permission: 'exam:manage' }), auth))
      .toEqual({ path: '/403' })
  })

  it('meta.permissionAny 任一命中即放行', async () => {
    const any = { permissionAny: ['exam:queslib', 'exam:paper', 'exam:manage'] }
    expect(await resolveRouteAccess(route(any), makeAuth({ permissions: ['exam:paper'] }))).toBe(true)
    expect(await resolveRouteAccess(route(any), makeAuth({ permissions: ['kng:course'] })))
      .toEqual({ path: '/403' })
  })

  it('超管直通所有权限校验', async () => {
    const auth = makeAuth({ isSuperAdmin: true, permissions: [] })
    expect(await resolveRouteAccess(route({ permission: 'exam:manage' }), auth)).toBe(true)
    expect(await resolveRouteAccess(route({ requiresAdmin: true }), auth)).toBe(true)
  })

  it('requiresAdmin 且没有任何权限时拒绝', async () => {
    const auth = makeAuth({ permissions: [] })
    expect(await resolveRouteAccess(route({ requiresAdmin: true }), auth))
      .toEqual({ path: '/403' })
  })

  it('身份加载失败时清凭证并回登录', async () => {
    const auth = makeAuth({
      identityLoaded: false,
      loadMe: () => Promise.reject(new Error('boom'))
    })
    expect(await resolveRouteAccess(route({}, '/x'), auth))
      .toEqual({ path: '/login', query: { redirect: '/x' } })
  })
})
