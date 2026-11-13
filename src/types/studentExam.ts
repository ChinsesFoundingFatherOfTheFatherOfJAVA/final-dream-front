/**
 * 学员端考试类型契约（对应 `04-接口文档.md` §11 / §11B.5）。
 *
 * <p>类型放这里的理由同 AGENTS §3.3：接口类型集中在 `src/types`，`src/api` 只做请求封装。
 * 字段名一律照抄契约，**不按前端喜好改名**——后端按契约实现，前端擅自美化会让偏差排查变难。
 */

/** 学员视角的考试状态（契约 01 §4E，由后端按 exam_attempt 实时推算） */
export type StudentExamStatus = 'not_started' | 'in_progress' | 'grading' | 'finished' | 'invalid'

/**
 * 列表卡片分组三档（契约 01 §S1）。
 *
 * <p>`failed` 组要容纳「考过但未通过」，包括次数已用完的：那种记录仍要显示，
 * 只是不可再考，前端不能因为它不能考就把它藏起来（学员会以为考试被取消）。
 */
export type ExamCardGroup = 'not_started' | 'failed' | 'passed'

/** §11.2 我的考试列表 单条 */
export interface StudentExamItem {
  arrangeId: string
  name: string
  /** 1=重要考试，卡片显示「重要」标记 */
  important: number
  examType: number
  totalScore: number
  passScore: number
  entryStartAt: string
  entryEndAt: string
  studentStatus: StudentExamStatus
  /** 历史最高分；从未出分时为 null */
  highestScore: number | null
  /** 已用次数 */
  attemptQty: number
  /** 0 表示不限次 */
  attemptLimit: number
  /** 1=已通过 */
  passed: number
  lastSubmitAt: string | null
  /**
   * 最近一次**已交卷**答卷的 id；从未交卷为 null（2026-11-13）。
   *
   * <p>用于「点卡片先进考试结果页」：原平台链路是
   * 卡片 → 结果页 →（再次考试）→ 入场页，结果页需要 attemptId。
   * 为 null 说明没交过卷，此时应进入场页开始/继续考试。
   */
  lastAttemptId?: string | null
  limitMinutes: number | null
}

export interface StudentExamListResult {
  records: StudentExamItem[]
  total: number
}

/** §11.3 上次作答摘要；从未考过时为 null */
export interface StudentExamLastResult {
  attemptId: string
  status: StudentExamStatus
  score: number | null
  passed: number | null
  submitAt: string | null
  answerDetailAvailable: boolean
  answerDetailBlockReason: string | null
}

/** §11.3 入场信息 */
export interface StudentExamEntry {
  arrangeId: string
  name: string
  totalScore: number
  /** 组合题子题计入总数（与原平台「10 题含组合题 5 子题」一致） */
  questionCount: number
  /** null 表示不限时 */
  limitMinutes: number | null
  passScore: number
  /** null 表示未配置优秀分 */
  excellentScore: number | null
  usedTimes: number
  /** 0 表示不限次 */
  attemptLimit: number
  entryStartAt: string
  entryEndAt: string
  fullname: string
  account: string
  /** 1=开启考前签名 */
  signatureConfirm: number
  /** 1=开启考前声明 */
  preExamDeclare: number
  /** 1=开启人脸核验 */
  faceVerify: number
  canStart: boolean
  /** canStart=false 时必填：考试尚未开始 / 考试已结束 / 考试次数已用完 */
  blockReason: string | null
  lastResult: StudentExamLastResult | null
}

/** §11.4 考前校验：前端据此决定弹几个前置步骤，顺序固定 声明 → 签名 → 人脸核验 */
export interface ExamPreCheck {
  needDeclare: number
  needSignature: number
  needFaceVerify: number
  canStart: boolean
  blockReason: string | null
}

/** §11.6 开始考试/续答 响应 */
export interface StartExamResult {
  attemptId: string
  arrangeId: string
  name: string
  totalScore: number
  passScore: number
  limitMinutes: number | null
  /** 服务端当前时间，答题页倒计时的唯一基准 */
  serverNow: string
  usedSeconds: number
  attemptNo: number
}

// ---- 答卷详情 / 批阅详情（§11.13、§11B.3）----
// 这两个接口返回同构结构，故共用一套类型：批阅只是「不受 answerView 限制 + 多 grades」。

/**
 * 题面选项。
 *
 * <p>`correct` / `picked` 由后端按 `answerView.viewAnswer` 决定是否下发——
 * 前端能拿到就显示，拿不到就不显示，**不要在前端自己推算对错**。
 */
export interface PaperOption {
  itemId: string
  content: string
  orderIndex?: number
  /** 1=正确选项；仅 viewAnswer=1 时下发 */
  correct?: number
  /** 1=学员选了该项 */
  picked?: number
}

/** 答卷详情里的一道题（含组合题的子题）。 */
export interface PaperCard {
  quesId: string
  /** 0 单选 / 1 多选 / 2 判断 / 3 填空 / 4 问答 / 5 组合 */
  type: number
  score: number
  /** 本题得分；未判分时为 null */
  earnedScore?: number | null
  /** 1 对 / 0 错 / 2 半对 / 3 待批阅 / null 未判分 */
  correctFlag?: number | null
  content: string
  options?: PaperOption[]
  /** 学员作答：客观题为选项 id 数组，填空/问答为文本数组 */
  userAnswer?: string[]
  /**
   * 答题页返回的「学员已有作答」（契约 §11.7）。
   *
   * <p>与 `userAnswer` 的区别：`userAnswer` 是**答卷详情**里给只读展示的简化数组；
   * `answer` 是**答题页**里带 `attach`/`marked` 的完整草稿。
   * 两个接口形状不同，故并存；答题页优先读 `answer`，缺失时回落 `userAnswer`。
   */
  answer?: AnswerDraft
  /**
   * 填空「空」的个数（后端 `StudentAnswerServiceImpl.blankCountOf` 从题干识别后下发）。
   *
   * <p>填空必须按空渲染 N 个输入框，而不是一个 textarea——判分是按空比对的，
   * 合成一个框就无法表达「答对 2/3 空」。答题态接口**不下发标准答案**，
   * 所以不能用 `answerContent` 推断空数，只能靠这个字段。
   */
  blankCount?: number
  /** 判断题：正确选项文案（后端下发，前端不硬编码「正确/错误」） */
  judgeCorrectOptionContent?: string
  /** 判断题：错误选项文案 */
  judgeWrongOptionContent?: string
  /** 标准答案展示文本；仅 viewAnswer=1 时下发 */
  answerContent?: string | null
  /** 考核点名称列表 */
  points?: string[]
  /** 解析；仅 viewAnalysis=1 时下发 */
  analysis?: string | null
  /** 批阅评语（批阅态/已批阅才有） */
  gradeComment?: string | null
  keywords?: string[]
  subQuestions?: PaperCard[]
}

/** 按大题分节；「只看错题」由后端 `wrongOnly=1` 过滤，前端不重算。 */
export interface PaperSection {
  sectionIndex: number
  sectionName: string
  cards: PaperCard[]
}

/** §11.13 答卷详情（学员只读） */
export interface AnswerPaperDetail {
  attemptId: string
  name: string
  totalScore: number
  score: number | null
  passScore: number
  passed: number | null
  submitAt: string | null
  signatureUrl: string | null
  sections: PaperSection[]
}

/** §11B.3 批阅答卷详情：在只读结构上追加身份证据与已打分结果 */
export interface MarkPaperDetail extends AnswerPaperDetail {
  /** 0 未核验 / 1 通过 / 2 不通过 / 3 无法核验 */
  identityStatus: number
  /** 核验抓拍图；identityStatus 异常时批阅人可查看 */
  identityEvidence: string | null
  /** 核验方式：1 仅活体 / 2 活体+人脸比对；历史数据为 null（台账 8caa） */
  identityMethod?: number
  /** 人脸比对相似度 0..1；仅 identityMethod=2 时有值 */
  identityScore?: number | null
  grades?: MarkGradeItem[]
  // ---- 被批阅的考生信息（2026-11-13 补）----
  // 后端 PaperDetail 一直在下发这几个字段，前端类型没声明，
  // 导致 candidateText / deptName 只能退回登录态——批阅人看到的是自己的名字。
  /** 考生账号 */
  account?: string
  /** 考生姓名 */
  fullname?: string
  /** 考生部门 */
  deptName?: string
  /** 批阅人姓名串（未批阅为 null） */
  graderNames?: string | null
  /** 该答卷的尝试序号（第几次作答） */
  attemptNo?: number
}

/**
 * 批阅队列（2026-11-13）：同场考试待批阅答卷的有序 id + 当前答卷下标。
 *
 * <p>`currentIndex === -1` 表示当前卷已不在待批阅集合里（看的是已批完的卷），
 * 此时只显示总数，不显示「第几份」——否则会把一份已批完的卷错标成「第 1 份」。
 */
export interface MarkQueue {
  /** 待批阅答卷 id，按提交时间升序（先交先批） */
  attemptIds: string[]
  /** 当前答卷在该列表中的下标；不在列表里为 -1 */
  currentIndex: number
  /** 待批阅总数 = attemptIds.length */
  total: number
}

/** 作答草稿：QuestionRenderer 的 modelValue，也用于答题页保存（契约 02 §8B.3） */
export interface AnswerDraft {
  /** 客观题为选项 id 数组；填空按空顺序；问答单元素 */
  answer: string[]
  /** 问答附件 URL */
  attach: string[]
  /** 1=已标记 */
  marked: number
}

/** 批阅时单题的打分草稿 */
export interface GradeDraft {
  correctFlag: number | null
  score: number | null
  comment: string
}

/** §11B.3 / §11B.4 的单题批阅结果 */
export interface MarkGradeItem {
  quesId: string
  correctFlag: number
  score: number
  maxScore: number
  comment?: string | null
}

/** §11B.5 学员端批阅待办 */
export interface StudentMarkTodoItem {
  attemptId: string
  arrangeId: string
  arrangeName: string
  /**
   * 考生姓名与部门。
   *
   * <p>2026-11-12 补：原类型漏了这两个字段，但后端 `§11B.5` 实测确实下发
   * （`GET /api/exam/mark/student/todo` 返回 `fullname/deptName`）。
   * 批阅待办要让批阅人一眼看出「这是谁交的卷」，缺了姓名就没法用。
   */
  fullname?: string | null
  deptName?: string | null
  submitAt: string | null
  score: number | null
  passed: number | null
  /** 0 待批阅 / 1 已批阅（后端下发，前端据此决定按钮文案是「批阅」还是「查看」） */
  markStatus?: number
}

// ---- 以下由 captain 补齐（2026-11-10），供答题页/结果页/批阅列表使用 ----

/** §11.7 答题页取卷响应（字段对齐后端 `StudentAnswerRespDtos.Paper`） */
export interface AttemptPaper {
  attemptId: string
  /**
   * 所属考试 id（2026-11-12 后端补下发）。
   *
   * <p>考后签名接口 `§11.5` 是 `POST /student/exams/{arrangeId}/sign`，
   * 是**考试维度**而不是答卷维度，而答题页只持有 attemptId，故随取卷下发。
   */
  arrangeId?: string
  /**
   * 是否开启考后电子签名（`advancedSettings.postExamSign`，1=开）。
   *
   * <p>2026-11-12 补：答题页交卷成功后需据此弹签名框，而前端拿不到 advancedSettings，
   * 故由后端解析快照后随取卷下发。缺省 0（不弹）。
   */
  postExamSign?: number
  /** 来自 advancedSettings.answerLayout，前端不要自己判断配置 */
  layout: 'single' | 'paged'
  sections: PaperSection[]
  serverNow: string
  /** 限时考试的截止时间；不限时为 null */
  deadlineAt: string | null
  /**
   * 是否已交卷。已交卷进入答题页应直接呈只读态（契约 01 §S5：交卷即终态）。
   * 后端 `Paper` 有此字段。
   */
  submitted?: boolean
  /** 试卷总分（后端权威值，答题页信息区优先用它，缺失时才由题面求和兜底） */
  totalScore?: number
  /**
   * 考试名（契约 01 §S4 顶部固定显示）。
   *
   * <p>后端 `Paper` 自 2026-11-11 起下发（`StudentAnswerServiceImpl.paper()` 从 arrange 现读）。
   * 缺失时前端整行不渲染——留空 `<h1>` 会在页面上留一段莫名空白。
   */
  name?: string
  /**
   * 通过分数（契约 01 §S4 顶部固定显示）。
   *
   * <p>同上由后端下发；真缺失时显示 `--` 而**不是** `--分`（后者会被读成 0 分）。
   */
  passScore?: number
}

/** §11.8 逐题保存请求体里的单条答案 */
export interface AnswerSaveItem {
  quesId: string
  quesType: number
  answer: string[]
  attach: string[]
  marked: number
  lastSubmitTime: number
}

/** §11.10 心跳响应 */
export interface AttemptTimeState {
  serverNow: string
  usedSeconds: number
  /** null 表示不限时 */
  remainingSeconds: number | null
  exitCount: number
  forceSubmit: boolean
}

/** §11.11 交卷响应（批阅未完成时只有客观题分） */
export interface SubmitExamResult {
  attemptId: string
  status: number
  objectiveScore: number
  objectiveFullScore: number
  subjectivePending: number
  submitAt: string
}

/** 考核点得分行（§11.12） */
export interface PointScoreRow {
  pointId: string
  pointName: string
  total: number
  score: number
  rate: number
}

/** 分题型统计行（§11.12） */
export interface TypeStatRow {
  type: number
  typeName: string
  total: number
  correct: number
  rate: number
  rank: number | null
  rankTotal: number | null
}

/** 考试历史一条（§11.12） */
export interface ExamHistoryRow {
  attemptId: string
  score: number | null
  passed: number | null
  submitAt: string | null
}

/** §11.12 结果页 */
export interface AttemptResult {
  arrangeId: string
  attemptId: string
  name: string
  status: number
  /** false 时 score/passed/rankNo 为 null，前端展示「批阅中」 */
  graded: boolean
  passed: number | null
  score: number | null
  totalScore: number
  passScore: number
  /** DER-03：批阅未完成时先给客观题分 */
  objectiveScore: number | null
  objectiveFullScore: number | null
  subjectivePending: number | null
  usedSeconds: number
  rankNo: number | null
  /**
   * 用时排名（2026-11-13 后端新增）：同场已出分考生中按 `usedSeconds` **升序**排，
   * 用时少的靠前，等时并列。
   *
   * <p>为 null 的两种情况：①未出分（`graded=false`）；②本卷用时无效（null/0），
   * 无效用时**不参与排名也不计入分母**——当成 0 秒会直接排第一，把真实第一名挤下去。
   */
  usedTimeRank?: number | null
  /**
   * 参与用时排名的总人数。
   *
   * <p>**可能小于** `typeStats[].rankTotal`：用时无效的答卷被排除在外。
   * 两个分母不同不是算错，展示时不要混用。
   */
  usedTimeRankTotal?: number | null
  submitAt: string | null
  answerDetailAvailable: boolean
  answerDetailBlockReason: string | null
  pointScores: PointScoreRow[]
  typeStats: TypeStatRow[]
  history: ExamHistoryRow[]
  highestScore: number | null
}

/** §11B.1 批阅列表（考试维度） */
export interface MarkListItem {
  arrangeId: string
  name: string
  arrangeType: number
  publishAt: string | null
  participantQty: number
  submittedQty: number
  /** 待批阅答卷数 */
  pendingQty: number
  /**
   * 该考试**第一份待批阅答卷**的 attemptId，没有则为 null（2026-11-13，台账 8db9）。
   *
   * <p>「快速批阅」靠它直接跳到批阅页——原平台就是点完直接进批阅页，
   * 不经答卷列表。为 null 表示该考试暂无待批阅，前端应提示而不是跳转。
   */
  firstPendingAttemptId?: string | null
}

/** §11B.2 批阅答卷列表（学员维度，同一学员多次作答逐条返回） */
export interface MarkUserItem {
  attemptId: string
  account: string
  fullname: string
  deptName: string
  positionName: string
  submitAt: string | null
  usedSeconds: number
  graderNames: string | null
  gradedAt: string | null
  score: number | null
  /** 0 待批阅 / 1 已批阅 */
  markStatus: number
  /** 0 未核验 1 通过 2 不通过 3 无法核验；2/3 时列表显示「身份待核对」 */
  identityStatus: number
}
