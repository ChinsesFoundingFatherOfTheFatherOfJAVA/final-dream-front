#!/usr/bin/env node
/**
 * 视觉契约审计（零依赖，驱动本机 Chrome/Edge 的 CDP）
 *
 * 解决的问题（两代问题，两个对策）：
 *   一代：改完前端"像不像原平台"只能靠人眼估 → 把原平台 computed style 固化成契约逐项比对。
 *   二代（本版）：数值达标 ≠ 结构相似。原平台左栏是"头像+段位+四宫格"、中栏有"三个快捷入口"，
 *        我们却是简化版；数值契约只量已存在的元素，整块区域缺失时它不会报警。
 *
 * 所以本版把契约拆成两段，期望值一律来自实测，不再手写：
 *   1) visual-capture.mjs  去原平台量 → visual/measured/<page>.json（唯一可信来源）
 *   2) visual-audit.mjs    读 measured + 本文件旁的契约映射 → 量本项目 → 逐项对比
 *
 * 契约文件 visual/contracts/<page>.json 只写「映射」，不写数值：
 *   {
 *     "page": "drillmate-home",
 *     "path": "/sparring/web/drillmate?va=home",   // 本项目路由（带一次性参数强制整页加载）
 *     "viewport": { "width": 1524, "height": 727 },
 *     "reference": "visual/reference/drillmate-home.original.png",
 *     "probes": [
 *       { "id": "content-width", "selector": ".drillmate-home", "required": true },
 *       { "id": "quick-entry", "selector": ".quick-entry", "count": 3, "text": true }
 *     ]
 *   }
 *
 * 每条检查的三种断言：
 *   - 存在性/数量：原平台有该元素（或 count=N），本项目必须也有（否则"结构缺失"，这正是二代的病）
 *   - CSS 数值：measured 里有哪个属性，就比哪个属性（±1px / 颜色 ±2 每通道）
 *   - 文本：text=true 时比对归一化文本（可选，用于确认区块真的渲染了内容）
 *
 * 用法：
 *   node scripts/visual-audit.mjs                 # 审计全部
 *   node scripts/visual-audit.mjs drillmate-home  # 只审一个页面
 *
 * 环境：
 *   VISUAL_BASE_URL      默认 http://localhost:3000
 *   VISUAL_AUDIT_USER    登录账号（页面需要登录态时必填）
 *   VISUAL_AUDIT_PASS    登录密码
 *   VISUAL_CHROME        浏览器可执行文件路径（默认自动探测 Chrome/Edge）
 *   VISUAL_STRICT_TEXT   1 时文本必须逐字一致（默认只要求非空且关键片段包含）
 *
 * 输出：visual/reports/<page>.{json,md,png}，失败退出码 1。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTRACT_DIR = join(ROOT, 'visual', 'contracts')
const MEASURED_DIR = join(ROOT, 'visual', 'measured')
const REPORT_DIR = join(ROOT, 'visual', 'reports')
const BASE_URL = process.env.VISUAL_BASE_URL || 'http://localhost:3000'
const USER = process.env.VISUAL_AUDIT_USER || ''
const PASS = process.env.VISUAL_AUDIT_PASS || ''
const STRICT_TEXT = process.env.VISUAL_STRICT_TEXT === '1'
const PORT = Number(process.env.VISUAL_CDP_PORT || 9333)
const PROFILES = join(ROOT, 'visual', process.env.VISUAL_PROFILE_DIR || '.chrome-profile')

const CANDIDATES = [
  process.env.VISUAL_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function pickChrome() {
  for (const c of CANDIDATES) if (existsSync(c)) return c
  throw new Error('未找到 Chrome/Edge，可用 VISUAL_CHROME 指定')
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg)
        this.pending.delete(msg.id)
      }
    }
  }
  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.id
      const timer = setTimeout(() => {
        this.pending.delete(id)
        rej(new Error(`CDP 超时：${method}`))
      }, 30_000)
      this.pending.set(id, (m) => {
        clearTimeout(timer)
        if (m.error) rej(new Error(`${method}: ${m.error.message}`))
        else res(m.result)
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) {
      throw new Error(`页面内执行失败：${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`)
    }
    return r.result?.value
  }
}

/** 页面内量取：与 visual-capture.mjs 的 CAPTURE_FN 保持同一套属性口径 */
const MEASURE_FN = `(() => {
  const px = (v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const toHex = (v) => {
    const m = String(v).match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(',').map((x) => parseFloat(x.trim()))
    if (p.length < 3) return null
    if (p.length >= 4 && p[3] === 0) return null
    return '#' + [p[0], p[1], p[2]].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
  }
  const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim()
  const out = {}
  for (const probe of window.__VA_SPEC__) {
    const els = Array.from(document.querySelectorAll(probe.selector))
    if (!els.length) { out[probe.id] = { exists: false, count: 0 }; continue }
    const el = els[0]
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const v = { exists: true, count: els.length }
    const props = probe.props || []
    for (const key of props) {
      if (key === 'width') v.width = Math.round(r.width)
      else if (key === 'height') v.height = Math.round(r.height)
      else if (key === 'x') v.x = Math.round(r.x)
      else if (key === 'y') v.y = Math.round(r.y)
      else if (key === 'gap') v.gap = s.gap === 'normal' ? 0 : px(s.gap.replace(/\\s.*$/, ''))
      else if (key === 'radius') v.radius = px(s.borderTopLeftRadius)
      else if (key === 'padding') v.padding = px(s.paddingTop)
      else if (key === 'paddingX') v.paddingX = px(s.paddingLeft)
      else if (key === 'paddingY') v.paddingY = px(s.paddingTop)
      else if (key === 'fontSize') v.fontSize = px(s.fontSize)
      else if (key === 'fontWeight') v.fontWeight = Number(s.fontWeight)
      else if (key === 'lineHeight') v.lineHeight = px(s.lineHeight)
      else if (key === 'color') v.color = toHex(s.color)
      else if (key === 'background') v.background = toHex(s.backgroundColor)
      else if (key === 'borderColor') v.borderColor = toHex(s.borderTopColor)
      else if (key === 'paddingBottom') v.paddingBottom = px(s.paddingBottom)
      else if (key === 'marginTop') v.marginTop = px(s.marginTop)
      else if (key === 'borderBottomColor') v.borderBottomColor = toHex(s.borderBottomColor)
      else if (key === 'borderBottomWidth') v.borderBottomWidth = px(s.borderBottomWidth)
      else if (key === 'display') v.display = s.display
    }
    if (probe.text) v.text = norm(el.innerText).slice(0, 200)
    out[probe.id] = v
  }
  return out
})()`

/** 数值 ±1px、颜色逐通道 ±2；缺一不可 */
function closeTo(actual, expected) {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(actual - expected) <= 1
  }
  if (typeof expected === 'string' && typeof actual === 'string') {
    if (/^#[0-9a-f]{6}$/i.test(expected) && /^#[0-9a-f]{6}$/i.test(actual)) {
      const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
      const [a, b] = [p(expected), p(actual)]
      return a.every((n, i) => Math.abs(n - b[i]) <= 2)
    }
    return actual === expected
  }
  return false
}

/** 文本比对：默认放宽（非空 + 期望的关键词按序出现），严格模式逐字一致 */
function textOk(actual, expected) {
  if (STRICT_TEXT) return actual === expected
  if (!actual) return false
  const tokens = String(expected).split(/\s+/).filter(Boolean)
  let pos = 0
  for (const t of tokens) {
    const idx = actual.indexOf(t, pos)
    if (idx < 0) return false
    pos = idx + t.length
  }
  return true
}

async function launch() {
  const chrome = pickChrome()
  mkdirSync(PROFILES, { recursive: true })
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${PROFILES}`,
    ],
    { stdio: 'ignore' }
  )
  for (let i = 0; i < 40; i++) {
    await wait(250)
    try {
      const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
      if (tab?.webSocketDebuggerUrl) return { proc, wsUrl: tab.webSocketDebuggerUrl }
    } catch {
      /* 浏览器还没起来 */
    }
  }
  proc.kill()
  throw new Error('Chrome 调试端口未就绪')
}

async function login(cdp) {
  if (!USER || !PASS) {
    throw new Error('需要登录态：设置 VISUAL_AUDIT_USER / VISUAL_AUDIT_PASS')
  }
  // 全新 profile 首启时，登录页可能还在冷启动渲染，此时注入的 localStorage 会被随后的
  // 路由守卫/整页加载覆盖，表现为"跑第一次全红、第二次正常"。先等前端真正挂载再注入。
  for (let i = 0; i < 40; i++) {
    const ready = await cdp.eval(`document.readyState === 'complete' && !!document.querySelector('#app')`)
    if (ready) break
    await wait(500)
  }
  // 走接口拿 token，再写 localStorage（与前端 auth store 同键名）
  const token = await cdp.eval(`(async () => {
    const r = await fetch('${BASE_URL}/api/sm/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: ${JSON.stringify(USER)}, password: ${JSON.stringify(PASS)} })
    })
    const b = await r.json()
    if (b.code !== 0) throw new Error('登录失败：' + b.message)
    const t = b.data.token
    localStorage.setItem('final_dream.auth', JSON.stringify({ token: t, user: b.data.user ?? null }))
    return t
  })()`)
  if (!token) throw new Error('登录未拿到 token')
  // 写入后回读确认：注入失败时立刻报错，而不是让整页探针静默判缺失
  const saved = await cdp.eval(`!!JSON.parse(localStorage.getItem('final_dream.auth') || '{}').token`)
  if (!saved) throw new Error('登录态写入 localStorage 失败')
  // 全新 profile 首启时，Vite 客户端与服务端还在联通，页面仍在登录态；随后 reload 会用刚写入的
  // localStorage 重新初始化 auth store。不 reload 会出现"跑第一次全红、第二次正常"。
  await cdp.send('Page.reload')
  await wait(2000)
  for (let i = 0; i < 20; i++) {
    const offLogin = await cdp.eval(`!location.hash.startsWith('#/login')`)
    if (offLogin) return
    await wait(500)
  }
  throw new Error('登录后仍停留在登录页：注入的登录态未生效')
}

/**
 * 动态路径：有些页面的 URL 里带一条会过期的业务记录（如运行时页的 attemptId）。
 * 契约写死 id 会导致全量回归必然失败，所以支持 pathFrom：
 *   "pathFrom": { "url": "/api/act/student/history?page=1&pageSize=5",
 *                 "match": { "status": "in_progress" }, "field": "attemptId",
 *                 "template": "/#/sparring/web/drillmate/attempt/{value}" }
 * 在已登录的页面上下文里取列表，挑第一条满足 match 的记录拼出真实路径。
 */
async function resolvePath(cdp, contract) {
  const from = contract.pathFrom
  if (!from) return contract.path
  const rows = await cdp.eval(`(async () => {
    const r = await fetch(${JSON.stringify(from.url)}, { headers: { Authorization: 'Bearer ' + JSON.parse(localStorage.getItem('final_dream.auth')).token } })
    const b = await r.json()
    if (b.code !== 0) return []
    const d = b.data
    return Array.isArray(d) ? d : (d.records ?? d.list ?? [])
  })()`)
  const hit = (rows || []).find((row) =>
    Object.entries(from.match || {}).every(([k, v]) => row[k] === v),
  )
  if (!hit) {
    throw new Error(`${contract.page}：pathFrom 未找到满足 ${JSON.stringify(from.match)} 的记录（共 ${(rows || []).length} 条）`)
  }
  return from.template.replace('{value}', String(hit[from.field]))
}

async function auditPage(cdp, contract, measured) {
  // viewport 允许只写在 measured 里（原平台实测就是这么定的视口），契约不必重复抄一遍
  const viewport = contract.viewport || measured.viewport
  if (!viewport) throw new Error('契约和 measured 都没有 viewport：' + contract.page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url: `${BASE_URL}/#/login` })
  await wait(1500)
  await login(cdp)
  const path = await resolvePath(cdp, contract)
  contract = { ...contract, path }

  // 一次性 query 参数：只改 hash 不会触发整页加载，会停在登录页
  const sep = path.includes('?') ? '&' : '?'
  await cdp.send('Page.navigate', { url: `${BASE_URL}${path}${sep}va=${Date.now()}` })
  await wait(1500)

  // 弹窗等目标需要先交互才挂载；steps 使用本项目选择器，与 captures 的原平台步骤分开声明。
  for (const step of contract.steps || []) {
    if (step.click) {
      // SPA 路由渲染有延迟：先等触发元素出现再点，否则会在页面尚未渲染时误报"选择器未命中"
      let clicked = false
      for (let i = 0; i < 24 && !clicked; i++) {
        clicked = await cdp.eval(`(() => {
          const el = document.querySelector(${JSON.stringify(step.click)})
          if (!el) return false
          el.click()
          return true
        })()`)
        if (!clicked) await wait(500)
      }
      if (!clicked) throw new Error(`steps 里的选择器未命中：${step.click}`)
    }
    await wait(step.wait ?? 800)
  }

  const firstSel = contract.probes[0]?.selector
  if (firstSel) {
    for (let i = 0; i < 24; i++) {
      const ok = await cdp.eval(`document.querySelector(${JSON.stringify(firstSel)}) !== null`)
      if (ok) break
      await wait(500)
    }
  }
  await wait(800)

  const spec = contract.probes.map((p) => {
    const m = measured.probes[p.id] || {}
    // 只量 measured 里真实存在过的属性，避免拿 null 去比
    const props = Object.keys(m).filter((k) => !['exists', 'count', 'selector', 'text'].includes(k))
    return { id: p.id, selector: p.selector, props, text: Boolean(p.text) }
  })
  await cdp.eval(`window.__VA_SPEC__ = ${JSON.stringify(spec)}; 1`)
  const actual = await cdp.eval(MEASURE_FN)

  const failures = []
  const rows = []
  const fail = (check, prop, expected, real, desc) => {
    rows.push({ probe: check.id, prop, expected, actual: real ?? null, ok: false })
    failures.push({ probe: check.id, desc, selector: check.selector, prop, expected, actual: real ?? null })
  }
  const pass = (check, prop, expected, real) => {
    rows.push({ probe: check.id, prop, expected, actual: real ?? null, ok: true })
  }

  for (const check of contract.probes) {
    const ref = measured.probes[check.id]
    const got = actual[check.id] || { exists: false }
    const desc = check.desc || check.id

    if (!ref || ref.exists === false) {
      // 量取时原平台没有该元素：只在显式要求 required 时报错（说明探针写错了）
      if (check.required) fail(check, 'exists', '原平台有', '原平台缺失', `${desc}（探针失效，请修 captures）`)
      continue
    }

    // ① 结构：原平台有 → 本项目必须有；原平台 count=N → 本项目也要 N
    if (!got.exists) {
      // optional = 契约刻意不做（如 F02 不展示段位）：不存在属预期，存在则照常比数值
      if (check.optional) {
        rows.push({ probe: check.id, prop: 'exists', expected: '刻意不做', actual: '缺失', ok: true })
        continue
      }
      fail(check, 'exists', '存在', '缺失', `${desc}（整块区域缺失）`)
      continue
    }
    pass(check, 'exists', '存在', '存在')

    // countIgnore：数量随业务数据变化（如"我的训练主题"条数），比对数量没有意义
    const wantCount = check.countIgnore ? undefined : (check.count ?? ref.count)
    if (wantCount !== undefined && wantCount > 0) {
      rows.push({ probe: check.id, prop: 'count', expected: wantCount, actual: got.count, ok: got.count === wantCount })
      if (got.count !== wantCount) {
        failures.push({
          probe: check.id, desc, selector: check.selector, prop: 'count',
          expected: wantCount, actual: got.count,
        })
      }
    }

    // ② CSS 数值：measured 里有什么就比什么。
    // skipProps：容器继承类属性（如 flex 行的 fontSize 来自父级）不参与比对，
    // 必须在契约里写明理由，否则等于悄悄删检查项。
    const skip = new Set([
      'exists',
      'count',
      'selector',
      'text',
      ...(check.skipProps || []),
    ])
    for (const [prop, expected] of Object.entries(ref)) {
      if (skip.has(prop)) continue
      const real = got[prop]
      if (real !== undefined && closeTo(real, expected)) pass(check, prop, expected, real)
      else fail(check, prop, expected, real, desc)
    }

    // ③ 文本
    if (check.text && ref.text) {
      const ok = textOk(got.text || '', ref.text)
      rows.push({ probe: check.id, prop: 'text', expected: ref.text, actual: got.text ?? null, ok })
      if (!ok) {
        failures.push({
          probe: check.id, desc, selector: check.selector, prop: 'text',
          expected: ref.text, actual: got.text ?? null,
        })
      }
    }
  }

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const pngName = `${contract.page}.actual.png`
  writeFileSync(join(REPORT_DIR, pngName), Buffer.from(shot.data, 'base64'))

  return { rows, failures, screenshot: pngName, viewport }
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  // 需要活数据的页面（如运行时页要求一条进行中的练习）在无匹配记录时，
  // 用 VISUAL_SKIP=<page,...> 显式跳过并把状态打印出来；不静默跳过，也不伪造数据。
  const skip = new Set(
    (process.env.VISUAL_SKIP || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  mkdirSync(REPORT_DIR, { recursive: true })
  const files = readdirSync(CONTRACT_DIR).filter((f) => f.endsWith('.json'))
  const contracts = files
    .map((f) => JSON.parse(readFileSync(join(CONTRACT_DIR, f), 'utf8')))
    .filter((c) => !only.length || only.includes(c.page))
    .filter((c) => {
      if (skip.has(c.page)) {
        console.warn(`跳过 ${c.page}（VISUAL_SKIP）`)
        return false
      }
      return true
    })
  if (!contracts.length) throw new Error(`没有匹配的契约：${only.join(' ') || '（空目录）'}`)

  const { proc, wsUrl } = await launch()
  let failed = 0
  try {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = rej
    })
    const cdp = new Cdp(ws)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    for (const contract of contracts) {
      const measuredPath = join(MEASURED_DIR, `${contract.page}.json`)
      if (!existsSync(measuredPath)) {
        throw new Error(
          `缺少原平台量取结果：visual/measured/${contract.page}.json\n` +
            `请先运行：node scripts/visual-capture.mjs ${contract.page}`
        )
      }
      const measured = JSON.parse(readFileSync(measuredPath, 'utf8'))
      const { rows, failures, screenshot, viewport } = await auditPage(cdp, contract, measured)
      const report = {
        page: contract.page,
        path: contract.path,
        viewport,
        reference: measured.reference,
        capturedAt: measured.capturedAt,
        screenshot,
        auditedAt: new Date().toISOString(),
        passed: failures.length === 0,
        rows,
        failures,
      }
      writeFileSync(join(REPORT_DIR, `${contract.page}.json`), JSON.stringify(report, null, 2))

      const md = [
        `# 视觉审计：${contract.page}`,
        '',
        `- 本项目路径：\`${contract.path}\` @ ${viewport.width}x${viewport.height}`,
        `- 原平台基准：\`${measured.reference}\`（量取于 ${measured.capturedAt}）`,
        `- 本项目截图：\`${screenshot}\``,
        `- 结论：**${failures.length === 0 ? '通过' : `${failures.length} 项不一致`}**`,
        '',
        '| 探针 | 属性 | 期望（原平台实测） | 实际 | 结果 |',
        '|---|---|---|---|---|',
        ...rows.map(
          (r) =>
            `| ${r.probe} | ${r.prop} | ${String(r.expected).slice(0, 60)} | ${r.actual ?? '（元素缺失）'} | ${r.ok ? '✅' : '❌'} |`
        ),
        '',
      ].join('\n')
      writeFileSync(join(REPORT_DIR, `${contract.page}.md`), md)

      console.log(`\n=== ${contract.page} ===`)
      for (const r of rows) {
        if (r.ok) continue
        console.log(
          `  DIFF ${r.probe}.${r.prop}: 期望 ${String(r.expected).slice(0, 60)}，实际 ${r.actual ?? '（缺失）'}`
        )
      }
      for (const f of failures) if (f.desc) console.log(`       └ ${f.desc}`)
      console.log(
        `  结论：${failures.length === 0 ? `通过（${rows.length} 项）` : `${failures.length} 项不一致`}` +
          `（报告：visual/reports/${contract.page}.md）`
      )
      if (failures.length) failed++
    }
  } finally {
    proc.kill()
  }
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('视觉审计失败：', e.message)
  process.exit(1)
})
