<template>
  <!-- F13 试题分析 tab：筛选 + 试题列表 + 试题查看抽屉 + 答题详情抽屉 -->
  <section class="list-card">
    <div class="filter-row">
      <el-select v-model="query.type" class="filter-select" @change="reload(1)">
        <el-option :value="-1" label="全部题型" />
        <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
      </el-select>
      <el-select v-model="query.levelType" class="filter-select" @change="reload(1)">
        <el-option :value="-1" label="全部难度" />
        <el-option :value="0" label="易" /><el-option :value="1" label="中" /><el-option :value="2" label="难" />
      </el-select>
      <el-input v-model.trim="query.keyword" placeholder="试题名称搜索" @keyup.enter="reload(1)" />
      <el-button class="btn primary" @click="reload(1)">查询</el-button>
      <el-button class="btn export-btn" @click="doExport">导出数据</el-button>
    </div>

    <div class="table-wrap">
      <el-table :data="list" row-key="quesId" empty-text="暂无数据，先点考试详情的「分析数据」">
        <el-table-column prop="summary" label="试题名称" min-width="240" show-overflow-tooltip />
        <el-table-column label="题型" width="100"><template #default="{ row }">{{ TYPE_LABELS[row.quesType] ?? '--' }}</template></el-table-column>
        <el-table-column label="难度" width="90"><template #default="{ row }">{{ LEVEL_LABELS[row.levelType] ?? '--' }}</template></el-table-column>
        <el-table-column prop="pointName" label="考核点" width="140" />
        <el-table-column prop="submitQty" label="作答人数" width="100" />
        <el-table-column prop="correctQty" label="正确人数" width="100" />
        <el-table-column label="正确率" width="100"><template #default="{ row }">{{ formatRate(row.correctRate) }}</template></el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link type="primary" @click="openView(row)">查看</el-button>
            <el-button link type="primary" @click="openAnswer(row)">答题详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination">
      <span>共 {{ total }} 条</span>
      <el-pagination v-model:current-page="pageNo" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="reload" />
    </div>

    <!-- 试题查看（F13） -->
        <el-drawer
      v-if="view"
      :model-value="true"
      size="640px"
      :with-header="false"
      append-to-body
      destroy-on-close
      class="exam-drawer"
      @close="view = null"
    >
      <div class="drawer">
        <div class="drawer-header"><span>试题查看</span><span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="view = null" @keydown.enter.prevent="view = null">×</span></div>
        <div class="drawer-body">
          <p class="q-meta">{{ TYPE_LABELS[view.type] }} · {{ LEVEL_LABELS[view.levelType] }} · 考核点：{{ (view.points || []).join('；') || '--' }}</p>
          <p class="q-label">题干</p>
          <div class="q-content" v-html="view.content || view.summary"></div>
          <template v-if="view.questionItems?.length">
            <p class="q-label">选项</p>
            <ul class="q-options">
              <li v-for="(o, i) in view.questionItems" :key="i" :class="{ correct: o.answer === 1 }">
                {{ String.fromCharCode(65 + i) }}. <span v-html="o.itemContent"></span>
              </li>
            </ul>
          </template>
          <p v-if="view.answerContent" class="q-label-row"><b>答案：</b>{{ view.answerContent }}</p>
          <p v-if="view.explainText" class="q-label-row"><b>解析：</b><span v-html="view.explainText"></span></p>
          <p class="q-updated">更新人：{{ view.updatedBy || '--' }} · {{ view.updatedAt || '--' }}</p>
        </div>
      </div>
        </el-drawer>

    <!--
      答题详情抽屉（2026-11-13 按原平台重排，台账 1a0f）

      原平台实测（截图见 观察素材/施工比对/原平台-答题详情抽屉.png）：
      - 宽约 474px，**没有标题栏**，打开后第一行直接是题干
      - 选项是「radio 圆圈 + A. 文字」，进度条在文字下方，比例人数与进度条同行
      - 正确答案靠「圆心实心 + 进度条变蓝」标识，**没有**额外的文字标签
      - 底部是蓝底小标签（答案/难度/正确率/解析）四行左对齐
      我方原先带标题栏、顶部 meta、字母前缀、文字标签、纯文本解析行，全部按上面改掉。

      关闭方式：去掉标题栏后靠「点遮罩」+ 右下角 × 按钮，两者都保留，
      否则学员/管理端会找不到怎么关。
    -->
    <el-drawer
      v-if="answer"
      :model-value="true"
      size="474px"
      :with-header="false"
      append-to-body
      destroy-on-close
      class="exam-drawer answer-detail-drawer"
      @close="answer = null"
    >
      <div class="drawer answer-detail">
        <!-- 题干：无「题干」标签，直接是题目文字 -->
        <div class="ad-stem" v-html="answer.content || answer.summary"></div>

        <!-- 选项：radio 圆圈 + 字母. 文字；进度条在下、比例人数同行 -->
        <div
          v-for="(o, i) in answer.options"
          :key="i"
          class="ad-opt"
          :class="{ 'is-correct': o.answer === 1 }"
        >
          <span class="ad-radio" aria-hidden="true"></span>
          <div class="ad-opt-main">
            <span class="ad-opt-label">{{ String.fromCharCode(65 + i) }}. {{ o.itemContent }}</span>
            <div class="ad-opt-bar-row">
              <span class="ad-bar"><i :style="{ width: barWidth(o.answerPercent) }"></i></span>
              <span class="ad-opt-num">{{ formatRate(o.answerPercent) }}（{{ o.answerQty }}人）</span>
            </div>
          </div>
        </div>

        <!-- 底部信息：蓝底小标签 + 值，四行 -->
        <dl class="ad-meta">
          <dt>答案</dt>
          <dd>{{ correctAnswerText }}</dd>
          <dt>难度</dt>
          <dd>{{ LEVEL_LABELS[answer.levelType] }}</dd>
          <dt>正确率</dt>
          <dd>{{ formatRate(answer.correctRate) }}</dd>
          <template v-if="answer.explainText">
            <dt>解析</dt>
            <dd v-html="answer.explainText"></dd>
          </template>
        </dl>

        <!-- 无标题栏后的关闭出口 -->
        <button class="ad-close" type="button" aria-label="关闭" @click="answer = null">×</button>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  exportArrangeQuestions, getArrangeAnswerDetail, getArrangeQuestionStats, getArrangeQuestionView,
  type ArrangeAnswerDetail, type ArrangeQuestionStat, type ArrangeQuestionView
} from '@/api/arrange'

const props = defineProps<{ arrangeId: string }>()

const TYPE_LABELS: Record<number, string> = { 0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }

const list = ref<ArrangeQuestionStat[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 10
const view = ref<ArrangeQuestionView | null>(null)
const answer = ref<ArrangeAnswerDetail | null>(null)
const query = reactive({ type: -1, levelType: -1, keyword: '' })

const formatRate = (r: number) => `${(((r ?? 0) * 100)).toFixed(2)}%`
const barWidth = (r: number) => `${Math.min(100, Math.round((r ?? 0) * 100))}%`

/**
 * 正确答案的展示文本（2026-11-13）。
 *
 * <p>原平台底部「答案」行显示的是选项字母（如 `B`、`A、B、C`），
 * 而接口给的是每个 option 的 `answer` 标记（1 = 正确）。这里从标记反推字母，
 * 顺序与选项一致，多选时用顿号连接。
 *
 * <p>为什么不在模板里直接算：模板里写 `filter` + `map` + `join` 会把
 * 「正确答案」这个语义埋进表达式，改起来容易漏；抽成 computed 后
 * 单测和肉眼都能一眼看懂它是什么。
 */
const correctAnswerText = computed(() => {
  const opts = answer.value?.options ?? []
  const letters = opts
    .map((o, i) => (o.answer === 1 ? String.fromCharCode(65 + i) : ''))
    .filter(Boolean)
  return letters.length ? letters.join('、') : '--'
})

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  try {
    const res = await getArrangeQuestionStats(props.arrangeId, pageNo.value, pageSize, query)
    list.value = res.records || []
    total.value = res.total || 0
  } catch { /* 拦截器已提示 */ }
}

const openView = async (row: ArrangeQuestionStat) => {
  try {
    view.value = await getArrangeQuestionView(props.arrangeId, row.quesId)
  } catch { /* 拦截器已提示 */ }
}

const openAnswer = async (row: ArrangeQuestionStat) => {
  try {
    answer.value = await getArrangeAnswerDetail(props.arrangeId, row.quesId)
  } catch { /* 拦截器已提示 */ }
}

onMounted(() => reload(1))

/** 导出当前筛选条件下的试题分析（后端 POI 生成 xlsx）。 */
const doExport = async () => {
  try {
    await exportArrangeQuestions(props.arrangeId, {
      type: query.type, levelType: query.levelType, keyword: query.keyword
    })
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}
</script>

<style scoped lang="scss">
.list-card { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 0 0 12px; }
.filter-row { display: flex; gap: 8px; align-items: center; input { flex: 1; min-width: 150px; border: 1px solid var(--color-rule-2); border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none; } .export-btn { margin-left: auto; } }
.filter-select { font-size: 12px; }
.table-wrap { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--color-paper-2); }
th { background: var(--color-paper-2); color: var(--color-muted); font-weight: 500; white-space: nowrap; }
tr:hover td { background: var(--color-accent-wash); }
.col-name { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-sm { min-width: 78px; white-space: nowrap; }
.col-point { min-width: 110px; }
.col-op { min-width: 130px; white-space: nowrap; }
.op-link { color: var(--color-accent); cursor: pointer; margin-right: 10px; &:hover { text-decoration: underline; } }
.empty-cell { text-align: center; color: var(--color-muted); padding: 44px 0; }
.pagination { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--color-muted); button { padding: 4px 10px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); cursor: pointer; &:disabled { opacity: .5; } } }
.drawer { width: 640px; height: 100%; background: var(--color-paper); display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-rule); font-size: 15px; font-weight: 600; .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } } }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; font-size: 13px; }
.q-meta { margin: 0 0 14px; color: var(--color-muted); font-size: 12px; }
.q-label { margin: 14px 0 6px; color: var(--color-ink-2); font-weight: 500; }
.q-content { padding: 10px 12px; background: var(--color-paper-2); border-radius: 6px; line-height: 1.8; }
.q-options { margin: 0; padding: 0; list-style: none; li { padding: 6px 0; &.correct { color: var(--color-success); font-weight: 600; } } }
.q-label-row { margin: 10px 0 0; line-height: 1.8; b { color: var(--color-ink-2); } }
.q-updated { margin: 16px 0 0; font-size: 12px; color: var(--color-rule-2); }
.opt-stat { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.opt-key { width: 18px; color: var(--color-ink-2); }
.opt-text { flex: 0 0 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt-bar { flex: 1; height: 8px; background: var(--color-paper-2); border-radius: 4px; overflow: hidden; i { display: block; height: 100%; background: var(--color-accent); } }
.opt-num { min-width: 120px; color: var(--color-muted); font-size: 12px; }
.opt-correct { color: var(--color-success); font-size: 12px; }
.btn { padding: 7px 16px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); font-size: 13px; cursor: pointer; &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); } }

/* ===== 答题详情抽屉（2026-11-13，对齐原平台，台账 1a0f） ===== */

/*
 * 抽屉本体：474px 宽、无标题栏，内容直接从题干开始。
 * 原平台实测宽 474px（截图逐像素量得），比原先的 640px 窄一圈，
 * 目的是让抽屉不遮挡左侧试题列表——批阅人要边看列表边看详情。
 */
.answer-detail-drawer {
  :deep(.el-drawer__body) { padding: 0; }
}

.answer-detail {
  position: relative;
  padding: 20px 24px 32px;
}

/* 题干：无「题干」标签，稍大字号以充当原来的标题位 */
.ad-stem {
  margin-bottom: 18px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink);
}

/* 选项行：radio 圆圈 + 文字/进度条两行 */
.ad-opt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
}

/*
 * radio 圆圈：未选中是空心灰圈；正确答案（.is-correct）是实心蓝点。
 * 原平台就是靠这个 + 进度条变蓝来标识正确答案，**没有**额外的文字标签，
 * 所以这里不再渲染「正确答案」四个字。
 */
.ad-radio {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-top: 3px;
  border: 1px solid var(--color-rule-2);
  border-radius: 50%;
  background: var(--color-paper);
}

.is-correct .ad-radio {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: inset 0 0 0 3px var(--color-accent-ink);
}

.ad-opt-main { flex: 1; min-width: 0; }

.ad-opt-label {
  display: block;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-ink);
}

.ad-opt-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.ad-bar {
  flex: 1;
  height: 6px;
  background: var(--color-paper-2);
  border-radius: 3px;
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    background: var(--color-rule-2);
  }
}

/* 正确答案的进度条变蓝，与圆圈呼应 */
.is-correct .ad-bar i { background: var(--color-accent); }

.ad-opt-num {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--color-muted);
}

/* 底部信息：蓝底小标签 + 值，两列对齐 */
.ad-meta {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 8px 12px;
  margin: 20px 0 0;
  font-size: 13px;

  dt {
    height: 22px;
    padding: 0 6px;
    border-radius: 2px;
    background: var(--color-accent-wash);
    color: var(--color-accent-deep);
    font-size: 12px;
    line-height: 22px;
    text-align: center;
  }

  dd {
    margin: 0;
    line-height: 22px;
    color: var(--color-ink);
    word-break: break-word;
  }
}

/* 无标题栏后的关闭按钮：贴右上角，点遮罩也能关 */
.ad-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  &:hover { background: var(--color-paper-2); color: var(--color-ink); }
}
</style>

