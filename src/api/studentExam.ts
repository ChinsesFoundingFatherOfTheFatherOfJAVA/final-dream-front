/**
 * 学员端考试接口（契约 `04-接口文档.md` §11，前缀 /api/exam，经网关转发）。
 *
 * <p>与 `exam.ts`（管理端测练中心）分文件的原因：本模块鉴权口径是"学员只能访问自己
 * 在 exam_arrange_student 中的考试"，与管理端 `exam:manage` 权限点无关；
 * 混在一个文件里会让 `permission` 归属变模糊。
 */
import request from './request'
import type {
  AnswerPaperDetail,
  AnswerSaveItem,
  AttemptPaper,
  AttemptResult,
  AttemptTimeState,
  ExamPreCheck,
  MarkGradeItem,
  MarkListItem,
  MarkPaperDetail,
  MarkQueue,
  MarkUserItem,
  StartExamResult,
  StudentExamEntry,
  StudentExamListResult,
  StudentExamStatus,
  StudentMarkTodoItem,
  SubmitExamResult
} from '@/types/studentExam'

/**
 * §11.2 我的考试列表。
 *
 * <p>左侧统计「待考/进行中/已完成」与卡片分组都由这一份数据在前端派生：
 * 契约只定义了一个列表接口，没有再给统计接口，所以不额外造接口。
 */
export function listMyExams(status?: StudentExamStatus) {
  return request.get<unknown, StudentExamListResult>('/exam/student/exams', {
    params: status ? { status } : undefined
  })
}

/** §11.3 入场信息 */
export function getExamEntry(arrangeId: string) {
  return request.get<unknown, StudentExamEntry>(`/exam/student/exams/${arrangeId}/entry`)
}

/** §11.4 考前校验 */
export function getExamPreCheck(arrangeId: string) {
  return request.get<unknown, ExamPreCheck>(`/exam/student/exams/${arrangeId}/pre-check`)
}

/** §11.4 考前声明（preExamDeclare=1 时才调用） */
export function submitExamDeclare(arrangeId: string, accepted: boolean) {
  return request.post<unknown, null>(`/exam/student/exams/${arrangeId}/declare`, { accepted })
}

/** §11.5 考前/考后签名落库，返回 signId 供 start 绑定 */
export function submitExamSign(arrangeId: string, imageUrl: string, stage: 'pre' | 'post') {
  return request.post<unknown, { signId: string }>(`/exam/student/exams/${arrangeId}/sign`, {
    imageUrl,
    stage
  })
}

/**
 * §11.6 开始考试。
 *
 * <p>已有未交卷答卷时后端**续答**：返回同一 attemptId，不新建、不重复计次。
 * 所以前端重复点击是安全的，不需要自己加去重状态。
 */
export function startExam(
  arrangeId: string,
  payload: { signId?: string; declareAccepted?: boolean } = {}
) {
  return request.post<unknown, StartExamResult>(`/exam/student/exams/${arrangeId}/start`, payload)
}

/** §11B.5 学员端批阅待办：批阅完成后学员能在这里看到结果 */
export function listStudentMarkTodo() {
  return request.get<unknown, { records: StudentMarkTodoItem[]; total: number }>(
    '/exam/mark/student/todo'
  )
}

// ---- 以下由 captain 补齐（2026-11-10），答题页/结果页/批阅页共用 ----

/** §11.7 答题页取卷。**不返回标准答案**，前端也不应尝试推算。 */
export function getAttemptPaper(attemptId: string) {
  return request.get<unknown, AttemptPaper>(`/exam/student/attempts/${attemptId}/paper`)
}

/**
 * §11.8 逐题保存。
 *
 * <p>后端按 `(attempt_id, ques_id)` 唯一键 upsert，重复提交覆盖不叠加，
 * 所以前端可以放心重试；交卷后再调会被拒（40053）。
 */
export function saveAttemptAnswers(attemptId: string, answers: AnswerSaveItem[]) {
  return request.post<unknown, { saved: number }>(
    `/exam/student/attempts/${attemptId}/answers`,
    { answers }
  )
}

/**
 * §11.9 题目标记。
 *
 * <p>独立于答案保存：学员可能只标记不答，所以不并入 saveAttemptAnswers。
 */
export function flagAttemptQuestion(attemptId: string, quesId: string, marked: number) {
  return request.post<unknown, { marked: number }>(
    `/exam/student/attempts/${attemptId}/flag`,
    { quesId, marked }
  )
}

/** §11.10 心跳：校正倒计时、上报切屏、感知强制交卷。前端每 30s 调一次。 */
export function heartbeatAttempt(attemptId: string) {
  return request.put<unknown, AttemptTimeState>(`/exam/student/attempts/${attemptId}/time`)
}

/** §11.10 切屏等异常事件上报 */
export function reportAttemptAntiCheat(
  attemptId: string,
  payload: { eventType: string; occurredAt: string; clientEventId: string }
) {
  return request.post<unknown, null>(
    `/exam/student/attempts/${attemptId}/anti-cheat`,
    payload
  )
}

/**
 * 人脸核验结果落库（契约缺口补充，2026-11-11，DER-07）。
 *
 * <p>`identityStatus`：1 通过 / 2 不通过 / 3 无法核验。
 * 后端**永不据此阻断考试**，所以这里也不需要按结果做什么分支——
 * 调用即完成"留证据"，失败时用 `silent` 吞掉，不要让上报失败干扰学员答题。
 */
export function reportFaceVerify(
  attemptId: string,
  payload: {
    identityStatus: number
    identityEvidence?: string | null
    /** 核验手段（DER-34）：1 仅活体 / 2 活体 + 基准照比对 */
    identityMethod?: number
    /** 比对相似度 0..1，未做比对时不传 */
    identityScore?: number | null
  }
) {
  return request.post<unknown, null>(
    `/exam/student/attempts/${attemptId}/face-verify`,
    payload,
    { silent: true }
  )
}

/**
 * §11.11 交卷。
 *
 * <p>submitType：1 主动 / 2 超时自动 / 3 管理员。已交卷幂等返回。
 * 响应里只有客观题分（DER-03），主观题待批阅。
 */
export function submitAttempt(attemptId: string, usedSeconds: number, submitType = 1) {
  return request.put<unknown, SubmitExamResult>(`/exam/student/attempts/${attemptId}/submit`, {
    usedSeconds,
    submitType
  })
}

/** §11.12 结果页 */
export function getAttemptResult(attemptId: string) {
  return request.get<unknown, AttemptResult>(`/exam/student/attempts/${attemptId}/result`)
}

/**
 * §11.13 答卷详情（学员只读）。
 *
 * <p>`wrongOnly=1` 时后端**只返回有错题的大题**，不是前端高亮，前端不要自己再过滤一遍。
 * 可见性由后端按 answerView 校验，不可见时返回 40055 并带原因。
 */
export function getAttemptPaperDetail(attemptId: string, wrongOnly = 0) {
  return request.get<unknown, AnswerPaperDetail>(
    `/exam/student/attempts/${attemptId}/paper-detail`,
    { params: { wrongOnly: wrongOnly ? 1 : 0 } }
  )
}

// ---- 批阅模块（§11B）----

/** §11B.1 批阅列表（考试维度，含待批阅计数） */
export function listMarkExams(params: {
  keyword?: string
  arrangeType?: number | ''
  startDate?: string
  endDate?: string
  current?: number
  limit?: number
  orderby?: string
  direction?: string
}) {
  return request.get<unknown, { records: MarkListItem[]; total: number }>('/exam/mark/list', {
    params
  })
}

/** §11B.2 批阅页头部（考试基本信息 + 批阅人设置） */
export function getMarkBase(arrangeId: string) {
  return request.get<unknown, Record<string, unknown>>(`/exam/mark/${arrangeId}/base`)
}

/**
 * §11B.2 某考试的答卷列表。
 *
 * <p>**同一学员多次作答逐条返回**，不合并——否则批阅人看不到历史答卷。
 */
export function listMarkUsers(
  arrangeId: string,
  params: { current?: number; limit?: number; markStatus?: number | ''; direction?: string }
) {
  return request.get<unknown, { records: MarkUserItem[]; total: number }>(
    `/exam/mark/${arrangeId}/users`,
    { params }
  )
}

/** §11B.3 批阅答卷详情（不受 answerView 限制，额外带 grades 与身份证据） */
export function getMarkPaper(attemptId: string) {
  return request.get<unknown, MarkPaperDetail>(`/exam/mark/paper/${attemptId}`)
}

/**
 * 批阅队列（2026-11-13）：同场考试待批阅答卷的有序 id 列表 + 当前答卷下标。
 *
 * <p>批阅页左侧「1/N」切换栏用它翻上一份/下一份，对齐原平台的同页连续批阅体验。
 * `currentIndex` 为 -1 表示当前答卷已不在待批阅集合里（例如查看一份已批完的卷），
 * 此时只显示总数、不显示「第几份」。
 */
export function getMarkQueue(attemptId: string) {
  return request.get<unknown, MarkQueue>(`/exam/mark/paper/${attemptId}/queue`)
}

/**
 * §11B.4 提交批阅。
 *
 * <p>`invalid=true` 走答卷作废（status=4），不参与统计；
 * 已批阅答卷可重复提交（重新批阅），后端会重算总分与排名，不会累加。
 */
export function submitMarkPaper(
  attemptId: string,
  payload: { grades: MarkGradeItem[]; overallComment?: string; invalid?: boolean }
) {
  return request.post<unknown, null>(`/exam/mark/paper/${attemptId}`, payload)
}

// ---- 人脸基准照（2026-11-12，DER-33）----

/** 基准照状态。`imageUrl` 也返回，因为前端要显示缩略图让学员确认拍对了 */
export interface FaceBaselineState {
  hasBaseline: boolean
  imageUrl: string | null
}

/**
 * 查是否已录入人脸基准照。
 *
 * <p>用途：进考试列表页时判断要不要提示录入。**提示不强制**——
 * 强制采集人脸在多数场景需单独告知同意，且设备/隐私条件不具备时会把正常学员挡在门外。
 */
export function getFaceBaseline() {
  return request.get<unknown, FaceBaselineState>('/exam/student/face-baseline')
}

/**
 * 录入/重录人脸基准照。
 *
 * <p>`imageUrl` 由 `uploadExamFile()` 上传后得到，本接口只收 URL。
 * **注意传原样 `/api/exam/files/...`**，不要用 `normalizeExamFileUrl` 去掉 `/api`——
 * 那个函数是给 `<img src>` 显示用的，混用会让后续取图 404。
 *
 * <p>能力边界（DEF-01）：基准照由学员自己拍，首次就可能是别人，
 * 只能用于检测「这次与上次不是同一人」，**不是身份认证**。
 */
export function saveFaceBaseline(imageUrl: string) {
  return request.post<unknown, FaceBaselineState>('/exam/student/face-baseline', { imageUrl })
}
