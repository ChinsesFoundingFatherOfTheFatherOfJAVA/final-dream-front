<template>
  <!-- FP-10 固定出卷编辑页（截图17/18）：独立全屏页 + 左侧竖排 tab（题型/概览）
       + 选择题型面板 + 大题画布（可编辑题卡）+ 右侧统计与大题概览 -->
  <div class="quick-edit">
    <header class="edit-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1>{{ paper?.name || '固定出卷' }}</h1>
      <span class="save-hint"><i class="hint-dot" aria-hidden="true"></i>{{ saveHint }}</span>
      <!-- 创建考试流程的第②步：三步条 + 右上角上一步/下一步（截图25） -->
      <ExamWizardSteps v-if="arrangeId" class="paper-steps" :current="2" :can-jump="canJumpStep" @jump="jumpStep" />
      <div class="header-actions">
        <el-button class="btn" @click="notReady('预览')">预览</el-button>
        <el-button class="btn" @click="notReady('导出')">导出</el-button>
        <template v-if="arrangeId">
          <el-button class="btn" @click="jumpStep(1)">上一步</el-button>
          <el-button class="btn primary" @click="goPublish">下一步</el-button>
        </template>
        <template v-else>
          <el-button v-if="!published" class="btn primary" @click="doRelease">发布</el-button>
          <span v-else class="sync-btn">同步试卷至考试</span>
        </template>
      </div>
    </header>

    <div class="edit-body">
      <!-- 左侧竖排 tab -->
      <nav class="tab-rail">
        <el-button class="rail-tab" :class="{ active: tab === 'type' }" @click="tab = 'type'">
          <span class="rail-icon">▦</span>
          <span class="rail-text">题型</span>
        </el-button>
        <el-button class="rail-tab" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">
          <span class="rail-icon">◔</span>
          <span class="rail-text">概览</span>
        </el-button>
      </nav>

      <template v-if="tab === 'type'">
        <!-- 选择题型 -->
        <aside class="type-panel">
          <p class="panel-title">选择题型</p>
          <el-button v-for="item in TYPE_BUTTONS" :key="item.type" class="type-btn"
                  :disabled="published" @click="addCard(item.type)">
            <span class="type-icon">{{ item.icon }}</span>{{ item.label }}
          </el-button>

          <div class="panel-foot">
            <el-button class="foot-btn" :disabled="published" @click="showAi = true">AI出题</el-button>
            <el-button class="foot-btn" :disabled="published" @click="openPick(-1)">从题库选题</el-button>
            <el-button class="foot-btn" :disabled="published" @click="showImport = true">导入</el-button>
          </div>
        </aside>

        <!-- 大题画布 -->
        <section class="canvas">
          <div v-if="!sections.length" class="empty-tip">
            <span class="empty-icon">＋</span>
            <p class="empty-title">还没有试题</p>
            <p class="empty-desc">点击左侧题型按钮，即可添加该题型的编辑卡片</p>
          </div>

          <div v-for="(section, si) in sections" :key="section.sectionIndex"
               :ref="(el) => setSectionRef(section.sectionIndex, el as HTMLElement | null)"
               class="section">
            <div class="section-head">
              <div>
                <h3 class="section-title">{{ chineseNo(si) }}、{{ typeLabel(section.sectionIndex) }}</h3>
                <p class="section-sub">（本题共{{ sectionQty(section) }}小题，共{{ sectionScore(section) }}分）</p>
              </div>
              <!-- 占位工具按钮：本期无功能，去掉 pointer 伪交互 -->
              <div class="section-tools">
                <span class="tool" title="引用情况">🔗</span>
                <span class="tool" title="更多">⋮</span>
              </div>
            </div>

            <PaperQuesCard
              v-for="card in section.cards"
              :key="card.quesId"
              :ref="(el) => setCardRef(card.quesId, el as HTMLElement | null)"
              :paper-id="paperId"
              :lib-id="defaultLibId"
              :lib-options="libOptions"
              :type="section.sectionIndex"
              :index="cardIndex(section, card.quesId)"
              :published="published"
              :card="card"
              @saved="onCardSaved"
              @remove="removeCard(card)"
              @duplicate="duplicateCard(card, section.sectionIndex)"
              @dragstart="onDragStart(card.quesId)"
              @dragend="dragSrc = null"
              @drop="onDrop(section.sectionIndex, card.quesId)"
            />

            <PaperQuesCard
              v-for="draft in section.drafts"
              :key="draft.key"
              :ref="(el) => setCardRef(draft.key, el as HTMLElement | null)"
              :paper-id="paperId"
              :lib-id="defaultLibId"
              :lib-options="libOptions"
              :type="draft.sectionIndex"
              :index="sectionQty(section) + draftIndex(section, draft.key) + 1"
              :published="published"
              :draft="draft"
              @saved="onDraftSaved(draft.key)"
              @cancel="removeDraft(draft.key)"
            />
          </div>
        </section>

        <!-- 右侧统计 -->
        <aside class="stat-panel">
          <div class="stat-card">
            <div class="stat-cell"><b>{{ totalQty }}</b><span>试题</span></div>
            <div class="stat-cell"><b>{{ totalScore.toFixed(2) }}</b><span>总分</span></div>
          </div>
          <el-button class="stat-link" :disabled="published" @click="showBatchScore = true">
            快速设置全部分数
          </el-button>

          <div class="group-list">
            <div v-for="(section, si) in sections" :key="section.sectionIndex" class="group-item">
              <p class="group-title">{{ chineseNo(si) }}、{{ typeLabel(section.sectionIndex) }}</p>
              <div class="group-boxes">
                <el-button v-for="n in sectionQty(section)" :key="n" class="group-box"
                        @click="scrollToCard(section, n)">{{ n }}</el-button>
              </div>
            </div>
            <p v-if="!sections.length" class="group-empty">暂无大题</p>
          </div>

          <p class="drag-hint"><span class="drag-dot"></span>可拖拽排序大题和小题</p>
        </aside>
      </template>

      <!-- 概览 tab：与题型页在同一页面里切换 -->
      <PaperOverviewPanel v-else :paper-id="paperId" />
    </div>

    <PickQuesDrawer
      v-if="showPick"
      :paper-id="paperId"
      :default-type="pickType"
      @close="showPick = false"
      @picked="loadCanvas"
    />
    <BatchScoreDrawer
      v-if="showBatchScore"
      :paper-id="paperId"
      :sections="apiSections"
      @close="showBatchScore = false"
      @saved="loadCanvas"
    />
    <AiQuesDrawer
      v-if="showAi && defaultLibId"
      :lib-id="defaultLibId"
      :paper-id="paperId"
      @close="showAi = false"
      @saved="loadCanvas"
    />
    <QuesImportDrawer
      v-if="showImport && defaultLibId"
      format="excel"
      :lib-id="defaultLibId"
      :paper-id="paperId"
      @close="showImport = false"
      @imported="loadCanvas"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import { getLibList, type LibItem, type QuesBodyDraft } from '@/api/exam'
import {
  getPaperDetail, getPaperEditCanvas, pickPaperQuestions, removePaperQuestion, releasePaper, sortPaperQuestions,
  type PaperDetail, type PaperQuesCard as PaperQuesCardData, type PaperSection
} from '@/api/paper'
import PaperQuesCard from './components/PaperQuesCard.vue'
import PaperOverviewPanel from './components/PaperOverviewPanel.vue'
import PickQuesDrawer from './components/PickQuesDrawer.vue'
import BatchScoreDrawer from './components/BatchScoreDrawer.vue'
import AiQuesDrawer from '../queslib/components/AiQuesDrawer.vue'
import QuesImportDrawer from '../queslib/components/QuesImportDrawer.vue'
import ExamWizardSteps from '../components/ExamWizardSteps.vue'

const route = useRoute()
const router = useRouter()

const paperId = String(route.query.paperId ?? '')
/** 从「创建考试向导」第二步进来时带 arrangeId，用于回跳发布配置 */
const arrangeId = String(route.query.arrangeId ?? '')
/** 六题型；组合题也占一个大题位，但走"先题干、再小题"的两段式编辑（见 PaperQuesCard）。 */
const TYPE_BUTTONS = [
  { type: 0, label: '单选题', icon: '◉' },
  { type: 1, label: '多选题', icon: '☑' },
  { type: 2, label: '判断题', icon: '％' },
  { type: 3, label: '填空题', icon: '✎' },
  { type: 4, label: '问答题', icon: '≡' },
  { type: 5, label: '组合题', icon: '⧉' }
]
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 草稿卡片的父组件侧状态（与 PaperQuesCard 的 draft 形状一致）。 */
interface DraftCard {
  key: string
  sectionIndex: number
  body: QuesBodyDraft
  libId: string
  levelType: number
  score: number
}

const paper = ref<PaperDetail | null>(null)
const apiSections = ref<PaperSection[]>([])
const drafts = ref<DraftCard[]>([])
const libs = ref<LibItem[]>([])
const defaultLibId = ref('')
const saveHint = ref('试卷将自动保存')
const tab = ref<'type' | 'overview'>('type')
const showPick = ref(false)
const pickType = ref(-1)
const showBatchScore = ref(false)
const showAi = ref(false)
const showImport = ref(false)
const dragSrc = ref<string | null>(null)

const sectionRefs = new Map<number, HTMLElement>()
const cardRefs = new Map<string, HTMLElement>()

const libOptions = computed(() => libs.value.map(l => ({ id: l.id, name: l.name })))
const published = computed(() => paper.value?.status === 4)
const typeLabel = (t: number) => TYPE_BUTTONS.find(b => b.type === t)?.label ?? '未知题型'
const chineseNo = (index: number) => CN_NUM[index] ?? String(index + 1)

/** 大题分组：接口返回的题卡 + 尚未保存的草稿按题型合并，保持"首次出现"的顺序。 */
interface SectionView {
  sectionIndex: number
  cards: PaperQuesCardData[]
  drafts: DraftCard[]
}

const sections = computed<SectionView[]>(() => {
  const list: SectionView[] = apiSections.value.map(s => ({
    sectionIndex: s.sectionIndex,
    cards: s.quesList || [],
    drafts: []
  }))
  for (const d of drafts.value) {
    let hit = list.find(s => s.sectionIndex === d.sectionIndex)
    if (!hit) {
      hit = { sectionIndex: d.sectionIndex, cards: [], drafts: [] }
      list.push(hit)
    }
    hit.drafts.push(d)
  }
  return list
})

/**
 * 统计只算"已确认"的题卡：草稿还在编辑中，不该计入试题数/总分/大题概览，
 * 否则一打开编辑卡片分数就先涨上去了（实测 bug）。
 */
const sectionQty = (s: SectionView) => s.cards.length
const sectionScore = (s: SectionView) =>
  s.cards.reduce((sum, c) => sum + Number(c.score ?? 0), 0)
const cardIndex = (s: SectionView, quesId: string) => s.cards.findIndex(c => c.quesId === quesId) + 1
const draftIndex = (s: SectionView, key: string) => s.drafts.findIndex(d => d.key === key) + 1

const totalQty = computed(() => sections.value.reduce((sum, s) => sum + sectionQty(s), 0))
const totalScore = computed(() => sections.value.reduce((sum, s) => sum + sectionScore(s), 0))

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

const loadPaper = async () => {
  if (!paperId) {
    toast.error('缺少试卷 id')
    return
  }
  try {
    paper.value = await getPaperDetail(paperId)
  } catch { /* 拦截器已提示 */ }
}

const loadCanvas = async () => {
  try {
    const canvas = await getPaperEditCanvas(paperId)
    apiSections.value = canvas.sections || []
    saveHint.value = '保存成功！'
    loadPaper()
  } catch { /* 拦截器已提示 */ }
}

/** 点题型 → 该题型大题末尾追加一张展开的编辑卡片（无该大题则新建）。 */
const addCard = (type: number) => {
  const key = `draft-${Date.now()}-${type}`
  drafts.value.push({
    key,
    sectionIndex: type,
    body: emptyBody(type),
    libId: defaultLibId.value,
    levelType: 1,
    // 组合题的分数来自各小题合计，草稿先记 0；其它题型给个常见默认值
    score: type === 5 ? 0 : 2
  })
  setTimeout(() => cardRefs.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
}

const onDraftSaved = (key: string) => {
  drafts.value = drafts.value.filter(d => d.key !== key)
  loadCanvas()
}

const removeDraft = (key: string) => {
  drafts.value = drafts.value.filter(d => d.key !== key)
}

const onCardSaved = () => {
  saveHint.value = '保存成功！'
  loadCanvas()
}

const removeCard = async (card: PaperQuesCardData) => {
  if (published.value) {
    toast.warn('已发布试卷不可删除题目')
    return
  }
  const ok = await confirmDialog({
    title: '确认从本卷移除该题？',
    message: '只移除试卷里的这道题，题库中的试题仍然保留',
    danger: true
  })
  if (!ok) return
  try {
    await removePaperQuestion(paperId, card.quesId)
    toast.success('已移除')
    loadCanvas()
  } catch { /* 拦截器已提示 */ }
}

/** 复制：把选中的题再挂一次（同源题目复用，只建新关联）。 */
const duplicateCard = async (card: PaperQuesCardData, sectionIndex: number) => {
  try {
    await pickPaperQuestions(paperId, [{
      quesId: card.quesId, score: Number(card.score ?? 0), sectionIndex
    }])
    toast.success('已复制该题')
    loadCanvas()
  } catch { /* 拦截器已提示 */ }
}

// ---- 拖拽排序（同一大题内）----
const onDragStart = (quesId: string) => {
  if (published.value) return
  dragSrc.value = quesId
}

const onDrop = async (sectionIndex: number, targetQuesId: string) => {
  const src = dragSrc.value
  dragSrc.value = null
  if (!src || src === targetQuesId) return
  const section = sections.value.find(s => s.sectionIndex === sectionIndex)
  if (!section) return
  const ids = section.cards.map(c => c.quesId)
  if (!ids.includes(src)) return
  const next = ids.filter(id => id !== src)
  next.splice(next.indexOf(targetQuesId), 0, src)
  try {
    await sortPaperQuestions(paperId, next.map((id, i) => ({
      quesId: id, sectionIndex, orderIndex: i + 1
    })))
    loadCanvas()
  } catch { /* 拦截器已提示 */ }
}

// ---- 定位 ----
const setSectionRef = (sectionIndex: number, el: HTMLElement | null) => {
  if (el) sectionRefs.set(sectionIndex, el)
  else sectionRefs.delete(sectionIndex)
}
const setCardRef = (key: string, el: HTMLElement | null) => {
  if (el) cardRefs.set(key, el)
  else cardRefs.delete(key)
}
const scrollToCard = (section: SectionView, n: number) => {
  const target = section.cards[n - 1]?.quesId
  if (!target) return
  cardRefs.get(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const openPick = (type: number) => {
  if (published.value) {
    toast.warn('已发布试卷不可新增题目')
    return
  }
  pickType.value = type
  showPick.value = true
}

const notReady = (name: string) => toast.warn(`${name}待考试模块联动后开放`)

const doRelease = async () => {
  const ok = await confirmDialog({
    title: '确认发布该试卷？',
    message: '发布后分值与题目将锁定，仅可修改题干/选项/答案/解析',
    danger: false
  })
  if (!ok) return
  try {
    await releasePaper(paperId)
    toast.success('试卷已发布')
    loadCanvas()
  } catch { /* 拦截器已提示 */ }
}

const goBack = () => {
  // 创建考试流程里返回第 1 步；独立编辑试卷时回试卷详情
  if (arrangeId) {
    router.push(`/exam/exam-mgmt/create?examType=onlineExam&arrangeId=${arrangeId}&step=1`)
    return
  }
  router.push(`/exam/paper/detail?paperId=${paperId}`)
}

/** F17 验收：固定卷无题时阻止进入下一步。 */
const goPublish = () => {
  if (!sections.value.length) {
    toast.warn('请先设置策略或添加试题')
    return
  }
  router.push(`/exam/exam-mgmt/create?examType=onlineExam&arrangeId=${arrangeId}&step=3`)
}

/** 步骤条只允许回第 1 步；第 3 步走 goPublish 的校验。 */
const canJumpStep = (no: number) => no === 1
const jumpStep = (no: number) => {
  if (no === 1) goBack()
  else if (no === 3) goPublish()
}

onMounted(async () => {
  loadCanvas()
  try {
    const res = await getLibList(1, 200, 'updateTime', 'desc', {
      queryType: 0, keyword: '', catalogId: 'root', routingPath: '',
      creatorUserId: '', disabled: 0
    })
    libs.value = res.records || []
    defaultLibId.value = libs.value[0]?.id || ''
  } catch { /* 拦截器已提示 */ }
})
</script>

<style scoped lang="scss">
.quick-edit { height: 100vh; display: flex; flex-direction: column; background: #fff; }

.edit-header {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 12px;
  height: 56px; padding: 0 20px; border-bottom: 1px solid #e8eaef;

  .back-btn {
    width: 26px; height: 26px; border: none; background: none;
    font-size: 20px; line-height: 1; color: #4a5368; cursor: pointer;
  }
  h1 { margin: 0; font-size: 15px; font-weight: 500; color: #303133; }
  .save-hint {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: #8a92a5;
    .hint-dot {
      width: 14px; height: 14px; border-radius: 50%;
      border: 1.5px solid #c7d0de; display: inline-block; position: relative;
    }
  }
  .header-actions { margin-left: auto; display: flex; gap: 10px; }
  .paper-steps { margin: 0 auto; }
  .sync-btn {
    padding: 6px 14px; border: 1px solid #e5e8ef; border-radius: 4px;
    background: #f5f7fa; color: #b0b7c3; font-size: 13px;
  }
}

.edit-body { flex: 1; min-height: 0; display: flex; }

// ---- 左侧竖排 tab ----
.tab-rail {
  flex: 0 0 58px; border-right: 1px solid #e8eaef;
  display: flex; flex-direction: column; padding-top: 14px; gap: 10px;

  .rail-tab {
    position: relative;
    /* el-button 自带行内间距，竖排时会让两个 tab 的图标基线错开；
       显式撑满并把内边距归零，改为对称 padding，图标与文字才会垂直居中对齐 */
    width: 100%;
    margin: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    padding: 10px 0; border: none; background: none; cursor: pointer;
    color: #8a92a5; font-size: 12px; line-height: 1;

    .rail-icon { font-size: 18px; line-height: 1; height: 18px; }
    .rail-text { writing-mode: vertical-rl; letter-spacing: 2px; line-height: 1; }

    &.active { color: #1890ff; }
    &.active::before {
      content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
      width: 3px; background: #1890ff; border-radius: 0 2px 2px 0;
    }
  }
}

// ---- 选择题型 ----
.type-panel {
  flex: 0 0 190px; border-right: 1px solid #e8eaef;
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 14px;

  .panel-title { margin: 0 0 4px; font-size: 14px; color: #303133; }

  .type-btn {
    /* el-button 默认按内容撑开：文字长短不同框宽就不同（"单选题"比"判断题"宽），
       统一成 100% 宽度才对得上 */
    width: 100%;
    /* Element Plus 对 .el-button + .el-button 加了 12px 左边距：
       不清掉的话第二个题型起会整体右移，和"单选题"及下方按钮对不齐 */
    margin-left: 0;
    display: flex; align-items: center; justify-content: flex-start; gap: 8px;
    padding: 11px 14px; border: 1px dashed #d9e1ec; border-radius: 6px;
    background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

    .type-icon { color: #8a92a5; font-size: 14px; }
    &:hover:not(:disabled) { border-color: #1890ff; color: #1890ff; }
    &:disabled { opacity: .55; cursor: not-allowed; }
  }

  .panel-foot {
    margin-top: auto; display: flex; flex-direction: column; gap: 10px;
  }

  .foot-btn {
    /* 同 type-btn：三个底部按钮文字长度不同（AI出题 / 从题库选题 / 导入），必须等宽 */
    width: 100%;
    margin-left: 0;
    padding: 10px 14px; border: 1px solid #d9d9d9; border-radius: 6px;
    background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

    &:hover:not(:disabled) { border-color: #1890ff; color: #1890ff; }
    &:disabled { opacity: .55; cursor: not-allowed; }
  }
}

// ---- 画布 ----
.canvas { flex: 1; min-width: 0; overflow-y: auto; padding: 16px 20px 40px; background: #fff; }

.empty-tip {
  margin: 60px 24px 0; padding: 70px 20px;
  border: 1px dashed #d9e1ec; border-radius: 8px; text-align: center; color: #8a92a5;

  .empty-icon { font-size: 30px; color: #c7d0de; }
  .empty-title { margin: 10px 0 4px; font-size: 14px; color: #667; }
  .empty-desc { margin: 0; font-size: 12px; color: #a0a7b8; }
}

.section { margin-bottom: 26px; }

.section-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 10px;

  .section-title { margin: 0; font-size: 15px; font-weight: 600; color: #303133; }
  .section-sub { margin: 4px 0 0; font-size: 12px; color: #8a92a5; }
  .section-tools { display: flex; gap: 14px; .tool { color: #b0b7c3; } }
}

// ---- 右侧统计 ----
.stat-panel {
  flex: 0 0 250px; border-left: 1px solid #e8eaef;
  display: flex; flex-direction: column; padding: 16px 16px 20px;

  .stat-card {
    display: flex; align-items: center; justify-content: space-around;
    padding: 14px 6px; background: #fafbfd; border-radius: 6px;
    margin-bottom: 10px;
  }
  .stat-cell {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    b { font-size: 20px; color: #303133; font-weight: 500; }
    span { font-size: 12px; color: #8a92a5; }
  }

  .stat-link {
    align-self: center; border: none; background: none; padding: 4px 0;
    font-size: 13px; color: #1890ff; cursor: pointer;

    &:hover:not(:disabled) { text-decoration: underline; }
    &:disabled { color: #c7d0de; cursor: not-allowed; }
  }

  .group-list { margin-top: 16px; display: flex; flex-direction: column; gap: 14px; }
  .group-title { margin: 0 0 8px; font-size: 13px; color: #303133; }
  .group-boxes { display: flex; flex-wrap: wrap; gap: 8px; }
  .group-box {
    width: 30px; height: 30px; border: 1px solid #d9e1ec; border-radius: 4px;
    background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

    &:hover { border-color: #1890ff; color: #1890ff; }
  }
  .group-empty { font-size: 12px; color: #b0b7c3; }

  .drag-hint {
    margin: auto 0 0; display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #8a92a5;

    .drag-dot {
      width: 12px; height: 12px; border-radius: 50%; background: #1890ff; display: inline-block;
    }
  }
}

.btn {
  padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
