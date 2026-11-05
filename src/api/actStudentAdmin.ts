/**
 * 主题学员管理接口（契约 04 §7，API-AD01~AD06）
 * <p>
 * 后端 /api/act/admin/theme/{themeId}/students/**。
 * 铁律：本工程不直读 sys_*，响应里 name 回落 userId、departmentName 为 null——
 * 前端用 SM 的 getEnterpriseUsers 做名字映射（本模块提供 mergeUserNames 辅助）。
 */
import request from './request'
import { getEnterpriseUsers, type EnterpriseUser } from './sm'

export interface StudentSummary {
  assignedCount: number
  publicCount: number
  trainingCount: number
  examCount: number
}

export interface StudentCard {
  userId: string
  name: string
  departmentName: string | null
  source: 'assigned' | 'public'
  status: 'in_progress' | 'idle'
  passedScenarioCount: number
  scenarioCount: number
  trainingCount: number
  examCount: number
  averageScore: number | null
  trainingAverage: number | null
  examAverage: number | null
  extraExamAttemptCount: number
  lastActiveAt: string | null
  summary?: StudentSummary
}

export interface StudentListResp {
  records: StudentCard[]
  total: number
}

export interface StudentRecordItem {
  attemptId: string
  scenarioId: string
  studyMode: number
  practiceType: string
  status: string
  startedAt: string | null
  endedAt: string | null
  endReason: string | null
  totalScore: number | null
  passScore: number | null
  passed: number | null
}

/** AD01 学员列表（汇总 + 分页 + 过滤） */
export function listThemeStudents(
  themeId: string,
  params: {
    page: number
    size: number
    keyword?: string
    /** 姓名/账号/工号经 SM 名册解析后的 userId 集合（本工程不直读 sys_*） */
    userIds?: string[]
    source?: string
    /** 参与状态：active / removed（AD01 不传时默认只取 active） */
    status?: string
    /** 练习状态：in_progress / idle（服务端由活动 attempt 推导） */
    practiceStatus?: string
    studyMode?: number
  },
) {
  return request.get<unknown, StudentListResp>(`/act/admin/theme/${themeId}/students`, {
    params,
  })
}

/** AD02 添加学员（唯一键防重复；已移除用户恢复） */
export function addThemeStudents(
  themeId: string,
  userIds: string[],
  source: 'assigned' | 'public',
) {
  return request.post<unknown, { successCount: number; skippedCount: number }>(
    `/act/admin/theme/${themeId}/students`,
    { userIds, source },
  )
}

/** AD03 调整考核次数（绝对值设置 + 审计；仅影响之后的考核 attempt） */
export function adjustExamQuota(
  themeId: string,
  userId: string,
  extraAttemptCount: number,
  reason: string,
) {
  return request.patch<unknown, void>(`/act/admin/theme/${themeId}/students/${userId}/exam-quota`, {
    extraAttemptCount,
    reason,
  })
}

/** AD04 移出主题（软删除；活动 attempt 时后端拒绝） */
export function removeThemeStudent(themeId: string, userId: string) {
  return request.delete<unknown, void>(`/act/admin/theme/${themeId}/students/${userId}`)
}

/** AD05 学员详情（汇总 + 场景分布 + 最近活跃） */
export function getThemeStudentDetail(themeId: string, userId: string) {
  return request.get<unknown, Record<string, unknown>>(
    `/act/admin/theme/${themeId}/students/${userId}`,
  )
}

/** AD06 学员对练记录（attempt 分页 + 报告摘要） */
export function listStudentRecords(
  themeId: string,
  userId: string,
  params: { studyMode?: number; page: number; size: number },
) {
  return request.get<unknown, { records: StudentRecordItem[]; total: number }>(
    `/act/admin/theme/${themeId}/students/${userId}/records`,
    { params },
  )
}

/**
 * 批量把 userId 映射成姓名/部门（SM 名册；分页拉取上限 500 足够单主题名单）。
 * name 回落 userId 的口径只影响展示，不影响数据。
 * 抛错由调用方决定：列表展示可以静默回落，但"按姓名搜索"必须知道名册不可用。
 */
export async function mergeUserNames(cards: StudentCard[]): Promise<StudentCard[]> {
  const userIds = cards.map((card) => card.userId)
  if (!userIds.length) return cards
  try {
    const page = await getEnterpriseUsers({ page: 1, size: 500 })
    const byId = new Map<string, EnterpriseUser>(
      (page.list ?? []).map((user) => [user.userId, user]),
    )
    return cards.map((card) => ({
      ...card,
      name: byId.get(card.userId)?.name ?? card.userId,
      departmentName: byId.get(card.userId)?.deptName ?? null,
    }))
  } catch {
    // SM 不可达时不阻塞学员管理主列表（name 回落 userId）
    return cards
  }
}

/**
 * 姓名/账号/工号 → userId 集合（AD01 的 userIds 参数）。
 * 为什么在前端解析：ACT 侧铁律不直读 sys_*，姓名与工号只存在于 SM 名册；
 * 名册不可达时返回 null，调用方据此回落到 userId 模糊搜索，而不是静默返回空列表。
 */
export async function resolveUserIds(keyword: string): Promise<string[] | null> {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return null
  try {
    const page = await getEnterpriseUsers({ page: 1, size: 500 })
    return (page.list ?? [])
      .filter(
        (user) =>
          user.name.toLowerCase().includes(needle) ||
          (user.account ?? '').toLowerCase().includes(needle) ||
          (user.employeeNo ?? '').toLowerCase().includes(needle) ||
          user.userId.toLowerCase().includes(needle),
      )
      .map((user) => user.userId)
  } catch {
    return null
  }
}
