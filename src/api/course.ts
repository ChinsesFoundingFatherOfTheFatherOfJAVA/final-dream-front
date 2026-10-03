/**
 * 在线课堂课程管理（/api/kng/admin/course/**）接口封装。
 * 各函数与 OnlineClassroom 的 CourseController / CourseOpController / CourseDesignerController
 * 一一对应，端点语义见后端同名方法的 javadoc 与《03-接口文档.md》。
 *
 * 注意：课程列表分页形状与课件列表一致（{total, records}），
 * 不是 SM 系的 {list,total,page,size}，不要混用。
 */
import request from './request'
import type { StudyRecord } from './courseware'

/** 课程列表查询体：同课件列表去掉 type、quoted（课程无"被引用"概念） */
export interface CourseListQuery {
  keyword?: string
  status?: number | null
  catalogId?: string | null
  includeChildCatalog?: number
  onSale?: number | null
  uploadTimeStart?: string | null
  uploadTimeEnd?: string | null
  updateTimeStart?: string | null
  updateTimeEnd?: string | null
}

/** 课程列表行（CS-01） */
export interface CourseListItem {
  id: string
  title: string
  catalogId: string
  catalogName: string
  status: number
  statusDesc: string
  onSale: number
  /** 隐藏标记（独立于 status，行置灰 + "已隐藏"标签） */
  hidden: boolean
  updateTime: string | null
  studyCount: number
  platformNo: string | null
  coverUrl: string | null
  createdByName: string | null
  structureType: number
}

/** 课程列表分页（同课件 {total,records} 形状） */
export interface CoursePage {
  total: number
  records: CourseListItem[]
}

export interface CourseContributor {
  userId: string
  name: string
  account: string
}

/** 课程附件（详情返回；表单上传时 storagePath 为必填） */
export interface CourseAttachment {
  fileName: string
  fileSize: number
  storagePath?: string
}

/** 课程详情（CS-03） */
export interface CourseDetail {
  id: string
  title: string
  catalogId: string
  catalogPath: string
  status: number
  platformNo: string | null
  standardMinutes: number
  standardSeconds: number
  /** 任务时长和（秒）——详情"标准时长"以此聚合值优先展示 */
  standardDurationCalc: number
  /** 单独设置的学分；null=跟随（展示值=任务学分和 studyScoreCalc） */
  studyScore: number | null
  /** 任务学分和（跟随时）或策略折算值 */
  studyScoreCalc: number
  /** 标准时长是否跟随学分策略（无任务时用手填值回退） */
  standardDurationFollow?: boolean
  finishStandardPercent: number
  description: string | null
  coverUrl: string | null
  code: string | null
  versionStr: string | null
  viewPermission: number
  speedEnabled: boolean
  speedHoursCalc: boolean
  contributor: CourseContributor | null
  createdByName: string | null
  structureType: number
  unlockMode: number
  unlockUnit: number
  attachments: CourseAttachment[]
}

/** 创建课程请求（CS-08 点下一步时创建未发布记录） */
export interface CourseCreateReq {
  title: string
  catalogId: string
  finishStandardPercent: number
  viewPermission: number
  structureType: number
}

/** 保存第一步表单（CS-07 编辑/创建后补全共用）：创建参数全集 + 其余表单字段 */
export interface CourseBasicReq {
  title: string
  catalogId: string
  standardDurationFollow: boolean
  standardMinutes: number
  standardSeconds: number
  studyScore: number | null
  finishStandardPercent: number
  description: string
  coverUrl: string | null
  code: string
  versionStr: string
  viewPermission: number
  speedEnabled: boolean
  speedHoursCalc: boolean
  contributorId: string | null
  attachments: Array<{ storagePath: string; fileName: string; fileSize: number }>
}

/** 章节学习统计的课件行（CS-04） */
export interface ChapterStudyTask {
  taskName: string
  coursewareId: string
  coursewareType: number
  numOfPastweek: number
  numOfTotal: number
}

/** 章节学习统计行；无章节课程 chapterId/chapterName 为 null（任务平铺） */
export interface ChapterStudyStat {
  chapterId: string | null
  chapterName: string | null
  tasks: ChapterStudyTask[]
}

/** 课程内课件学习记录行：同课件 study-records，行内多一个 studySchedule（学习进度%，可为 null） */
export type CourseStudyRecord = StudyRecord & { studySchedule: number | null }

/** 设计器章节结构（CS-07a） */
export interface DesignerChapter {
  id?: string
  name: string
  description: string
  tasks: Array<{
    id?: string
    coursewareId: string
    taskName: string
    hidden: boolean
  }>
}

/** 设计器读取结构（join 课件实时值仅展示用） */
export interface CourseDesignerDetail {
  structureType: number
  unlockMode: number
  unlockUnit: number
  chapters: Array<{
    id: string
    name: string
    description: string
    tasks: Array<{
      id: string
      coursewareId: string
      taskName: string
      hidden: boolean
      credits: number
      durationText: string
      coursewareStatus: number
      coursewareType: number
    }>
  }>
  flatTasks: Array<{
    id: string
    coursewareId: string
    taskName: string
    hidden: boolean
    credits: number
    durationText: string
    coursewareStatus: number
    coursewareType: number
  }>
}

/** 设计器保存请求：同读取结构（不含 join 展示字段）+ publish（true=保存发布，false=暂存关闭） */
export interface CourseDesignerSaveReq {
  publish: boolean
  structureType: number
  unlockMode: number
  unlockUnit: number
  chapters: DesignerChapter[]
  flatTasks: DesignerChapter['tasks']
}

/** 分页查询课程列表（CS-01） */
export function getCourseList(
  params: { page: number; pageSize: number; orderBy?: string; orderType?: string },
  body: CourseListQuery
) {
  return request.post<unknown, CoursePage>('/kng/admin/course/list', body, { params })
}

/** 课程详情（CS-03） */
export function getCourseDetail(id: string) {
  return request.get<unknown, CourseDetail>(`/kng/admin/course/${id}/detail`)
}

/** 创建课程（CS-08）：插入 status=0 未发布记录，返回新课程 id */
export function createCourse(data: CourseCreateReq) {
  return request.post<unknown, { id: string }>('/kng/admin/course', data)
}

/** 保存第一步表单（CS-07，编辑/创建后补全共用） */
export function updateCourseBasic(id: string, data: CourseBasicReq) {
  return request.put<unknown, null>(`/kng/admin/course/${id}/basic`, data)
}

/** 章节学习统计（CS-04）：无章节课程返回单行 chapterId=null 的平铺结构 */
export function getChapterStudyStats(id: string) {
  return request.post<unknown, ChapterStudyStat[]>(`/kng/admin/course/${id}/chapter-study-stats`)
}

/** 课程内课件学习记录（CS-05）：复用课件 study-records 语义，请求路径带 courseId */
export function getCourseCoursewareStudyRecords(
  courseId: string,
  coursewareId: string,
  params: { page: number; pageSize: number },
  body: {
    deptId?: string | null
    hasChild?: number
    studyStatus?: number | null
    finishMethod?: number | null
    keyword?: string
  }
) {
  return request.post<unknown, { total: number; records: CourseStudyRecord[] }>(
    `/kng/admin/course/${courseId}/courseware/${coursewareId}/study-records`,
    body,
    { params }
  )
}

/** 学习数据四件套（CS-06）：路径前缀换 course，形状同课件模块 */
export function getCourseStudyOverview(id: string) {
  return request.get<unknown, { numOf7days: number; numOftotal: number; numOfFinish: number }>(
    `/kng/admin/course/${id}/study-overview`
  )
}

export function getCourseFinishTimeOverview(id: string) {
  return request.get<unknown, {
    numInOneDay: number
    numInOneWeek: number
    numInOneMon: number
    numInThreeMon: number
    numInMoreThrMon: number
  }>(`/kng/admin/course/${id}/finish-time-overview`)
}

export function getCourseDeptFirstLevel() {
  return request.get<unknown, Array<{ id: string; name: string }>>('/kng/admin/course/dept-first-level')
}

export function getCourseDeptFinishOverview(id: string, deptIds: string[]) {
  return request.post<unknown, Array<{
    deptId: string
    deptName: string
    numOfStudyPeo: number
    numOfFinishPeo: number
  }>>(`/kng/admin/course/${id}/dept-finish-overview`, { deptIds })
}

/** 隐藏/取消隐藏课程（CS-09）：hidden 独立于 status 的双标记 */
export function hideCourse(id: string, hidden: boolean) {
  return request.post<unknown, null>(`/kng/admin/course/${id}/hide`, { hidden })
}

/** 下架课程（CS-09）：status 2→3、on_sale=0 */
export function takeDownCourse(id: string) {
  return request.post<unknown, null>(`/kng/admin/course/${id}/take-down`)
}

/** 批量上架（CS-02） */
export function batchPutOnCourses(ids: string[]) {
  return request.post<unknown, null>('/kng/admin/course/batch/put-on', { ids })
}

/** 批量下架（CS-02） */
export function batchTakeDownCourses(ids: string[]) {
  return request.post<unknown, null>('/kng/admin/course/batch/take-down', { ids })
}

/** 批量移动到目标分类（CS-02/09） */
export function moveCourses(ids: string[], targetCatalogId: string) {
  return request.post<unknown, null>('/kng/admin/course/batch/move', { ids, targetCatalogId })
}

/** 复制课程（CS-09）：深拷贝章节任务并重建 ref，副本 status=0、标题加"-副本" */
export function copyCourse(id: string, targetCatalogId: string) {
  return request.post<unknown, { id: string }>(`/kng/admin/course/${id}/copy`, { targetCatalogId })
}

/** 删除课程（CS-09）：引用检查 + 连带清章节/任务/ref 行 */
export function deleteCourse(id: string) {
  return request.delete<unknown, null>(`/kng/admin/course/${id}`)
}

/** 批量删除课程（CS-02） */
export function batchDeleteCourses(ids: string[]) {
  return request.post<unknown, null>('/kng/admin/course/batch/delete', { ids })
}

/**
 * 下载课程（CS-09）：后端恒返回 code=1"课程无源文件"，
 * 拦截器会弹提示并 reject，调用方 catch 后无需额外处理。
 */
export function downloadCourse(id: string) {
  return request.get<unknown, null>(`/kng/admin/course/${id}/download`)
}

/** 课程引用记录（CS-09）：当前恒空（kng_ref ref_type=2 尚无数据） */
export function getCourseReferences(id: string) {
  return request.get<unknown, unknown[]>(`/kng/admin/course/${id}/references`)
}

/** 读取设计器结构（CS-07a）：整体读 */
export function getCourseDesigner(id: string) {
  return request.get<unknown, CourseDesignerDetail>(`/kng/admin/course/${id}/designer`)
}

/** 保存设计器（CS-07a）：整体写；publish=true 且 status=0 → 已发布 */
export function saveCourseDesigner(id: string, data: CourseDesignerSaveReq) {
  return request.put<unknown, null>(`/kng/admin/course/${id}/designer`, data)
}
