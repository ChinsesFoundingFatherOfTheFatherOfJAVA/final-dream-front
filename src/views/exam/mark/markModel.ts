/**
 * 批阅模块的纯逻辑（契约 `01` §M1–§M3、接口 `04` §11B）。
 *
 * <p>抽成纯函数而不是散在页面里，理由同 `resultModel.ts`：这里每条规则都是
 * 「写错了不会有报错，只会静默给人错误结论」的地方——
 * - 组合题**父题不可评**（DER-02）：父题混进 `grades[]` 会被后端当成一道新题写分，
 *   或直接被拒，而批阅人看不出来；
 * - **没动过的题不能进 payload**：带上 `score:null` 会覆盖客观题的系统判分；
 * - 身份核验 2/3 才标警告，0 未核验不标，否则全员带黄标。
 */
import type { GradeDraft, MarkGradeItem, MarkUserItem, PaperCard, PaperSection } from '@/types/studentExam'

/** 组合题的 type 值（契约 01 §S4：0单/1多/2判/3填/4问/5组合） */
const COMBO_TYPE = 5

/** 可评项：题目 + 用于展示的题号 + 满分 */
export interface ScorableItem {
  quesId: string
  /** 展示题号：普通题 `1`，组合题子题 `1-1`（与原平台答题卡一致） */
  no: string
  /** 本题满分，用于校验手填分数与补 correctFlag */
  score: number
  card: PaperCard
}

/**
 * 把 sections 铺平成可评项列表。
 *
 * <p>**组合题父题不产生可评项**：DER-02 定「子题各自一行答案，父题无答案行」，
 * 父题的分数就是子题之和。原平台父题也没有答案行可看，给它打分区等于让人对着
 * 一行没有作答内容的题盲打分。
 */
export function flattenScorableItems(sections: PaperSection[] | null | undefined): ScorableItem[] {
  const out: ScorableItem[] = []
  for (const sec of sections ?? []) {
    sec.cards.forEach((card, index) => {
      const subs = card.subQuestions ?? []
      if (card.type === COMBO_TYPE || subs.length) {
        subs.forEach((sub, subIndex) => {
          out.push({
            quesId: sub.quesId,
            no: `${index + 1}-${subIndex + 1}`,
            score: Number(sub.score) || 0,
            card: sub
          })
        })
        return
      }
      out.push({
        quesId: card.quesId,
        no: String(index + 1),
        score: Number(card.score) || 0,
        card
      })
    })
  }
  return out
}

/**
 * 已批数量。
 *
 * <p>判定口径：**判了对错 或 给了分** 都算已批。
 * 批阅人可能只点「对」不打分（快速批阅路径），那种情况当然算批过了；
 * 只写了评语不算——评语是附加信息，没判对错就没有结论。
 */
export function countGradedItems(
  items: ScorableItem[],
  grades: Record<string, GradeDraft> | null | undefined
): number {
  const map = grades ?? {}
  return items.filter((item) => {
    const g = map[item.quesId]
    if (!g) return false
    return g.correctFlag !== null || g.score !== null
  }).length
}

/**
 * 生成提交用的 `grades[]`。
 *
 * <p>三条硬规则：
 * 1. **只提交动过的题**——没碰的题带 `score:null` 上去会覆盖后端已有的系统判分；
 * 2. 没判对错但给了分时，按「满分为对、否则为错」补 `correctFlag`，
 *    因为接口要求每条 `grades` 都有 `correctFlag`，缺了后端无法定档；
 * 3. 空白评语转 `null`，不提交空串（空串会覆盖后端已有的评语）。
 */
export function buildGradePayload(
  items: ScorableItem[],
  grades: Record<string, GradeDraft> | null | undefined
): MarkGradeItem[] {
  const map = grades ?? {}
  const payload: MarkGradeItem[] = []
  for (const item of items) {
    const g = map[item.quesId]
    if (!g) continue
    if (g.correctFlag === null && g.score === null) continue

    const score = g.score ?? 0
    const correctFlag =
      g.correctFlag ?? (item.score > 0 && score >= item.score ? 1 : 0)

    payload.push({
      quesId: item.quesId,
      correctFlag,
      score,
      maxScore: item.score,
      comment: g.comment && g.comment.trim() ? g.comment : null
    })
  }
  return payload
}

/**
 * 是否需要「身份待核对」标记（DER-07）。
 *
 * <p>只有 **2 不通过 / 3 无法核验** 才算异常。0 未核验不算——
 * 大部分考试根本不开人脸核验，把 0 也标上会让整列常年挂黄标，真异常反而看不见。
 * 认不出的值一律不标，避免脏数据把列表刷成警告墙。
 */
export function needsIdentityCheck(status: number | null | undefined): boolean {
  return status === 2 || status === 3
}

/**
 * 按提交时间倒序。
 *
 * <p>刻度口径同接口默认排序（`orderby=submitTime&direction=DESC`）：
 * 同一学员多次作答时，最近一次应该在最上面。
 * `null` 排最后——没有提交时间的记录不该插在有效数据中间。
 */
export function sortBySubmitTime<T extends { submitAt: string | null }>(rows: T[]): T[] {
  const stamp = (value: string | null): number => {
    if (!value) return Number.NEGATIVE_INFINITY
    // 契约格式 yyyy-MM-dd HH:mm:ss；解析失败也按最旧处理
    const t = new Date(value.replace(' ', 'T')).getTime()
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
  }
  return [...rows].sort((a, b) => stamp(b.submitAt) - stamp(a.submitAt))
}

/** 批阅状态筛选的选项值，页面与单测共用一套口径 */
export const MARK_STATUS_OPTIONS: { value: number | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 0, label: '待批阅' },
  { value: 1, label: '已批阅' }
]

/** 答卷列表一行是否可批阅（待批阅可批，已批阅是「重新批阅」，两者都能进批阅页） */
export function markActionText(row: Pick<MarkUserItem, 'markStatus'>): string {
  return row.markStatus === 1 ? '重新批阅' : '批阅'
}
