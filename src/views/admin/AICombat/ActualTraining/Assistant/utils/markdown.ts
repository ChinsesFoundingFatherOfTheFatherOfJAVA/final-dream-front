/**
 * 轻量 markdown 渲染（工程内无 markdown 依赖，按 02-技术实现方案 §6「轻量手写」）
 * 支持：标题 / 粗体 / 斜体 / 行内代码 / 围栏代码块 / 无序列表 / 有序列表 / 表格 / 引用块 / 分割线 / 链接 / 段落
 *
 * 安全：先整体 HTML 转义，再套用白名单标签；不解析原始 HTML，避免 XSS。
 * 样式在 MessageBubble.vue 内以 .md-body 后代选择器手写（scoped 下用 :deep）。
 */

/** 转义 HTML 特殊字符（渲染第一步，保证后续插入的标签均来自本文件） */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 行内标记：行内代码 → 粗体 → 斜体 → 链接 */
function renderInline(text: string): string {
  let out = text
  // 行内代码（内容已在 escapeHtml 阶段转义）
  out = out.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
  // 链接（仅允许 http/https，其余当普通文本，避免 javascript: 之类注入）
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  // 粗体 / 斜体
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return out
}

/** 判断是否为表格分隔行（|---|---|） */
function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)
}

/** 拆分表格行单元格 */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((c) => c.trim())
}

function renderTable(rows: string[][]): string {
  const [head, ...body] = rows
  if (!head) return ''
  const headHtml = head.map((c) => `<th>${renderInline(c)}</th>`).join('')
  const bodyHtml = body
    .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
}

/** 渲染列表块（ul / ol），输入为已去掉标记的行 */
function renderList(items: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul'
  const body = items.map((i) => `<li>${renderInline(i)}</li>`).join('')
  return `<${tag} class="md-list">${body}</${tag}>`
}

/**
 * 渲染 markdown 为 HTML 字符串。
 * 逐行状态机：围栏代码块 / 表格 / 列表 / 引用 / 标题 / 分割线 / 段落。
 */
export function renderMarkdown(source: string): string {
  if (!source) return ''
  const text = escapeHtml(source.replace(/\r\n?/g, '\n'))
  const lines = text.split('\n')
  const out: string[] = []

  let i = 0
  let paragraph: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let quoteLines: string[] = []
  let tableRows: string[][] = []
  let inCode = false
  let codeLines: string[] = []
  let codeLang = ''

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p class="md-p">${renderInline(paragraph.join('<br/>'))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (listItems.length) {
      out.push(renderList(listItems, listOrdered))
      listItems = []
    }
  }
  const flushQuote = () => {
    if (quoteLines.length) {
      out.push(`<blockquote class="md-quote">${quoteLines.map((q) => renderInline(q)).join('<br/>')}</blockquote>`)
      quoteLines = []
    }
  }
  const flushTable = () => {
    if (tableRows.length) {
      out.push(renderTable(tableRows))
      tableRows = []
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushList()
    flushQuote()
    flushTable()
  }

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // 围栏代码块
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/)
    if (fence) {
      if (inCode) {
        out.push(
          `<pre class="md-pre"><code class="md-pre-code" data-lang="${codeLang}">${codeLines.join('\n')}</code></pre>`
        )
        inCode = false
        codeLines = []
        codeLang = ''
      } else {
        flushAll()
        inCode = true
        codeLang = fence[1] ?? ''
      }
      i += 1
      continue
    }
    if (inCode) {
      codeLines.push(line)
      i += 1
      continue
    }

    // 空行：结束当前块
    if (!line.trim()) {
      flushAll()
      i += 1
      continue
    }

    // 表格：当前行含 | 且下一行是分隔行
    const next = lines[i + 1] ?? ''
    if (line.includes('|') && isTableSeparator(next)) {
      flushAll()
      tableRows.push(splitTableRow(line))
      i += 2
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim()) {
        tableRows.push(splitTableRow(lines[i] ?? ''))
        i += 1
      }
      flushTable()
      continue
    }

    // 引用（线上"正在生成…"提示用 > 引用块样式）
    const quote = line.match(/^\s*&gt;\s?(.*)$/)
    if (quote) {
      flushParagraph()
      flushList()
      flushTable()
      quoteLines.push(quote[1] ?? '')
      i += 1
      continue
    }
    flushQuote()

    // 分割线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushAll()
      out.push('<hr class="md-hr"/>')
      i += 1
      continue
    }

    // 标题
    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = (heading[1] ?? '#').length
      out.push(`<h${level} class="md-h md-h${level}">${renderInline(heading[2] ?? '')}</h${level}>`)
      i += 1
      continue
    }

    // 无序列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      flushParagraph()
      flushTable()
      if (listItems.length && listOrdered) flushList()
      listOrdered = false
      listItems.push(ul[1] ?? '')
      i += 1
      continue
    }

    // 有序列表
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ol) {
      flushParagraph()
      flushTable()
      if (listItems.length && !listOrdered) flushList()
      listOrdered = true
      listItems.push(ol[1] ?? '')
      i += 1
      continue
    }
    flushList()

    paragraph.push(line.trim())
    i += 1
  }

  // 收尾：未闭合的代码块也渲染出来
  if (inCode) {
    out.push(`<pre class="md-pre"><code class="md-pre-code">${codeLines.join('\n')}</code></pre>`)
  }
  flushAll()
  return out.join('')
}