/**
 * 学员端考试 / 批阅的离线浏览 Mock（仅供 `VITE_USE_MOCK=1` 的 dev 会话）。
 *
 * <p>为什么单独一个文件而不塞进 `devApiMock.ts`：学员端考试这一批接口由多人并行施工
 * （列表/入场、答题、结果/答卷、批阅），各自往同一个 400 行文件里插路由必然冲突；
 * 拆成模块后各自加自己的，`devApiMock.ts` 只保留一行注册。
 *
 * <p>数据口径刻意照抄契约 `04` §11.12 / §11.13 / §11B 的示例响应，
 * 包括「批阅中 `graded=false`」「`wrongOnly=1` 只返回有错题的大题」这两个容易做错的分支，
 * 这样走查时能直接看到批阅中/已出分两种形态。
 */

type MockHandler = (
  body: Record<string, unknown>,
  path: string,
  query?: Record<string, string>
) => unknown

const ok = (data: unknown) => ({ code: 0, message: 'ok', data })

// ==================== 试卷内容（六题型 + 组合题，覆盖全部渲染分支） ====================

/** 一份含单选/多选/判断/填空/问答/组合的答卷，用于结果页与答卷详情走查 */
const paperSections = [
  {
    sectionIndex: 1,
    sectionName: '一、单选题',
    cards: [
      {
        quesId: 'q-single',
        type: 0,
        score: 2,
        earnedScore: 2,
        correctFlag: 1,
        content: 'MES 的三大核心作用不包括以下哪一项？',
        options: [
          { itemId: 'o1', content: '生产计划排程', correct: 0, picked: 1 },
          { itemId: 'o2', content: '数据采集与分析', correct: 1, picked: 0 },
          { itemId: 'o3', content: '设备联网监控', correct: 0, picked: 0 }
        ],
        userAnswer: ['o1'],
        answerContent: 'A',
        points: ['MES的三大核心作用'],
        analysis: '三大核心作用为排程、采集、监控，数据采集属子能力。'
      }
    ]
  },
  {
    sectionIndex: 2,
    sectionName: '二、多选题',
    cards: [
      {
        quesId: 'q-multi',
        type: 1,
        score: 3,
        earnedScore: 0,
        correctFlag: 0,
        content: '默认题干',
        options: [
          { itemId: 'm1', content: '默认选项', correct: 1, picked: 1 },
          { itemId: 'm2', content: '默认选项', correct: 1, picked: 1 },
          { itemId: 'm3', content: '默认选项', correct: 1, picked: 0 },
          { itemId: 'm4', content: '默认选项', correct: 0, picked: 0 }
        ],
        userAnswer: ['m1', 'm2'],
        answerContent: 'A、B、C',
        points: ['默认考点'],
        analysis: '漏选不得分，需全部选对。'
      }
    ]
  },
  {
    sectionIndex: 3,
    sectionName: '三、判断题',
    cards: [
      {
        quesId: 'q-judge',
        type: 2,
        score: 1,
        earnedScore: 1,
        correctFlag: 1,
        content: 'MES 可以脱离 ERP 独立运行。',
        options: [
          { itemId: 'j1', content: '正确', correct: 0, picked: 0 },
          { itemId: 'j2', content: '错误', correct: 1, picked: 1 }
        ],
        userAnswer: ['j2'],
        answerContent: '错误',
        points: ['关于ERP与MES的'],
        analysis: null
      }
    ]
  },
  {
    sectionIndex: 4,
    sectionName: '四、填空题',
    cards: [
      {
        quesId: 'q-fill',
        type: 3,
        score: 2,
        earnedScore: 1,
        correctFlag: 2,
        content: 'MES 的全称是 ____。',
        userAnswer: ['制造执行系统'],
        // 填空题按空数渲染输入框；答案用换行分隔多个空
        answerContent: '制造执行系统',
        points: ['MES的全称是什么'],
        analysis: 'Manufacturing Execution System。'
      }
    ]
  },
  {
    sectionIndex: 5,
    sectionName: '五、问答题',
    cards: [
      {
        quesId: 'q-qa',
        type: 4,
        score: 2,
        earnedScore: null,
        correctFlag: 3,
        content: '默认题干（问答题）',
        userAnswer: ['这是问答测试答案，包含交期与产能两个关键词。'],
        answerContent: '应包含交期与产能两个关键词',
        points: ['默认考点'],
        analysis: '按关键词给分。',
        gradeComment: null,
        keywords: ['交期', '产能']
      }
    ]
  },
  {
    sectionIndex: 6,
    sectionName: '六、组合题',
    cards: [
      {
        quesId: 'q-combo',
        type: 5,
        score: 5,
        earnedScore: null,
        correctFlag: 3,
        content: '组合题父题干（含 3 个子题）',
        points: ['默认考点'],
        answerContent: null,
        analysis: null,
        userAnswer: [],
        subQuestions: [
          {
            quesId: 'q-combo-1',
            type: 0,
            score: 2,
            earnedScore: 2,
            correctFlag: 1,
            content: '子题一：单选',
            options: [
              { itemId: 'c1a', content: '选项 A', correct: 1, picked: 1 },
              { itemId: 'c1b', content: '选项 B', correct: 0, picked: 0 }
            ],
            userAnswer: ['c1a'],
            answerContent: 'A',
            points: ['默认考点'],
            analysis: '子题一解析'
          },
          {
            quesId: 'q-combo-2',
            type: 1,
            score: 2,
            earnedScore: 0,
            correctFlag: 0,
            content: '子题二：多选',
            options: [
              { itemId: 'c2a', content: '选项 A', correct: 1, picked: 1 },
              { itemId: 'c2b', content: '选项 B', correct: 1, picked: 0 }
            ],
            userAnswer: ['c2a'],
            answerContent: 'A、B',
            points: ['默认考点'],
            analysis: null
          },
          {
            quesId: 'q-combo-3',
            type: 3,
            score: 1,
            earnedScore: 0,
            correctFlag: 0,
            content: '子题三：填空 ____',
            userAnswer: ['测试答案'],
            answerContent: '测试答案',
            points: ['默认考点'],
            analysis: null
          }
        ]
      }
    ]
  }
]

/** 只看错题时的返回：只保留有错题的大题（模拟后端 wrongOnly=1 的过滤，前端不得再过滤） */
const wrongOnlySections = paperSections.filter((sec) =>
  sec.cards.some((card) => {
    const sub = (card as { subQuestions?: { correctFlag?: number }[] }).subQuestions ?? []
    // 有错题：父题自身判错，或任一子题判错
    return card.correctFlag === 0 || sub.some((s) => s.correctFlag === 0)
  })
)

const basePaper = {
  attemptId: 'at-demo-1',
  name: '内部测试用考试试卷',
  totalScore: 18,
  score: 4,
  passScore: 10.8,
  passed: 0,
  submitAt: '2026-11-10 12:49:40',
  signatureUrl: null
}

/** 已出分的结果（对应原平台截图「结果页」） */
const gradedResult = {
  arrangeId: 'ar-demo-1',
  attemptId: 'at-demo-1',
  name: '默认考试',
  status: 3,
  graded: true,
  passed: 0,
  score: 4,
  totalScore: 18,
  passScore: 10.8,
  objectiveScore: 4,
  objectiveFullScore: 9,
  subjectivePending: 0,
  usedSeconds: 265,
  rankNo: 1,
  submitAt: '2026-11-10 12:49:40',
  answerDetailAvailable: true,
  answerDetailBlockReason: null,
  pointScores: [
    { pointId: 'p1', pointName: 'MES的三大核心作用', total: 2, score: 2, rate: 1 },
    { pointId: 'p2', pointName: '默认考点', total: 18, score: 4, rate: 0.22 },
    { pointId: 'p3', pointName: 'MES的全称是什么', total: 5, score: 0, rate: 0 },
    { pointId: 'p4', pointName: '关于ERP与MES的', total: 2, score: 0, rate: 0 }
  ],
  typeStats: [
    { type: 0, typeName: '单选题', total: 1, correct: 1, rate: 1, rank: 1, rankTotal: 2 },
    { type: 1, typeName: '多选题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 2 },
    { type: 2, typeName: '判断题', total: 1, correct: 1, rate: 1, rank: 1, rankTotal: 2 },
    { type: 3, typeName: '填空题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 2 },
    { type: 4, typeName: '问答题', total: 1, correct: 0, rate: 0, rank: 1, rankTotal: 2 },
    { type: 5, typeName: '组合题', total: 5, correct: 2, rate: 0.4, rank: 1, rankTotal: 2 }
  ],
  history: [
    { attemptId: 'at-demo-1', score: 4, passed: 0, submitAt: '2026-11-10 13:00:00' },
    { attemptId: 'at-demo-2', score: 4, passed: 0, submitAt: '2026-11-10 12:49:00' },
    { attemptId: 'at-demo-3', score: null, passed: null, submitAt: '2026-11-10 12:34:00' }
  ],
  highestScore: 4
}

/** 批阅中的结果（DER-03：只给客观题分，总分/通过/排名为 null） */
const pendingResult = {
  ...gradedResult,
  attemptId: 'at-demo-3',
  status: 2,
  graded: false,
  passed: null,
  score: null,
  subjectivePending: 9,
  rankNo: null,
  submitAt: '2026-11-10 12:34:00'
}

/**
 * `at-*` 里的序号决定走哪条分支，方便走查：
 * - `at-demo-3`（以及任何 `pending*`） → 批阅中
 * - 其余 → 已出分
 */
const isPending = (attemptId: string) => attemptId.includes('pending') || attemptId === 'at-demo-3'

const users = [
  { attemptId: 'at-demo-1', account: 'admin', fullname: '管理员', deptName: '杰克科技股份', positionName: '--', submitAt: '2026-11-10 13:00:00', usedSeconds: 43, graderNames: null, gradedAt: null, score: 4, markStatus: 1, identityStatus: 1 },
  { attemptId: 'at-demo-2', account: 'admin', fullname: '管理员', deptName: '杰克科技股份', positionName: '--', submitAt: '2026-11-10 12:49:00', usedSeconds: 240, graderNames: '管理员', gradedAt: '2026-11-10 13:05:00', score: 4, markStatus: 1, identityStatus: 2 },
  { attemptId: 'at-demo-3', account: 'admin', fullname: '管理员', deptName: '杰克科技股份', positionName: '--', submitAt: '2026-11-10 12:34:00', usedSeconds: 334, graderNames: null, gradedAt: null, score: null, markStatus: 0, identityStatus: 3 }
]

/** 批阅列表（考试维度） */
const markList = [
  { arrangeId: 'ar-demo-1', name: '默认考试', arrangeType: 1, publishAt: '2026-11-10', participantQty: 1, submittedQty: 1, pendingQty: 1 },
  { arrangeId: 'ar-demo-2', name: '默认考试', arrangeType: 1, publishAt: '2026-11-10', participantQty: 1, submittedQty: 1, pendingQty: 0 },
  { arrangeId: 'ar-demo-3', name: '智慧理论考试（重复/复习）', arrangeType: 1, publishAt: '2026-08-17', participantQty: 39, submittedQty: 32, pendingQty: 1 },
  { arrangeId: 'ar-demo-4', name: '26年任职资格统考试题', arrangeType: 1, publishAt: '2026-07-15', participantQty: 3, submittedQty: 0, pendingQty: 0 },
  { arrangeId: 'ar-demo-5', name: '26年任职资格统考试', arrangeType: 2, publishAt: '2026-07-15', participantQty: 0, submittedQty: 0, pendingQty: 0 }
]

/**
 * 学员端考试 / 批阅路由。
 *
 * <p>路径与 `src/api/studentExam.ts` 一一对应（前缀 `/exam`，由请求 baseURL 提供）。
 */
export const studentExamMockRoutes: Array<[string, RegExp, MockHandler]> = [
  // ---- 学员端考试 ----
  ['GET', /^\/exam\/student\/exams$/, () => ok({
    records: [
      { arrangeId: 'ar-demo-1', name: '默认考试', important: 0, examType: 1, totalScore: 18, passScore: 10.8, entryStartAt: '11-10 00:00', entryEndAt: '2030-11-30 00:00', studentStatus: 'finished', highestScore: 4, attemptQty: 1, attemptLimit: 0, passed: 0, lastSubmitAt: '2026-11-10 13:00:00', limitMinutes: null },
      { arrangeId: 'ar-demo-2', name: '智慧理论考试（预约）', important: 1, examType: 1, totalScore: 100, passScore: 60, entryStartAt: '11-20 09:00', entryEndAt: '11-25 18:00', studentStatus: 'not_started', highestScore: null, attemptQty: 0, attemptLimit: 2, passed: 0, lastSubmitAt: null, limitMinutes: 60 }
    ],
    total: 2
  })],
  ['GET', /^\/exam\/student\/exams\/[^/]+\/entry$/, () => ok({
    arrangeId: 'ar-demo-1',
    name: '默认考试',
    totalScore: 18,
    questionCount: 10,
    limitMinutes: null,
    passScore: 10.8,
    excellentScore: null,
    usedTimes: 1,
    attemptLimit: 0,
    entryStartAt: '11-10 00:00',
    entryEndAt: '2030-11-30 00:00',
    fullname: '管理员',
    account: 'admin',
    signatureConfirm: 0,
    preExamDeclare: 0,
    faceVerify: 0,
    canStart: true,
    blockReason: null,
    lastResult: { attemptId: 'at-demo-1', status: 'finished', score: 4, passed: 0, submitAt: '2026-11-10 13:00:00', answerDetailAvailable: true, answerDetailBlockReason: null }
  })],

  // ---- 结果页 ----
  ['GET', /^\/exam\/student\/attempts\/[^/]+\/result$/, (_body, path) => {
    const attemptId = path.split('/')[4] || 'at-demo-1'
    return ok(isPending(attemptId) ? { ...pendingResult, attemptId } : { ...gradedResult, attemptId })
  }],

  // ---- 答卷详情（wrongOnly=1 由「后端」过滤，这里照契约模拟） ----
  ['GET', /^\/exam\/student\/attempts\/[^/]+\/paper-detail$/, (body, path) => {
    const attemptId = path.split('/')[4] || 'at-demo-1'
    const wrongOnly = String(body.wrongOnly ?? '0') === '1'
    const pending = isPending(attemptId)
    return ok({
      ...basePaper,
      attemptId,
      score: pending ? null : basePaper.score,
      passed: pending ? null : basePaper.passed,
      sections: wrongOnly ? wrongOnlySections : paperSections
    })
  }],

  // ---- 批阅：列表 / 头部 / 答卷列表 / 详情 / 提交 ----
  ['GET', /^\/exam\/mark\/list$/, () => ok({ records: markList, total: markList.length })],
  ['GET', /^\/exam\/mark\/[^/]+\/base$/, () => ok({
    arrangeId: 'ar-demo-1',
    name: '默认考试',
    arrangeType: 1,
    totalScore: 18,
    passScore: 10.8,
    publishAt: '2026-11-10',
    reviewerNames: ['管理员']
  })],
  // markStatus 是 GET query 参数（不是 body），由 devApiMock 的第三个参数传入
  ['GET', /^\/exam\/mark\/[^/]+\/users$/, (_body, _path, query) => {
    const status = query?.markStatus
    const rows = status === undefined || status === ''
      ? users
      : users.filter((u) => u.markStatus === Number(status))
    return ok({ records: rows, total: rows.length })
  }],
  ['GET', /^\/exam\/mark\/paper\/[^/]+$/, (_body, path) => {
    const attemptId = path.split('/')[4] || 'at-demo-1'
    return ok({
      ...basePaper,
      attemptId,
      sections: paperSections,
      identityStatus: 2,
      identityEvidence: null,
      grades: []
    })
  }],
  ['POST', /^\/exam\/mark\/paper\/[^/]+$/, () => ok(null)]
]
