// 全站 sloplint 分组统计：stdin JSON → 按 gate/tier 聚合 FAIL，按文件聚合 top 榜
let s = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => s += d)
process.stdin.on('end', () => {
  const j = JSON.parse(s)
  console.log('SUMMARY', JSON.stringify(j.summary))
  const byGate = {}, byFile = {}
  for (const f of j.findings) {
    if (f.grade !== 'FAIL') continue
    byGate[f.gate] = (byGate[f.gate] || 0) + 1
    const name = f.file.split('\\').slice(-2).join('/')
    byFile[name] = (byFile[name] || 0) + 1
  }
  console.log('FAIL-BY-GATE', JSON.stringify(byGate))
  const top = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log('TOP-FILES')
  for (const [k, v] of top) console.log(' ', k, v)
  // gate48 样例
  const g48 = j.findings.filter(f => f.grade === 'FAIL' && f.gate === '48').slice(0, 6)
  for (const f of g48) console.log('G48-SAMPLE', f.file.split('\\').slice(-2).join('/') + ':' + f.line, f.evidence.slice(0, 70))
  const g7 = j.findings.filter(f => f.grade === 'FAIL' && f.gate.startsWith('7')).slice(0, 5)
  for (const f of g7) console.log('G7-SAMPLE', f.file.split('\\').slice(-2).join('/') + ':' + f.line, f.evidence.slice(0, 70))
  const g30 = j.findings.filter(f => f.grade === 'FAIL' && f.gate === '30a').slice(0, 5)
  for (const f of g30) console.log('G30-SAMPLE', f.file.split('\\').slice(-2).join('/') + ':' + f.line, f.evidence.slice(0, 70))
})
