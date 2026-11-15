/**
 * 设计器（CS-07a）本地状态模型与工具函数。
 *
 * 状态模型与《02-技术实现方案.md》§4 对齐：
 * { structureType, chapters:[{id,name,description,tasks}], flatTasks, unlockMode, unlockUnit }
 * 任务行在 coursewareId/taskName/hidden 三个落库字段之外，额外持有课件展示快照
 * （credits/durationText/coursewareStatus/coursewareType），列表渲染不回表；
 * 快照来源：GET designer 回显（join 实时值）或选课件抽屉确认时按课件详情补齐。
 */

/** 设计器任务行（本地状态，含展示快照） */
export interface DesignerTask {
  /** 已落库任务 id；本次新增的任务无 id（保存为全删全插，id 可缺省） */
  id?: string
  coursewareId: string
  taskName: string
  hidden: boolean
  /** 课件学分（studyScoreCalc 快照），无则展示 "--" */
  credits: number | null
  /** 课件时长文案（如 "13 分 20 秒" 快照） */
  durationText: string
  /** 课件状态：0 未发布 / 1 发布中 / 2 已发布 / 3 已下架（绿点=2） */
  coursewareStatus: number
  /** 课件类型 1~8（渲染类型图标） */
  coursewareType: number
}

/** 设计器章节（本地状态） */
export interface DesignerChapter {
  id?: string
  name: string
  description: string
  tasks: DesignerTask[]
}

/** 解锁模式：1 自由学习（默认）/ 2 按顺序学习 */
export const UNLOCK_MODE_FREE = 1
export const UNLOCK_MODE_ORDER = 2
/** 解锁单元：1 按内容（默认）/ 2 按章节（仅按顺序学习时生效） */
export const UNLOCK_UNIT_CONTENT = 1
export const UNLOCK_UNIT_CHAPTER = 2

/** 任务/选课上限：选课件抽屉单次 99，任务总数后端校验 999 */
export const PICKER_MAX_SELECTED = 99
export const MAX_TASK_COUNT = 999

/**
 * 由标准时长（分/秒）拼展示文案；与后端 durationText 口径一致（"13 分 20 秒"，0 值段省略）。
 */
export function formatDurationText(minutes: number, seconds: number): string {
  const m = Number(minutes) || 0
  const s = Number(seconds) || 0
  if (!m && !s) return '--'
  const parts: string[] = []
  if (m) parts.push(`${m} 分`)
  if (s) parts.push(`${s} 秒`)
  return parts.join(' ')
}

/** 课件状态点/文案（取课件状态，不做转码媒体态） */
export function coursewareStatusText(status: number): string {
  if (status === 2) return '已发布'
  if (status === 1) return '发布中'
  if (status === 3) return '已下架'
  return '未发布'
}

export interface CoursewareTypeOption {
  type: number
  label: string
  /** 圆角方块配色（t21：token 变量字符串，冷区 Cobalt 层级） */
  color: string
  /** t21：glyph 已废弃（图标走 TaskTypeBar 的 EP 组件映射），保留字段兼容旧引用 */
  glyph: string
  /** true=可点；false=置灰占位（悬浮"功能建设中"） */
  enabled: boolean
}

/**
 * 任务类型图标行数据（需求 §2 枚举）：
 * 做=文档1/视频2/音频3/压缩4/SCORM6/HTML7/外链8 + 本地上传（type=0）；
 * 占位置灰=微课5/练习/考试；不显示=讨论/问卷/签署/作业/实战演练。
 */
export const TASK_TYPE_ITEMS: CoursewareTypeOption[] = [
  // t21：底座色全冷区（与 Home.vue hue 体系同款 Cobalt 层级），glyph 仅为无障碍兜底、图标走 EP 组件
  { type: 1, label: '文档', color: 'var(--color-accent-deep)', glyph: '', enabled: true },
  { type: 2, label: '视频', color: 'var(--color-accent)', glyph: '', enabled: true },
  { type: 3, label: '音频', color: 'var(--color-accent-2)', glyph: '', enabled: true },
  { type: 4, label: '压缩文件', color: 'var(--color-accent-2)', glyph: '', enabled: true },
  { type: 6, label: 'SCORM', color: 'var(--color-accent-deep)', glyph: '', enabled: true },
  { type: 7, label: 'HTML', color: 'var(--color-graphite)', glyph: '', enabled: true },
  { type: 8, label: '外链课', color: 'var(--color-accent)', glyph: '', enabled: true },
  // 本地上传（type=0）：新窗口打开课件发布页，非选课件入口
  { type: 0, label: '本地上传', color: 'var(--color-accent-deep)', glyph: '', enabled: true },
  // 占位：依赖模块未做
  { type: 5, label: '微课', color: 'var(--color-rule-2)', glyph: '', enabled: false },
  { type: -1, label: '练习', color: 'var(--color-rule-2)', glyph: '', enabled: false },
  { type: -2, label: '考试', color: 'var(--color-rule-2)', glyph: '', enabled: false }
]

/** 任务类型 → 中文名（任务表类型列用） */
export function coursewareTypeLabel(type: number): string {
  const found = TASK_TYPE_ITEMS.find(item => item.type === type)
  if (found) return found.label
  if (type === 5) return '微课'
  return '文档'
}

/** 任务行类型图标配色（同图标行） */
export function coursewareTypeColor(type: number): string {
  const found = TASK_TYPE_ITEMS.find(item => item.type === type)
  return found ? found.color : 'var(--color-rule-2)'
}

export interface CatalogFlatNode {
  id: string
  name: string
  /** 层级深度（0 起），用于下拉里的缩进 */
  depth: number
}

/** 分类树节点的最小结构（兼容 api/kng.ts 的 KngTreeNode，避免耦合） */
export interface CatalogNodeLike {
  id: string
  name: string
  children?: CatalogNodeLike[] | null
}

/** 递归展平分类树为带缩进层级的下拉选项（选课件抽屉"分类下拉树"的简化实现） */
export function flattenCatalogTree(nodes: CatalogNodeLike[], depth = 0): CatalogFlatNode[] {
  const result: CatalogFlatNode[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth })
    if (node.children && node.children.length) {
      result.push(...flattenCatalogTree(node.children, depth + 1))
    }
  }
  return result
}
