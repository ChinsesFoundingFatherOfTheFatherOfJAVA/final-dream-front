#!/usr/bin/env node
/**
 * 契约「量错对象」自查（对应 t7 发现的假通过根因）
 *
 * 背景：`drillmate-scenario-prepare` 的旧 captures 有 2 步——
 *   1) 点场景按钮 → 打开 F09 场景准备弹窗（800x627）
 *   2) 点案例卡「开始练习」 → F09 被关掉、打开 F10 模式选择弹窗（480x571）
 * 结果 measured 量的是 F10，79 项数值全过，却完全没测 F09。
 *
 * 这不是「探针太少」，是**量取时的界面状态与契约描述的对象不是同一个**。
 * 只补存在性探针而不修 steps，仍然会假通过。
 *
 * 本脚本做静态自查（不需要服务），检查四类风险：
 *   A. captures 有 ≥2 步，且后续步骤点击的是「弹窗内部元素」——
 *      极可能像 F09→F10 那样切换/关闭了目标弹窗；
 *   B. contract 与 capture 的 steps 不一致（契约点 A、采集点 B）；
 *   C. capture 走 Tab 切换、但 contract 的 path 没有对应 query 参数——
 *      采集量与审计量的可能是不同 Tab；
 *   D. contract 探针选择器在原平台 measured 里没有对应 id——
 *      探针指向了未量过的元素（会拿 undefined 当期望值）。
 *
 * 用法：node scripts/visual-contract-selftest.mjs
 * 退出码：发现 A/B 类风险时为 1（这两类会直接导致假通过）。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPTURE_DIR = join(ROOT, 'visual', 'captures')
const CONTRACT_DIR = join(ROOT, 'visual', 'contracts')
const MEASURED_DIR = join(ROOT, 'visual', 'measured')

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

/** 判断选择器是否指向「弹窗内部」（弹窗类名/dt 元素） */
function looksLikeDialogTarget(selector) {
  if (!selector) return false
  return /dialog|modal|overlay|drawer|dm-check|dm-scene-dialog|yxt-dialog/i.test(selector)
}

const warnings = []
const infos = []

const captures = readdirSync(CAPTURE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()

for (const file of captures) {
  const page = file.replace(/\.json$/, '')
  const cap = readJson(join(CAPTURE_DIR, file))
  if (!cap) continue

  const steps = (cap.steps || []).map((s) => (typeof s === 'string' ? s : s.click)).filter(Boolean)

  // ---- A. 多步且后一步点进弹窗内部 → 可能切换/关闭了目标弹窗
  if (steps.length >= 2) {
    for (let i = 1; i < steps.length; i++) {
      if (looksLikeDialogTarget(steps[i])) {
        warnings.push({
          page,
          kind: 'A',
          msg:
            `第 ${i + 1} 步点击弹窗内部元素 ${JSON.stringify(steps[i])}，` +
            `很可能像 F09→F10 那样把目标弹窗关掉/切换成另一个，导致量错对象`,
        })
        break
      }
    }
  }

  // ---- B. 界面状态可达性
  // 注意：capture 的 steps 是给【原平台】用的，contract 的 steps 是给【本项目】用的，
  // 两者选择器本来就不同（原平台 .dm-scene-btn / 本项目 .dm-scene__btn），
  // 直接字符串比对会全量误报。真正要查的是：
  //   「采集时需要的界面状态」在审计侧是否也能到达？
  // 若采集需要交互，而契约既没有 steps 也没有带 tab 等查询参数，就说明审计量的是另一个画面。
  const contract = readJson(join(CONTRACT_DIR, file))
  if (contract) {
    const cSteps = (contract.steps || [])
      .map((s) => (typeof s === 'string' ? s : s.click))
      .filter(Boolean)
    const needsInteraction = steps.length > 0
    const contractCanReachState =
      cSteps.length > 0 || /\?.*(tab|mode|view)=/.test(contract.path || '')
    if (needsInteraction && !contractCanReachState) {
      warnings.push({
        page,
        kind: 'B',
        msg:
          `采集侧需要 ${steps.length} 步交互才能到达目标界面（${JSON.stringify(steps)}），` +
          `但契约既无 steps、path 也没带 tab/mode/view 查询参数——审计侧到不了同一画面`,
      })
    }

    // ---- C. capture 走 Tab 切换，但 contract 的 path 没有对应 query
    const captureTabs = steps.filter((s) => /\btab|nth-child\(n\)/i.test(s) && /fs-tab|el-tabs|dm-tab/.test(s))
    if (captureTabs.length && contract.path && !/\?|tab=/.test(contract.path)) {
      infos.push({
        page,
        kind: 'C',
        msg:
          `capture 用 ${JSON.stringify(captureTabs)} 切 Tab，但 contract.path=${JSON.stringify(contract.path)} ` +
          `没带 tab 查询参数；请确认本项目路由能在无参数下渲染同一面板`,
      })
    }

    // ---- D. contract 探针在 measured 里没有 id
    const measured = readJson(join(MEASURED_DIR, file))
    if (measured?.probes) {
      const orphan = (contract.probes || [])
        .filter((p) => !measured.probes[p.id])
        .map((p) => p.id)
      if (orphan.length) {
        warnings.push({
          page,
          kind: 'D',
          msg: `契约探针在 measured 中无对应 id：${orphan.join(', ')}（期望值缺失，比对会被跳过）`,
        })
      }
    }
  }
}

// ---- 输出
console.log('契约「量错对象」自查（静态，不需服务）\n')
if (!warnings.length) {
  console.log('✓ 未发现 A/B/D 类风险')
} else {
  for (const w of warnings) console.log(`  [${w.kind}] ${w.page}\n        ${w.msg}`)
}
if (infos.length) {
  console.log('\n提示（需人工确认，不判失败）：')
  for (const i of infos) console.log(`  [${i.kind}] ${i.page}\n        ${i.msg}`)
}

const fatal = warnings.filter((w) => ['A', 'B'].includes(w.kind))
console.log(`\n结论：${fatal.length} 项需修（A/B），${warnings.length - fatal.length} 项需补（D），${infos.length} 项待确认（C）`)
process.exit(fatal.length ? 1 : 0)
