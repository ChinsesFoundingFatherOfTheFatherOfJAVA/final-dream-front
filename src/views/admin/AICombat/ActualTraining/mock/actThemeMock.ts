/**
 * AI实战训练场（管理端）接口 Mock
 * 数据与行为对齐 03-接口文档.md + 05-建表与种子数据.sql（演示主题 seed-theme-001）
 * 后端（AtualCombatTraining 8082）就绪后，在 src/api/actTheme.ts 中将 ACT_USE_MOCK 置为 false 即可切换真实接口。
 */
import type {
  ActPageResult,
  ActScenarioUnit,
  ActThemeCard,
  ActThemeDetail,
  ActThemeListReq,
  ActThemeSettings,
  ActThemeSettingsSaveReq,
  ActThemeStatusResp,
  ActVersionItem
} from '@/types/actTheme'

interface MockVersion {
  versionNo: number
  createdAt: string
  basic: { themeName: string; themeDesc: string | null; ownerUserId: string; planStartTime: string | null; planEndTime: string | null }
  access: { totalDrillCount: number; perSceneLimit: number | null; joinMode: number; guestAccessEnabled: boolean }
  strategy: {
    aiResponseMode: number; trainingModeEnabled: boolean; assessmentModeEnabled: boolean
    coachReviewEnabled: boolean; suggestionEnabled: boolean; practiceMethods: string[]
    difficulty: number; allowCustomDifficulty: boolean
    antiCheat: { faceCheckEnabled: boolean; faceCheckStage: string | null; screenSwitchMode: string; screenSwitchLimit: number }
  }
  passStandard: { scenePassType: number; scenePassCount: number }
  usedUserCount: number; completedCount: number; inProgressCount: number
  creator: string
}

interface MockTheme {
  id: string
  status: number
  currentVersionNo: number
  stats: { passRate: number; passUserCount: number; participantCount: number; avgScore: number; totalTrainingCount: number }
  customerProfileCount: number
  createdAt: string
  updatedAt: string
}

// ---------------- 种子数据（照 05-SQL） ----------------

const THEME_ID = 'seed-theme-001'

const theme: MockTheme = {
  id: THEME_ID,
  status: 3,
  currentVersionNo: 2,
  stats: { passRate: 0, passUserCount: 0, participantCount: 4, avgScore: 10, totalTrainingCount: 1 },
  customerProfileCount: 4,
  createdAt: '2026-05-26 15:32:12',
  updatedAt: '2026-09-16 10:31:34'
}

function seedVersion(no: number): MockVersion {
  return {
    versionNo: no,
    createdAt: no === 1 ? '2026-05-26 15:37:48' : '2026-06-02 07:55:17',
    basic: {
      themeName: '柔性智造销售话术训练',
      themeDesc: '基于六大场景知识库，训练销售精准讲解方案价值并应对客户质疑',
      ownerUserId: 'admin',
      planStartTime: null,
      planEndTime: null
    },
    access: { totalDrillCount: 3708, perSceneLimit: null, joinMode: 1, guestAccessEnabled: false },
    strategy: {
      aiResponseMode: 1,
      trainingModeEnabled: true,
      assessmentModeEnabled: false,
      coachReviewEnabled: true,
      suggestionEnabled: false,
      practiceMethods: ['case', 'custom', 'random'],
      difficulty: 2,
      allowCustomDifficulty: true,
      antiCheat: { faceCheckEnabled: false, faceCheckStage: null, screenSwitchMode: 'forbid', screenSwitchLimit: 0 }
    },
    passStandard: { scenePassType: 1, scenePassCount: 1 },
    usedUserCount: no === 2 ? 1 : 0,
    completedCount: 0,
    inProgressCount: no === 2 ? 1 : 0,
    creator: '管理员'
  }
}

const versions: MockVersion[] = [seedVersion(1), seedVersion(2)]

/** 按 version_no 存储的场景单元（含评估维度），模拟 act_scenario_unit + act_evaluation_dimension */
const unitStore: Record<number, ActScenarioUnit[]> = { 1: [], 2: [] }

function seedUnits(versionNo: number): ActScenarioUnit[] {
  const p = `seed-unit-v${versionNo}`
  return [
    {
      id: `${p}-001`, sortOrder: 1, unitName: '初次拜访：系统定位与六大场景全景介绍', audience: '新入职销售', timeLimitMinutes: 15,
      businessGoal: '在首次客户沟通中清晰传达柔性智造运营管理系统的核心价值与全链路覆盖能力，建立专业可信的第一印象',
      icebergElements: ['系统架构认知', '场景功能区分', '结构化表达', '基础话术运用', '技术型销售顾问', '专业可信', '客户导向', '耐心细致', '积极主动', '建立信任', '传递价值'],
      businessImpact: '客户对系统形成完整认知，愿意安排技术对接',
      failureCost: '客户兴趣流失，后续接触成本大幅上升',
      coreConflict: '客户时间有限，需在短时间内讲清复杂系统的核心价值',
      commonFailureModes: ['遗漏关键场景', '表述混乱导致客户理解困难', '过度技术化引发客户抵触'],
      difficulties: ['如何简化专业内容以适应非技术背景客户', '如何在短时间内突出核心优势'],
      forbiddenBehaviors: ['直接报价', '承诺未核实的技术细节'],
      passScore: 70,
      dimensions: [
        {
          id: `seed-dim-${versionNo}0101`, dimensionName: '系统认知完整性', weight: 25, sortOrder: 1,
          dimensionDesc: '评估学员对柔性智造运营管理系统整体架构与核心定位的理解程度',
          excellentStandard: '优秀（90-100分）：能准确描述系统为全链路数据驱动、端到端快速反应的六大场景解决方案，并完整列举所有场景名称，逻辑清晰无遗漏',
          goodStandard: '良好（70-89分）：能说出系统核心定位和4-5个场景，表述基本正确但略有卡顿',
          improveStandard: '需改进（<70分）：无法说清系统定位，场景遗漏超过2个或存在明显错误'
        },
        {
          id: `seed-dim-${versionNo}0102`, dimensionName: '量化指标准确运用', weight: 20, sortOrder: 2,
          dimensionDesc: '评估学员在陈述中引用关键量化指标的准确性与恰当性',
          excellentStandard: '优秀（90-100分）：指标引用准确且贴合客户关注点，能现场推算效益',
          goodStandard: '良好（70-89分）：指标基本准确，个别数据模糊',
          improveStandard: '需改进（<70分）：指标错误或全程无数据支撑'
        },
        {
          id: `seed-dim-${versionNo}0103`, dimensionName: '场景差异辨析能力', weight: 15, sortOrder: 3,
          dimensionDesc: '评估学员区分六大场景功能边界与适用条件的能力',
          excellentStandard: '优秀（90-100分）：能精准辨析场景差异并举例说明适用场景组合',
          goodStandard: '良好（70-89分）：能区分主要场景，个别混淆',
          improveStandard: '需改进（<70分）：场景概念混用，无法举例'
        },
        {
          id: `seed-dim-${versionNo}0104`, dimensionName: '标准话术规范使用', weight: 25, sortOrder: 4,
          dimensionDesc: '评估学员对标准开场与价值话术的掌握与灵活运用',
          excellentStandard: '优秀（90-100分）：话术自然流畅，能根据客户反应灵活调整',
          goodStandard: '良好（70-89分）：话术完整但略显背诵感',
          improveStandard: '需改进（<70分）：话术遗漏关键环节或明显生硬'
        },
        {
          id: `seed-dim-${versionNo}0105`, dimensionName: '价值整合与升华', weight: 15, sortOrder: 5,
          dimensionDesc: '评估学员将单点价值整合为整体方案的陈述能力',
          excellentStandard: '优秀（90-100分）：能自然收束全场信息并升华到战略价值',
          goodStandard: '良好（70-89分）：有总结但整合度一般',
          improveStandard: '需改进（<70分）：陈述散乱，无整合意识'
        }
      ]
    },
    {
      id: `${p}-002`, sortOrder: 2, unitName: '客户关注产前效益：物料齐套方案深度解析', audience: '新入职销售', timeLimitMinutes: 12,
      businessGoal: '针对客户对产前效益的关注，深度解析物料齐套方案的价值与实施路径',
      icebergElements: ['物料齐套认知', '方案价值表达', '数据化论证', '需求挖掘', '专业可信', '客户导向'],
      businessImpact: '客户认可方案价值，进入方案评估阶段',
      failureCost: '客户转向竞品对比，错失引导机会',
      coreConflict: '客户已有供应商认知，需重塑价值标准',
      commonFailureModes: ['只谈功能不谈效益', '无法回应成本质疑'],
      difficulties: ['如何用 ROI 视角重构对话', '如何应对比价压力'],
      forbiddenBehaviors: ['贬低竞品', '口头承诺交付期'],
      passScore: 70,
      dimensions: [
        { id: `seed-dim-${versionNo}0201`, dimensionName: '方案价值表达', weight: 30, sortOrder: 1, dimensionDesc: '评估学员讲清物料齐套方案价值主线的能力', excellentStandard: '优秀（90-100分）：价值主线清晰，能分层递进展开', goodStandard: '良好（70-89分）：价值点齐全但层次感不足', improveStandard: '需改进（<70分）：价值表达零散' },
        { id: `seed-dim-${versionNo}0202`, dimensionName: '数据化论证', weight: 25, sortOrder: 2, dimensionDesc: '评估学员用数据支撑效益主张的能力', excellentStandard: '优秀（90-100分）：数据选取精准，论证链完整', goodStandard: '良好（70-89分）：有数据但论证不充分', improveStandard: '需改进（<70分）：缺乏数据支撑' },
        { id: `seed-dim-${versionNo}0203`, dimensionName: '需求挖掘', weight: 25, sortOrder: 3, dimensionDesc: '评估学员在解析方案时探询客户真实关注的能力', excellentStandard: '优秀（90-100分）：能敏锐捕捉信号并追问验证', goodStandard: '良好（70-89分）：有探询但深度不足', improveStandard: '需改进（<70分）：单向输出不探询' },
        { id: `seed-dim-${versionNo}0204`, dimensionName: '专业可信度', weight: 20, sortOrder: 4, dimensionDesc: '评估学员整体表达的专业形象与可信度', excellentStandard: '优秀（90-100分）：术语准确，姿态自信可信', goodStandard: '良好（70-89分）：基本专业，偶有迟疑', improveStandard: '需改进（<70分）：表述不专业' }
      ]
    },
    {
      id: `${p}-003`, sortOrder: 3, unitName: '应对技术质疑：智能裁剪与产中齐套对比说明', audience: '新入职销售', timeLimitMinutes: 10,
      businessGoal: '面对技术型质疑，准确说明智能裁剪与产中齐套的技术差异与优势边界',
      icebergElements: ['技术原理认知', '对比表达', '异议处理', '临场应变', '专业可信'],
      businessImpact: '技术疑虑消除，客户信任度提升',
      failureCost: '被客户技术团队否定，项目停滞',
      coreConflict: '客户技术团队掌握话语权，要求严谨论证',
      commonFailureModes: ['回避技术细节', '夸大技术指标'],
      difficulties: ['如何在不确定处诚实表达', '如何引导回到价值主线'],
      forbiddenBehaviors: ['编造参数', '攻击客户现有系统'],
      passScore: 70,
      dimensions: [
        { id: `seed-dim-${versionNo}0301`, dimensionName: '技术原理认知', weight: 30, sortOrder: 1, dimensionDesc: '评估学员对智能裁剪与产中齐套技术原理的掌握', excellentStandard: '优秀（90-100分）：原理阐述准确，边界清晰', goodStandard: '良好（70-89分）：原理基本正确，细节模糊', improveStandard: '需改进（<70分）：原理表述错误' },
        { id: `seed-dim-${versionNo}0302`, dimensionName: '对比表达', weight: 25, sortOrder: 2, dimensionDesc: '评估学员进行优势对比时的表达策略', excellentStandard: '优秀（90-100分）：对比客观有力，突出差异价值', goodStandard: '良好（70-89分）：能对比但重点不突出', improveStandard: '需改进（<70分）：对比混乱或失实' },
        { id: `seed-dim-${versionNo}0303`, dimensionName: '异议处理', weight: 25, sortOrder: 3, dimensionDesc: '评估学员应对技术质疑的心态与策略', excellentStandard: '优秀（90-100分）：沉着应对，层层化解', goodStandard: '良好（70-89分）：能回应但方法单一', improveStandard: '需改进（<70分）：回避或抵触质疑' },
        { id: `seed-dim-${versionNo}0304`, dimensionName: '临场应变', weight: 20, sortOrder: 4, dimensionDesc: '评估学员在压力情境下的临场调整能力', excellentStandard: '优秀（90-100分）：反应迅速，策略灵活', goodStandard: '良好（70-89分）：能调整但速度偏慢', improveStandard: '需改进（<70分）：应变失措' }
      ]
    },
    {
      id: `${p}-004`, sortOrder: 4, unitName: '处理关键异议：分拣准确性与仓储性能验证', audience: '新入职销售', timeLimitMinutes: 13,
      businessGoal: '针对分拣准确性与仓储性能的关键异议，用验证数据与案例化解顾虑',
      icebergElements: ['性能指标认知', '证据呈现', '异议转化', '情绪管理', '客户导向', '耐心细致'],
      businessImpact: '异议转化为深化沟通的切入点',
      failureCost: '异议升级为信任危机',
      coreConflict: '客户要求可验证的数据而现场缺乏完整材料',
      commonFailureModes: ['以偏概全回应异议', '情绪化争辩'],
      difficulties: ['如何现场构建可信论证', '如何承诺合理的验证路径'],
      forbiddenBehaviors: ['承诺无法兑现的指标', '回避验证请求'],
      passScore: 70,
      dimensions: [
        { id: `seed-dim-${versionNo}0401`, dimensionName: '证据呈现', weight: 30, sortOrder: 1, dimensionDesc: '评估学员组织验证数据与案例的说服力', excellentStandard: '优秀（90-100分）：证据链完整，呈现有序有力', goodStandard: '良好（70-89分）：有证据但组织松散', improveStandard: '需改进（<70分）：无有效证据' },
        { id: `seed-dim-${versionNo}0402`, dimensionName: '异议转化', weight: 25, sortOrder: 2, dimensionDesc: '评估学员将异议转化为沟通深化的能力', excellentStandard: '优秀（90-100分）：转化自然，借异议推进关系', goodStandard: '良好（70-89分）：能化解但无转化', improveStandard: '需改进（<70分）：被异议牵制' },
        { id: `seed-dim-${versionNo}0403`, dimensionName: '情绪管理', weight: 25, sortOrder: 3, dimensionDesc: '评估学员面对质疑时的情绪稳定性', excellentStandard: '优秀（90-100分）：全程稳定，压力下依然从容', goodStandard: '良好（70-89分）：基本稳定，偶有波动', improveStandard: '需改进（<70分）：情绪明显失控' },
        { id: `seed-dim-${versionNo}0404`, dimensionName: '验证承诺', weight: 20, sortOrder: 4, dimensionDesc: '评估学员给出的验证路径承诺的合理性与可信度', excellentStandard: '优秀（90-100分）：路径具体可执行，承诺克制', goodStandard: '良好（70-89分）：有承诺但路径模糊', improveStandard: '需改进（<70分）：过度承诺或回避' }
      ]
    },
    {
      id: `${p}-005`, sortOrder: 5, unitName: '综合考核：小单快反与爆品打造优势整合陈述', audience: '新入职销售', timeLimitMinutes: 15,
      businessGoal: '整合小单快反与爆品打造的核心优势，完成面向决策层的综合价值陈述',
      icebergElements: ['价值整合', '结构化表达', '场景功能区分', '基础话术运用', '建立信任', '传递价值'],
      businessImpact: '决策层认可整体价值，推动立项',
      failureCost: '陈述失焦，项目失去高层支持',
      coreConflict: '决策层时间宝贵且关注点宏观，需高度整合表达',
      commonFailureModes: ['信息堆砌无主线', '只讲单点优势'],
      difficulties: ['如何构建决策层视角叙事', '如何平衡宏观与细节'],
      forbiddenBehaviors: ['无结论收尾', '超时陈述'],
      passScore: 70,
      dimensions: [
        { id: `seed-dim-${versionNo}0501`, dimensionName: '价值整合', weight: 30, sortOrder: 1, dimensionDesc: '评估学员整合多模块优势的整体陈述能力', excellentStandard: '优秀（90-100分）：整合主线清晰，层次分明', goodStandard: '良好（70-89分）：有整合但主线不突出', improveStandard: '需改进（<70分）：信息堆砌' },
        { id: `seed-dim-${versionNo}0502`, dimensionName: '结构化表达', weight: 25, sortOrder: 2, dimensionDesc: '评估学员面向决策层的结构化表达水平', excellentStandard: '优秀（90-100分）：结构严谨，节奏得当', goodStandard: '良好（70-89分）：结构完整但节奏一般', improveStandard: '需改进（<70分）：表达无结构' },
        { id: `seed-dim-${versionNo}0503`, dimensionName: '决策层视角', weight: 25, sortOrder: 3, dimensionDesc: '评估学员站在决策层关注点组织内容的能力', excellentStandard: '优秀（90-100分）：全程贴合决策视角，直击关切', goodStandard: '良好（70-89分）：偶有视角偏移', improveStandard: '需改进（<70分）：视角错位' },
        { id: `seed-dim-${versionNo}0504`, dimensionName: '收尾与推进', weight: 20, sortOrder: 4, dimensionDesc: '评估学员陈述收束与下一步推动的能力', excellentStandard: '优秀（90-100分）：收尾有力，明确推动动作', goodStandard: '良好（70-89分）：有收尾但推进乏力', improveStandard: '需改进（<70分）：无收尾或无推进' }
      ]
    }
  ]
}

unitStore[1] = seedUnits(1)
unitStore[2] = seedUnits(2)

// ---------------- Mock 行为（对齐 03 接口文档） ----------------

function currentVersion(): MockVersion {
  return versions.find(v => v.versionNo === theme.currentVersionNo) ?? versions[versions.length - 1] ?? seedVersion(1)
}

function nowStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function err(message: string): never {
  throw new Error(message)
}

export function mockGetThemeList(req: ActThemeListReq): ActPageResult<ActThemeCard> {
  const v = currentVersion()
  let card: ActThemeCard = {
    id: theme.id,
    themeName: v.basic.themeName,
    themeDesc: v.basic.themeDesc,
    status: theme.status,
    themeMode: v.strategy.trainingModeEnabled && v.strategy.assessmentModeEnabled ? 3 : v.strategy.assessmentModeEnabled ? 2 : 1,
    sourceType: 1,
    participantCount: theme.stats.participantCount,
    updatedAt: theme.updatedAt
  }
  if (req.status != null && req.status !== card.status) return { total: 0, records: [] }
  const mode = card.themeMode
  if (req.themeMode != null && req.themeMode !== mode) return { total: 0, records: [] }
  if (req.keyword && !card.themeName.includes(req.keyword.trim())) return { total: 0, records: [] }
  return { total: 1, records: [card] }
}

export function mockGetThemeDetail(id: string): ActThemeDetail {
  if (id !== theme.id) err('主题不存在')
  const v = currentVersion()
  const units = unitStore[theme.currentVersionNo] || []
  return {
    id: theme.id,
    themeName: v.basic.themeName,
    themeDesc: v.basic.themeDesc,
    status: theme.status,
    themeMode: v.strategy.trainingModeEnabled && v.strategy.assessmentModeEnabled ? 3 : v.strategy.assessmentModeEnabled ? 2 : 1,
    assignMode: v.access.joinMode === 2 ? 2 : 1,
    difficulty: v.strategy.difficulty,
    currentVersionNo: String(theme.currentVersionNo),
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
    stats: { ...theme.stats },
    scenarioUnitCount: units.length,
    versionCount: versions.length
  }
}

export function mockPauseTheme(id: string): ActThemeStatusResp {
  if (id !== theme.id) err('主题不存在')
  if (theme.status === 3) theme.status = 4
  else if (theme.status === 4) theme.status = 3
  else err('当前状态不允许暂停或恢复')
  return { id: theme.id, status: theme.status }
}

export function mockFinishTheme(id: string): ActThemeStatusResp {
  if (id !== theme.id) err('主题不存在')
  if (theme.status === 3 || theme.status === 4) theme.status = 5
  else err('主题已结束，无法操作')
  return { id: theme.id, status: theme.status }
}

/**
 * 供发布初始化流程同步主题状态（assistant mock 使用）：
 * 发布受理 → 1 发布中；剧本编译全部完成 → 3 已发布。
 * 与真实后端一致（POST publish 置 1，进度跑完后置 3）。
 */
export function mockSetThemeStatus(status: number): void {
  theme.status = status
}

export function mockGetScenarioUnits(id: string): ActScenarioUnit[] {
  if (id !== theme.id) err('主题不存在')
  return JSON.parse(JSON.stringify(unitStore[theme.currentVersionNo] || []))
}

export function mockGetThemeSettings(id: string): ActThemeSettings {
  if (id !== theme.id) err('主题不存在')
  const v = currentVersion()
  const units = unitStore[theme.currentVersionNo] || []
  const iceberg = new Set<string>()
  const dimNames = new Set<string>()
  units.forEach((u: ActScenarioUnit) => {
    u.icebergElements.forEach(e => iceberg.add(e))
    u.dimensions.forEach(d => dimNames.add(d.dimensionName))
  })
  return {
    versionNo: String(v.versionNo),
    basic: { ...v.basic },
    access: { ...v.access, remainingEnterpriseCapacity: 2 },
    strategy: { ...v.strategy, practiceMethods: [...v.strategy.practiceMethods], antiCheat: { ...v.strategy.antiCheat } },
    passStandard: { ...v.passStandard },
    contentOverview: {
      scenarioUnitCount: units.length,
      customerProfileCount: theme.customerProfileCount,
      icebergElementCount: iceberg.size,
      evaluationDimensionCount: dimNames.size
    }
  }
}

export function mockSaveThemeSettings(id: string, req: ActThemeSettingsSaveReq): { id: string; versionNo: string; themeMode: number; assignMode: number } {
  if (id !== theme.id) err('主题不存在')
  if (theme.status === 5) err('主题已结束，无法保存')
  const s = req
  if (!s.basic.themeName || !s.basic.themeName.trim()) err('主题名称不能为空')
  if (s.basic.themeName.length > 50) err('主题名称不能超过 50 字')
  if (s.basic.themeDesc && s.basic.themeDesc.length > 100) err('主题描述不能超过 100 字')
  if (!s.access.totalDrillCount || s.access.totalDrillCount < 1) err('总演练次数必须大于 0')
  if (s.access.perSceneLimit != null && s.access.perSceneLimit < 1) err('单场景演练次数必须大于 0')
  if (!s.strategy.trainingModeEnabled && !s.strategy.assessmentModeEnabled) err('至少启用一种演练模式')
  if (s.strategy.trainingModeEnabled && !s.strategy.coachReviewEnabled) err('训练模式开启时教练点评必选')
  if (!s.strategy.practiceMethods.length) err('至少保留一种练习方式')
  if (!s.passStandard.scenePassCount || s.passStandard.scenePassCount < 1) err('达标次数至少为 1 次')

  const newNo = Math.max(...versions.map(v => v.versionNo)) + 1
  const cur = currentVersion()
  const nv: MockVersion = {
    versionNo: newNo,
    createdAt: nowStr(),
    basic: {
      themeName: s.basic.themeName.trim(),
      themeDesc: s.basic.themeDesc,
      ownerUserId: cur.basic.ownerUserId,
      planStartTime: s.basic.planStartTime,
      planEndTime: s.basic.planEndTime
    },
    access: { ...s.access },
    strategy: {
      ...s.strategy,
      practiceMethods: [...s.strategy.practiceMethods],
      antiCheat: { ...s.strategy.antiCheat }
    },
    passStandard: { ...s.passStandard },
    usedUserCount: 0, completedCount: 0, inProgressCount: 0,
    creator: '管理员'
  }
  versions.push(nv)
  // 复制当前版本场景单元 + 维度到新版本（内容不变，版本隔离）
  unitStore[newNo] = JSON.parse(JSON.stringify(unitStore[theme.currentVersionNo] || []))
  theme.currentVersionNo = newNo
  theme.updatedAt = nowStr()
  return {
    id: theme.id,
    versionNo: String(newNo),
    themeMode: nv.strategy.trainingModeEnabled && nv.strategy.assessmentModeEnabled ? 3 : nv.strategy.assessmentModeEnabled ? 2 : 1,
    assignMode: nv.access.joinMode === 2 ? 2 : 1
  }
}

export function mockGetThemeVersions(id: string): ActVersionItem[] {
  if (id !== theme.id) err('主题不存在')
  return [...versions]
    .sort((a, b) => b.versionNo - a.versionNo)
    .map(v => ({
      versionNo: String(v.versionNo),
      current: v.versionNo === theme.currentVersionNo,
      createdAt: v.createdAt,
      usedUserCount: v.usedUserCount,
      completedCount: v.completedCount,
      inProgressCount: v.inProgressCount,
      creator: v.creator
    }))
}

export function mockRollbackThemeVersion(id: string, versionNo: string): { id: string; currentVersionNo: string } {
  if (id !== theme.id) err('主题不存在')
  const target = versions.find(v => String(v.versionNo) === versionNo)
  if (!target) err('目标版本不存在')
  if (theme.status === 5) err('主题已结束，无法回滚')
  theme.currentVersionNo = target.versionNo
  theme.updatedAt = nowStr()
  return { id: theme.id, currentVersionNo: String(target.versionNo) }
}
