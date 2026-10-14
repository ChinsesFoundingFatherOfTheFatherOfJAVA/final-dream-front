<template>
  <!-- FP-07 试卷管理页（截图02）：页头 + 基本信息 + 试题列表 + 跨模块跳转 -->
  <div class="paper-detail">
    <header class="detail-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1 class="paper-name">
        {{ paper?.name || '试卷管理' }}
        <span class="build-tag">{{ paper?.buildType === 1 ? '随机出卷' : '固定出卷' }}</span>
        <span v-if="paper?.status === 4" class="status-tag">已发布</span>
      </h1>
      <div class="header-actions">
        <button v-if="paper && paper.status !== 4" class="btn primary" type="button" @click="doRelease">发布</button>
        <button class="btn" type="button" @click="goEdit">编辑</button>
      </div>
    </header>

    <section class="info-card">
      <div class="info-item"><span>试卷名称</span><strong>{{ paper?.name || '--' }}</strong></div>
      <div class="info-item"><span>试卷分类</span><strong>{{ paper?.catalogName || '--' }}</strong></div>
      <div class="info-item"><span>试卷保密</span><strong>{{ paper?.secrecy === 1 ? '保密' : '公开' }}</strong></div>
      <div class="info-item"><span>总分</span><strong>{{ paper?.totalScore ?? 0 }}</strong></div>
      <div class="info-item"><span>试题数</span><strong>{{ paper?.totalQuesQty ?? 0 }}</strong></div>
      <!-- FP-07：编辑基本信息（分类树 + 名称200字 + 保密）走抽屉，与新建共用组件 -->
      <button v-if="paper" class="edit-info-link" type="button" @click="showEditInfo = true">编辑基本信息</button>
    </section>

    <div class="tabs">
      <button class="tab" type="button" :class="{ active: tab === 'ques' }" @click="switchTab('ques')">试题列表</button>
      <button class="tab" type="button" :class="{ active: tab === 'overview' }" @click="switchTab('overview')">概览</button>
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
        <select v-model.number="type" class="filter-select" @change="reload(1)">
          <option :value="-1">全部题型</option>
          <option :value="0">单选题</option>
          <option :value="1">多选题</option>
          <option :value="2">判断题</option>
          <option :value="3">填空题</option>
          <option :value="4">问答题</option>
        </select>
        <select v-model.number="levelType" class="filter-select" @change="reload(1)">
          <option :value="-1">全部难度</option>
          <option :value="0">易</option>
          <option :value="1">中</option>
          <option :value="2">难</option>
        </select>
        <input v-model.trim="keyword" type="search" placeholder="请输入试题名称搜索" @keyup.enter="reload(1)" />
        <button class="btn primary" type="button" @click="reload(1)">查询</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-name">试题名称</th>
              <th class="col-sm">题型</th>
              <th class="col-point">考核点</th>
              <th class="col-lib">所属题库</th>
              <th class="col-sm">难度</th>
              <th class="col-sm">分值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in records" :key="row.quesId">
              <!-- 跨模块跳转：带 quesId，题库详情页只展示该题 -->
              <td class="col-name">
                <span class="link" :title="row.summary"
                      @click="goQues(row)">{{ row.summary }}</span>
              </td>
              <td class="col-sm">{{ typeLabel(row.type) }}</td>
              <td class="col-point" :title="row.mainPointName">{{ row.mainPointName || '--' }}</td>
              <td class="col-lib">
                <span class="link" @click="goLib(row)">{{ row.libName || '--' }}</span>
              </td>
              <td class="col-sm">{{ levelLabel(row.levelType) }}</td>
              <td class="col-sm">{{ row.score }}</td>
            </tr>
            <tr v-if="!loading && !records.length">
              <td colspan="6" class="empty-cell">暂无试题</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <button :disabled="pageNo <= 1" type="button" @click="reload(pageNo - 1)">上一页</button>
        <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <button :disabled="pageNo >= Math.ceil(total / pageSize)" type="button" @click="reload(pageNo + 1)">下一页</button>
        <select v-model.number="pageSize" @change="reload(1)">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
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
        v: { fontSize: 18, fontWeight: 600, color: '#1f2937' },
        t: { fontSize: 11, color: '#8a92a5', padding: [4, 0, 0, 0] }
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
.paper-detail { padding: 16px 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.tabs {
  display: flex; gap: 4px; border-bottom: 1px solid #e5e8ef;

  .tab {
    padding: 8px 18px; border: none; border-bottom: 2px solid transparent;
    background: transparent; color: #4a5368; font-size: 14px; cursor: pointer;

    &.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 600; }
  }
}

.charts { display: flex; flex-wrap: wrap; gap: 16px; }

.chart-box {
  flex: 1 1 280px; min-width: 260px;
  border: 1px solid #eef1f6; border-radius: 6px; padding: 10px;

  .chart-title { margin: 0 0 6px; font-size: 12px; color: #8a92a5; }
  .chart { width: 100%; height: 220px; }
}

.detail-header {
  display: flex; align-items: center; gap: 10px;

  .back-btn {
    width: 28px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px;
    background: #fff; font-size: 18px; line-height: 1; color: #4a5368; cursor: pointer;
    &:hover { border-color: #1890ff; color: #1890ff; }
  }

  .paper-name {
    flex: 1; margin: 0; font-size: 17px; font-weight: 600; color: #1f2937;
    display: flex; align-items: center; gap: 8px;
  }

  .build-tag {
    padding: 1px 6px; border-radius: 3px; background: #fff7e6;
    border: 1px solid #ffd591; color: #d46b08; font-size: 11px; font-weight: 400;
  }
  .status-tag {
    padding: 1px 6px; border-radius: 3px; background: #f6ffed;
    border: 1px solid #b7eb8f; color: #389e0d; font-size: 11px; font-weight: 400;
  }

  .header-actions { display: flex; gap: 8px; }
}

.info-card {
  display: flex; flex-wrap: wrap; gap: 24px;
  padding: 14px 18px; border: 1px solid #e5e8ef; border-radius: 8px; background: #fff;

  .info-item {
    display: flex; align-items: baseline; gap: 8px; font-size: 13px;
    span { color: #8a92a5; }
    strong { color: #1f2937; font-weight: 500; }
  }

  .edit-info-link {
    margin-left: auto;
    border: none; background: none; padding: 0;
    font-size: 13px; color: #1890ff; cursor: pointer;

    &:hover { text-decoration: underline; }
  }
}

.list-card {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px 18px; border: 1px solid #e5e8ef; border-radius: 8px; background: #fff;
}

.filter-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;

  .filter-select {
    border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; max-width: 130px;
  }
  input {
    flex: 1; min-width: 160px; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 6px 10px; font-size: 12px; outline: none;
  }
}

.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr:hover td { background: #fafbfe; }

.col-name { min-width: 240px; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-point { min-width: 130px; }
.col-lib { min-width: 130px; }
.col-sm { min-width: 72px; white-space: nowrap; }

.link { color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }
.empty-cell { text-align: center; color: #999; padding: 40px 0; }

.pagination {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667;

  button {
    padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }
  select { margin-left: auto; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
}

.btn {
  padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
}
</style>
