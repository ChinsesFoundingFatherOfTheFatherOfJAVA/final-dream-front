/**
 * 答题页的纯计算口径（契约 `01` §S4 / `02` §8B.3）。
 *
 * <p>抽成纯函数而不是散在组件里，理由与 `examListModel.ts` 相同：
 * 「哪些题算已做」「翻到第几题」「倒计时剩多久」这三条是**答题页唯一会被悄悄改错**的地方，
 * 混在 300 行 SFC 里既写不了单测，也没法在 Bash 挂掉时验证。
 *
 * <p>尤其「逐题分页」的题号：原平台实测（勘探 §11）**组合题的 5 个子题各占一个题号**，
 * 所以进度与题号都按「扁平化后的题」算，不是按大题算。写成 `flattenQuestions` 一处，
 * 答题卡、进度条、分页指针共用同一份，避免三处各算一遍算出三个答案。
 */
import type {
  AnswerDraft,
  AnswerSaveItem,
  PaperCard,
  PaperSection
} from '@/types/studentExam'

/** 组合题题型值：父题只作分组，真正作答的是子题 */
export const COMBO_TYPE = 5

/** 扁平化后的一道「可作答题」——答题卡题号、分页指针、保存请求都以它为准 */
export interface FlatQuestion {
  quesId: string
  type: number
  score: number
  /** 大题内题号（从 1 起）。原平台每个大题各自从 1 编号，不是全卷连续编号 */
  no: number
  sectionIndex: number
  sectionName: string
  /** 子题所属组合题父题的 quesId；非子题为 null */
  parentQuesId: string | null
  /** 子题需要在页面上带出父题干，否则单题分页时子题没有上下文 */
  parentContent: string | null
  card: PaperCard
}

/** 答题卡一个大题分组 */
export interface SheetSection {
  sectionIndex: number
  sectionName: string
  items: { quesId: string; type: number; no: number }[]
}

const isBlank = (v: string | null | undefined) => (v ?? '').trim() === ''

/**
 * 单题是否算「已做」。
 *
 * <p>不能只看 `answer.length > 0`：填空题按空渲染，学员先填第 3 空时数组是
 * `['', '', 'x']`，长度非 0 但其实只答了一空；问答清空后也可能留 `['']`。
 * 所以按题型判断有效内容，否则答题卡会把「只点了一下输入框」标成已做。
 */
export function isAnswered(draft: AnswerDraft | undefined, type: number): boolean {
  if (!draft) return false
  const answer = draft.answer ?? []
  if (type === 3) return answer.some((v) => !isBlank(v))
  if (type === 4) return !isBlank(answer[0])
  // 0/1/2 客观题存的是选项 id 数组，任何一项非空即已作答
  return answer.some((v) => !isBlank(v))
}

/** 把一节的 cards 摊平成可作答题。组合题子题各自一条，父题自身不参与作答也不占题号。 */
export function flattenSection(sec: PaperSection): FlatQuestion[] {
  const out: FlatQuestion[] = []
  for (const card of sec.cards ?? []) {
    if (card.type === COMBO_TYPE) {
      for (const sub of card.subQuestions ?? []) {
        out.push({
          quesId: sub.quesId,
          type: sub.type,
          score: Number(sub.score) || 0,
          no: out.length + 1,
          sectionIndex: sec.sectionIndex,
          sectionName: sec.sectionName,
          parentQuesId: card.quesId,
          parentContent: card.content,
          card: sub
        })
      }
      continue
    }
    out.push({
      quesId: card.quesId,
      type: card.type,
      score: Number(card.score) || 0,
      no: out.length + 1,
      sectionIndex: sec.sectionIndex,
      sectionName: sec.sectionName,
      parentQuesId: null,
      parentContent: null,
      card
    })
  }
  return out
}

/** 全卷扁平题列表；答题卡与分页指针都是它的投影 */
export function flattenQuestions(sections: PaperSection[] | undefined): FlatQuestion[] {
  return (sections ?? []).flatMap((sec) => flattenSection(sec))
}

/** 答题卡分组：只带题号与题型，已做/标记/当前由组件从本地 answers 派生（契约 02 §8B.3） */
export function buildSheetSections(sections: PaperSection[] | undefined): SheetSection[] {
  return (sections ?? [])
    .map((sec) => {
      const items = flattenSection(sec).map((q) => ({
        quesId: q.quesId,
        type: q.type,
        no: q.no
      }))
      return { sectionIndex: sec.sectionIndex, sectionName: sec.sectionName, items }
    })
    .filter((g) => g.items.length > 0)
}

/** 某一节里第一道扁平题的全局下标——分页模式下「跳到本节第一题」要用 */
export function firstIndexOfSection(flats: FlatQuestion[], sectionIndex: number): number {
  const at = flats.findIndex((q) => q.sectionIndex === sectionIndex)
  return at < 0 ? 0 : at
}

/** 未作答题数，交卷提示「还有 N 道题未做」用（N=0 也要提示一次，契约 01 §S5） */
export function countUnanswered(
  flats: FlatQuestion[],
  answers: Record<string, AnswerDraft>
): number {
  return flats.filter((q) => !isAnswered(answers[q.quesId], q.type)).length
}

/** 已作答题数，答题卡进度「N/总」用 */
export function countAnswered(
  flats: FlatQuestion[],
  answers: Record<string, AnswerDraft>
): number {
  return flats.length - countUnanswered(flats, answers)
}

/**
 * 解析服务端时间字符串。
 *
 * <p>契约里的时间形如 `2026-11-10 13:34:02`（空格分隔），Safari 对空格分隔会 `NaN`，
 * 统一换成 `T` 再交给 `Date.parse`；解析失败返回 null 让调用方退化为「不显示倒计时」，
 * **绝不拿本地时间冒充服务端时间**。
 */
export function parseServerTime(value: string | null | undefined): number | null {
  if (!value) return null
  const iso = value.includes('T') ? value : value.replace(' ', 'T')
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

/**
 * 本地时钟与服务端的偏移（毫秒）：`服务端时间 - 本地时间`。
 *
 * <p>之后所有「现在几点」都用 `Date.now() + offset` 推算，不用 `setInterval` 自减——
 * 自减会在标签页休眠、系统改时、刷新后漂移，而漂移在限时考试里等于判错。
 */
export function resolveServerOffset(serverNow: string | null | undefined, localNowMs: number): number {
  const serverMs = parseServerTime(serverNow)
  return serverMs === null ? 0 : serverMs - localNowMs
}

/** 剩余秒数。`deadlineAtMs` 为 null（不限时）返回 null，与接口 `remainingSeconds=null` 语义一致。 */
export function remainingSeconds(
  deadlineAtMs: number | null,
  nowMs: number
): number | null {
  if (deadlineAtMs === null) return null
  return Math.max(0, Math.floor((deadlineAtMs - nowMs) / 1000))
}

/** 倒计时文案 `HH:MM:SS`；超过 24 小时也不截断（长周期考试少见但不能显示成 00:00:00） */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`
}

/**
 * 分数展示：去掉浮点尾巴（18 而不是 18.000000001），整数不带 `.0`。
 * 后端 `score` 是 `BigDecimal(3.00)`，序列化后可能变成 3 或 3.0，两种都要收敛成同一形态。
 */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  const n = Math.round(Number(value) * 100) / 100
  return String(n)
}

/** 一个大题的总分（原平台节标题「本题共N小题，共M分」里的 M） */
export function sectionScore(cards: PaperCard[] | undefined): string {
  const sum = (cards ?? []).reduce((acc, c) => acc + (Number(c.score) || 0), 0)
  return formatScore(sum)
}

/** 空作答草稿；新建题、后端未下发 answer 时都用它 */
export const emptyDraft = (): AnswerDraft => ({ answer: [], attach: [], marked: 0 })

/**
 * 取卷响应里「一道题的已有作答」。
 *
 * <p>⚠ 两种形态都要认，因为契约与类型文件在这里**不一致**：
 * - `04-接口文档.md` §11.7 把作答放在题卡内联的 `answer` 对象里（`{answer,attach,marked}`）；
 * - `types/studentExam.ts` 的 `PaperCard` 没有 `answer` 字段，只有 `userAnswer: string[]`。
 *
 * <p>后端按契约实现就下发前者，按类型文件实现就下发后者。前端两种都接，
 * 无论后端选哪种都不会出现「刷新后答案丢了」；差异已报 captain 统一，届时删掉多余分支即可。
 */
type CardWithAnswer = PaperCard & {
  answer?: Partial<AnswerDraft>
  marked?: number
}

const draftOfCard = (card: PaperCard): AnswerDraft => {
  const c = card as CardWithAnswer
  const inline = c.answer
  if (inline && (Array.isArray(inline.answer) || Array.isArray(inline.attach))) {
    return {
      answer: Array.isArray(inline.answer) ? [...inline.answer] : [],
      attach: Array.isArray(inline.attach) ? [...inline.attach] : [],
      marked: Number(inline.marked) || 0
    }
  }
  return {
    answer: Array.isArray(c.userAnswer) ? [...c.userAnswer] : [],
    attach: [],
    marked: Number(c.marked) || 0
  }
}

/** 后端未下发 answer 时补一份空草稿，避免模板里到处 `?? emptyDraft()` */
export function normalizeDrafts(sections: PaperSection[] | undefined): Record<string, AnswerDraft> {
  const out: Record<string, AnswerDraft> = {}
  const put = (card: PaperCard) => {
    out[card.quesId] = draftOfCard(card)
  }
  for (const sec of sections ?? []) {
    for (const card of sec.cards ?? []) {
      if (card.type === COMBO_TYPE) {
        // 组合题父题不落答案（勘探 §10.3：子题各自独立提交），只归一子题
        for (const sub of card.subQuestions ?? []) put(sub)
        continue
      }
      put(card)
    }
  }
  return out
}

/** 组装逐题保存请求体（契约 04 §11.8）。`lastSubmitTime` 用本地毫秒，与勘探实测一致。 */
export function buildSaveItem(
  flat: FlatQuestion,
  draft: AnswerDraft,
  nowMs: number
): AnswerSaveItem {
  return {
    quesId: flat.quesId,
    quesType: flat.type,
    answer: draft.answer ?? [],
    attach: draft.attach ?? [],
    marked: Number(draft.marked) || 0,
    lastSubmitTime: nowMs
  }
}
