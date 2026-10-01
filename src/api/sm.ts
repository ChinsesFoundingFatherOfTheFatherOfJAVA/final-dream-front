/**
 * StaffManagement（用户与权限中心，/api/sm/**）HTTP 接口封装。
 *
 * <p>接口语义对齐《组织架构与角色权限模块\03-接口文档.md》：
 * 统一 `ApiResponse{code,message,data}`、id 一律 string、分页形状 `{list,total,page,size}`。
 * 登录相关的 auth.ts 单独维护，本文件只承载登录后的管理端查询与配置。
 */
import request from './request'

/** 不分页列表响应的通用包装（后端约定：不分页列表也包 `{list}`）。 */
export interface SmList<T> {
  list: T[]
}

/** 分页响应的通用包装（`{list,total,page,size}`）。 */
export interface SmPage<T> extends SmList<T> {
  total: number
  page: number
  size: number
}

/** 部门节点（同步任务按员工路径合成，userCount 为含子部门人数）。 */
export interface EnterpriseDepartment {
  deptId: string
  deptCode: string | null
  deptName: string
  deptPath: string
  parentPath: string | null
  userCount: number
}

export type DepartmentNode = EnterpriseDepartment

/** 员工名册行（Oracle 同步来源 + 本地管理的状态/超管标记）。 */
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

/** 员工名册查询条件（字段搜索 + 部门/状态/岗位/超管过滤）。 */
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

/** 岗位候选值（distinct 岗位名 + 人数，随同步自动增删）。 */
export interface PositionOption {
  positionName: string
  userCount: number
}

/** 角色列表行（含成员数）。 */
export interface RoleSummary {
  roleId: string
  name: string
  userCount: number
}

/** 角色详情（含权限码集合）。 */
export interface RoleDetail extends RoleSummary {
  description: string | null
  remark: string | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  permissionCodes: string[]
}

/** 权限树节点（菜单级权限码）。 */
export interface PermissionNode {
  permissionId: string
  code: string
  name: string
  routePath: string | null
  children: PermissionNode[]
}

/** 角色成员行。 */
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

/** 角色成员查询条件。 */
export interface RoleMemberQuery {
  page: number
  size: number
  deptId?: string
  status?: number
  searchField?: 'name' | 'account'
  keyword?: string
}

/** Oracle 同步日志一行。 */
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

/** 部门树（可选关键词过滤）。 */
export function getDepartmentTree(params?: { keyword?: string }) {
  return request.get<unknown, SmList<EnterpriseDepartment>>('/sm/admin/departments/tree', { params })
}

/** 部门树别名：员工名册侧沿用同一数据源。 */
export const getEnterpriseDepartments = getDepartmentTree

/** 员工名册分页查询。 */
export function getEnterpriseUsers(params: EnterpriseUserQuery) {
  return request.get<unknown, SmPage<EnterpriseUser>>('/sm/admin/users', { params })
}

/** 启用/禁用用户账号。 */
export function updateUserStatus(userId: string, status: number) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/status`, { status })
}

/** 重置用户密码为默认口令。 */
export function resetUserPassword(userId: string) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/reset-password`)
}

/** 删除用户（仍有项目负责关系时后端拒绝）。 */
export function deleteUser(userId: string) {
  return request.delete<unknown, null>(`/sm/admin/users/${userId}`)
}

/** 设置/取消超级管理员。 */
export function setSuperAdmin(userId: string, isSuperAdmin: boolean) {
  return request.post<unknown, null>(`/sm/admin/users/${userId}/super-admin`, { isSuperAdmin })
}

/** 岗位候选值分页（选人/筛选弹窗）。 */
export function getPositions(params?: { page?: number; size?: number; keyword?: string }) {
  return request.get<unknown, SmPage<PositionOption>>('/sm/admin/positions', {
    params: { page: 1, size: 20, ...params }
  })
}

/** 职级 distinct 列表。 */
export function getJobGrades() {
  return request.get<unknown, SmList<string>>('/sm/admin/job-grades')
}

/** 角色列表（含成员数）。 */
export function getRoles(params?: { keyword?: string }) {
  return request.get<unknown, SmList<RoleSummary>>('/sm/admin/roles', { params })
}

/** 创建角色（名称全局唯一，重名返回 40901）。 */
export function createRole(payload: { name: string; description?: string; remark?: string }) {
  return request.post<unknown, { roleId: string }>('/sm/admin/roles', payload)
}

/** 编辑角色基础信息。 */
export function updateRole(
  roleId: string,
  payload: { name?: string; description?: string; remark?: string }
) {
  return request.put<unknown, null>(`/sm/admin/roles/${roleId}`, payload)
}

/** 删除角色（角色下仍有用户时返回 40902）。 */
export function deleteRole(roleId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}`)
}

/** 角色详情（含权限码）。 */
export function getRoleDetail(roleId: string) {
  return request.get<unknown, RoleDetail>(`/sm/admin/roles/${roleId}`)
}

/** 权限树（菜单级权限码）。 */
export function getPermissionTree() {
  return request.get<unknown, SmList<PermissionNode>>('/sm/admin/permissions/tree')
}

/** 给角色追加一个权限点。 */
export function addRolePermission(roleId: string, permissionId: string) {
  return request.post<unknown, null>(`/sm/admin/roles/${roleId}/permissions`, { permissionId })
}

/** 从角色移除一个权限点。 */
export function removeRolePermission(roleId: string, permissionId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}/permissions/${permissionId}`)
}

/** 角色成员分页。 */
export function getRoleMembers(roleId: string, params: RoleMemberQuery) {
  return request.get<unknown, SmPage<RoleMember>>(`/sm/admin/roles/${roleId}/users`, { params })
}

/** 批量添加角色成员（幂等，返回 added/skipped）。 */
export function addRoleMembers(roleId: string, userIds: string[]) {
  return request.post<unknown, { added: number; skipped: number }>(
    `/sm/admin/roles/${roleId}/users`,
    { userIds }
  )
}

/** 移除单个角色成员。 */
export function removeRoleMember(roleId: string, userId: string) {
  return request.delete<unknown, null>(`/sm/admin/roles/${roleId}/users/${userId}`)
}

/** 批量移除角色成员。 */
export function removeRoleMembers(roleId: string, userIds: string[]) {
  return request.post<unknown, { removed: number }>(
    `/sm/admin/roles/${roleId}/users/batch-remove`,
    { userIds }
  )
}

/** 手动触发 Oracle 同步（full=true 全量，需人工盯守）。 */
export function triggerSync(full = false) {
  return request.post<unknown, { triggered: boolean }>('/sm/admin/sync/trigger', null, {
    params: { full }
  })
}

/** 同步日志列表。 */
export function getSyncStatus() {
  return request.get<unknown, SmList<SyncLog>>('/sm/admin/sync/status')
}

/** 修改当前登录人密码。 */
export function changePassword(oldPassword: string, newPassword: string) {
  return request.post<unknown, null>('/sm/auth/change-password', { oldPassword, newPassword })
}
