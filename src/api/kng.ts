/**
 * 在线课堂分类/主体选人（/api/kng/admin/**）接口封装。
 * 与 OnlineClassroom 的 CatalogController / SubjectController 对应，端点语义见后端 javadoc。
 */
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

export interface KngStandardScoreRule {
  standardMinutes: number
  score: number
  applyToAll: boolean
}

export interface KngDocumentScoreRule {
  pagesPerScore: number
  score: number
  standardMinutes: number
  maxScore: number
  applyToAll: boolean
}

export interface KngMicrocourseScoreRule {
  standardMinutes: number
  score: number
  maxScore: number
  applyToAll: boolean
}

export interface KngScoreConf {
  videoAudio: KngStandardScoreRule
  document: KngDocumentScoreRule
  microcourse: KngMicrocourseScoreRule
  scorm: KngStandardScoreRule
  html: KngStandardScoreRule
  rewardType: number
}

export interface KngCheatConf {
  antiIdleEnabled: boolean
  mode: number
  checkMinutes: number
  confirmSeconds: number
  promptText: string
  multiCourseEnabled: boolean
  forbidDragEnabled: boolean
  audioBackgroundPlay: boolean
}

export interface KngCheatSaveReq {
  antiIdleEnabled: boolean
  mode: number
  checkMinutes: number
  confirmSeconds: number
  promptText: string
  multiCourseEnabled: boolean
  forbidDragEnabled: boolean
}

export interface KngPlayConf {
  speedEnabled: boolean
  speedScope: number
  speedHoursCalc: boolean
}

export interface KngFaceConf {
  enabled: boolean
}

export interface KngSetting {
  scoreConf: KngScoreConf
  cheatConf: KngCheatConf
  playConf: KngPlayConf
  faceConf: KngFaceConf
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

export function saveKngScoreConf(data: KngScoreConf) {
  return request.put<unknown, null>('/kng/admin/setting/score', data)
}

export function saveKngCheatConf(data: KngCheatSaveReq) {
  return request.put<unknown, null>('/kng/admin/setting/cheat', data)
}

export function saveKngSpecialSetting(data: { audioBackgroundPlay: boolean }) {
  return request.put<unknown, null>('/kng/admin/setting/special', data)
}

export function saveKngPlayConf(data: KngPlayConf) {
  return request.put<unknown, null>('/kng/admin/setting/play', data)
}

export function saveKngFaceConf(data: KngFaceConf) {
  return request.put<unknown, null>('/kng/admin/setting/face', data)
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
