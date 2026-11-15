// 抽查 t21/t22/t23 声明已清域的 FAIL 明细
let s = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => s += d)
process.stdin.on('end', () => {
  const j = JSON.parse(s)
  const seen = {}
  for (const f of j.findings) {
    if (f.grade !== 'FAIL') continue
    const norm = f.file.split('\\').join('/')
    if (!/views\/(student|admin|exam)\/|onlineclassroom/.test(norm)) continue
    const name = norm.split('/').slice(-2).join('/')
    seen[name] = seen[name] || []
    if (seen[name].length < 3) seen[name].push(f.gate + ':' + f.line + ' ' + f.evidence.slice(0, 58))
  }
  for (const [k, v] of Object.entries(seen).slice(0, 16)) {
    console.log('FILE', k)
    for (const line of v) console.log('   ', line)
  }
})
