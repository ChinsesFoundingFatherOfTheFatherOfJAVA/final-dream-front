import { describe, expect, it } from 'vitest'
import { parseQuickQues } from './quickQuesParser'

/**
 * 快速建题解析器（FP-10）单测。
 * 覆盖验收里的两条：正常 3 题按序出卡；其中 1 题缺答案时只标红该题、其余照常。
 */
describe('parseQuickQues', () => {
  it('按序解析多题型，题型/难度/选项/答案/解析各归各位', () => {
    const text = [
      '[单选题][难]下面哪一项不属于面向对象的特性。',
      'A. 封装性',
      'B. 原子性',
      'C. 继承性',
      'D. 多态性',
      '答案: B',
      '解析: 原子性不是面向对象的特性',
      '',
      '[判断题][易]原子性是面向三大特征之一。',
      '答案: 错误',
      '',
      '[填空题][中]面向对象的特征有(_)(_)(_)。',
      '答案: 封装性；继承性；多态性'
    ].join('\n')

    const { drafts, issues } = parseQuickQues(text)

    expect(issues).toEqual([])
    expect(drafts).toHaveLength(3)

    expect(drafts[0]!.type).toBe(0)
    expect(drafts[0]!.levelType).toBe(2)
    expect(drafts[0]!.options).toEqual(['封装性', '原子性', '继承性', '多态性'])
    expect(drafts[0]!.answer).toBe('B')
    expect(drafts[0]!.analysis).toBe('原子性不是面向对象的特性')

    expect(drafts[1]!.type).toBe(2)
    expect(drafts[1]!.options).toEqual(['正确', '错误'])
    expect(drafts[1]!.answer).toBe('错误')

    expect(drafts[2]!.type).toBe(3)
    expect(drafts[2]!.answer).toBe('封装性；继承性；多态性')
  })

  it('多选题答案归一："A C D" / "A、C、D" / "ACD" 都识别为 ACD', () => {
    for (const raw of ['A C D', 'A、C、D', 'ACD', 'A,C,D']) {
      const { drafts, issues } = parseQuickQues([
        '[多选题][中]题干',
        'A. 甲', 'B. 乙', 'C. 丙', 'D. 丁',
        `答案: ${raw}`
      ].join('\n'))
      expect(issues).toEqual([])
      expect(drafts[0]!.answer).toBe('ACD')
    }
  })

  it('判断题答案支持"对"/"错"', () => {
    const { drafts } = parseQuickQues('[判断题][易]题干\n答案: 对')
    expect(drafts[0]!.answer).toBe('正确')
  })

  it('缺答案的那题只标红，不阻断其它题（验收场景）', () => {
    const text = [
      '[单选题][易]第一题',
      'A. 甲', 'B. 乙',
      '答案: A',
      '',
      '[单选题][易]第二题（缺答案）',
      'A. 甲', 'B. 乙',
      '',
      '[单选题][易]第三题',
      'A. 甲', 'B. 乙',
      '答案: B'
    ].join('\n')

    const { drafts, issues } = parseQuickQues(text)

    expect(drafts).toHaveLength(2)
    expect(issues).toHaveLength(1)
    // 第二题的题头在第 6 行（第 5 行是分隔空行）
    expect(issues[0]!.line).toBe(6)
    expect(issues[0]!.reason).toContain('答案不能为空')
  })

  it('题型/难度写错时给出可读原因', () => {
    const { drafts, issues } = parseQuickQues('[单择题][中]题干\n答案: A')
    expect(drafts).toHaveLength(0)
    expect(issues[0]!.reason).toContain('不认识的题型')
  })

  it('全角冒号同样识别（规范说明写的是"答案："）', () => {
    const { drafts, issues } = parseQuickQues('[问答题][难]题干\n答案：封装、继承\n解析：略')
    expect(issues).toEqual([])
    expect(drafts[0]!.answer).toBe('封装、继承')
    expect(drafts[0]!.analysis).toBe('略')
  })
})