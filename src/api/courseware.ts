/**
 * 在线课堂课件管理（/api/kng/admin/courseware/**）接口封装。
 * 各函数与 OnlineClassroom 的 CoursewareController / CoursewareOpController 一一对应，
 * 端点语义见后端同名方法的 javadoc。
 */
import request from './request'

export interface CoursewareListQuery {
  keyword?: string
  type?: number | null
  status?: number | null
  catalogId?: string | null
  includeChildCatalog?: number
  onSale?: number | null
  quoted?: number | null
  uploadTimeStart?: string | null
  uploadTimeEnd?: string | null
  updateTimeStart?: string | null
  updateTimeEnd?: string | null
}

export interface CoursewareListItem {
  id: string
  title: string
  type: number
  typeDesc: string
  catalogId: string
  catalogName: string
  status: number
  statusDesc: string
  onSale: number
  /** 隐藏标记（增补A：独立于 status 的双标记，行置灰 + "已隐藏"标签） */
  hidden: boolean
  updateTime: string | null
  studyCount: number
  platformNo: string | null
  coverUrl: string | null
  createdByName: string | null
}

export interface CoursewarePage {
  total: number
  records: CoursewareListItem[]
}

export interface CoursewareFile {
  id?: string
  fileName: string
  fileSize: number
  language: string | null
  storagePath: string
}

export interface CoursewareAttachment {
  id?: string
  fileName: string
  fileSize: number
  storagePath?: string
}

export interface CoursewareContributor {
  userId: string
  name: string
  account: string
}

export interface CoursewareDetail {
  id: string
  title: string
  type: number
  typeDesc: string
  catalogId: string
  catalogPath: string
  status: number
  platformNo: string | null
  standardMinutes: number
  standardSeconds: number
  standardDurationFollow: boolean
  studyScore: number | null
  studyScoreCalc: number
  finishStandardPercent: number
  description: string | null
  coverUrl: string | null
  code: string | null
  versionStr: string | null
  viewPermission: number
  downloadEnabled: boolean
  downloadPermission: number
  appSaveEnabled: boolean
  appSavePermission: number
  speedEnabled: boolean
  speedHoursCalc: boolean
  aiSubtitleEnabled: boolean
  /** 隐藏标记（增补A：详情响应追加，向后兼容） */
  hidden?: boolean
  contributor: CoursewareContributor | null
  createdByName: string | null
  createTime: string | null
  updateTime: string | null
  files: CoursewareFile[]
  attachments: CoursewareAttachment[]
}

export interface CoursewareSaveReq {
  title: string
  type: number
  catalogId: string
  standardMinutes: number
  standardSeconds: number
  standardDurationFollow: boolean
  studyScore: number | null
  finishStandardPercent: number
  description: string
  coverStoragePath: string | null
  code: string
  versionStr: string
  viewPermission: number
  downloadEnabled: boolean
  downloadPermission: number
  appSaveEnabled: boolean
  appSavePermission: number
  speedEnabled: boolean
  speedHoursCalc: boolean
  aiSubtitleEnabled: boolean
  files: CoursewareFile[]
  links: CoursewareFile[]
  attachmentPaths: Array<{ storagePath: string; fileName: string; fileSize: number }>
}

export interface StudyRecordQuery {
  deptId?: string | null
  hasChild?: number
  studyStatus?: number | null
  finishMethod?: number | null
  keyword?: string
}

export interface StudyRecord {
  userId: string
  name: string
  account: string
  deptName: string
  deptFullName: string
  post: string
  studyStatus: number
  studyStatusDesc: string
  startStudyTime: string | null
  endStudyTime: string | null
  studyLenHours: number
  finishCostDays: number | null
  finishMethod: number | null
  finishMethodDesc: string | null
  /** 学习进度%（课程内学习详情 CS-05 增补字段；课件模块自身不返回，恒 undefined） */
  studySchedule?: number | null
}

export interface StudyOverview {
  numOf7days: number
  numOftotal: number
  numOfFinish: number
}

export interface FinishTimeOverview {
  numInOneDay: number
  numInOneWeek: number
  numInOneMon: number
  numInThreeMon: number
  numInMoreThrMon: number
}

export function getCoursewareList(
  params: { page: number; pageSize: number; orderBy?: string; orderType?: string },
  body: CoursewareListQuery
) {
  return request.post<unknown, CoursewarePage>('/kng/admin/courseware/list', body, { params })
}

export function getCoursewareDetail(id: string) {
  return request.get<unknown, CoursewareDetail>(`/kng/admin/courseware/${id}/detail`)
}

export function createCourseware(data: CoursewareSaveReq) {
  return request.post<unknown, { id: string; status: number }>('/kng/admin/courseware', data)
}

export function updateCourseware(id: string, data: CoursewareSaveReq) {
  return request.put<unknown, { id: string }>(`/kng/admin/courseware/${id}`, data)
}

export function takeDownCourseware(id: string) {
  return request.post<unknown, { count: number }>(`/kng/admin/courseware/${id}/take-down`)
}

/** 隐藏/取消隐藏课件（增补A）：更新 hidden 列，独立于 status */
export function hideCourseware(id: string, hidden: boolean) {
  return request.post<unknown, null>(`/kng/admin/courseware/${id}/hide`, { hidden })
}

export function batchTakeDownCourseware(ids: string[]) {
  return request.post<unknown, { count: number }>('/kng/admin/courseware/batch/take-down', { ids })
}

export function batchPutOnCourseware(ids: string[]) {
  return request.post<unknown, { count: number }>('/kng/admin/courseware/batch/put-on', { ids })
}

export function moveCourseware(ids: string[], targetCatalogId: string) {
  return request.post<unknown, { count: number }>('/kng/admin/courseware/batch/move', { ids, targetCatalogId })
}

export function copyCourseware(id: string, targetCatalogId: string) {
  return request.post<unknown, { id: string }>(`/kng/admin/courseware/${id}/copy`, { targetCatalogId })
}

export function deleteCourseware(id: string) {
  return request.delete<unknown, { count: number }>(`/kng/admin/courseware/${id}`)
}

export function batchDeleteCourseware(ids: string[]) {
  return request.post<unknown, { count: number }>('/kng/admin/courseware/batch/delete', { ids })
}

export function getCoursewareReferences(id: string) {
  return request.get<unknown, unknown[]>(`/kng/admin/courseware/${id}/references`)
}

export function getCoursewareDownloadRecords(id: string) {
  return request.get<unknown, { total: number; records: unknown[] }>(
    `/kng/admin/courseware/${id}/download-records`
  )
}

export function getStudyRecords(
  id: string,
  params: { page: number; pageSize: number },
  body: StudyRecordQuery
) {
  return request.post<unknown, { total: number; records: StudyRecord[] }>(
    `/kng/admin/courseware/${id}/study-records`,
    body,
    { params }
  )
}

export function getStudyOverview(id: string) {
  return request.get<unknown, StudyOverview>(`/kng/admin/courseware/${id}/study-overview`)
}

export function getFinishTimeOverview(id: string) {
  return request.get<unknown, FinishTimeOverview>(`/kng/admin/courseware/${id}/finish-time-overview`)
}

export function getCoursewareDeptFirstLevel() {
  return request.get<unknown, Array<{ id: string; name: string }>>('/kng/admin/courseware/dept-first-level')
}

export function getDeptFinishOverview(id: string, deptIds: string[]) {
  return request.post<unknown, Array<{
    deptId: string
    deptName: string
    numOfStudyPeo: number
    numOfFinishPeo: number
  }>>(`/kng/admin/courseware/${id}/dept-finish-overview`, { deptIds })
}

export function initUpload(data: {
  fileName: string
  fileSize: number
  md5: string
  chunkSize: number
  totalChunks: number
  uploadId?: string
}) {
  return request.post<unknown, {
    uploadId: string
    uploadedChunks: number[]
    instant: boolean
    storagePath: string | null
  }>('/kng/admin/upload/init', data)
}

export function uploadChunk(uploadId: string, chunkIndex: number, file: Blob) {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, null>('/kng/admin/upload/chunk', form, {
    params: { uploadId, chunkIndex },
    timeout: 0
  })
}

export function mergeUpload(uploadId: string, fileName: string) {
  return request.post<unknown, { storagePath: string; fileSize: number }>(
    '/kng/admin/upload/merge',
    { uploadId, fileName }
  )
}

export function getTranscodeList(
  params: { page: number; pageSize: number },
  body: { tab: 'processing' | 'failed'; keyword?: string }
) {
  return request.post<unknown, {
    total: number
    processingCount: number
    records: Array<{
      id: string
      title: string
      catalogName: string
      uploadTime: string
      convertedSeconds: number
      createdByName: string
      remark: string
    }>
  }>('/kng/admin/courseware/transcode/list', body, { params })
}

export function getSubtitleList(
  params: { page: number; pageSize: number },
  body: { tab: 'recognizing' | 'failed'; keyword?: string }
) {
  return request.post<unknown, { total: number; records: unknown[] }>(
    '/kng/admin/courseware/subtitles/list',
    body,
    { params }
  )
}
