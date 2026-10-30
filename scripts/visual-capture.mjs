#!/usr/bin/env node
/**
 * 原平台视觉「量取」脚本（零依赖，驱动本机 Chrome/Edge 的 CDP）
 *
 * 解决的痛点：
 *   以前"像不像原平台"靠人眼估，估出来的数值写进契约，写错了没人发现；
 *   而漏掉整个区域（比如原平台左栏的四宫格统计、中栏的三个快捷入口）时，
 *   数值契约根本不会报警，因为它只量已存在的元素。
 *
 * 做法：把「量取原平台」和「比对我们自己」拆成两条独立流水线：
 *
 *   1) node scripts/visual-capture.mjs <page>   ← 你在这一步
 *      按 visual/captures/<page>.json 的探针清单，去原平台量 computed style、
 *      元素数量、文本，结果写入 visual/measured/<page>.json。
 *      **契约里的期望值全部来自这个文件，从不手写。**
 *
 *   2) node scripts/visual-audit.mjs <page>
 *      读 visual/contracts/<page>.json 里的「映射」（原平台探针 id → 本项目选择器），
 *      把 measured 里的期望值与本项目实测值逐项对比，输出差异清单，不通过退出码 1。
 *
 * 登录态：
 *   原平台需要登录。脚本从 visual/.original-auth.json（gitignore，勿提交）读取
 *   localStorage 键值对并注入后再导航。该文件由 ego 浏览器里已登录的会话导出：
 *     ego_run → js("JSON.stringify({token: localStorage.token, userInfo: localStorage.userInfo})")
 *   token 有效期约 14 天，过期后重新导出即可。
 *
 * 用法：
 *   node scripts/visual-capture.mjs                   # 量取全部
 *   node scripts/visual-capture.mjs drillmate-home    # 只量一个页面
 *   node scripts/visual-capture.mjs --dump-auth       # 打印当前注入的键值（排查登录态）
 *
 * 环境变量：
 *   VISUAL_CAPTURE_ORIGIN   原平台地址，默认 https://train.chinajack.com
 *   VISUAL_CHROME           浏览器可执行文件路径（默认自动探测 Chrome/Edge）
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPTURE_DIR = join(ROOT, 'visual', 'captures')
const MEASURED_DIR = join(ROOT, 'visual', 'measured')
const AUTH_FILE = join(ROOT, 'visual', '.original-auth.json')
const PROFILES = join(ROOT, 'visual', process.env.VISUAL_PROFILE_DIR || '.chrome-profile-original')
const PORT = Number(process.env.VISUAL_CDP_PORT || 9334)
const ORIGIN = process.env.VISUAL_CAPTURE_ORIGIN || 'https://train.chinajack.com'

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

/**
 * 页面内量取函数。对每个探针返回：
 *   exists / count（匹配元素个数）/ 各 CSS 属性 / text（归一化文本）/
 *   rect（前若干个元素的盒子，用于判断"区域是否存在、是否在正确位置"）
 */
const CAPTURE_FN = `(() => {
  const px = (v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const toHex = (v) => {
    const m = String(v).match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(',').map((x) => parseFloat(x.trim()))
    if (p.length < 3) return null
    if (p.length >= 4 && p[3] === 0) return null // 全透明当作无背景
    return '#' + [p[0], p[1], p[2]].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
  }
  const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim()
  const out = {}
  for (const probe of window.__VA_CAPTURE__) {
    const els = Array.from(document.querySelectorAll(probe.selector))
    if (!els.length) {
      out[probe.id] = { exists: false, count: 0, selector: probe.selector }
      continue
    }
    const el = els[0]
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const v = { exists: true, count: els.length }
    const box = probe.props || []
    if (box.includes('width')) v.width = Math.round(r.width)
    if (box.includes('height')) v.height = Math.round(r.height)
    if (box.includes('x')) v.x = Math.round(r.x)
    if (box.includes('y')) v.y = Math.round(r.y)
    if (box.includes('gap')) v.gap = s.gap === 'normal' ? 0 : px(s.gap.replace(/\\s.*$/, ''))
    if (box.includes('radius')) v.radius = px(s.borderTopLeftRadius)
    if (box.includes('padding')) v.padding = px(s.paddingTop)
    if (box.includes('paddingX')) v.paddingX = px(s.paddingLeft)
    if (box.includes('paddingY')) v.paddingY = px(s.paddingTop)
    if (box.includes('paddingBottom')) v.paddingBottom = px(s.paddingBottom)
    if (box.includes('marginTop')) v.marginTop = px(s.marginTop)
    if (box.includes('fontSize')) v.fontSize = px(s.fontSize)
    if (box.includes('fontWeight')) v.fontWeight = Number(s.fontWeight)
    if (box.includes('lineHeight')) v.lineHeight = px(s.lineHeight)
    if (box.includes('color')) v.color = toHex(s.color)
    if (box.includes('background')) v.background = toHex(s.backgroundColor)
    if (box.includes('borderColor')) v.borderColor = toHex(s.borderTopColor)
    if (box.includes('borderBottomColor')) v.borderBottomColor = toHex(s.borderBottomColor)
    if (box.includes('borderBottomWidth')) v.borderBottomWidth = px(s.borderBottomWidth)
    if (box.includes('display')) v.display = s.display
    if (probe.text) v.text = norm(el.innerText).slice(0, 200)
    out[probe.id] = v
  }
  return out
})()`

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

async function capturePage(cdp, spec, auth) {
  const { viewport, path } = spec
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // 先落到源站（任意页）才能写 localStorage，再导航到目标路由
  await cdp.send('Page.navigate', { url: `${ORIGIN}/` })
  await wait(1500)
  if (auth) {
    await cdp.eval(`(() => {
      const auth = ${JSON.stringify(auth)}
      for (const [k, v] of Object.entries(auth)) localStorage.setItem(k, v)
      return Object.keys(auth).length
    })()`)
  }

  await cdp.send('Page.navigate', { url: `${ORIGIN}${path}` })
  await wait(2500)
  // 等首个探针出现（页面是 SPA，路由渲染有延迟）
  const firstSel = spec.probes[0]?.selector
  if (firstSel) {
    for (let i = 0; i < 30; i++) {
      const ok = await cdp.eval(`document.querySelector(${JSON.stringify(firstSel)}) !== null`)
      if (ok) break
      await wait(500)
    }
  }
  await wait(1000)

  // 守卫一：登录态。原平台 token 过期时不报错而是渲染「没有访问权限」，
  // 此时量出来的全是「原平台无此元素」，会静默污染 measured 文件——比量错更危险。
  const bodyText = await cdp.eval('document.body ? document.body.innerText.slice(0, 4000) : ""')
  if (/没有访问权限|请重新登录|登录已失效/.test(bodyText || '')) {
    throw new Error(
      `原平台登录态已失效（页面出现：${(bodyText || '').slice(0, 120)}）。` +
        '请用 ego 浏览器在已登录会话里重新导出：\n' +
        '  ego_run → js("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))")\n' +
        '  写回 visual/.original-auth.json 后重跑本脚本。'
    )
  }

  // 守卫二：路由真的渲染了。首个探针找不到说明是路由/页面级失败，不能继续量。
  if (firstSel) {
    const hit = await cdp.eval(`document.querySelector(${JSON.stringify(firstSel)}) !== null`)
    if (!hit) {
      throw new Error(
        `首个探针 ${spec.probes[0].id}（${firstSel}）在原平台未命中，页面可能未渲染。` +
          '请先确认路由可访问、登录态有效，再检查 captures 规格里的选择器。'
      )
    }
  }

  // 有些原平台页面需要先交互才渲染出目标区域（例如管理端主题详情要切到「学员管理」Tab）。
  // steps 显式声明「点哪个选择器、等多久」，避免把交互步骤藏进选择器里。
  for (const step of spec.steps || []) {
    if (step.click) {
      const clicked = await cdp.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(step.click)})
        if (!el) return false
        el.click()
        return true
      })()`)
      if (!clicked) throw new Error(`steps 里的选择器未命中：${step.click}`)
    }
    await wait(step.wait ?? 800)
  }

  await cdp.eval(`window.__VA_CAPTURE__ = ${JSON.stringify(spec.probes)}; 1`)
  const measured = await cdp.eval(CAPTURE_FN)

  // 守卫三：个别探针失效要显式失败（可用 "optional": true 显式豁免）。
  // 静默跳过 = 契约里少一条检查，以后永远不会有人发现。
  const missing = spec.probes
    .filter((probe) => !probe.optional && !measured[probe.id]?.exists)
    .map((probe) => `${probe.id}（${probe.selector}）`)
  if (missing.length) {
    throw new Error(
      `以下探针在原平台未命中，请修正 captures 规格或标 optional:\n  ${missing.join('\n  ')}`
    )
  }

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const refName = `${spec.page}.original.png`
  mkdirSync(join(ROOT, 'visual', 'reference'), { recursive: true })
  writeFileSync(join(ROOT, 'visual', 'reference', refName), Buffer.from(shot.data, 'base64'))

  return { measured, refName }
}

async function main() {
  if (process.argv.includes('--dump-auth')) {
    console.log(existsSync(AUTH_FILE) ? readFileSync(AUTH_FILE, 'utf8') : '（没有 visual/.original-auth.json）')
    return
  }
  const only = process.argv[2]
  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      '缺少登录态 visual/.original-auth.json。请从 ego 浏览器已登录会话导出：\n' +
        '  ego_run → js("JSON.stringify({token: localStorage.token, userInfo: localStorage.userInfo})")\n' +
        '  然后写入 { "token": "...", "userInfo": "..." }'
    )
  }
  const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf8'))

  mkdirSync(MEASURED_DIR, { recursive: true })
  const specs = readdirSync(CAPTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CAPTURE_DIR, f), 'utf8')))
    .filter((s) => !only || s.page === only)
  if (!specs.length) throw new Error(`没有匹配的量取规格：${only ?? '（空目录）'}`)

  const { proc, wsUrl } = await launch()
  try {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = rej
    })
    const cdp = new Cdp(ws)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    for (const spec of specs) {
      const { measured, refName } = await capturePage(cdp, spec, auth)
      const out = {
        page: spec.page,
        origin: ORIGIN,
        path: spec.path,
        viewport: spec.viewport,
        reference: `visual/reference/${refName}`,
        capturedAt: new Date().toISOString(),
        probes: measured,
      }
      writeFileSync(join(MEASURED_DIR, `${spec.page}.json`), JSON.stringify(out, null, 2))
      console.log(`\n=== 已量取 ${spec.page}（${Object.keys(measured).length} 个探针）===`)
      for (const [id, v] of Object.entries(measured)) {
        const brief = Object.entries(v)
          .filter(([k]) => !['exists', 'selector'].includes(k))
          .map(([k, val]) => `${k}=${val}`)
          .join(' ')
        console.log(`  ${id}: ${v.exists ? `count=${v.count} ${brief}` : '（optional，原平台无此元素）'}`)
      }
      console.log(`  基准截图：visual/reference/${refName}`)
    }
  } finally {
    proc.kill()
  }
}

main().catch((e) => {
  console.error('量取失败：', e.message)
  process.exit(1)
})
