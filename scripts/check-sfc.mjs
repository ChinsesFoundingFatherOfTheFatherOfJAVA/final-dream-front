// 用 Vue 官方编译器检查 SFC 模板是否能编译（2026-11-13）
//
// 为什么需要它：`vue-tsc` 不编译模板，`vitest` 也只测逻辑，
// 所以「模板里多一个或少一个闭合标签」这类错误它们都发现不了，
// 只有 Vite 真正编译页面时才会 500。本脚本按 Vite 同样的编译路径提前暴露。
//
// 用法：node scripts/check-sfc.mjs <file.vue> [more.vue ...]
import { parse, compileTemplate, compileStyle } from '@vue/compiler-sfc'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const files = process.argv.slice(2)
if (!files.length) {
  console.error('用法: node scripts/check-sfc.mjs <file.vue> ...')
  process.exit(2)
}

let failed = 0
for (const f of files) {
  const abs = resolve(f)
  const src = readFileSync(abs, 'utf-8')
  const { descriptor, errors } = parse(src, { filename: abs })
  if (errors.length) {
    console.log(`✗ ${f}`)
    for (const e of errors) console.log('   SFC:', e.message)
    failed++
    continue
  }
  if (!descriptor.template) {
    console.log(`- ${f} （无 template，跳过）`)
    continue
  }
  const r = compileTemplate({ source: descriptor.template.content, filename: abs, id: 'chk' })
  if (r.errors.length) {
    console.log(`✗ ${f}`)
    for (const e of r.errors) console.log('   TEMPLATE:', e.message || String(e))
    failed++
  } else {
    // ---- 再查 SCSS ----
    // 2026-11-13 教训：`AnswerPaperPage.vue` 的 <style lang="scss"> 多了一个 `}`，
    // 模板和 vue-tsc 全过，但 Vite 的 sass 编译直接 500、整页白屏。
    // 只查模板不够 —— 样式块同样会挂掉整个页面，必须一起查。
    const scssBlocks = (descriptor.styles || []).filter((s) => s.lang === 'scss' || s.lang === 'sass')
    let scssOk = true
    for (const blk of scssBlocks) {
      const res = compileStyle({
        source: blk.content,
        filename: abs,
        id: 'data-v-chk',
        scoped: !!blk.scoped,
        preprocessLang: blk.lang
      })
      if (res.errors && res.errors.length) {
        console.log(`✗ ${f}`)
        for (const e of res.errors) {
          const msg = e.message || String(e)
          console.log('   STYLE:', msg)
        }
        failed++
        scssOk = false
      }
    }
    if (scssOk) console.log(`✓ ${f}`)
  }
}
process.exit(failed ? 1 : 0)
