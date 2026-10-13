import type { AiGenDraft } from '@/api/exam'

/**
 * 快速建题解析器（FP-10）。
 *
 * 标准格式（原平台截图23「标准格式示例」）：
 *   [单选题][难]题干
 *   A. 选项一
 *   B. 选项二
 *   答案: B
 *   解析: 可选
 *
 * 规范：
 *  1) 题型与难度同行且不能为空，形如 [单选题][难]
 *  2) 必须含「答案:」且不能为空（半角/全角冒号都认）
 *  3) 「解析:」非必填
 *  4) 选择题选项之间换行，形如 A. xxx
 *  5) 判断题答案支持 正确/错误 或 对/错
 *  6) 填空题多个答案用「；」分隔
 *
 * 逐题切分、逐题校验：出错的那题只标红并给出原因，不影响其它题出卡。
 */
export interface QuickParseIssue {
  /** 题干所在行号（1 起） */
  line: number
  reason: string
}

export interface QuickParseResult {
  drafts: AiGenDraft[]
  issues: QuickParseIssue[]
}

const TYPE_BY_LABEL: Record<string, number> = {
  单选题: 0, 多选题: 1, 判断题: 2, 填空题: 3, 问答题: 4
}
const LEVEL_BY_LABEL: Record<string, number> = { 易: 0, 中: 1, 难: 2 }

/** 题头：[单选题][中]题干 */
const HEAD_RE = /^\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/
/** 选项行：A. xxx / A、xxx / A．xxx */
const OPTION_RE = /^\s*([A-Za-z])\s*[.、．)）]\s*(.+)$/
/** 答案行 / 解析行（半角或全角冒号） */
const ANSWER_RE = /^\s*答案\s*[:：]\s*(.*)$/
const ANALYSIS_RE = /^\s*解析\s*[:：]\s*(.*)$/

export function parseQuickQues(text: string): QuickParseResult {
  const drafts: AiGenDraft[] = []
  const issues: QuickParseIssue[] = []

  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n')
  let block: { startLine: number; lines: string[] } | null = null

  const flush = () => {
    if (!block) return
    const parsed = parseBlock(block.startLine, block.lines)
    if (parsed.ok) drafts.push(parsed.draft)
    else issues.push({ line: block.startLine, reason: parsed.reason })
    block = null
  }

  lines.forEach((line, index) => {
    if (HEAD_RE.test(line)) {
      flush()
      block = { startLine: index + 1, lines: [line] }
      return
    }
    if (block) {
      block.lines.push(line)
    } else if (line.trim()) {
      // 题头之前出现非空内容：属于残留/格式错误，落一条 issue 而不是静默丢弃
      issues.push({ line: index + 1, reason: '缺少 [题型][难度] 题头' })
    }
  })
  flush()

  return { drafts, issues }
}

function parseBlock(startLine: number, blockLines: string[]): { ok: true; draft: AiGenDraft } | { ok: false; reason: string } {
  const head = HEAD_RE.exec(blockLines[0] || '')
  if (!head) {
    return { ok: false, reason: '缺少 [题型][难度] 题头' }
  }
  const typeLabel = (head[1] ?? '').trim()
  const levelLabel = (head[2] ?? '').trim()
  const stem = (head[3] ?? '').trim()

  const type = TYPE_BY_LABEL[typeLabel]
  if (type === undefined) {
    return { ok: false, reason: `不认识的题型「${typeLabel}」` }
  }
  const levelType = LEVEL_BY_LABEL[levelLabel]
  if (levelType === undefined) {
    return { ok: false, reason: `不认识的难度「${levelLabel}」` }
  }
  if (!stem) {
    return { ok: false, reason: '题干不能为空' }
  }

  const options: string[] = []
  let answer = ''
  let analysis = ''
  let inAnswer = false

  for (let i = 1; i < blockLines.length; i++) {
    const line = blockLines[i] ?? ''
    if (!line.trim()) continue

    const answerMatch = ANSWER_RE.exec(line)
    if (answerMatch) {
      answer = (answerMatch[1] || '').trim()
      inAnswer = true
      continue
    }
    const analysisMatch = ANALYSIS_RE.exec(line)
    if (analysisMatch) {
      analysis = (analysisMatch[1] || '').trim()
      inAnswer = false
      continue
    }
    if (inAnswer) {
      // 答案跨行（问答题参考答案换行）时续接
      answer = `${answer}\n${line.trim()}`.trim()
      continue
    }
    const optionMatch = OPTION_RE.exec(line)
    if (optionMatch) {
      options.push((optionMatch[2] || '').trim())
    }
  }

  if (!answer) {
    return { ok: false, reason: '答案不能为空' }
  }
  if ((type === 0 || type === 1) && options.length < 2) {
    return { ok: false, reason: '选择题至少需要 2 个选项（每行一个，形如 A. xxx）' }
  }

  // 多选答案归一：把 "A C D" / "ACD" / "A、C、D" 统一成 "ACD"
  const normalizedAnswer = type === 1
    ? Array.from(new Set(answer.toUpperCase().replace(/[^A-Z]/g, '').split(''))).sort().join('')
    : type === 2
      ? (answer.includes('对') && !answer.includes('错') ? '正确' : '错误')
      : answer

  return {
    ok: true,
    draft: {
      type,
      levelType,
      stem,
      options: type === 2 ? ['正确', '错误'] : options,
      answer: normalizedAnswer,
      keywords: [],
      analysis
    }
  }
}