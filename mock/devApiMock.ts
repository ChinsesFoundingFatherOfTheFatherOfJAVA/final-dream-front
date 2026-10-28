/**
 * 离线浏览 Mock（Vite dev 中间件，仅 serve 模式生效）。
 *
 * 背景：后端网关/数据库不可用时，需要临时浏览前端各页面（样式走查、布局走查）。
 * 本插件在 Vite dev server 内部拦截 /api 请求直接返回假数据：前端代码与 axios
 * 请求链路（request.ts → /api）零改动，仅服务端应答被替换，不触碰后端与数据库。
 *
 * 用法：VITE_USE_MOCK=1 npm run dev（不设该环境变量时本插件完全不生效）
 * 口径：响应统一 {code:0,message:'ok',data}；SM 模块分页为 {list,total,page,size}，
 * exam/kng/ST/ACT 分页为 {records,total}——与 AGENTS.md §3.6 的历史形状一一对应。
 *
 * 已知限制（离线固有，非缺陷）：
 * - WS（AI助手对话 /api/act/ws）不走 HTTP 中间件，连接后端失败属预期；
 * - 音视频播放、文件上传/下载、AI 生成类接口为占位应答，功能不可用；
 * - 封面/头像静态资源返回占位 SVG。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/** 统一成功信封 */
const ok = (data: unknown) => ({ code: 0, message: 'ok', data })

const wait = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms))

// ==================== 样例数据（仅供渲染走查，不做业务正确性保证） ====================

const smUsers = [
  { userId: '1001', account: 'admin', name: '杰克管理员', mobile: '13800000001', email: 'admin@jack.com', deptId: 'd10', deptName: '教学管理部', deptPath: '杰克集团/教学管理部', status: 1, isSuperAdmin: true, createdAt: '2026-01-05 09:30:00' },
  { userId: '1002', account: 'zhangsan', name: '张三', mobile: '13800000002', email: 'zhangsan@jack.com', deptId: 'd11', deptName: '销售一部', deptPath: '杰克集团/销售一部', status: 1, isSuperAdmin: false, createdAt: '2026-02-11 14:20:00' },
  { userId: '1003', account: 'lisi', name: '李四', mobile: '13800000003', email: 'lisi@jack.com', deptId: 'd11', deptName: '销售一部', deptPath: '杰克集团/销售一部', status: 1, isSuperAdmin: false, createdAt: '2026-03-02 10:00:00' },
  { userId: '1004', account: 'wangwu', name: '王五', mobile: '13800000004', email: 'wangwu@jack.com', deptId: 'd12', deptName: '教研部', deptPath: '杰克集团/教研部', status: 0, isSuperAdmin: false, createdAt: '2026-04-18 16:45:00' },
  { userId: '1005', account: 'zhaoliu', name: '赵六', mobile: '13800000005', email: 'zhaoliu@jack.com', deptId: 'd12', deptName: '教研部', deptPath: '杰克集团/教研部', status: 1, isSuperAdmin: false, createdAt: '2026-05-30 11:10:00' }
]

const smRoles = [
  { roleId: 'r1', roleName: '超级管理员', remark: '拥有全部权限', userCount: 1, createdAt: '2026-01-05 09:31:00' },
  { roleId: 'r2', roleName: '培训管理员', remark: '课程与考试管理', userCount: 3, createdAt: '2026-02-14 10:00:00' },
  { roleId: 'r3', roleName: '质检员', remark: '只读查看报告', userCount: 5, createdAt: '2026-03-20 15:30:00' }
]

const deptTree = [
  {
    deptId: 'd1', deptCode: 'D01', deptName: '杰克集团', deptPath: '杰克集团', children: [
      { deptId: 'd10', deptCode: 'D10', deptName: '教学管理部', deptPath: '杰克集团/教学管理部', children: [] },
      { deptId: 'd11', deptCode: 'D11', deptName: '销售一部', deptPath: '杰克集团/销售一部', children: [] },
      { deptId: 'd12', deptCode: 'D12', deptName: '教研部', deptPath: '杰克集团/教研部', children: [] }
    ]
  }
]

const examTree = [
  {
    id: 'c1', name: '入职测评', parentId: '0', routingPath: '入职测评', disabled: 0, libQty: 3, children: [
      { id: 'c11', name: '2026 春季批', parentId: 'c1', routingPath: '入职测评/2026 春季批', disabled: 0, libQty: 2, children: null },
      { id: 'c12', name: '2026 秋季批', parentId: 'c1', routingPath: '入职测评/2026 秋季批', disabled: 0, libQty: 1, children: null }
    ]
  },
  {
    id: 'c2', name: '岗位认证', parentId: '0', routingPath: '岗位认证', disabled: 0, libQty: 2, children: [
      { id: 'c21', name: '讲师认证', parentId: 'c2', routingPath: '岗位认证/讲师认证', disabled: 0, libQty: 1, children: null },
      { id: 'c22', name: '销售认证', parentId: 'c2', routingPath: '岗位认证/销售认证', disabled: 1, libQty: 1, children: null }
    ]
  }
]

const kngTree = [
  {
    id: 'k1', name: '通识课程', parentId: '0', disabled: 0, children: [
      { id: 'k11', name: '企业文化', parentId: 'k1', disabled: 0, children: null },
      { id: 'k12', name: '规章制度', parentId: 'k1', disabled: 0, children: null }
    ]
  },
  { id: 'k2', name: '业务技能', parentId: '0', disabled: 0, children: null }
]

const examLibs = [
  { id: 'l1', name: '新品话术题库', catalogId: 'c1', catalogName: '入职测评', secrecy: 0, defaultLib: 0, disabled: 0, pointQty: 3, totalQuesQty: 42, createUserId: '1002', createFullname: '张三', createUserName: 'zhangsan', updateFullname: '张三', updateTime: '2026-06-01 10:00:00' },
  { id: 'l2', name: '服务规范题库', catalogId: 'c1', catalogName: '入职测评', secrecy: 0, defaultLib: 0, disabled: 0, pointQty: 2, totalQuesQty: 28, createUserId: '1003', createFullname: '李四', createUserName: 'lisi', updateFullname: '李四', updateTime: '2026-06-12 09:20:00' },
  { id: 'l3', name: '安全知识题库', catalogId: 'c2', catalogName: '岗位认证', secrecy: 1, defaultLib: 0, disabled: 1, pointQty: 4, totalQuesQty: 60, createUserId: '1004', createFullname: '王五', createUserName: 'wangwu', updateFullname: '王五', updateTime: '2026-07-08 14:00:00' }
]

// 考核点（QuesFormPage/AiQuesDrawer 的考点下拉）
const examPoints = [
  { id: 'pt1', name: '产品卖点', defaultPoint: 1 },
  { id: 'pt2', name: '异议处理', defaultPoint: 1 },
  { id: 'pt3', name: '促单技巧', defaultPoint: 0 }
]

// 试题详情（QuesDetail 契约：type 0=单选；选项在 questionItems[{itemContent,answer,orderIndex}]）
const quesDetail = {
  id: 'q1', libId: 'l1', libName: '新品话术题库', parentId: null,
  type: 0, levelType: 1,
  content: '<p>介绍产品核心卖点时，以下哪种开场更有效？</p>',
  summary: '介绍产品核心卖点时，以下哪种开场更有效？',
  disabled: 0, duplicate: 0, stemPlay: null, explainPlay: null,
  explainText: '先讲收益能快速建立价值感。',
  questionItems: [
    { id: 'qi1', itemContent: '直接报价格', answer: 0, orderIndex: 1 },
    { id: 'qi2', itemContent: '先讲客户收益', answer: 1, orderIndex: 2 },
    { id: 'qi3', itemContent: '背诵产品参数', answer: 0, orderIndex: 3 },
    { id: 'qi4', itemContent: '询问预算', answer: 0, orderIndex: 4 }
  ],
  judgeCorrectOptionContent: '', judgeWrongOptionContent: '', judgeAnswer: 0,
  answerContent: '', answerKeywords: [],
  points: [{ pointId: 'pt1' }],
  subQuestions: [],
  mainPointName: '产品卖点', pointNames: '产品卖点',
  createFullname: '张三', createUserName: 'zhangsan', createTime: '2026-06-02 10:00:00'
}

// AI 建题草稿（AiGenDraft 契约：type/levelType/stem/options/answer/keywords/analysis）
const aiDrafts = [
  { type: 1, levelType: 1, stem: '【AI】介绍产品核心卖点时，以下哪种开场最有效？', options: ['直接报价格', '先讲客户收益', '背诵产品参数', '询问预算'], answer: 'B', keywords: [], analysis: '先讲收益能快速建立价值感。' },
  { type: 2, levelType: 2, stem: '【AI】客户提出"太贵了"，请给出标准应对话术。', options: [], answer: '先认同客户感受，再强调产品带来的收益与保障。', keywords: [{ keyword: '认同', scoreRatio: 30 }, { keyword: '价值', scoreRatio: 70 }], analysis: '' },
  { type: 3, levelType: 1, stem: '【AI】请完成一段面向新客户的产品介绍。', options: [], answer: '', keywords: [{ keyword: '核心卖点', scoreRatio: 50 }, { keyword: '使用场景', scoreRatio: 50 }], analysis: '' }
]

// 试卷（PaperItem 契约；pp1 为随机出卷供走通随机流程）
const examPapers = [
  { id: 'pp1', name: '新员工入职试卷（随机）', catalogId: 'c1', catalogName: '入职测评', buildType: 1, status: 0, disabled: 0, secrecy: 0, totalScore: 100, totalQuesQty: 30, usedQty: 0, createUserId: '1002', createFullname: '张三', createUserName: 'zhangsan', updateTime: '2026-08-01 10:00:00', permissions: { canDelete: true, canEdit: true } },
  { id: 'pp2', name: '销售话术认证卷', catalogId: 'c2', catalogName: '岗位认证', buildType: 0, status: 4, disabled: 0, secrecy: 0, totalScore: 150, totalQuesQty: 45, usedQty: 2, createUserId: '1003', createFullname: '李四', createUserName: 'lisi', updateTime: '2026-08-15 11:30:00', permissions: { canDelete: true, canEdit: true } }
]

// 每条来源策略的格子：三档难度（0易/1中/2难）× 五题型（Qty/MaxQty/Score）+ 漏选配置；
// 页面按 (libId, levelType, field) 读写，格子必须三档齐全否则读回默认 0
const makeSettingCount = (base: number) =>
  [0, 1, 2].map(levelType => {
    const cell: Record<string, number> = { levelType, multiMissScore: 0, multiMissScoreType: 0 }
    for (const key of ['single', 'multi', 'judge', 'fill', 'qa']) {
      cell[key + 'Qty'] = base
      cell[key + 'MaxQty'] = base
      cell[key + 'Score'] = key === 'single' ? 5 : 10
    }
    return cell
  })

// 随机出卷抽题策略（StrategyItem 契约）
const paperStrategies = [
  { libId: 'l1', libName: '新品话术题库', indicatorId: null, pointName: null, selectedSourceType: 'lib', selectedSourceTypeValue: 1, selectedPointIds: 'pt1,pt2', catalogName: '入职测评', quesQty: 18, settingCount: makeSettingCount(6) },
  { libId: 'l2', libName: '服务规范题库', indicatorId: null, pointName: null, selectedSourceType: 'lib', selectedSourceTypeValue: 1, selectedPointIds: 'pt1', catalogName: '入职测评', quesQty: 12, settingCount: makeSettingCount(4) }
]

// 策略格子写值持久化（batch-cell 写入 → strategy 读取时合并），key: paperId|libId|levelType|field
const paperCellStore = new Map<string, number>()

// 试卷试题列表（PaperQuesItem 契约）
const paperQuestions = [
  { quesId: 'q1', summary: '介绍产品核心卖点时，以下哪种开场更有效？', type: 0, levelType: 1, score: 5, libId: 'l1', libName: '新品话术题库', mainPointName: '产品卖点', createFullname: '张三', createTime: '2026-06-02 10:00:00' },
  { quesId: 'q2', summary: '客户提出"太贵了"，标准应对话术是什么？', type: 3, levelType: 2, score: 10, libId: 'l1', libName: '新品话术题库', mainPointName: '异议处理', createFullname: '张三', createTime: '2026-06-03 10:00:00' },
  { quesId: 'q3', summary: '服务规范中，接听电话的标准开场白是什么？', type: 0, levelType: 1, score: 5, libId: 'l2', libName: '服务规范题库', mainPointName: '服务礼仪', createFullname: '李四', createTime: '2026-06-12 10:00:00' }
]

const examArranges = [
  { arrangeId: 'ar1', name: '2026 Q4 新员工测评', paperName: '新员工入职试卷', studentQty: 35, startTime: '2026-10-20 09:00:00', endTime: '2026-10-30 18:00:00', status: 1 },
  { arrangeId: 'ar2', name: '销售认证 10 月批', paperName: '销售话术认证卷', studentQty: 18, startTime: '2026-10-01 09:00:00', endTime: '2026-10-15 18:00:00', status: 2 }
]

const kngCourses = [
  { courseId: 'co1', courseName: '新员工入职培训', cover: '', subjectName: '通识课程', chapterQty: 8, studyQty: 120, status: 1, createdAt: '2026-05-01 09:00:00' },
  { courseId: 'co2', courseName: '产品知识进阶', cover: '', subjectName: '业务技能', chapterQty: 12, studyQty: 86, status: 0, createdAt: '2026-06-20 13:00:00' }
]

const kngCoursewares = [
  { coursewareId: 'cw1', name: '入职第一课：企业文化', type: 1, duration: 320, status: 1, createdAt: '2026-05-02 10:00:00' },
  { coursewareId: 'cw2', name: '合规红线解读', type: 2, duration: 540, status: 0, createdAt: '2026-06-11 15:00:00' }
]

const actThemes = [
  { id: 1, themeName: '异议处理实战', status: 1, sceneQty: 6, createdAt: '2026-09-01 10:00:00' },
  { id: 2, themeName: '高压客户应对', status: 0, sceneQty: 4, createdAt: '2026-09-20 14:00:00' }
]

const stProjects = [
  { id: 1, projectId: 1, name: '黄金话术通关', projectType: 1, status: 'ongoing', startDate: '2026-10-01', endDate: '2026-11-30', cover: '' },
  { id: 2, projectId: 2, name: '新人七天训练营', projectType: 2, status: 'not_started', startDate: '2026-11-01', endDate: '2026-12-15', cover: '' }
]

// ==================== 路由表：具体接口优先，未命中走兜底 ====================

type MockHandler = (body: Record<string, unknown>, path: string) => unknown
const routes: Array<[string, RegExp, MockHandler]> = [
  // ---- 认证 ----
  ['POST', /^\/sm\/auth\/login$/, () => ok({
    token: 'mock-token-offline-browsing',
    user: { userId: '1001', account: 'admin', name: '杰克管理员', isSuperAdmin: true, status: 1 },
    permissions: ['*']
  })],
  ['GET', /^\/sm\/auth\/me$/, () => ok({ userId: '1001', fullname: '杰克管理员', permissions: ['*'] })],

  // ---- SM（组织/角色）：SmList{list} / SmPage{list,total,page,size} ----
  ['GET', /^\/sm\/admin\/users$/, () => ok({ list: smUsers, total: smUsers.length, page: 1, size: smUsers.length })],
  ['GET', /^\/sm\/admin\/positions$/, () => ok({ list: [{ id: 'p1', name: '讲师' }, { id: 'p2', name: '销售顾问' }, { id: 'p3', name: '教研' }], total: 3, page: 1, size: 3 })],
  ['GET', /^\/sm\/admin\/roles$/, () => ok({ list: smRoles })],
  ['GET', /^\/sm\/admin\/roles\/[^/]+$/, () => ok({ ...smRoles[1], permissionIds: [], permissions: [] })],
  ['GET', /^\/sm\/admin\/roles\/[^/]+\/users$/, () => ok({ list: smUsers.slice(1, 4), total: 3, page: 1, size: 3 })],
  ['GET', /^\/sm\/admin\/departments\/tree$/, () => ok({ list: deptTree })],

  // ---- 考试域：{records,total} ----
  ['GET', /^\/exam\/catalog\/tree$/, () => ok(examTree)],
  ['GET', /^\/exam\/paper\/catalog\/tree$/, () => ok(examTree)],
  ['GET', /^\/exam\/arrange\/catalog\/tree$/, () => ok(examTree)],
  ['GET', /^\/exam\/arrange\/options\/(departments|users)$/, () => ok([{ id: 'd10', name: '教学管理部' }, { id: 'd11', name: '销售一部' }, { id: 'd12', name: '教研部' }])],
  ['GET', /^\/exam\/lib\/(?!list$)[^/]+$/, () => ok({ ...examLibs[0], catDisabled: 0 })],
  ['GET', /^\/exam\/point\/list$/, () => ok(examPoints)],
  ['POST', /^\/exam\/lib\/list$/, () => ok({ records: examLibs, total: examLibs.length })],
  ['POST', /^\/exam\/ques\/list$/, () => ok({
    records: [
      { id: 'q1', summary: '介绍产品核心卖点时，以下哪种开场更有效？', type: 1, levelType: 1, disabled: 0, duplicate: 0, isMultiMediaType: 0, mainPointName: '产品卖点', pointNames: '产品卖点', createFullname: '张三', createUserName: 'zhangsan', createTime: '2026-06-02 10:00:00', updateFullname: '张三', updateTime: '2026-06-02 10:00:00' },
      { id: 'q2', summary: '客户提出"太贵了"，标准应对话术是什么？', type: 2, levelType: 2, disabled: 0, duplicate: 0, isMultiMediaType: 0, mainPointName: '异议处理', pointNames: '异议处理', createFullname: '张三', createUserName: 'zhangsan', createTime: '2026-06-03 10:00:00', updateFullname: '李四', updateTime: '2026-06-05 10:00:00' }
    ], total: 2
  })],
  ['GET', /^\/exam\/ques\/[^/]+$/, () => ok(quesDetail)],
  ['POST', /^\/exam\/ques$/, () => ok({ id: 'q-' + Date.now() })],
  ['POST', /^\/exam\/ques\/ai-generate$/, () => ok({ questions: aiDrafts })],
  ['POST', /^\/exam\/file\/parse$/, () => ok({ text: '（离线示例材料）产品介绍：我们的产品面向中小销售团队，核心卖点是开箱即用与话术沉淀；典型场景包括新人带教、客户回访与促单收口。' })],
  ['GET', /^\/exam\/paper\/(?!list$)[^/]+$/, (_body, path) => {
    // 按路径 id 取对应试卷（创建后的新卷在列表头部），抽题方式跟随已保存值
    const id = path.split('/')[3]
    const item = examPapers.find(p => p.id === id) ?? examPapers[0]
    return ok({ ...item, quesMode: (item as { quesMode?: number }).quesMode ?? 3 })
  }],
  ['POST', /^\/exam\/paper\/list$/, () => ok({ records: examPapers, total: examPapers.length })],
  ['POST', /^\/exam\/paper$/, (body) => {
    // 新建试卷写入 mock 列表，创建后列表可见、流程可继续
    const item = {
      id: 'pp-' + Date.now(),
      name: (body.name as string) || '未命名试卷',
      catalogId: (body.catalogId as string) || 'c1',
      catalogName: '入职测评',
      buildType: Number(body.buildType ?? 0),
      status: 0,
      disabled: 0,
      secrecy: Number(body.secrecy ?? 0),
      totalScore: 100,
      totalQuesQty: 0,
      usedQty: 0,
      createUserId: '1001',
      createFullname: '杰克管理员',
      createUserName: 'admin',
      updateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      permissions: { canDelete: true, canEdit: true }
    }
    examPapers.unshift(item)
    return ok({ id: item.id })
  }],
  ['GET', /^\/exam\/paper\/[^/]+\/edit$/, () => ok({
    sections: [{
      sectionIndex: 1,
      quesList: [
        { quesId: 'q1', type: 0, content: '<p>介绍产品核心卖点时，以下哪种开场更有效？</p>', summary: '介绍产品核心卖点时，以下哪种开场更有效？', levelType: 0, score: 5, missScore: 0, missScoreType: 0, orderIndex: 1, libId: 'l1', libName: '新品话术题库', questionItems: [
          { itemContent: '直接报价格', answer: 0, orderIndex: 1 },
          { itemContent: '先讲客户收益', answer: 1, orderIndex: 2 },
          { itemContent: '背诵产品参数', answer: 0, orderIndex: 3 },
          { itemContent: '询问预算', answer: 0, orderIndex: 4 }
        ], judgeAnswer: null, judgeCorrectOptionContent: null, judgeWrongOptionContent: null, answerContent: null, points: [{ pointId: 'pt1' }] },
        { quesId: 'q2', type: 2, content: '<p>客户提出"太贵了"属于异议处理场景。</p>', summary: '客户提出"太贵了"属于异议处理场景。', levelType: 1, score: 5, missScore: 0, missScoreType: 0, orderIndex: 2, libId: 'l1', libName: '新品话术题库', questionItems: [], judgeAnswer: 1, judgeCorrectOptionContent: '正确', judgeWrongOptionContent: '错误', answerContent: null, points: [{ pointId: 'pt2' }] },
        { quesId: 'q3', type: 4, content: '<p>请完成一段面向新客户的产品介绍。</p>', summary: '请完成一段面向新客户的产品介绍。', levelType: 2, score: 10, missScore: 0, missScoreType: 0, orderIndex: 3, libId: 'l2', libName: '服务规范题库', questionItems: [], judgeAnswer: null, judgeCorrectOptionContent: null, judgeWrongOptionContent: null, answerContent: '（示例话术）先讲客户收益，再演示核心功能。', points: [] }
      ]
    }],
    editableFields: null
  })],
  ['GET', /^\/exam\/paper\/[^/]+\/stat\/overview$/, () => ok({
    total: 30,
    byType: [{ name: '单选', count: 10 }, { name: '多选', count: 10 }, { name: '判断', count: 10 }],
    byPoint: [{ name: '产品卖点', count: 15 }, { name: '异议处理', count: 15 }],
    byLevel: [{ name: '易', count: 10 }, { name: '中', count: 10 }, { name: '难', count: 10 }]
  })],
  ['GET', /^\/exam\/paper\/[^/]+\/questions$/, () => ok({ records: paperQuestions, total: paperQuestions.length })],
  ['GET', /^\/exam\/paper\/[^/]+\/strategy$/, (_body, path) => {
    const paperId = path.split('/')[3]
    return ok(paperStrategies.map(row => ({
      ...row,
      settingCount: row.settingCount.map(cell => {
        const merged: Record<string, number> = { multiMissScoreType: 0, multiMissScore: 0, ...cell }
        for (const [key, value] of paperCellStore) {
          const [pid, libId, levelType, field] = key.split('|')
          if (pid === paperId && libId === row.libId && Number(levelType) === Number(cell.levelType)) {
            merged[field] = value
          }
        }
        return merged
      })
    })))
  }],
  ['POST', /^\/exam\/paper\/[^/]+\/strategy\/batch-cell$/, (body, path) => {
    const paperId = path.split('/')[3]
    const cells = Array.isArray(body) ? body : []
    for (const c of cells) {
      paperCellStore.set([paperId, c.libId, String(c.levelType), c.field].join('|'), Number(c.value) || 0)
    }
    return ok(null)
  }],
  ['GET', /^\/exam\/paper\/[^/]+\/strategy\/summary$/, () => ok({ quesQty: 30, totalScore: 100 })],
  ['PUT', /^\/exam\/paper\/[^/]+\/ques-mode$/, (body, path) => {
    // 抽题方式持久化到 mock 试卷上，切换后 loadAll 拿回的仍是新值
    const id = path.split('/')[3]
    const item = examPapers.find(p => p.id === id)
    if (item) (item as { quesMode?: number }).quesMode = Number(body.quesMode ?? 0)
    return ok(null)
  }],
  ['GET', /^\/exam\/arrange\/(?!list$)[^/]+$/, () => ok(examArranges[0])],
  ['POST', /^\/exam\/arrange\/list$/, () => ok({ records: examArranges, total: examArranges.length })],

  // ---- 在线课堂：{records,total} ----
  ['GET', /^\/kng\/admin\/catalog\/tree$/, () => ok(kngTree)],
  ['GET', /^\/kng\/admin\/subjects\/dept-tree$/, () => ok(deptTree)],
  ['POST', /^\/kng\/admin\/course\/list$/, () => ok({ records: kngCourses, total: kngCourses.length })],
  ['POST', /^\/kng\/admin\/courseware\/list$/, () => ok({ records: kngCoursewares, total: kngCoursewares.length })],
  ['GET', /^\/kng\/admin\/courseware\/[^/]+\/detail$/, () => ok(kngCoursewares[0])],
  ['GET', /^\/kng\/admin\/setting$/, () => ok({ antiCheat: false, faceCheck: false, playLimit: 0, scoreRule: 'average' })],

  // ---- AI 实战训练 / 话术训练（ST/ACT，id 为 number）：{records,total} ----
  ['GET', /^\/act\/admin\/theme\/list$/, () => ok({ records: actThemes, total: actThemes.length })],
  ['GET', /^\/act\/admin\/theme\/[^/]+$/, () => ok(actThemes[0])],
  ['GET', /^\/act\/admin\/theme\/[^/]+\/(settings|script-progress)$/, () => ok({})],
  ['GET', /^\/act\/admin\/theme\/[^/]+\/(scenario-units|versions)$/, () => ok([])],
  ['GET', /^\/admin\/training-project\/list$/, () => ok({ records: [{ id: 1, name: '异议处理训练', status: 1, studentQty: 20, createdAt: '2026-09-10 09:00:00' }], total: 1 })],
  ['GET', /^\/admin\/speech-template\/list$/, () => ok({ records: [{ id: 1, name: '标准接待模板', nodeQty: 9, updatedAt: '2026-09-12 16:00:00' }], total: 1 })],

  // ---- 学员端 ----
  ['GET', /^\/student\/projects$/, () => ok({ records: stProjects, total: stProjects.length })],
  ['GET', /^\/student\/projects\/[^/]+$/, () => ok({ ...stProjects[0], intro: '本项目用于新人话术上手训练，完成全部关卡即可结业。' })],
  ['GET', /^\/student\/projects\/[^/]+\/records$/, () => ok([{ recordId: 1, score: 86, duration: 320, createdAt: '2026-10-12 20:00:00' }])],
  ['GET', /^\/student\/projects\/[^/]+\/(rank|tops)$/, () => ok([{ userId: '1002', name: '张三', score: 92 }, { userId: '1003', name: '李四', score: 85 }])],

  // ---- 统计类：给最小可渲染数据，图表允许为空 ----
  ['GET', /^\/admin\/projects\/[^/]+\/statistics\/(summary|active)$/, () => ok({})],
  ['GET', /^\/admin\/projects\/[^/]+\/statistics\/(radar|times-averages)$/, () => ok([])]
]

/** 占位封面/头像（SVG），避免离线时图片区域破图 */
const placeholderSvg = (label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#e8eef5"/><text x="50%" y="50%" fill="#8a92a5" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}（离线占位）</text></svg>`

/** 命中 mock 的请求统一在这里应答；具体路由 → tree/options 兜底 → 列表兜底 → 其余 */
async function handleApi(req: IncomingMessage, res: ServerResponse) {
  await wait()
  const method = (req.method || 'GET').toUpperCase()
  const rawUrl = (req.url || '/').split('?')[0]
  const path = decodeURIComponent(rawUrl).replace(/\/+$/, '') || '/'
  // 收集请求体（JSON），供创建类路由使用（如新建试卷写入 mock 列表）
  const body: Record<string, unknown> = await new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })

  // 静态资源占位（封面/头像）
  if (method === 'GET') {
    const m = path.match(/^\/(coverImage|avatar)\//)
    if (m) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
      res.end(placeholderSvg(m[1] === 'avatar' ? '头像' : '封面'))
      return
    }
  }

  for (const [m, re, handler] of routes) {
    if (m === method && re.test(path)) {
      reply(res, (handler as (body: Record<string, unknown>, path: string) => unknown)(body, path))
      return
    }
  }

  // 兜底：树/选项返回空数组；列表返回空分页；其余 GET 返回 null；写操作返回 true
  if (path.endsWith('/tree') || path.includes('/options/')) return reply(res, ok([]))
  if (/\/list$/.test(path)) return reply(res, ok({ records: [], total: 0 }))
  if (method === 'GET') return reply(res, ok(null))
  return reply(res, ok(true))
}

function reply(res: ServerResponse, body: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export function devApiMockPlugin(): Plugin {
  return {
    name: 'dev-api-mock',
    apply: 'serve',
    configureServer(server) {
      // 仅在显式设置 VITE_USE_MOCK=1 时生效，平时对开发/构建零影响
      if (process.env.VITE_USE_MOCK !== '1') return
      server.config.logger.info('\n  [dev-api-mock] 离线 Mock 已启用：/api 请求由本地假数据应答，不经后端\n')
      // 注册在 Vite 内部中间件（含 proxy）之前，/api 请求不会到达代理
      server.middlewares.use('/api', (req, res) => {
        void handleApi(req, res).catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ code: 500, message: String(err), data: null }))
        })
      })
    }
  }
}
