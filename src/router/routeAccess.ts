/**
 * 导航守卫需要的认证能力（从 Pinia 的 useAuthStore 抽象出来，便于单测）。
 */
export interface AuthLike {
  isAuthenticated: boolean
  identityLoaded: boolean
  isSuperAdmin: boolean
  permissions: string[]
  loadMe: () => Promise<unknown>
  logout: () => void
  hasPermission: (code: string) => boolean
}

export type RouteAccessResult = true | { path: string; query?: Record<string, string> }

/** 守卫只关心这几个 meta 字段，抽成结构类型便于单测直接构造。 */
export interface RouteLike {
  meta: {
    public?: unknown
    permission?: unknown
    permissionAny?: unknown
    requiresAdmin?: unknown
  }
  fullPath: string
}

/**
 * 统一的导航守卫判定（纯函数，不依赖浏览器/Pinia）。
 *
 * <p>判定顺序：public → 未登录 → 加载身份 → `meta.permission` → `meta.permissionAny` → `requiresAdmin`。
 * `hasPermission` 内部已处理超管与 `*`，这里不重复判断 `isSuperAdmin`。
 *
 * <p>`permissionAny` 用于布局路由（如 `/exam`、`/kng`、`/sparring`）：
 * 它们横跨多个子模块，任一并列权限即可进入，具体子路由再用 `permission` 精确校验。
 */
export const resolveRouteAccess = async (
  to: RouteLike,
  auth: AuthLike
): Promise<RouteAccessResult> => {
  if (to.meta.public === true) {
    return true
  }

  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  try {
    if (!auth.identityLoaded) {
      await auth.loadMe()
    }
  } catch {
    auth.logout()
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const required = to.meta.permission
  if (required && !auth.hasPermission(String(required))) {
    return { path: '/403' }
  }

  const anyOf = to.meta.permissionAny
  if (Array.isArray(anyOf) && anyOf.length > 0
      && !anyOf.some(code => auth.hasPermission(String(code)))) {
    return { path: '/403' }
  }

  // 只给"没有更细权限要求"的管理端布局兜底（如 AdminLayout 根路由）
  if (to.meta.requiresAdmin === true && !auth.isSuperAdmin && auth.permissions.length === 0) {
    return { path: '/403' }
  }

  return true
}
