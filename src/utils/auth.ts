export interface AuthUser {
  userId: string
  account: string
  name: string
  isSuperAdmin: boolean
  status: number
  /** 部门名，首页左栏头像下展示；来源 /sm/auth/me，未加载时为 null */
  deptName?: string | null
  /** 岗位名，暂无展示位但保留在会话里 */
  positionName?: string | null
}

export interface StoredAuth {
  token: string
  user: AuthUser | null
  permissions: string[]
}

const AUTH_STORAGE_KEY = 'final_dream.auth'

const emptyAuth = (): StoredAuth => ({
  token: '',
  user: null,
  permissions: []
})

export function readStoredAuth(): StoredAuth {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return emptyAuth()
    const parsed = JSON.parse(raw) as Partial<StoredAuth>
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      user: parsed.user ?? null,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : []
    }
  } catch {
    return emptyAuth()
  }
}

export function writeStoredAuth(auth: StoredAuth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getStoredToken() {
  return readStoredAuth().token
}

export function redirectToLogin() {
  if (window.location.hash.startsWith('#/login')) return
  const current = window.location.hash.replace(/^#/, '') || '/'
  window.location.hash = `/login?redirect=${encodeURIComponent(current)}`
}

export function redirectToForbidden() {
  if (!window.location.hash.startsWith('#/403')) {
    window.location.hash = '/403'
  }
}
