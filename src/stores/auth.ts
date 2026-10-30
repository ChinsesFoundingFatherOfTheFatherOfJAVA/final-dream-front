import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getMe, login as loginApi } from '@/api/auth'
import {
  clearStoredAuth,
  readStoredAuth,
  writeStoredAuth,
  type AuthUser
} from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const stored = readStoredAuth()
  const token = ref(stored.token)
  const user = ref<AuthUser | null>(stored.user)
  const permissions = ref<string[]>(stored.permissions)
  const identityLoaded = ref(Boolean(stored.user))

  const isAuthenticated = computed(() => Boolean(token.value))
  const isSuperAdmin = computed(() => Boolean(user.value?.isSuperAdmin))
  const displayName = computed(() => user.value?.name || user.value?.account || '用户')
  const userInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
  /** 部门名（如"杰克科技股份"），首页左栏展示；无数据时为空串 */
  const deptName = computed(() => user.value?.deptName || '')

  const persist = () => {
    writeStoredAuth({
      token: token.value,
      user: user.value,
      permissions: permissions.value
    })
  }

  const login = async (account: string, password: string) => {
    const result = await loginApi(account, password)
    token.value = result.token
    user.value = result.user
    permissions.value = result.permissions ?? []
    identityLoaded.value = true
    persist()
    return result
  }

  const loadMe = async (force = false) => {
    if (!token.value) return null
    if (identityLoaded.value && user.value && !force) return user.value
    const me = await getMe()
    user.value = {
      userId: me.userId,
      account: user.value?.account || me.userId,
      name: me.fullname,
      isSuperAdmin: user.value?.isSuperAdmin ?? false,
      status: user.value?.status ?? 1,
      deptName: me.deptName ?? user.value?.deptName ?? null,
      positionName: me.positionName ?? user.value?.positionName ?? null
    }
    permissions.value = me.permissions ?? []
    identityLoaded.value = true
    persist()
    return user.value
  }

  const hasPermission = (code: string) => {
    if (isSuperAdmin.value) return true
    return permissions.value.includes('*') || permissions.value.includes(code)
  }

  const logout = () => {
    token.value = ''
    user.value = null
    permissions.value = []
    identityLoaded.value = false
    clearStoredAuth()
  }

  return {
    token,
    user,
    permissions,
    identityLoaded,
    isAuthenticated,
    isSuperAdmin,
    displayName,
    userInitial,
    deptName,
    login,
    loadMe,
    hasPermission,
    logout
  }
})
