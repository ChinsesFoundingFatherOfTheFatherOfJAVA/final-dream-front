// 定位 SFC 模板里未闭合的标签（2026-11-13）
//
// parse 只给「Element is missing end tag」不说是哪个元素，这里自己逐行扫
// 开闭栈，把「闭合标签对不上栈顶」的那一刻打出来——那通常就是问题所在行。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const f = resolve(process.argv[2])
const src = readFileSync(f, 'utf-8')

// 只取 <template> ... </template> 的第一段（SFC 顶层模板）
const start = src.indexOf('<template>')
const end = src.lastIndexOf('</template>')
const body = src.slice(start + '<template>'.length, end)
const lines = body.split('\n')
const offset = src.slice(0, start).split('\n').length

const VOID = new Set([
  'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
  // Element Plus 常见自闭合用法（写成 <el-option ... /> 时不进栈）
])

const stack = []
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i]
  const lineNo = offset + i
  // 跳过纯注释行
  if (/^\s*<!--/.test(ln) && !/-->/.test(ln)) continue

  const re = /<(\/?)([A-Za-z][\w.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let m
  while ((m = re.exec(ln))) {
    const [, closing, tag, , selfClose] = m
    if (VOID.has(tag.toLowerCase()) || selfClose) continue
    if (closing) {
      if (!stack.length) {
        console.log(`line ${lineNo}: </${tag}> 多余（栈已空）`)
        continue
      }
      const top = stack[stack.length - 1]
      if (top.tag === tag) {
        stack.pop()
      } else {
        console.log(`line ${lineNo}: </${tag}> 与栈顶 <${top.tag}>（line ${top.line}）不匹配`)
        // 尝试向上找同名标签，找到就弹出到那里（容错继续扫）
        let idx = -1
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].tag === tag) { idx = k; break }
        }
        if (idx >= 0) {
          console.log(`   → 推断 <${stack[idx].tag}>（line ${stack[idx].line}）缺少闭合`)
          stack.length = idx
        }
      }
    } else {
      stack.push({ tag, line: lineNo })
    }
  }
}

if (stack.length) {
  console.log('扫描结束仍有未闭合:')
  for (const s of stack) console.log(`   <${s.tag}> 在 line ${s.line}`)
} else {
  console.log('扫描完成：标签平衡')
}
