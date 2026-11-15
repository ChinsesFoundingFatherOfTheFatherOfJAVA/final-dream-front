<template>
  <!-- FP-07 试卷管理页（截图02）：页头 + 基本信息 + 试题列表 + 跨模块跳转 -->
  <div class="paper-detail">
    <header class="detail-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1 class="paper-name">
        {{ paper?.name || '试卷管理' }}
        <span class="build-tag">{{ paper?.buildType === 1 ? '随机出卷' : '固定出卷' }}</span>
        <span v-if="paper?.status === 4" class="status-tag">已发布</span>
      </h1>
      <div class="header-actions">
        <el-button v-if="paper && paper.status !== 4" class="btn primary" @click="doRelease">发布</el-button>
        <el-button class="btn" @click="goEdit">编辑</el-button>
      </div>
    </header>

    <section class="info-card">
      <div class="info-item"><span>试卷名称</span><strong>{{ paper?.name || '--' }}</strong></div>
      <div class="info-item"><span>试卷分类</span><strong>{{ paper?.catalogName || '--' }}</strong></div>
      <div class="info-item"><span>试卷保密</span><strong>{{ paper?.secrecy === 1 ? '保密' : '公开' }}</strong></div>
      <div class="info-item"><span>总分</span><strong>{{ paper?.totalScore ?? 0 }}</strong></div>
      <div class="info-item"><span>试题数</span><strong>{{ paper?.totalQuesQty ?? 0 }}</strong></div>
      <!-- FP-07：编辑基本信息（分类树 + 名称200字 + 保密）走抽屉，与新建共用组件 -->
      <el-button v-if="paper" class="edit-info-link" @click="showEditInfo = true">编辑基本信息</el-button>
    </section>

    <div class="tabs">
      <el-button class="tab" :class="{ active: tab === 'ques' }" @click="switchTab('ques')">试题列表</el-button>
      <el-button class="tab" :class="{ active: tab === 'overview' }" @click="switchTab('overview')">概览</el-button>
    </div>

    <section v-if="tab === 'overview'" class="list-card">
      <div v-if="overview && overview.total" class="charts">
        <div class="chart-box">
          <p class="chart-title">按题型</p>
          <div ref="typeChartRef" class="chart"></div>
        </div>
        <div class="chart-box">
          <p class="chart-title">按难度</p>
          <div ref="levelChartRef" class="chart"></div>
        </div>
        <div class="chart-box">
          <p class="chart-title">按考核点</p>
          <div ref="pointChartRef" class="chart"></div>
        </div>
      </div>
      <p v-else class="empty-cell">暂无试题，先到「试题列表」添加</p>
    </section>

    <section v-else class="list-card">
      <div class="filter-row">
        <el-select v-model="type" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="全部题型" />
          <el-option :value="0" label="单选题" />
          <el-option :value="1" label="多选题" />
          <el-option :value="2" label="判断题" />
          <el-option :value="3" label="填空题" />
          <el-option :value="4" label="问答题" />
        </el-select>
        <el-select v-model="levelType" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="全部难度" />
          <el-option :value="0" label="易" />
          <el-option :value="1" label="中" />
          <el-option :value="2" label="难" />
        </el-select>
        <el-input v-model.trim="keyword" placeholder="请输入试题名称搜索" @keyup.enter="reload(1)" />
        <el-button class="btn primary" @click="reload(1)">查询</el-button>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="records" row-key="quesId" empty-text="暂无试题">
          <el-table-column label="试题名称" min-width="300">
            <template #default="{ row }"><el-button link type="primary" @click="goQues(row)">{{ row.summary }}</el-button></template>
          </el-table-column>
          <el-table-column label="题型" width="100"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
          <el-table-column label="考核点" width="140" show-overflow-tooltip><template #default="{ row }">{{ row.mainPointName || '--' }}</template></el-table-column>
          <el-table-column label="所属题库" min-width="160">
            <template #default="{ row }"><el-button link type="primary" @click="goLib(row)">{{ row.libName || '--' }}</el-button></template>
          </el-table-column>
          <el-table-column label="难度" width="90"><template #default="{ row }">{{ levelLabel(row.levelType) }}</template></el-table-column>
          <el-table-column prop="score" label="分值" width="90" />
        </el-table>
      </div>

      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="pageNo"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="sizes, prev, pager, next"
          background
          @size-change="reload(1)"
          @current-change="reload"
        />
      </div>
    </section>

    <PaperFormDrawer
      v-if="showEditInfo && paper"
      mode="edit"
      :paper="paper"
      @close="showEditInfo = false"
      @saved="onInfoSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import * as echarts from 'echarts'
import PaperFormDrawer from './components/PaperFormDrawer.vue'
import {
  getPaperDetail, getPaperOverview, getPaperQuesList, releasePaper,
  type PaperDetail, type PaperOverview, type PaperQuesItem
} from '@/api/paper'

/** FP-07 试卷管理页：基本信息 + 试题列表；试题名/所属题库可跨模块跳到题库详情页。 */
const route = useRoute()
const router = useRouter()

const paperId = String(route.query.paperId ?? '')
const TYPE_LABELS: Record<number, string> = { 0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }

const paper = ref<PaperDetail | null>(null)
const records = ref<PaperQuesItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const type = ref(-1)
const levelType = ref(-1)
const keyword = ref('')
const loading = ref(false)

/** 概览 tab（FP-15）：三环形图 + 中心总数。 */
const tab = ref<'ques' | 'overview'>('ques')
const overview = ref<PaperOverview | null>(null)
const typeChartRef = ref<HTMLDivElement | null>(null)
const levelChartRef = ref<HTMLDivElement | null>(null)
const pointChartRef = ref<HTMLDivElement | null>(null)
let typeChart: echarts.ECharts | null = null
let levelChart: echarts.ECharts | null = null
let pointChart: echarts.ECharts | null = null

const typeLabel = (v: number) => TYPE_LABELS[v] ?? '--'
const levelLabel = (v: number) => LEVEL_LABELS[v] ?? '--'

const load = async () => {
  if (!paperId) {
    toast.error('缺少试卷 id')
    return
  }
  try {
    paper.value = await getPaperDetail(paperId)
  } catch { /* 拦截器已提示 */ }
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res = await getPaperQuesList(paperId, pageNo.value, pageSize.value, type.value, levelType.value, keyword.value)
    total.value = res.total || 0
    records.value = res.records || []
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/exam/paper')

const loadOverview = async () => {
  try {
    overview.value = await getPaperOverview(paperId)
  } catch { /* 拦截器已提示 */ }
}

/** 单个环形图：中心显示总数，右侧图例。 */
const renderRing = (
  chart: echarts.ECharts | null,
  el: HTMLDivElement | null,
  items: { name: string; count: number }[],
  total: number
) => {
  if (!el) return chart
  const instance = chart ?? echarts.init(el)
  instance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 0, top: 'center', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['52%', '72%'],
      center: ['36%', '50%'],
      avoidLabelOverlap: false,
      label: { show: true, position: 'center', formatter: () => `{v|${total}}\n{t|总数}`, rich: {
        v: { fontSize: 18, fontWeight: 600, color: 'var(--color-ink)' },
        t: { fontSize: 11, color: 'var(--color-muted)', padding: [4, 0, 0, 0] }
      } },
      labelLine: { show: false },
      data: items.map(i => ({ name: i.name, value: i.count }))
    }]
  })
  return instance
}

const renderOverview = async () => {
  if (!overview.value) return
  await nextTick()
  typeChart = renderRing(typeChart, typeChartRef.value, overview.value.byType, overview.value.total)
  levelChart = renderRing(levelChart, levelChartRef.value, overview.value.byLevel, overview.value.total)
  pointChart = renderRing(pointChart, pointChartRef.value, overview.value.byPoint, overview.value.total)
}

const switchTab = async (next: 'ques' | 'overview') => {
  tab.value = next
  if (next === 'overview') {
    await loadOverview()
    renderOverview()
  }
}

watch(overview, () => { renderOverview() })

const goEdit = () => {
  // 固定卷 → 固定卷编辑页；随机卷 → 随机卷编辑页
  const path = paper.value?.buildType === 1 ? '/exam/paper/auto' : '/exam/paper/quick'
  router.push(`${path}?paperId=${paperId}`)
}

/** 「编辑基本信息」抽屉关闭后的收尾：刷新页头与基本信息。 */
const showEditInfo = ref(false)
const onInfoSaved = () => {
  showEditInfo.value = false
  load()
}

/** 试题名 → 题库详情页并定位单题（题库 07 §9 增量：list 支持 quesId）。 */
const goQues = (row: PaperQuesItem) => {
  router.push(`/exam/queslib/detail?libId=${row.libId}&quesId=${row.quesId}`)
}

const goLib = (row: PaperQuesItem) => {
  router.push(`/exam/queslib/detail?libId=${row.libId}`)
}

const doRelease = async () => {
  const ok = await confirmDialog({
    title: '确认发布该试卷？',
    message: '发布后仅可修改题干/选项/答案/解析，分值与抽题策略将被锁定',
    danger: false
  })
  if (!ok) return
  try {
    await releasePaper(paperId)
    toast.success('试卷已发布')
    load()
  } catch { /* 拦截器已提示 */ }
}

onMounted(() => {
  load()
  reload(1)
})
</script>

<style scoped lang="scss">
// 页面自管滚动（.exam-content 为 overflow:hidden，见 QuesFormPage 同款注释）
.paper-detail { padding: 16px 20px 24px; display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; overflow-y: auto; }

.tabs {
  display: flex; gap: 4px; border-bottom: 1px solid var(--color-rule);

  .tab {
    padding: 8px 18px; border: none; border-bottom: 2px solid transparent;
    background: transparent; color: var(--color-ink-2); font-size: 14px; cursor: pointer;

    &.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }
  }
}

.charts { display: flex; flex-wrap: wrap; gap: 16px; }

.chart-box {
  flex: 1 1 280px; min-width: 260px;
  border: 1px solid var(--color-rule); border-radius: 6px; padding: 10px;

  .chart-title { margin: 0 0 6px; font-size: 12px; color: var(--color-muted); }
  .chart { width: 100%; height: 220px; }
}

.detail-header {
  display: flex; align-items: center; gap: 10px;

  .back-btn {
    width: 28px; height: 28px; border: 1px solid var(--color-rule-2); border-radius: 4px;
    background: var(--color-paper); font-size: 18px; line-height: 1; color: var(--color-ink-2); cursor: pointer;
    &:hover { border-color: var(--color-accent); color: var(--color-accent); }
  }

  .paper-name {
    flex: 1; margin: 0; font-size: 17px; font-weight: 600; color: var(--color-ink);
    display: flex; align-items: center; gap: 8px;
  }

  .build-tag {
    padding: 1px 6px; border-radius: 3px; background: color-mix(in oklab, var(--color-warning) 16%, var(--color-paper));
    border: 1px solid color-mix(in oklab, var(--color-warning) 45%, var(--color-paper)); color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink)); font-size: 11px; font-weight: 400;
  }
  .status-tag {
    padding: 1px 6px; border-radius: 3px; background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper));
    border: 1px solid color-mix(in oklab, var(--color-success) 40%, var(--color-paper)); color: var(--color-success); font-size: 11px; font-weight: 400;
  }

  .header-actions { display: flex; gap: 8px; }
}

.info-card {
  display: flex; flex-wrap: wrap; gap: 24px;
  padding: 14px 18px; border: 1px solid var(--color-rule); border-radius: 8px; background: var(--color-paper);

  .info-item {
    display: flex; align-items: baseline; gap: 8px; font-size: 13px;
    span { color: var(--color-muted); }
    strong { color: var(--color-ink); font-weight: 500; }
  }

  .edit-info-link {
    margin-left: auto;
    border: none; background: none; padding: 0;
    font-size: 13px; color: var(--color-accent); cursor: pointer;

    &:hover { text-decoration: underline; }
  }
}

.list-card {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px 18px; border: 1px solid var(--color-rule); border-radius: 8px; background: var(--color-paper);
}

.filter-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;

  .filter-select { font-size: 12px; max-width: 130px; }
  .el-input { flex: 1; min-width: 160px; font-size: 12px; }
}

.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--color-paper-2); }
th { background: var(--color-paper-2); color: var(--color-muted); font-weight: 500; white-space: nowrap; }
tr:hover td { background: var(--color-accent-wash); }

.col-name { min-width: 240px; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-point { min-width: 130px; }
.col-lib { min-width: 130px; }
.col-sm { min-width: 72px; white-space: nowrap; }

.link { color: var(--color-accent); cursor: pointer; &:hover { text-decoration: underline; } }
.empty-cell { text-align: center; color: var(--color-muted); padding: 40px 0; }

.pagination {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--color-muted);

  button {
    padding: 4px 10px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }
  select { margin-left: auto; border: 1px solid var(--color-rule-2); border-radius: 4px; padding: 4px 6px; font-size: 12px; }
}

.btn {
  padding: 7px 16px; border: 1px solid var(--color-rule-2); border-radius: 4px;
  background: var(--color-paper); font-size: 13px; color: var(--color-ink-2); cursor: pointer;
  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
}
</style>
