import request from './request'

export interface SmList<T> {
  list: T[]
}

export interface SmPage<T> extends SmList<T> {
  total: number
  page: number
  size: number
}

export interface EnterpriseDepartment {
  deptId: string
  deptCode: string | null
  deptName: string
  deptPath: string
  parentPath: string | null
  userCount: number
}

export type DepartmentNode = EnterpriseDepartment

export interface EnterpriseUser {
  userId: string
  name: string
  account: string
  employeeNo: string | null
  mobile: string | null
  email: string | null
  deptCode: string | null
  deptName: string | null
  deptPath: string | null
  positionName: string | null
  jobGrade: string | null
  roleNames: string[]
  entryDate: string | null
  status: number
  isSuperAdmin: boolean
  builtin: boolean
}

export interface EnterpriseUserQuery {
  page: number
  size: number
  deptId?: string
  status?: number
  searchField?: string
  keyword?: string
  positionNames?: string | string[]
  isSuperAdmin?: number
}

export interface PositionOption {
  positionName: string
  userCount: number
}

export interface RoleSummary {
  roleId: string
  name: string
  userCount: number
}

export interface RoleDetail extends RoleSummary {
  description: string | null
  remark: string | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  permissionCodes: string[]
}

export interface PermissionNode {
  permissionId: string
  code: string
  name: string
  routePath: string | null
  children: PermissionNode[]
}

export interface RoleMember {
  userId: string
  name: string
  account: string
  status: number
  deptName: string | null
  positionName: string | null
  addedBy: string | null
  addedByName: string | null
  addedAt: string
}

export interface RoleMemberQuery {
  page: number
  size: number
  deptId?: string
  status?: number
  searchField?: 'name' | 'account'
  keyword?: string
}

export interface SyncLog {
  syncType: 'FULL' | 'INCREMENT'
  watermark: string | null
  total: number | null
  inserted: number | null
  updated: number | null
  deleted: number | null
  skipped: number | null
  status: 'SUCCESS' | 'FAILED'
  errorMsg: string | null
  startedAt: string
  finishedAt: string | null
}

export function getDepartmentTree(params?: { keyword?: string }) {
  return request.get<unknown, SmList<EnterpriseDepartment>>('/sm/admin/departments/tree', { params })
}

export const getEnterpriseDepartments = getDepartmentTree

export function getEnterpriseUsers(params: EnterpriseUserQuery) {
  return request.get<unknown, SmPage<EnterpriseUser>>('/sm/admin/users', { params })
}

export function updateUserStatus(userId: string, status: number) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/status`, { status })
}

export function resetUserPassword(userId: string) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/reset-password`)
}

export function deleteUser(userId: string) {
  return request.delete<unknown, null>(`/sm/admin/users/${userId}`)
}

export function setSuperAdmin(userId: string, isSuperAdmin: boolean) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/super-admin`, { isSuperAdmin })
}

export function getPositions(params?: { page?: number; size?: number; keyword?: string }) {
  return request.get<unknown, SmPage<PositionOption>>('/sm/admin/positions', {
    params: { page: 1, size: 20, ...params }
  })
}

export function getJobGrades() {
  return request.get<unknown, SmList<string>>('/sm/admin/job-grades')
}

export function getRoles(params?: { keyword?: string }) {
  return request.get<unknown, SmList<RoleSummary>>('/sm/admin/roles', { params })
}

export function createRole(payload: { name: string; description?: string; remark?: string }) {
  return request.post<unknown, { roleId: string }>('/sm/admin/roles', payload)
}

export function updateRole(
  roleId: string,
  payload: { name?: string; description?: string; remark?: string }
) {
  return request.put<unknown, null>(`/sm/admin/roles/${roleId}`, payload)
}

export function deleteRole(roleId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}`)
}

export function getRoleDetail(roleId: string) {
  return request.get<unknown, RoleDetail>(`/sm/admin/roles/${roleId}`)
}

export function getPermissionTree() {
  return request.get<unknown, SmList<PermissionNode>>('/sm/admin/permissions/tree')
}

export function addRolePermission(roleId: string, permissionId: string) {
  return request.post<unknown, null>(`/sm/admin/roles/${roleId}/permissions`, { permissionId })
}

export function removeRolePermission(roleId: string, permissionId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}/permissions/${permissionId}`)
}

export function getRoleMembers(roleId: string, params: RoleMemberQuery) {
  return request.get<unknown, SmPage<RoleMember>>(`/sm/admin/roles/${roleId}/users`, { params })
}

export function addRoleMembers(roleId: string, userIds: string[]) {
  return request.post<unknown, { added: number; skipped: number }>(
    `/sm/admin/roles/${roleId}/users`,
    { userIds }
  )
}

export function removeRoleMember(roleId: string, userId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}/users/${userId}`)
}

export function removeRoleMembers(roleId: string, userIds: string[]) {
  return request.post<unknown, { removed: number }>(
    `/sm/admin/roles/${roleId}/users/batch-remove`,
    { userIds }
  )
}

export function triggerSync(full = false) {
  return request.post<unknown, { triggered: boolean }>('/sm/admin/sync/trigger', null, {
    params: { full }
  })
}

export function getSyncStatus() {
  return request.get<unknown, SmList<SyncLog>>('/sm/admin/sync/status')
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request.post<unknown, null>('/sm/auth/change-password', { oldPassword, newPassword })
}
