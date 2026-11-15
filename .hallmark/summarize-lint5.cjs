// 分类：声明域 FAIL 按两桶分——token/emoji 类（7a/30a/48）vs 结构类（其余）
let s = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => s += d)
process.stdin.on('end', () => {
  const j = JSON.parse(s)
  const tokenGates = new Set(['7a', '30a', '48'])
  const buckets = { claimedToken: {}, claimedStructural: {}, excludedAll: {} }
  const excluded = /components\/business\//
  for (const f of j.findings) {
    if (f.grade !== 'FAIL') continue
    const norm = f.file.split('\\').join('/')
    const isToken = tokenGates.has(f.gate)
    if (excluded.test(norm)) continue
    const bucket = isToken ? buckets.claimedToken : buckets.claimedStructural
    const name = norm.split('/').slice(-2).join('/')
    bucket[name] = (bucket[name] || 0) + 1
  }
  console.log('TOKEN/EMOJI-FAILS-IN-CLAIMED (7a/30a/48):')
  const t = Object.entries(buckets.claimedToken).sort((a, b) => b[1] - a[1])
  console.log('  total', t.reduce((a, b) => a + b[1], 0))
  for (const [k, v] of t.slice(0, 10)) console.log('  ', k, v)
  console.log('STRUCTURAL-FAILS-IN-CLAIMED:')
  const st = Object.entries(buckets.claimedStructural).sort((a, b) => b[1] - a[1])
  console.log('  total', st.reduce((a, b) => a + b[1], 0))
  console.log('STRUCTURAL-BY-GATE:')
  const byGate = {}
  for (const f of j.findings) {
    if (f.grade !== 'FAIL') continue
    const norm = f.file.split('\\').join('/')
    if (excluded.test(norm)) continue
    if (tokenGates.has(f.gate)) continue
    byGate[f.gate] = (byGate[f.gate] || 0) + 1
  }
  console.log(JSON.stringify(byGate))
})
