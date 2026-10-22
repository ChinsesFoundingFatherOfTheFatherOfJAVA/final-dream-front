<template>
  <!-- FP-11 AI建题（截图25）：左区素材 + 题型数量，右区生成卡片流。
       确定录入直接调 /exam/ques 落库（不经编辑页，保证 AI 这条链路闭环可用）。 -->
    <el-drawer
    :model-value="true"
    size="1040px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <!-- 原平台是同一页面上用左侧两个 tab 切换 AI建题 / 快速建题，这里对齐同一形态 -->
        <div class="mode-tabs">
          <el-button class="mode-tab" :class="{ active: mode === 'ai' }"
                  @click="switchMode('ai')">AI建题</el-button>
          <el-button class="mode-tab" :class="{ active: mode === 'quick' }"
                  @click="switchMode('quick')">快速建题</el-button>
        </div>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <!-- 左区：素材与数量 -->
        <section v-if="mode === 'ai'" class="left-pane">
          <label class="form-label">素材文本<span class="hint">（≤5000 字）</span></label>
          <el-input v-model.trim="materialText" :rows="10" maxlength="20000"
                    placeholder="粘贴产品资料、课件内容等，AI 将严格依据素材出题" type="textarea" />
          <div class="char-count">{{ materialText.length }} 字</div>

          <div class="upload-row">
            <el-button class="btn" :disabled="parsing" @click="pickFile">
              {{ parsing ? `解析中 ${parsePercent}%` : '上传文件解析' }}
            </el-button>
            <span class="hint">支持 .doc/.docx/.ppt/.pptx/.pdf</span>
            <input ref="fileInput" type="file" class="file-input"
                   accept=".doc,.docx,.ppt,.pptx,.pps,.pdf" @change="onFileChange" />
          </div>

          <label class="form-label">题型数量<span class="hint">（各 0~35）</span></label>
          <div class="count-grid">
            <label v-for="item in COUNT_ITEMS" :key="item.key" class="count-item">
              <span>{{ item.label }}</span>
              <el-input-number v-model="counts[item.key]" :min="0" :max="35" :controls="false" />
            </label>
          </div>

          <el-button class="btn-primary generate" :disabled="generating" @click="generate">
            {{ generating ? '生成中（最长约 120s）…' : `生成试题（共 ${totalCount} 题）` }}
          </el-button>
        </section>
        <section v-else class="left-pane">
          <label class="form-label">
            格式化文本<span class="hint">（≤10000 字）</span>
            <el-button class="link" @click="showFormatHelp = !showFormatHelp">
              {{ showFormatHelp ? '收起标准格式' : '查看标准格式示例' }}
            </el-button>
          </label>
          <el-input ref="quickTextarea" v-model="quickText" :rows="12" maxlength="10000"
                    placeholder="[单选题][中]题干&#10;A. 选项一&#10;B. 选项二&#10;答案: A" type="textarea" />
          <div class="char-count">{{ quickText.length }} 字</div>

          <div v-if="showFormatHelp" class="format-help">
            <!-- 规范说明（照截图23：灰色块 + 圆点列表 + 收起） -->
            <div class="rule-block">
              <p class="rule-title">规范说明</p>
              <ul class="rule-list">
                <li>所有试题的题型与难度同行，不能为空，示例：[单选题][难]；</li>
                <li>所有题型必须含有 "答案:" 字段，且不能为空。</li>
                <li>所有题型 "解析:" 字段非必填，没有可不填。</li>
                <li>选择题选项之间需要换行；</li>
                <li>判断题答案支持"错误"、"正确"或者"错"、"对"；</li>
                <li>填空题多个答案之间用"；"分隔；</li>
              </ul>
              <el-button class="rule-toggle" @click="showFormatHelp = false">收起 ^</el-button>
            </div>

            <!-- 题型示例（照截图23：标题 + 题型 tab + 示例正文） -->
            <p class="example-title">题型示例</p>
            <div class="example-tabs">
              <el-button v-for="tab in FORMAT_TABS" :key="tab.key"
                      class="example-tab" :class="{ active: formatTab === tab.key }"
                      @click="formatTab = tab.key">{{ tab.label }}</el-button>
            </div>
            <pre class="example-body">{{ FORMAT_EXAMPLES[formatTab] }}</pre>
          </div>

          <div class="insert-row">
            <span class="hint">设为</span>
            <el-button v-for="label in QUICK_TYPES" :key="label" class="chip"
                    @click="insertMarker(`[${label}]`)">{{ label }}</el-button>
          </div>
          <div class="insert-row">
            <span class="hint">难度</span>
            <el-button v-for="label in QUICK_LEVELS" :key="label" class="chip"
                    @click="insertMarker(`[${label}]`)">{{ label }}</el-button>
          </div>

          <el-button class="btn-primary generate" :disabled="generating" @click="generate">
            生成试题
          </el-button>

          <div v-if="issues.length" class="issue-box">
            <p v-for="issue in issues" :key="issue.line">
              第 {{ issue.line }} 行：{{ issue.reason }}
            </p>
          </div>
        </section>

        <!-- 右区：生成结果卡片流 -->
        <section class="right-pane">
          <div class="right-header">
            <span>生成结果（{{ drafts.length }}）</span>
            <el-button v-if="drafts.length" class="link danger" @click="drafts = []">清空</el-button>
          </div>

          <div class="card-list">
            <article v-for="(card, index) in drafts" :key="index" class="card" :class="{ expanded: card.expanded }">
              <div class="card-top" @click="card.expanded = !card.expanded">
                <span class="tag">{{ typeLabel(card.data.type) }}</span>
                <span class="level">{{ levelLabel(card.data.levelType) }}</span>
                <span class="expand-hint">{{ card.expanded ? '收起' : '点击展开编辑' }}</span>
                <el-button class="link danger" @click.stop="drafts.splice(index, 1)">删除</el-button>
              </div>

              <!-- 折叠态：预览 -->
              <template v-if="!card.expanded">
                <div class="card-stem">{{ card.data.stem }}</div>
                <ul v-if="card.data.options?.length" class="card-options">
                  <li v-for="(opt, i) in card.data.options" :key="i"
                      :class="{ correct: isCorrect(card.data, i) }">
                    {{ String.fromCharCode(65 + i) }}. {{ opt }}
                  </li>
                </ul>
                <div class="card-answer">答案：{{ card.data.answer || '--' }}</div>
                <div v-if="card.data.keywords?.length" class="card-keywords">
                  关键词：{{ card.data.keywords.map(k => `${k.keyword}(${k.scoreRatio}%)`).join('、') }}
                </div>
                <div v-if="card.data.analysis" class="card-analysis">解析：{{ card.data.analysis }}</div>
              </template>

              <!-- 展开态：直接编辑，改完即生效（确定录入时按当前值落库） -->
              <template v-else>
                <div class="edit-row">
                  <label class="edit-label">难度</label>
                  <el-select v-model="card.data.levelType" class="edit-select">
                    <el-option :value="0" label="易" />
                    <el-option :value="1" label="中" />
                    <el-option :value="2" label="难" />
                  </el-select>
                </div>

                <label class="edit-label">题干</label>
                <el-input v-model="card.data.stem" :rows="3" type="textarea" />

                <template v-if="card.data.type === 0 || card.data.type === 1">
                  <label class="edit-label">选项（勾选正确答案，拖手柄可调序）</label>
                  <div v-for="(opt, i) in card.data.options" :key="i" class="edit-option"
                       :class="{ dragging: cardDragIndex === i }"
                       @dragover.prevent
                       @drop="onCardDrop(card, i)">
                    <span class="drag-handle" draggable="true" title="拖拽调整顺序"
                          @dragstart="cardDragIndex = i" @dragend="cardDragIndex = null">⠿</span>
                    <span class="option-key">{{ String.fromCharCode(65 + i) }}</span>
                    <el-input v-model="card.data.options[i]" />
                    <label class="answer-flag">
                      <el-checkbox :model-value="isCorrect(card.data, i)"
                             @change="toggleCorrect(card.data, i, Boolean($event))" />
                      正确
                    </label>
                    <el-button class="link danger" :disabled="card.data.options.length <= 2"
                            @click="card.data.options.splice(i, 1)">×</el-button>
                  </div>
                  <el-button class="btn small" :disabled="card.data.options.length >= 12"
                          @click="card.data.options.push('')">+ 新增选项</el-button>
                </template>

                <template v-else-if="card.data.type === 2">
                  <label class="edit-label">参考答案</label>
                  <div class="radio-row">
                    <label><el-radio v-model="card.data.answer" value="正确" /> 正确</label>
                    <label><el-radio v-model="card.data.answer" value="错误" /> 错误</label>
                  </div>
                </template>

                <template v-else>
                  <label class="edit-label">参考答案</label>
                  <el-input v-model="card.data.answer" :rows="3" type="textarea" />
                  <template v-if="card.data.type === 4">
                    <label class="edit-label">关键词及占比</label>
                    <div v-for="(kw, i) in card.data.keywords" :key="i" class="edit-option">
                      <el-input v-model="kw.keyword" placeholder="关键词" />
                      <el-input-number v-model="kw.scoreRatio" :min="0" :max="100" class="score-input" :controls="false" />
                      <span class="percent">%</span>
                      <el-button class="link danger" @click="card.data.keywords.splice(i, 1)">×</el-button>
                    </div>
                  </template>
                </template>

                <label class="edit-label">试题解析</label>
                <el-input v-model="card.data.analysis" :rows="2" type="textarea" />
              </template>
            </article>

            <p v-if="!drafts.length" class="empty-tip">
              左侧粘贴素材、设置题型数量后点「生成试题」
            </p>
          </div>
        </section>
      </div>

      <div class="drawer-footer">
        <span class="footer-tip">{{ materialText.length > 5000 ? '⚠ 粘贴文本超过 5000 字，建议精简' : '' }}</span>
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!drafts.length || saving" @click="saveAll">
          {{ saving ? '录入中…' : `确定录入（${drafts.length}）` }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  aiGenerateQues, createQues, getPointList, parseQuesFile,
  type AiGenCounts, type AiGenDraft
} from '@/api/exam'
import { addPaperQuestion } from '@/api/paper'
import { parseQuickQues } from '@/utils/quickQuesParser'

/**
 * FP-11 AI建题。
 * 素材 → Dify「AI出题」工作流 → 草稿卡片流 → 确定录入（逐题落库）。
 */
const props = withDefaults(defineProps<{
  libId: string
  initialMode?: 'ai' | 'quick'
  /** 传了试卷 id 就走"录入到试卷"：题目落库后同时建 exam_paper_question 关联 */
  paperId?: string
}>(), {
  initialMode: 'ai'
})
const emit = defineEmits<{ close: []; saved: [] }>()

const COUNT_ITEMS = [
  { key: 'single' as const, label: '单选' },
  { key: 'multi' as const, label: '多选' },
  { key: 'judge' as const, label: '判断' },
  { key: 'fill' as const, label: '填空' },
  { key: 'answer' as const, label: '问答' }
]

const TYPE_LABELS: Record<number, string> = { 0: '单选', 1: '多选', 2: '判断', 3: '填空', 4: '问答' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }

const mode = ref<'ai' | 'quick'>(props.initialMode)
const materialText = ref('')
const quickText = ref('')
const issues = ref<{ line: number; reason: string }[]>([])
const showFormatHelp = ref(false)
const formatTab = ref<'all' | 'single' | 'multi' | 'judge' | 'fill' | 'answer'>('all')
const FORMAT_TABS = [
  { key: 'all' as const, label: '全部题型' },
  { key: 'single' as const, label: '单选题' },
  { key: 'multi' as const, label: '多选题' },
  { key: 'judge' as const, label: '判断题' },
  { key: 'fill' as const, label: '填空题' },
  { key: 'answer' as const, label: '问答题' }
]
/** 标准格式示例文案照原平台截图23。 */
const FORMAT_EXAMPLES: Record<string, string> = {
  single: [
    '[单选题][难]下面哪一项不属于面向对象的特性。',
    'A. 封装性', 'B. 原子性', 'C. 继承性', 'D. 多态性',
    '答案: B', '解析: 原子性不是面向对象的特性'
  ].join('\n'),
  multi: [
    '[多选题][中]下面哪些项属于面向对象的特性。',
    'A. 封装性', 'B. 原子性', 'C. 继承性', 'D. 多态性',
    '答案: A C D', '解析: 面向对象特性有封装性、继承性、多态性。'
  ].join('\n'),
  judge: [
    '[判断题][易]原子性是面向三大特征之一。',
    '答案: 错误', '解析: 原子性不是面向对象的特性'
  ].join('\n'),
  fill: [
    '[填空题][中]面向对象的特征有(_)(_)(_)。',
    '答案: 封装性；继承性；多态性', '解析: 面向对象特性有封装性、继承性、多态性。'
  ].join('\n'),
  answer: [
    '[问答题][难]面向对象的特征包括哪些?',
    '答案: 封装性；继承性；多态性', '解析: 面向对象特性有封装性、继承性、多态性。'
  ].join('\n')
}
FORMAT_EXAMPLES.all = ['single', 'multi', 'judge', 'fill', 'answer']
  .map(key => FORMAT_EXAMPLES[key]).join('\n\n')
/** 展开编辑卡片里的选项拖拽（同一时刻只会拖一个，共用一个下标即可）。 */
const cardDragIndex = ref<number | null>(null)
const QUICK_TYPES = ['单选题', '多选题', '判断题', '填空题', '问答题']
const QUICK_LEVELS = ['易', '中', '难']
const counts = ref<AiGenCounts>({ single: 5, multi: 0, judge: 0, fill: 0, answer: 0 })
/** 卡片包一层：data 是可编辑草稿，expanded 控制折叠/展开编辑态。 */
interface CardItem {
  data: AiGenDraft
  expanded: boolean
}

const drafts = ref<CardItem[]>([])
const generating = ref(false)
const parsing = ref(false)
const parsePercent = ref(0)
const saving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const quickTextarea = ref<HTMLTextAreaElement | null>(null)

const totalCount = computed(() => COUNT_ITEMS.reduce((sum, item) => sum + (counts.value[item.key] || 0), 0))
const typeLabel = (type: number) => TYPE_LABELS[type] ?? '--'
const levelLabel = (level: number) => LEVEL_LABELS[level] ?? '--'

/** 勾选正确答案：单选直接覆盖，多选增删字母后升序拼接（与后端 answer 约定一致）。 */
const toggleCorrect = (draft: AiGenDraft, index: number, checked: boolean) => {
  const letter = String.fromCharCode(65 + index)
  if (draft.type === 0) {
    draft.answer = checked ? letter : ''
    return
  }
  const letters = new Set(String(draft.answer || '').toUpperCase().split('').filter(Boolean))
  if (checked) letters.add(letter)
  else letters.delete(letter)
  draft.answer = Array.from(letters).sort().join('')
}

/** 单选答案是 "B"、多选是 "ACD"，据此把选项下标标红。 */
const isCorrect = (draft: AiGenDraft, index: number) => {
  if (draft.type !== 0 && draft.type !== 1) return false
  return String(draft.answer || '').toUpperCase().includes(String.fromCharCode(65 + index))
}

const pickFile = () => fileInput.value?.click()

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  parsing.value = true
  parsePercent.value = 0
  try {
    const res = await parseQuesFile(file, (p) => { parsePercent.value = p })
    materialText.value = res.text || ''
    toast.success('文件已解析，文本已填入素材框')
  } finally {
    parsing.value = false
    input.value = ''
  }
}

const onCardDrop = (card: CardItem, target: number) => {
  const from = cardDragIndex.value
  cardDragIndex.value = null
  if (from === null || from === target) return
  const list = card.data.options
  const [item] = list.splice(from, 1)
  if (item === undefined) return
  list.splice(target, 0, item)
}

/** 切换 tab 时清掉上一模式的产物，避免 AI 卡片和快速建题卡片混在一起。 */
const switchMode = (next: 'ai' | 'quick') => {
  if (mode.value === next) return
  mode.value = next
  drafts.value = []
  issues.value = []
}

/** "设为/难度"按钮：在光标处插入 [单选题][中] 式标记。 */
const insertMarker = (marker: string) => {
  const el = quickTextarea.value
  if (!el) {
    quickText.value += marker
    return
  }
  const start = el.selectionStart ?? quickText.value.length
  const end = el.selectionEnd ?? start
  quickText.value = quickText.value.slice(0, start) + marker + quickText.value.slice(end)
  nextTick(() => {
    el.focus()
    el.selectionStart = el.selectionEnd = start + marker.length
  })
}

const generate = async () => {
  if (mode.value === 'quick') {
    // FP-10：前端解析器逐题切分 + 校验，错题只标红不阻断其它题
    const { drafts: parsed, issues: parseIssues } = parseQuickQues(quickText.value)
    issues.value = parseIssues
    drafts.value = parsed.map(q => ({ data: q, expanded: false }))
    if (!parsed.length && !parseIssues.length) {
      toast.warn('请先粘贴格式化文本')
    } else if (parseIssues.length) {
      toast.warn(`共解析 ${parsed.length} 题，${parseIssues.length} 题有格式问题（见左下方）`)
    } else {
      toast.success(`已解析 ${parsed.length} 道试题`)
    }
    return
  }

  if (!materialText.value.trim()) {
    toast.warn('请先粘贴素材或上传文件')
    return
  }
  if (totalCount.value <= 0) {
    toast.warn('请至少为一种题型设置题量')
    return
  }
  generating.value = true
  try {
    const res = await aiGenerateQues(materialText.value, counts.value)
    drafts.value = (res.questions || []).map(q => ({ data: q, expanded: false }))
    toast.success(`已生成 ${drafts.value.length} 道试题`)
  } finally {
    generating.value = false
  }
}

/** 把草稿转成 /exam/ques 的请求体（含默认考核点，避免题目没有考点）。 */
const toSaveReq = (draft: AiGenDraft, pointId: string) => {
  const stem = draft.stem || ''
  const summary = stem.replace(/<[^>]+>/g, '').trim()
  const options = draft.options || []
  const answerLetters = String(draft.answer || '').toUpperCase()

  const req: Parameters<typeof createQues>[0] = {
    libId: props.libId,
    type: draft.type,
    levelType: draft.levelType ?? 1,
    content: stem,
    summary,
    explainText: draft.analysis || '',
    noOrderMark: draft.type === 1 ? 1 : 0,
    points: pointId ? [{ pointId, orderIndex: 1 }] : []
  }

  if (draft.type === 0 || draft.type === 1) {
    req.questionItems = options.map((text, index) => ({
      itemContent: text,
      answer: answerLetters.includes(String.fromCharCode(65 + index)) ? 1 : 0,
      orderIndex: index + 1
    }))
  } else if (draft.type === 2) {
    req.judgeCorrectOptionContent = options[0] || '正确'
    req.judgeWrongOptionContent = options[1] || '错误'
    req.judgeAnswer = String(draft.answer).includes('正确') ? 0 : 1
  } else if (draft.type === 3) {
    req.answerContent = draft.answer || ''
  } else if (draft.type === 4) {
    req.answerContent = draft.answer || ''
    req.answerKeywords = (draft.keywords || []).map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio }))
  }
  return req
}

const saveAll = async () => {
  saving.value = true
  try {
    // 默认考点：AI 出的题至少挂一个考点，否则列表的"考核点"列会是空的
    const points = await getPointList(props.libId)
    const pointId = points[0]?.id || ''
    let ok = 0
    for (const card of drafts.value) {
      try {
          const req = toSaveReq(card.data, pointId)
          if (props.paperId) {
            // 试卷编辑页：题目落库 + 建关联，sectionIndex 用题型（每题型一个大题组）
            await addPaperQuestion(props.paperId, {
              sectionIndex: card.data.type,
              score: 2,
              libId: props.libId,
              question: req
            })
          } else {
            await createQues(req)
          }
        ok++
      } catch {
        // 单题失败不阻断整体，失败明细最后由 toast 汇总
      }
    }
    if (ok === drafts.value.length) {
      toast.success(`已录入 ${ok} 道试题`)
      emit('saved')
      emit('close')
    } else {
      toast.warn(`录入完成：成功 ${ok} 道，失败 ${drafts.value.length - ok} 道（可删掉失败的再试）`)
      drafts.value = drafts.value.slice(ok)
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer {
  width: 1040px;
  max-width: 96vw;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

/* 双 tab：对齐原平台"左侧两个图标切换 AI建题 / 快速建题"的形态 */
.mode-tabs {
  display: flex;
  gap: 6px;

  .mode-tab {
    padding: 6px 16px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    font-size: 14px;
    color: #4a5368;
    cursor: pointer;

    &:hover { background: #f5f8ff; }
    &.active {
      background: #eaf2ff;
      border-color: #c7ddff;
      color: #1890ff;
      font-weight: 600;
    }
  }
}

/* 规范说明块：照截图23 的灰色底 + 圆点列表 */
.rule-block {
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 4px;
}

.rule-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #4a5368;
}

.rule-list {
  margin: 0;
  padding-left: 16px;
  list-style: disc;

  li {
    margin: 0 0 3px;
    font-size: 12px;
    line-height: 1.7;
    color: #667;
  }
}

.rule-toggle {
  margin-top: 2px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
}

.example-title {
  margin: 12px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #4a5368;
}

.example-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 8px 0 8px;
  border-bottom: 1px solid #e6eaf1;

  .example-tab {
    padding: 4px 2px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    font-size: 13px;
    color: #4a5368;
    cursor: pointer;

    &:hover { color: #1890ff; }
    &.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 600; }
  }
}

/* 示例正文：定高可滚动，长示例不撑爆面板 */
.example-body {
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #eef1f6;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.9;
  color: #4a5368;
  white-space: pre-wrap;
  word-break: break-word;
}

.insert-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  .hint { font-size: 11px; color: #a0a7b8; }

  .chip {
    padding: 3px 10px;
    border: 1px solid #d9d9d9;
    border-radius: 12px;
    background: #fff;
    font-size: 12px;
    color: #4a5368;
    cursor: pointer;

    &:hover { border-color: #1890ff; color: #1890ff; }
  }
}

.issue-box {
  padding: 8px 10px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;

  p { margin: 0 0 3px; font-size: 12px; color: #cf1322; line-height: 1.6; }
}

.link {
  margin-left: 6px;
  border: none;
  background: transparent;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  padding: 16px 20px;
}

.left-pane {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;

  textarea {
    width: 100%;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 9px 10px;
    font-size: 13px;
    line-height: 1.6;
    resize: vertical;
    outline: none;

    &:focus { border-color: #1890ff; }
  }

  .char-count { text-align: right; font-size: 11px; color: #b0b7c3; margin-top: -6px; }
}

.form-label {
  font-size: 13px;
  color: #4a5368;
  font-weight: 500;

  .hint { color: #a0a7b8; font-weight: 400; font-size: 11px; }
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .hint { font-size: 11px; color: #a0a7b8; }
  .file-input { display: none; }
}

.count-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.count-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4a5368;

  input {
    width: 60px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    outline: none;
  }
}

.generate { margin-top: 4px; padding: 9px 16px; }

.right-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  overflow: hidden;
}

.right-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  border-bottom: 1px solid #eef1f6;
  background: #fafbfd;
  font-size: 13px;
  color: #4a5368;
}

.card-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }

.card {
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;

  .card-top { display: flex; align-items: center; gap: 8px; }
  .tag { background: #f0f5ff; border: 1px solid #adc6ff; color: #2f54eb; border-radius: 3px; padding: 0 6px; }
  .level { color: #8a92a5; }
  .card-top .link { margin-left: auto; }

  &.expanded { border-color: #adc6ff; background: #fcfdff; }

  .expand-hint { margin-left: auto; font-size: 11px; color: #1890ff; }
  .card-top .link { margin-left: 10px; }

  .card-stem { margin: 8px 0 6px; color: #1f2937; line-height: 1.6; }
  .card-options { margin: 0 0 6px; padding-left: 18px; color: #4a5368; line-height: 1.8; }
  .card-options .correct { color: #52c41a; font-weight: 600; }
  .card-answer { color: #389e0d; }
  .card-keywords { margin-top: 4px; color: #8a92a5; }
  .card-analysis { margin-top: 4px; color: #a0a7b8; line-height: 1.6; }
}

/* 展开编辑态：与编辑页保持同一种控件手感 */
.edit-label {
  display: block;
  margin: 10px 0 4px;
  font-size: 12px;
  color: #4a5368;
  font-weight: 500;
}

.card textarea,
.edit-option input {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.6;
  outline: none;
  resize: vertical;

  &:focus { border-color: #1890ff; }
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;

  .edit-label { margin: 0; }
}

.edit-select {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
}

.edit-option {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;

  .option-key { width: 18px; text-align: center; font-size: 12px; color: #4a5368; font-weight: 600; }
  .score-input { width: 80px; }
  .percent { font-size: 11px; color: #8a92a5; }
  .drag-handle { color: #b0b7c3; cursor: grab; user-select: none; }
  &.dragging { opacity: .5; background: #f3f7ff; border-radius: 4px; }
  .link:disabled { opacity: .4; cursor: not-allowed; }
}

.btn.small {
  padding: 4px 12px;
  font-size: 12px;
  margin: 4px 0 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4a5368;
  cursor: pointer;
  &:disabled { opacity: .5; cursor: not-allowed; }
}

.answer-flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #4a5368;
  white-space: nowrap;
}

.radio-row {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #4a5368;
}

.empty-tip { text-align: center; color: #b0b7c3; font-size: 13px; margin-top: 60px; }

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid #eee;

  .footer-tip { margin-right: auto; font-size: 11px; color: #d46b08; }
}

.btn, .btn-primary {
  padding: 7px 18px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
}
.btn { border: 1px solid #d9d9d9; background: #fff; color: #4a5368; }
.btn.primary, .btn-primary { border: 1px solid #1890ff; background: #1890ff; color: #fff; }

.link {
  border: none;
  background: transparent;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  &.danger { color: #f5222d; }
}
</style>
