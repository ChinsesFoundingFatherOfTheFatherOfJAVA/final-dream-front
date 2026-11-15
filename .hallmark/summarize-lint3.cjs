// 按一级/二级目录聚合 FAIL
let s = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => s += d)
process.stdin.on('end', () => {
  const j = JSON.parse(s)
  const byDir = {}
  for (const f of j.findings) {
    if (f.grade !== 'FAIL') continue
    const parts = f.file.split('\\')
    const key = parts.slice(1, 4).join('/')
    byDir[key] = (byDir[key] || 0) + 1
  }
  const entries = Object.entries(byDir).sort((a, b) => b[1] - a[1])
  for (const [k, v] of entries) console.log(v, k)
})
