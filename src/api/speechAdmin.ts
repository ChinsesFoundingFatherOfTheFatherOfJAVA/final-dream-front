import request from './request'
import type {
  ActiveItem,
  CandidateRow,
  DepartmentNode,
  DeptStatRow,
  PageData,
  PositionOption,
  PracticeItem,
  ProjectOverviewStudentRow,
  ProjectRadar,
  ProjectStudentRow,
  ProjectSummary,
  StudentQuery,
  TimesAverage,
  Tops,
  AttendRecordRow
} from '@/types/speechAdmin'

function normalizePage<T>(data: PageData<T> | { list?: T[]; records?: T[]; total: number }): PageData<T> {
  return {
    records: data.records ?? ('list' in data ? data.list : undefined) ?? [],
    total: data.total ?? 0,
    page: 'page' in data ? data.page : undefined,
    pageSize: 'pageSize' in data ? data.pageSize : undefined
  }
}

export function getProjectSummary(projectId: string | number) {
  return request.get<unknown, ProjectSummary>(`/admin/projects/${projectId}/statistics/summary`)
}

export function getTimesAverages(projectId: string | number) {
  return request.get<unknown, { datas: TimesAverage[] }>(
    `/admin/projects/${projectId}/statistics/times-averages`
  )
}

export function getProjectRadar(projectId: string | number) {
  return request.get<unknown, ProjectRadar>(`/admin/projects/${projectId}/statistics/radar`)
}

export function getActiveStats(projectId: string | number) {
  return request.get<unknown, { datas: ActiveItem[] }>(
    `/admin/projects/${projectId}/statistics/active`
  )
}

export async function getOverviewStudents(projectId: string | number, query: StudentQuery) {
  const data = await request.post<
    unknown,
    PageData<ProjectOverviewStudentRow> | { list?: ProjectOverviewStudentRow[]; total: number }
  >(`/admin/projects/${projectId}/statistics/students`, query)
  return normalizePage(data)
}

export async function getDeptStats(projectId: string | number, query: StudentQuery) {
  const data = await request.post<
    unknown,
    PageData<DeptStatRow> | { list?: DeptStatRow[]; total: number }
  >(`/admin/projects/${projectId}/statistics/depts`, query)
  return normalizePage(data)
}

export async function getProjectStudents(projectId: string | number, query: StudentQuery) {
  const data = await request.post<
    unknown,
    PageData<ProjectStudentRow> | { list?: ProjectStudentRow[]; total: number }
  >(`/admin/projects/${projectId}/students/list`, query)
  return normalizePage(data)
}

export function inviteProjectStudents(projectId: string | number, userIds: string[]) {
  return request.post<unknown, { inserted: number; skipped: number }>(
    `/admin/projects/${projectId}/students`,
    { userIds }
  )
}

export function removeProjectStudents(projectId: string | number, userIds: string[]) {
  return request.delete<unknown, { removed: number }>(
    `/admin/projects/${projectId}/students`,
    { data: { userIds } }
  )
}

export async function getStudentCandidates(
  projectId: string | number,
  params: { deptId?: string; keyword?: string; page?: number; pageSize?: number }
) {
  const data = await request.get<
    unknown,
    PageData<CandidateRow> | { list?: CandidateRow[]; total: number }
  >(`/admin/projects/${projectId}/student-candidates`, { params })
  return normalizePage(data)
}

export function getAdminStudentTops(projectId: string | number, userId: string) {
  return request.get<unknown, Tops>(`/admin/projects/${projectId}/students/${userId}/tops`)
}

export function getAdminPracticeAnalysis(
  projectId: string | number,
  userId: string,
  dimension?: string
) {
  return request.get<unknown, { datas: PracticeItem[] }>(
    `/admin/projects/${projectId}/students/${userId}/practice-analysis`,
    { params: { dimension: dimension || undefined } }
  )
}

export async function getAdminAttendRecords(
  projectId: string | number,
  userId: string,
  page = 1,
  pageSize = 10
) {
  const data = await request.get<
    unknown,
    PageData<AttendRecordRow> | { list?: AttendRecordRow[]; total: number }
  >(`/admin/projects/${projectId}/students/${userId}/attend-record`, {
    params: { page, pageSize }
  })
  return normalizePage(data)
}

export function getStudentTops(projectId: string | number) {
  return request.get<unknown, Tops>(`/student/projects/${projectId}/tops`)
}

export function getStudentPracticeAnalysis(projectId: string | number, dimension?: string) {
  return request.get<unknown, { datas: PracticeItem[] }>(
    `/student/projects/${projectId}/practice-analysis`,
    { params: { dimension: dimension || undefined } }
  )
}

export async function getStudentAttendRecords(
  projectId: string | number,
  page = 1,
  pageSize = 10
) {
  const data = await request.get<
    unknown,
    PageData<AttendRecordRow> | { list?: AttendRecordRow[]; total: number }
  >(`/student/projects/${projectId}/attend-record`, { params: { page, pageSize } })
  return normalizePage(data)
}

export function getDepartmentTree() {
  return request.get<unknown, { list: DepartmentNode[] }>('/sm/admin/departments/tree')
}

export function getPositionOptions(params?: { page?: number; size?: number; keyword?: string }) {
  return request.get<
    unknown,
    { list: PositionOption[]; total: number; page?: number; size?: number }
  >('/sm/admin/positions', {
    params: { page: 1, size: 200, ...params }
  })
}
