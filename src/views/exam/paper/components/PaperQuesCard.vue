<template>
  <!-- 固定卷题卡：折叠态=题干预览+选项预览+工具；展开态=六题型编辑表单（复用题库 QuesBodyForm）。
       组合题是"两段式"：先确定题干+解析，再逐个配置小题（各小题单独设分、可单独删除）。 -->
  <article class="q-card" :class="{ expanded, published }">
    <!-- 折叠态 -->
    <div
      v-if="!expanded"
      class="card-collapsed"
      draggable="true"
      role="button"
      tabindex="0"
      @dragstart="emit('dragstart')"
      @dragend="emit('dragend')"
      @dragover.prevent
      @drop="emit('drop')"
      @click="startEdit"
      @keydown.enter.prevent="startEdit"
    >
      <span class="idx" aria-hidden="true">{{ index }}.</span>
      <div class="collapsed-main">
        <p class="stem">{{ plainStem }}</p>
        <ul v-if="displayOptions.length" class="opt-preview">
          <li v-for="(opt, i) in displayOptions" :key="i">
            <span class="dot" :class="{ on: opt.answer === 1 }" aria-hidden="true"></span>
            <span class="opt-text">{{ String.fromCharCode(65 + i) }}. {{ stripHtml(opt.itemContent) }}</span>
          </li>
        </ul>
        <ul v-else-if="type === 5 && subDrafts.length" class="opt-preview">
          <li v-for="(sub, i) in subDrafts" :key="i">
            <span class="opt-text">{{ i + 1 }}. [{{ typeLabel(sub.type) }}] {{ stripHtml(sub.body.content) }}</span>
          </li>
        </ul>
        <p v-else-if="type === 3 || type === 4" class="answer-preview">答案：{{ stripHtml(answerText) }}</p>
      </div>
      <span v-if="type === 5" class="sub-count">含 {{ subDrafts.length }} 个小题</span>
      <span class="score">{{ score }}分</span>
      <div class="card-tools" @click.stop>
        <span class="tool" title="拖拽调整顺序" aria-hidden="true">⠿</span>
        <span class="tool" title="复制此题" aria-label="复制此题" role="button" tabindex="0"
              @click="emit('duplicate')" @keydown.enter.prevent.stop="emit('duplicate')">⧉</span>
        <span class="tool danger" title="删除此题" aria-label="删除此题" role="button" tabindex="0"
              @click="emit('remove')" @keydown.enter.prevent.stop="emit('remove')">🗑</span>
      </div>
    </div>

    <!-- 展开态：编辑 -->
    <div v-else class="card-expanded">
      <!-- ============ 组合题 ============ -->
      <template v-if="type === 5">
        <div class="block">
          <label class="block-label required">题干</label>
          <RichTextEditor v-model="body.content" placeholder="请输入组合题题干" />
        </div>
        <div class="block">
          <label class="block-label">试题解析</label>
          <RichTextEditor v-model="body.explainText" placeholder="试题解析（可含富文本/图片）" />
        </div>

        <!-- 组合题只在父题上设考核点（小题不单独设） -->
        <div class="setting-row combo-setting">
          <label class="setting-item">
            <span>题库</span>
            <el-select v-model="libId">
              <el-option v-for="lib in libOptions" :key="lib.id" :value="lib.id" :label="lib.name" />
            </el-select>
          </label>
          <label class="setting-item">
            <span>难度</span>
            <el-select v-model="levelType">
              <el-option :value="0" label="易" />
              <el-option :value="1" label="中" />
              <el-option :value="2" label="难" />
            </el-select>
          </label>
          <!-- 不能用 label 包裹：label 会把点击转发给内部第一个可聚焦控件（考核点抽屉的「编辑」按钮），
               导致点选考核点时抽屉被误开。 -->
          <div class="setting-item point-item">
            <span>考核点</span>
            <PointPicker v-model="selectedPointIds" :lib-id="libId" />
          </div>
        </div>

        <p v-if="!parentReady" class="stage-hint">
          先填写题干与解析并点「确定」，之后才能继续配置小题
        </p>

        <template v-else>
          <div class="sub-head">
            <span class="sub-title">小题（在此逐个添加）</span>
            <span class="sub-total">组合题总分：{{ comboTotal }} 分</span>
          </div>

          <!-- 已确定的小题 -->
          <div v-for="(sub, i) in subDrafts" :key="i" class="sub-block">
            <div class="sub-row">
              <span class="sub-no">{{ i + 1 }}</span>
              <span class="sub-tag">{{ typeLabel(sub.type) }}</span>
              <span class="sub-stem">{{ stripHtml(sub.body.content) || '未命名小题' }}</span>
              <span class="sub-score">{{ sub.score }} 分</span>
              <span class="sub-del" role="button" tabindex="0" @click="removeSub(i)" @keydown.enter.prevent="removeSub(i)">删除</span>
            </div>
          </div>

          <!-- 正在配置的小题：上一个小题确认前不会出现新的编辑区 -->
          <div v-if="editingSub" class="sub-editor">
            <p class="sub-editor-title">配置第 {{ subDrafts.length + 1 }} 个小题（{{ typeLabel(editingSub.type) }}）</p>
            <QuesBodyForm :type="editingSub.type" :body="editingSub.body" />
            <div class="setting-row">
              <label class="setting-item">
                <span>此题分值</span>
                <el-input-number v-model="editingSub.score" :min="0" :step="0.5" class="num" :controls="false" />
                <span>分</span>
              </label>
              <template v-if="editingSub.type === 1">
                <MissScoreField
                  :miss-score="editingSub.missScore" :miss-type="editingSub.missScoreType"
                  @miss="editingSub.missScore = $event" @miss-type="editingSub.missScoreType = $event" />
              </template>
            </div>
            <div class="card-actions">
              <el-button class="btn" @click="editingSub = null">取消</el-button>
              <el-button class="btn primary" :disabled="saving" @click="confirmSub">确定小题</el-button>
            </div>
          </div>

          <!-- 没有正在配置的小题时，才让选题型 -->
          <div v-else class="sub-picker">
            <p class="picker-tip">请选择小题题型</p>
            <div class="picker-btns">
              <el-button v-for="t in SUB_TYPES" :key="t.type" class="picker-btn"
                      @click="startSub(t.type)">{{ t.label }}</el-button>
            </div>
          </div>
        </template>

        <div class="card-actions">
          <el-button class="btn" @click="cancel">{{ isDraft ? '取消' : '收起' }}</el-button>
          <el-button v-if="!parentReady" class="btn primary" :disabled="saving" @click="saveParent">
            {{ saving ? '保存中…' : '确定' }}
          </el-button>
        </div>
      </template>

      <!-- ============ 其它五题型 ============ -->
      <template v-else>
        <QuesBodyForm :type="type" :body="body" />

        <div class="setting-row">
          <!-- 已发布：题目设置区整体隐藏（需求 FP-14） -->
          <template v-if="!published">
            <label class="setting-item">
              <span>题库</span>
              <el-select v-model="libId">
                <el-option v-for="lib in libOptions" :key="lib.id" :value="lib.id" :label="lib.name" />
              </el-select>
            </label>
            <label class="setting-item">
              <span>难度</span>
              <el-select v-model="levelType">
                <el-option :value="0" label="易" />
                <el-option :value="1" label="中" />
                <el-option :value="2" label="难" />
              </el-select>
            </label>
            <label class="setting-item">
              <span>此题分值</span>
              <el-input-number v-model="score" :min="0" :step="0.5" class="num" :controls="false" />
              <span>分</span>
            </label>
            <!-- 同组合题：div 包裹，避免 label 把点击转发给抽屉里的按钮 -->
            <div class="setting-item point-item">
              <span>考核点</span>
              <PointPicker v-model="selectedPointIds" :lib-id="libId" />
            </div>
            <!-- 多选题：漏选得分策略 -->
            <MissScoreField v-if="type === 1" :miss-score="missScore" :miss-type="missScoreType"
                            @miss="missScore = $event" @miss-type="missScoreType = $event" />
          </template>
        </div>

        <div class="card-actions">
          <el-button class="btn" @click="cancel">{{ isDraft ? '取消' : '收起' }}</el-button>
          <el-button class="btn primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '确定' }}
          </el-button>
        </div>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import { toast } from '@/utils/toast'
import QuesBodyForm from '../../queslib/components/QuesBodyForm.vue'
import RichTextEditor from '../../queslib/components/RichTextEditor.vue'
import PointPicker from '../../queslib/components/PointPicker.vue'
import {
  addPaperQuestion, updatePaperQuestion,
  type PaperQuesCard, type PaperSubScore
} from '@/api/paper'
import type { QuesBodyDraft, QuesSaveReq } from '@/api/exam'

/** 草稿卡片的数据形状（由父组件持有，确定时落库）。 */
interface QuesDraft {
  body: QuesBodyDraft
  libId: string
  levelType: number
  score: number
}

/** 组合题里的一个小题（含它自己的分值）。 */
interface SubDraft {
  type: number
  body: QuesBodyDraft
  score: number
  missScore: number
  missScoreType: number
}

const props = defineProps<{
  paperId: string
  libId: string
  libOptions: { id: string; name: string }[]
  type: number
  index: number
  published: boolean
  card?: PaperQuesCard | null
  draft?: QuesDraft | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
  remove: []
  duplicate: []
  dragstart: []
  dragend: []
  drop: []
}>()

const SUB_TYPES = [
  { type: 0, label: '单选题' }, { type: 1, label: '多选题' }, { type: 2, label: '判断题' },
  { type: 3, label: '填空题' }, { type: 4, label: '问答题' }
]
const TYPE_LABELS: Record<number, string> = {
  0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题'
}
const typeLabel = (t: number) => TYPE_LABELS[t] ?? '--'
const stripHtml = (html: string) => (html || '').replace(/<[^>]+>/g, '').trim()

const emptyBody = (type: number): QuesBodyDraft => ({
  content: '',
  options: type === 0 || type === 1 || type === 2
    ? [1, 2, 3, 4].map(i => ({ itemContent: '', answer: 0, orderIndex: i }))
    : [],
  judgeCorrect: '正确',
  judgeWrong: '错误',
  judgeAnswer: 0,
  answerContent: '',
  keywords: [],
  explainText: ''
})

const bodyFromCard = (card: PaperQuesCard): QuesBodyDraft => ({
  content: card.content || card.summary || '',
  options: (card.questionItems || []).map((item, i) => ({
    itemContent: item.itemContent,
    answer: item.answer,
    orderIndex: item.orderIndex ?? i + 1
  })),
  judgeCorrect: card.judgeCorrectOptionContent || '正确',
  judgeWrong: card.judgeWrongOptionContent || '错误',
  judgeAnswer: card.judgeAnswer ?? 0,
  answerContent: card.answerContent || '',
  keywords: (card.answerKeywords || []).map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio })),
  explainText: card.explainText || ''
})

const isDraft = computed(() => !!props.draft)
const expanded = ref(isDraft.value)
const saving = ref(false)
const localBody = ref<QuesBodyDraft>(props.card ? bodyFromCard(props.card) : emptyBody(props.type))
const localLevel = ref(props.card?.levelType ?? 1)
const localScore = ref(Number(props.card?.score ?? 2))
const localLib = ref(props.card?.libId || props.libId)
const localMiss = ref(Number(props.card?.missScore ?? 0))
const localMissType = ref(Number(props.card?.missScoreType ?? 0))
/** 考核点：来源是本卡片选的题库（与题库模块「新增题目」一致） */
const selectedPointIds = ref<string[]>((props.card?.points || []).map(p => p.pointId))

const body = computed<QuesBodyDraft>(() => props.draft ? props.draft.body : localBody.value)
const libId = computed({
  get: () => (props.draft ? props.draft.libId : localLib.value),
  set: (v: string) => { if (props.draft) props.draft.libId = v; else localLib.value = v }
})
const levelType = computed({
  get: () => (props.draft ? props.draft.levelType : localLevel.value),
  set: (v: number) => { if (props.draft) props.draft.levelType = v; else localLevel.value = v }
})
const score = computed({
  get: () => (props.draft ? props.draft.score : localScore.value),
  set: (v: number) => { if (props.draft) props.draft.score = v; else localScore.value = v }
})
const missScore = computed({
  get: () => localMiss.value,
  set: (v: number) => { localMiss.value = v }
})
const missScoreType = computed({
  get: () => localMissType.value,
  set: (v: number) => { localMissType.value = v }
})

// ---- 组合题状态 ----
/** 父题已落库（已有题卡或本次刚确定），才允许配置小题。 */
const createdQuesId = ref('')
const parentReady = computed(() => !!props.card || !!createdQuesId.value)
const editingSub = ref<SubDraft | null>(null)
const subDrafts = ref<SubDraft[]>([])
const comboTotal = computed(() =>
  Number(subDrafts.value.reduce((sum, s) => sum + Number(s.score || 0), 0).toFixed(2)))

const parentQuesId = computed(() => props.card?.quesId || createdQuesId.value)

/** 已有组合题：把小题与「同序」的分值配对还原。 */
const initSubsFromCard = (card: PaperQuesCard) => {
  const scores = card.subScores || []
  subDrafts.value = (card.subQuestions || []).map((sub, i) => {
    const s = scores[i]
    return {
      type: sub.type,
      body: {
        content: sub.content || sub.summary || '',
        options: (sub.questionItems || []).map((it, k) => ({
          itemContent: it.itemContent, answer: it.answer, orderIndex: it.orderIndex ?? k + 1
        })),
        judgeCorrect: sub.judgeCorrectOptionContent || '正确',
        judgeWrong: sub.judgeWrongOptionContent || '错误',
        judgeAnswer: sub.judgeAnswer ?? 0,
        answerContent: sub.answerContent || '',
        keywords: (sub.answerKeywords || []).map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio })),
        explainText: sub.explainText || ''
      },
      score: Number(s?.score ?? 0),
      missScore: Number(s?.missScore ?? 0),
      missScoreType: Number(s?.missScoreType ?? 0)
    }
  })
}

const plainStem = computed(() => stripHtml(body.value.content || props.card?.summary || '') || '未命名题目')
const displayOptions = computed(() => props.card?.questionItems || (props.draft ? props.draft.body.options : []))
const answerText = computed(() =>
  props.card?.answerContent || (props.draft ? props.draft.body.answerContent : ''))

watch(() => props.card, (next) => {
  if (!next) return
  localBody.value = bodyFromCard(next)
  localLevel.value = next.levelType ?? 1
  localScore.value = Number(next.score ?? 2)
  localLib.value = next.libId || props.libId
  localMiss.value = Number(next.missScore ?? 0)
  localMissType.value = Number(next.missScoreType ?? 0)
  selectedPointIds.value = (next.points || []).map(p => p.pointId)
  if (next.type === 5) initSubsFromCard(next)
}, { immediate: true })

/** 归属题库换了，之前的考核点就不属于新库了，清掉避免存错。 */
watch(libId, (next, prev) => {
  if (prev && next !== prev) selectedPointIds.value = []
})

const startEdit = () => {
  if (props.card) {
    localBody.value = bodyFromCard(props.card)
    localLevel.value = props.card.levelType ?? 1
    localScore.value = Number(props.card.score ?? 2)
    localLib.value = props.card.libId || props.libId
    localMiss.value = Number(props.card.missScore ?? 0)
    localMissType.value = Number(props.card.missScoreType ?? 0)
    selectedPointIds.value = (props.card.points || []).map(p => p.pointId)
  }
  expanded.value = true
}

const cancel = () => {
  if (isDraft.value) emit('cancel')
  else expanded.value = false
}

/** 组装题库 03 §3.3 的请求体（考核点沿用题卡原有，避免编辑把考点清空）。 */
const buildReq = (): QuesSaveReq => {
  const b = body.value
  const req: QuesSaveReq = {
    libId: libId.value,
    type: props.type,
    levelType: levelType.value,
    content: b.content,
    summary: stripHtml(b.content),
    explainText: b.explainText,
    noOrderMark: props.type === 1 ? 1 : 0,
    points: selectedPointIds.value.map((pointId, i) => ({ pointId, orderIndex: i + 1 }))
  }
  if (props.type === 0 || props.type === 1) {
    req.questionItems = b.options
      .filter(o => o.itemContent.trim())
      .map((o, i) => ({ itemContent: o.itemContent, answer: o.answer, orderIndex: i + 1 }))
  } else if (props.type === 2) {
    req.judgeCorrectOptionContent = b.judgeCorrect
    req.judgeWrongOptionContent = b.judgeWrong
    req.judgeAnswer = b.judgeAnswer
  } else {
    req.answerContent = b.answerContent
    req.answerKeywords = b.keywords.filter(k => k.keyword.trim())
      .map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio }))
  }
  return req
}

/** 小题 → 题库子题请求体。 */
const subReq = (sub: SubDraft) => {
  const b = sub.body
  const req: Record<string, unknown> = {
    type: sub.type,
    levelType: levelType.value,
    content: b.content,
    summary: stripHtml(b.content),
    explainText: b.explainText,
    noOrderMark: sub.type === 1 ? 1 : 0
  }
  if (sub.type === 0 || sub.type === 1) {
    req.questionItems = b.options.filter(o => o.itemContent.trim())
      .map((o, i) => ({ itemContent: o.itemContent, answer: o.answer, orderIndex: i + 1 }))
  } else if (sub.type === 2) {
    req.judgeCorrectOptionContent = b.judgeCorrect
    req.judgeWrongOptionContent = b.judgeWrong
    req.judgeAnswer = b.judgeAnswer
  } else {
    req.answerContent = b.answerContent
    req.answerKeywords = b.keywords.filter(k => k.keyword.trim())
      .map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio }))
  }
  return req
}

const validate = () => {
  if (!body.value.content.trim()) {
    toast.warn('题干不能为空')
    return false
  }
  if ((props.type === 0 || props.type === 1)
      && body.value.options.filter(o => o.itemContent.trim()).length < 2) {
    toast.warn('选项至少 2 项')
    return false
  }
  if (!props.published && props.type !== 5 && Number(score.value) <= 0) {
    toast.warn('分数必须大于 0')
    return false
  }
  return true
}

/** 组合题：只保存父题（题干 + 解析），之后才解锁小题区。 */
const saveParent = async () => {
  if (!body.value.content.trim()) {
    toast.warn('题干不能为空')
    return
  }
  saving.value = true
  try {
    // points 已由 buildReq 带上（取用户在本卡片选的考核点），不要再覆盖
    const parentReq = { ...buildReq(), type: 5 }
    if (!props.card) {
      const res = await addPaperQuestion(props.paperId, {
        sectionIndex: 5,
        score: 0,
        libId: libId.value,
        question: parentReq
      })
      createdQuesId.value = res.quesId
      toast.success('已保存组合题题干，可以继续配置小题了')
    } else {
      await updatePaperQuestion(props.paperId, props.card.quesId, {
        libId: libId.value,
        question: parentReq
      })
      toast.success('组合题题干已保存')
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

const startSub = (type: number) => {
  editingSub.value = { type, body: emptyBody(type), score: 2, missScore: 0, missScoreType: 0 }
}

/** 确定小题：先入列，再把「全部已确认小题 + 各自分值」整份提交。 */
const confirmSub = async () => {
  const sub = editingSub.value
  if (!sub) return
  if (!sub.body.content.trim()) {
    toast.warn('小题题干不能为空')
    return
  }
  if ((sub.type === 0 || sub.type === 1) && sub.body.options.filter(o => o.itemContent.trim()).length < 2) {
    toast.warn('小题选项至少 2 项')
    return
  }
  if (Number(sub.score) <= 0) {
    toast.warn('请设置小题分值')
    return
  }
  subDrafts.value.push(sub)
  editingSub.value = null
  await persistCombo()
}

/** 删除单个小题。 */
const removeSub = async (index: number) => {
  subDrafts.value.splice(index, 1)
  await persistCombo()
}

/** 组合题落库：父题分值 = 各小题合计，分值按"同序"存进关联行。 */
const persistCombo = async () => {
  const qid = parentQuesId.value
  if (!qid) return
  saving.value = true
  try {
    const scores: PaperSubScore[] = subDrafts.value.map(s => ({
      score: Number(s.score || 0),
      missScore: Number(s.missScore || 0),
      missScoreType: Number(s.missScoreType || 0)
    }))
    await updatePaperQuestion(props.paperId, qid, {
      score: comboTotal.value,
      subScores: scores,
      libId: libId.value,
      question: { ...buildReq(), type: 5, subQuestions: subDrafts.value.map(subReq) }
    })
    toast.success('小题已保存')
    emit('saved')
  } finally {
    saving.value = false
  }
}

const save = async () => {
  if (!validate()) return
  saving.value = true
  try {
    if (isDraft.value) {
      await addPaperQuestion(props.paperId, {
        sectionIndex: props.type,
        score: Number(score.value),
        missScore: props.type === 1 ? Number(missScore.value) : undefined,
        missScoreType: props.type === 1 ? Number(missScoreType.value) : undefined,
        libId: libId.value,
        question: buildReq()
      })
      toast.success('题目已添加')
    } else {
      await updatePaperQuestion(props.paperId, props.card!.quesId, {
        score: props.published ? undefined : Number(score.value),
        levelType: props.published ? undefined : levelType.value,
        missScore: props.published || props.type !== 1 ? undefined : Number(missScore.value),
        missScoreType: props.published || props.type !== 1 ? undefined : Number(missScoreType.value),
        libId: libId.value,
        question: buildReq()
      })
      toast.success('题目已保存')
      expanded.value = false
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

/** 多选漏选得分：统一得 X 分 / 按漏选数量均分。 */
const MissScoreField = defineComponent({
  props: {
    missScore: { type: Number, required: true },
    missType: { type: Number, required: true }
  },
  emits: ['miss', 'miss-type'],
  setup: (p, { emit }) => () => h('div', { class: 'miss-field' }, [
    h('p', { class: 'miss-title' }, '漏选得分'),
    h('label', { class: 'miss-radio' }, [
      h('input', {
        type: 'radio', checked: p.missType === 0, onChange: () => emit('miss-type', 0)
      }),
      h('span', {}, '统一得'),
      h('input', {
        type: 'number', min: 0, step: 0.5, class: 'miss-input', value: p.missScore,
        onChange: (e: Event) => emit('miss', Number((e.target as HTMLInputElement).value) || 0)
      }),
      h('span', {}, '分')
    ]),
    h('label', { class: 'miss-radio' }, [
      h('input', {
        type: 'radio', checked: p.missType === 2, onChange: () => emit('miss-type', 2)
      }),
      h('span', {}, '按漏选数量均分')
    ])
  ])
})
</script>

<style scoped lang="scss">
.q-card {
  background: #fff; border: 1px solid #e8eaef; border-radius: 6px; margin-bottom: 12px;

  &.expanded { border-color: #adc6ff; }
}

.card-collapsed {
  display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; cursor: pointer;

  &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 6px; }

  .idx { flex: 0 0 auto; font-size: 14px; color: #303133; }
  .collapsed-main { flex: 1; min-width: 0; }
  .stem { margin: 0 0 8px; font-size: 13px; color: #303133; word-break: break-word; }
  .sub-count { flex: 0 0 auto; font-size: 12px; color: #8a92a5; margin-right: 10px; }
  .score { flex: 0 0 auto; font-size: 13px; color: #303133; }

  .opt-preview {
    margin: 0; padding: 0; list-style: none;

    li { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: #4a5368; }
    .dot {
      width: 12px; height: 12px; border-radius: 50%; border: 1px solid #c7d0de; flex: 0 0 auto;
      &.on { border-color: #1890ff; box-shadow: inset 0 0 0 3px #1890ff; }
    }
    .opt-text { word-break: break-word; }
  }

  .answer-preview { margin: 0; font-size: 13px; color: #8a92a5; }

  .card-tools {
    flex: 0 0 auto; display: flex; gap: 10px;

    .tool {
      color: #8a92a5; cursor: pointer; font-size: 14px;
      &:hover { color: #1890ff; }
      &.danger:hover { color: #f5222d; }
      &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 2px; }
    }
  }
}

.card-expanded { padding: 16px; }

.block { margin-bottom: 14px; }
.block-label {
  display: block; margin-bottom: 6px; font-size: 13px; color: #4a5368;
  &.required::after { content: ' *'; color: #f5222d; }
}

.stage-hint {
  margin: 4px 0 12px; padding: 10px 12px; border-radius: 4px;
  background: #f5f8ff; border: 1px dashed #adc6ff; font-size: 12px; color: #2f54eb;
}

.sub-head {
  display: flex; align-items: baseline; gap: 12px; margin: 4px 0 10px;

  .sub-title { font-size: 13px; color: #303133; }
  .sub-total { font-size: 12px; color: #fa8c16; }
}

.sub-block { border: 1px solid #eef1f6; border-radius: 6px; margin-bottom: 8px; }

.sub-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; font-size: 13px;

  .sub-no {
    width: 20px; height: 20px; border-radius: 50%; background: #f0f5ff; color: #2f54eb;
    font-size: 11px; line-height: 20px; text-align: center; flex: 0 0 auto;
  }
  .sub-tag { color: #8a92a5; font-size: 12px; }
  .sub-stem { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #303133; }
  .sub-score { color: #303133; }
  .sub-del { color: #f5222d; cursor: pointer; &:hover { text-decoration: underline; } &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; border-radius: 2px; } }
}

.sub-editor {
  border: 1px solid #adc6ff; border-radius: 6px; padding: 14px; margin-bottom: 10px;

  .sub-editor-title { margin: 0 0 10px; font-size: 13px; color: #2f54eb; }
}

.sub-picker {
  padding: 22px 16px; border: 1px dashed #d9e1ec; border-radius: 6px; text-align: center;

  .picker-tip { margin: 0 0 12px; font-size: 12px; color: #a0a7b8; }
  .picker-btns { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
  .picker-btn {
    padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
    background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

    &:hover { border-color: #1890ff; color: #1890ff; }
  }
}

.setting-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px;
  padding: 12px 0 4px; border-top: 1px dashed #eef1f6; margin-top: 8px;

  .setting-item {
    display: inline-flex; align-items: center; gap: 8px;
    // 最小宽度保证题库/难度下拉不被 flex 压缩到看不见；放不下时整项换行
    min-width: 200px; flex: 1 1 200px;
    font-size: 13px; color: #4a5368;

    // 题库/难度下拉定宽
    .el-select { width: 150px; }

    // el-input-number 根只定宽：边框由 EP wrapper 提供，根上不再画边框（避免双层）
    .num { width: 84px; }
  }

  /* 考核点选择器独占一行，给足宽度，否则下拉里名字被挤没了 */
  .point-item {
    flex: 1 1 100%;
    :deep(.point-picker),
    :deep(.picker-field) { width: 100%; min-width: 240px; }
  }
}

:deep(.miss-field) {
  display: flex; flex-direction: column; gap: 6px;

  .miss-title { margin: 0; font-size: 12px; color: #4a5368; }
  .miss-radio {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12px; color: #4a5368; cursor: pointer;

    input[type="radio"] { margin: 0; accent-color: #1890ff; }
    .miss-input {
      width: 84px; border: 1px solid #d9d9d9; border-radius: 4px;
      padding: 4px 6px; font-size: 12px; outline: none; margin-left: 4px;
    }
  }
}

.card-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

.btn {
  padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
