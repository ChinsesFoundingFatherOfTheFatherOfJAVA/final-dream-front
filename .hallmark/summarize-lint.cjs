// 汇总 sloplint JSON：stdin 进，按 tier/grade/gate 聚合到文件粒度，逐条打印行号
let s = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => s += d)
process.stdin.on('end', () => {
  const j = JSON.parse(s)
  console.log('SUMMARY', JSON.stringify(j.summary))
  const groups = {}
  for (const f of j.findings) {
    const name = f.file.split('\\').pop()
    const k = name + ' | ' + f.tier + '/' + f.grade + ' | gate ' + f.gate
    ;(groups[k] = groups[k] || []).push(f.line)
  }
  for (const k of Object.keys(groups)) console.log(k, '->', groups[k].join(','))
  console.log('---DETAIL-WARN-AND-REFLEX---')
  for (const f of j.findings) {
    if (f.tier !== 'floor') console.log(f.grade, '|', f.file.split('\\').pop() + ':' + f.line, '|', f.gate, '|', f.evidence.slice(0, 110))
  }
})
