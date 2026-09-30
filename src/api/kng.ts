import request from './request'

export interface KngTreeNode {
  id: string
  name: string
  level: number
  orderIndex: number
  kngCount: number
  courseCount: number
  allKngCount: number
  allCourseCount: number
  updateTime: string | null
  children: KngTreeNode[]
}

export interface KngPermissionItem {
  subjectType: number
  subjectId: string | null
  subjectName: string
  permCodes: number[]
}

export interface KngCatalogDetail {
  id: string
  parentId: string | null
  name: string
  parentPath: string
  level: number
  orderType: number
  prefixEnabled: boolean
  prefixContent: string | null
  dateSuffixEnabled: boolean
  dateSuffixFormat: string | null
  inheritParent: boolean
  createTime: string | null
  createUser: { name: string; account: string }
  permissions: KngPermissionItem[]
}

export interface KngCatalogSaveReq {
  parentId: string | null
  name: string
  orderType: number
  prefixEnabled: boolean
  prefixContent: string | null
  dateSuffixEnabled: boolean
  dateSuffixFormat: string | null
  inheritParent: boolean
  childrenInherit: boolean
  permissions: KngPermissionItem[]
}

export interface KngSetting {
  creditMode: number
  antiIdleEnabled: boolean
  antiIdleMode: number
  checkIntervalMinutes: number
  confirmSeconds: number
  promptText: string
}

export interface KngDeptNode {
  id: string
  name: string
  userCount: number
  children: KngDeptNode[]
}

export interface KngPage<T> {
  total: number
  records: T[]
}

export function getKngCatalogTree() {
  return request.get<unknown, KngTreeNode[]>('/kng/admin/catalog/tree')
}

export function getKngCatalogDetail(id: string) {
  return request.get<unknown, KngCatalogDetail>(`/kng/admin/catalog/${id}/detail`)
}

export function createKngCatalog(data: KngCatalogSaveReq) {
  return request.post<unknown, { id: string }>('/kng/admin/catalog', data)
}

export function updateKngCatalog(id: string, data: KngCatalogSaveReq) {
  return request.put<unknown, { id: string }>(`/kng/admin/catalog/${id}`, data)
}

export function deleteKngCatalog(id: string) {
  return request.delete<unknown, null>(`/kng/admin/catalog/${id}`)
}

export function batchCreateKngCatalog(data: { parentId: string | null; content: string }) {
  return request.post<unknown, { count: number }>('/kng/admin/catalog/batch', data)
}

export function moveKngCatalog(id: string, targetParentId: string | null, coursesOnly = false) {
  const path = coursesOnly ? 'move-courses' : 'move'
  return request.post<unknown, { count: number }>(`/kng/admin/catalog/${id}/${path}`, { targetParentId })
}

export function mergeKngCatalogToParent(id: string) {
  return request.post<unknown, { count: number }>(`/kng/admin/catalog/${id}/merge-to-parent`)
}

export function getKngSetting() {
  return request.get<unknown, KngSetting>('/kng/admin/setting')
}

export function updateKngSetting(data: KngSetting) {
  return request.put<unknown, null>('/kng/admin/setting', data)
}

export function getKngDeptTree() {
  return request.get<unknown, KngDeptNode[]>('/kng/admin/subjects/dept-tree')
}

export function getKngPositions(params: { page: number; pageSize: number; name?: string }) {
  return request.get<unknown, KngPage<{ name: string; userCount: number }>>('/kng/admin/subjects/positions', { params })
}

export function getKngRoles(params: { page: number; pageSize: number; name?: string }) {
  return request.get<unknown, KngPage<{ id: string; name: string; remark: string | null; userCount: number }>>('/kng/admin/subjects/roles', { params })
}
