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

    <!-- 答题详情（F13） -->
        <el-drawer
      v-if="answer"
      :model-value="true"
      size="640px"
      :with-header="false"
      append-to-body
      destroy-on-close
      class="exam-drawer"
      @close="answer = null"
    >
      <div class="drawer">
        <div class="drawer-header"><span>答题详情</span><span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="answer = null" @keydown.enter.prevent="answer = null">×</span></div>
        <div class="drawer-body">
          <p class="q-meta">{{ TYPE_LABELS[answer.type] }} · {{ LEVEL_LABELS[answer.levelType] }} · 正确率 {{ formatRate(answer.correctRate) }}（{{ answer.correctQty }}/{{ answer.submitQty }}）</p>
          <p class="q-label">题干</p>
          <div class="q-content" v-html="answer.content || answer.summary"></div>
          <p class="q-label">各选项选择情况</p>
          <div v-for="(o, i) in answer.options" :key="i" class="opt-stat">
            <span class="opt-key">{{ String.fromCharCode(65 + i) }}</span>
            <span class="opt-text">{{ o.itemContent }}</span>
            <span class="opt-bar"><i :style="{ width: barWidth(o.answerPercent) }"></i></span>
            <span class="opt-num">{{ o.answerQty }} 人 · {{ formatRate(o.answerPercent) }}</span>
            <span v-if="o.answer === 1" class="opt-correct">正确答案</span>
          </div>
          <p v-if="answer.explainText" class="q-label-row"><b>解析：</b><span v-html="answer.explainText"></span></p>
        </div>
      </div>
        </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
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
.filter-row { display: flex; gap: 8px; align-items: center; input { flex: 1; min-width: 150px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none; } .export-btn { margin-left: auto; } }
.filter-select { font-size: 12px; }
.table-wrap { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr:hover td { background: #fafbfe; }
.col-name { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-sm { min-width: 78px; white-space: nowrap; }
.col-point { min-width: 110px; }
.col-op { min-width: 130px; white-space: nowrap; }
.op-link { color: #1890ff; cursor: pointer; margin-right: 10px; &:hover { text-decoration: underline; } }
.empty-cell { text-align: center; color: #999; padding: 44px 0; }
.pagination { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667; button { padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; } } }
.drawer { width: 640px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600; .close-btn { font-size: 22px; color: #999; cursor: pointer; &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; } } }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; font-size: 13px; }
.q-meta { margin: 0 0 14px; color: #8a92a5; font-size: 12px; }
.q-label { margin: 14px 0 6px; color: #4a5368; font-weight: 500; }
.q-content { padding: 10px 12px; background: #fafbfd; border-radius: 6px; line-height: 1.8; }
.q-options { margin: 0; padding: 0; list-style: none; li { padding: 6px 0; &.correct { color: #52c41a; font-weight: 600; } } }
.q-label-row { margin: 10px 0 0; line-height: 1.8; b { color: #4a5368; } }
.q-updated { margin: 16px 0 0; font-size: 12px; color: #b0b7c3; }
.opt-stat { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.opt-key { width: 18px; color: #4a5368; }
.opt-text { flex: 0 0 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt-bar { flex: 1; height: 8px; background: #f0f2f5; border-radius: 4px; overflow: hidden; i { display: block; height: 100%; background: #1890ff; } }
.opt-num { min-width: 120px; color: #8a92a5; font-size: 12px; }
.opt-correct { color: #52c41a; font-size: 12px; }
.btn { padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer; &.primary { background: #1890ff; border-color: #1890ff; color: #fff; } }
</style>
