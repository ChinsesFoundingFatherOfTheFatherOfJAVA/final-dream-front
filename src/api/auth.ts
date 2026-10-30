import request from './request'
import type { AuthUser } from '@/utils/auth'

export interface LoginResult {
  token: string
  user: AuthUser
  permissions: string[]
}

export interface MeResult {
  userId: string
  fullname: string
  permissions: string[]
  deptName?: string | null
  positionName?: string | null
}

export function login(account: string, password: string) {
  return request.post<unknown, LoginResult>('/sm/auth/login', { account, password })
}

export function getMe() {
  return request.get<unknown, MeResult>('/sm/auth/me')
}
