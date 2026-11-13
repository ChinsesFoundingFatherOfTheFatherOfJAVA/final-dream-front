#!/usr/bin/env node
/**
 * 学员端考试/批阅页面的截图走查脚本（离线 Mock，零新增依赖）。
 *
 * 为什么另起一个脚本而不复用 `visual-audit.mjs`：
 * 后者是「拿原平台 measured 契约逐项比数值」，要求原平台可登录、且每个页面都有 measured 文件。
 * 本次施工中后端网关不在线、原平台登录态也过期，只能做「我方页面按 mock 数据渲染出来长什么样」，
 * 属于**人眼比对**这一步，不是数值门禁。两者定位不同，故分开，避免污染数值契约。
 *
 * 用法：
 *   node scripts/exam-shot.mjs                      # 截全部
 *   node scripts/exam-shot.mjs result graded        # 只截一个页面/一个场景
 *
 * 环境：
 *   SHOT_BASE_URL    默认 http://localhost:3123（VITE_USE_MOCK=1 的 dev 端口）
 *   SHOT_OUT         默认 visual/exam-shot
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = process.env.SHOT_BASE_URL || 'http://localhost:3123'
const OUT_DIR = join(ROOT, process.env.SHOT_OUT || 'visual/exam-shot')
const PROFILES = join(ROOT, 'visual/.chrome-profile-exam-shot')
const PORT = Number(process.env.SHOT_CDP_PORT || 9455)

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
      throw new Error(
        `页面内执行失败：${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`
      )
    }
    return r.result?.value
  }
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
      const tab = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
      ).json()
      if (tab?.webSocketDebuggerUrl) return { proc, wsUrl: tab.webSocketDebuggerUrl }
    } catch {
      /* 浏览器还没起来 */
    }
  }
  proc.kill()
  throw new Error('Chrome 调试端口未就绪')
}

/** 注入登录态：Mock 模式下随便什么 token 都能过守卫（/sm/auth/me 也由 mock 应答） */
async function login(cdp) {
  for (let i = 0; i < 40; i++) {
    const ready = await cdp.eval(`document.readyState === 'complete' && !!document.querySelector('#app')`)
    if (ready) break
    await wait(500)
  }
  await cdp.eval(`(() => {
    localStorage.setItem('final_dream.auth', JSON.stringify({
      token: 'mock-token-exam-shot',
      user: { userId: '1001', account: 'admin', name: '管理员', isSuperAdmin: true, status: 1,
              deptName: '杰克科技股份', positionName: null }
    }))
    return true
  })()`)
  await cdp.send('Page.reload')
  await wait(2500)
}

/** 页面清单：hash 路由 + 场景名 + 视口 */
const PAGES = [
  { key: 'result-graded', path: '/#/exam/student/attempts/at-demo-1/result', w: 1524, h: 900 },
  { key: 'result-pending', path: '/#/exam/student/attempts/at-demo-3/result', w: 1524, h: 900 },
  { key: 'paper-all', path: '/#/exam/student/attempts/at-demo-1/paper', w: 1524, h: 1100 },
  { key: 'mark-list', path: '/#/exam/mark', w: 1524, h: 900 },
  { key: 'mark-users', path: '/#/exam/mark/ar-demo-1/users', w: 1524, h: 900 },
  { key: 'mark-paper', path: '/#/exam/mark/paper/at-demo-1', w: 1524, h: 1100 },
]

async function main() {
  const picks = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const pages = picks.length ? PAGES.filter((p) => picks.includes(p.key)) : PAGES
  if (!pages.length) throw new Error(`没有匹配的页面：${picks.join(' ')}`)

  mkdirSync(OUT_DIR, { recursive: true })
  const { proc, wsUrl } = await launch()
  const report = []
  try {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = rej
    })
    const cdp = new Cdp(ws)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    for (const page of pages) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: page.w,
        height: page.h,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await cdp.send('Page.navigate', { url: `${BASE_URL}/#/login` })
      await wait(1200)
      await login(cdp)
      // 一次性 query 参数强制整页加载，避免只改 hash 不触发数据请求
      const sep = page.path.includes('?') ? '&' : '?'
      await cdp.send('Page.navigate', { url: `${BASE_URL}${page.path}${sep}shot=${Date.now()}` })
      await wait(2500)

      const errors = await cdp.eval(`(() => {
        const el = document.querySelector('#app')
        return {
          hash: location.hash,
          appText: (el?.innerText || '').slice(0, 200),
          cardCount: document.querySelectorAll('.card, .head-card, .info-card').length,
        }
      })()`)

      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      const file = join(OUT_DIR, `${page.key}.png`)
      writeFileSync(file, Buffer.from(shot.data, 'base64'))
      report.push({ key: page.key, path: page.path, file, ...errors })
      console.log(`✓ ${page.key} → ${file}`)
      console.log(`  hash=${errors.hash} cards=${errors.cardCount}`)
      console.log(`  text=${String(errors.appText).replace(/\s+/g, ' ').slice(0, 120)}`)
    }
    writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2))
  } finally {
    proc.kill()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
