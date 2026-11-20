<template>
  <div class="project-overview">
    <section class="summary-grid">
      <article class="summary-card">
        <p class="summary-label">学员总数</p>
        <p class="summary-value">{{ summary.totalStudentNum }}</p>
        <p class="summary-foot">实际学习人数 {{ summary.learnStudentNum }}</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">学习次数</p>
        <p class="summary-value">{{ summary.totalLearnTimes }}</p>
        <p class="summary-foot">平均学习次数 {{ summary.percapitaLearnTimes }}</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">完成人数</p>
        <p class="summary-value">{{ summary.completedPeoples }}</p>
        <p class="summary-foot">完成率 {{ summary.completionRate }}</p>
      </article>
    </section>

    <section class="panel-grid">
      <article class="chart-panel">
        <header class="panel-header">
          <h3>按次平均分</h3>
        </header>
        <div class="chart-box">
          <div ref="timesChartRef" class="chart-canvas"></div>
          <p v-if="!timesAverages.length" class="chart-empty">暂无学习数据</p>
        </div>
      </article>

      <article class="chart-panel">
        <header class="panel-header">
          <h3>学习雷达</h3>
          <div class="tab-switch" role="tablist" aria-label="雷达数据口径">
            <span
              class="tab-switch__thumb"
              :style="{ transform: radarTab === 'first' ? 'translateX(100%)' : 'translateX(0)' }"
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              class="tab-switch__item"
              :class="{ 'is-active': radarTab === 'overall' }"
              :aria-selected="radarTab === 'overall'"
              @click="radarTab = 'overall'"
            >
              总均分
            </button>
            <button
              type="button"
              role="tab"
              class="tab-switch__item"
              :class="{ 'is-active': radarTab === 'first' }"
              :aria-selected="radarTab === 'first'"
              @click="radarTab = 'first'"
            >
              记录
            </button>
          </div>
        </header>
        <RadarChart
          v-if="radarDimensions.length"
          :dimensions="radarDimensions"
          :last-dimensions="null"
        />
        <div v-else class="chart-empty chart-empty-inline">暂无学习数据</div>
      </article>
    </section>

    <section class="chart-panel active-panel">
      <header class="panel-header">
        <h3>学员活跃统计</h3>
      </header>
      <div class="chart-box">
        <div ref="activeChartRef" class="chart-canvas chart-canvas-active"></div>
        <p v-if="activeEmpty" class="chart-empty">暂无学习数据</p>
      </div>
    </section>

    <section class="table-panel">
      <header class="panel-header table-header">
        <div class="tab-switch" role="tablist" aria-label="统计口径">
          <span
            class="tab-switch__thumb"
            :style="{ transform: tableMode === 'dept' ? 'translateX(100%)' : 'translateX(0)' }"
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            class="tab-switch__item"
            :class="{ 'is-active': tableMode === 'student' }"
            :aria-selected="tableMode === 'student'"
            @click="switchTableMode('student')"
          >
            学员模式
          </button>
          <button
            type="button"
            role="tab"
            class="tab-switch__item"
            :class="{ 'is-active': tableMode === 'dept' }"
            :aria-selected="tableMode === 'dept'"
            @click="switchTableMode('dept')"
          >
            部门模式
          </button>
        </div>
      </header>

      <div v-if="tableMode === 'student'" class="filter-bar">
        <el-select v-model="filters.finishStatus" placeholder="全部完成状态" @change="searchTable">
          <el-option label="全部完成状态" :value="null" />
          <el-option label="未开始" :value="0" />
          <el-option label="未完成" :value="1" />
          <el-option label="已完成" :value="2" />
        </el-select>
        <el-button class="filter-picker" @click="openFilterPicker('dept')">
          部门{{ selectedDeptIds.length ? `（${selectedDeptIds.length}）` : '' }}
        </el-button>
        <el-button class="filter-picker" @click="openFilterPicker('position')">
          岗位{{ selectedPostIds.length ? `（${selectedPostIds.length}）` : '' }}
        </el-button>
        <el-input
          v-model.trim="filters.keyword"
          placeholder="姓名 / 账号 / 工号"
          clearable
          @keyup.enter="searchTable"
        />
        <el-button class="primary-btn" @click="searchTable">查询</el-button>
      </div>

      <div v-else class="filter-bar">
        <el-button class="filter-picker" @click="openFilterPicker('dept')">
          部门{{ selectedDeptIds.length ? `（${selectedDeptIds.length}）` : '' }}
        </el-button>
        <el-button class="primary-btn" @click="searchTable">查询</el-button>
      </div>

      <div class="table-wrap">
        <el-table
          v-if="tableMode === 'student'"
          v-loading="tableLoading"
          :data="studentRows"
          row-key="userId"
          class="data-table"
          empty-text="暂无学员数据"
        >
          <el-table-column label="姓名" min-width="120">
            <template #default="{ row }">
              <span class="name-cell">
                {{ row.fullname || '--' }}
                <el-tag v-if="row.userStatus === 0" size="small" type="warning">已禁用</el-tag>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="账号" min-width="130"><template #default="{ row }">{{ row.username || '--' }}</template></el-table-column>
          <el-table-column label="工号" width="120"><template #default="{ row }">{{ row.userNo || '--' }}</template></el-table-column>
          <el-table-column label="部门" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.deptFullName || '--' }}</template></el-table-column>
          <el-table-column label="岗位" min-width="130"><template #default="{ row }">{{ row.positionName || '--' }}</template></el-table-column>
          <el-table-column label="最高得分" width="100"><template #default="{ row }">{{ valueOrDash(row.highestScore) }}</template></el-table-column>
          <el-table-column label="最高排名" width="100"><template #default="{ row }">{{ valueOrDash(row.highestRank) }}</template></el-table-column>
          <el-table-column label="学习次数" width="100"><template #default="{ row }">{{ row.learnTimes ?? 0 }}</template></el-table-column>
          <el-table-column label="学习时长(min)" width="130"><template #default="{ row }">{{ valueOrDash(row.learnDurationMin) }}</template></el-table-column>
          <el-table-column label="完成状态" width="110"><template #default="{ row }"><el-tag>{{ row.finishStatusText || '--' }}</el-tag></template></el-table-column>
        </el-table>

        <el-table
          v-else
          v-loading="tableLoading"
          :data="deptRows"
          row-key="deptFullName"
          class="data-table"
          empty-text="暂无部门数据"
        >
          <el-table-column label="部门" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.deptFullName || '--' }}</template></el-table-column>
          <el-table-column prop="studentCount" label="学员人数" width="110" />
          <el-table-column prop="learnCount" label="实际学习人数" width="130" />
          <el-table-column label="参与率" width="100"><template #default="{ row }">{{ row.participationRate || '--' }}</template></el-table-column>
          <el-table-column prop="totalLearnTimes" label="总学习次数" width="120" />
          <el-table-column label="人均学习次数" width="130"><template #default="{ row }">{{ row.percapitaLearnTimes || '--' }}</template></el-table-column>
          <el-table-column label="总均分" width="100"><template #default="{ row }">{{ valueOrDash(row.averageScore) }}</template></el-table-column>
          <el-table-column prop="completedCount" label="完成人数" width="110" />
          <el-table-column label="完成率" width="100"><template #default="{ row }">{{ row.completionRate || '--' }}</template></el-table-column>
        </el-table>
      </div>

      <footer class="pagination">
        <span>共 {{ tableTotal }} 条</span>
        <el-pagination
          v-model:current-page="page"
          :page-size="10"
          :total="tableTotal"
          :disabled="tableLoading"
          layout="prev, pager, next"
          background
          @current-change="changePage"
        />
      </footer>
    </section>

    <FilterPickerDialog
      :visible="picker.visible"
      :title="picker.title"
      :mode="picker.mode"
      :model-value="picker.values"
      :departments="departments"
      :positions="positions"
      @close="picker.visible = false"
      @update:model-value="applyPicker"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { resolveChartColors } from '@/utils/chartColor'
import RadarChart from '@/views/student/AICombat/RadarChart.vue'
import FilterPickerDialog from './components/FilterPickerDialog.vue'
import {
  getActiveStats,
  getDepartmentTree,
  getDeptStats,
  getOverviewStudents,
  getPositionOptions,
  getProjectRadar,
  getProjectSummary,
  getTimesAverages
} from '@/api/speechAdmin'
import type {
  ActiveItem,
  DepartmentNode,
  DeptStatRow,
  PositionOption,
  ProjectOverviewStudentRow,
  ProjectRadar,
  ProjectSummary,
  TimesAverage
} from '@/types/speechAdmin'
import type { ReportDimension } from '@/types/student'
import { useRoute } from 'vue-router'

const route = useRoute()
const projectId = route.params.id as string

const summary = ref<ProjectSummary>({
  totalStudentNum: 0,
  learnStudentNum: 0,
  totalLearnTimes: 0,
  percapitaLearnTimes: '0.0',
  completedPeoples: 0,
  completionRate: '0.0%'
})
const timesAverages = ref<TimesAverage[]>([])
const projectRadar = ref<ProjectRadar>({ dimensions: [], overall: null, first: null })
const activeItems = ref<ActiveItem[]>([])
const studentRows = ref<ProjectOverviewStudentRow[]>([])
const deptRows = ref<DeptStatRow[]>([])
const departments = ref<DepartmentNode[]>([])
const positions = ref<PositionOption[]>([])

const radarTab = ref<'overall' | 'first'>('overall')
const tableMode = ref<'student' | 'dept'>('student')
const tableLoading = ref(false)
const tableTotal = ref(0)
const page = ref(1)
const pageSize = 10
const selectedDeptIds = ref<string[]>([])
const selectedPostIds = ref<string[]>([])
const filters = reactive({
  keyword: '',
  finishStatus: null as number | null
})
const picker = reactive({
  visible: false,
  mode: 'dept' as 'dept' | 'position',
  title: '',
  values: [] as string[]
})

const timesChartRef = ref<HTMLElement>()
const activeChartRef = ref<HTMLElement>()
let timesChart: echarts.ECharts | null = null
let activeChart: echarts.ECharts | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(tableTotal.value / pageSize)))
const activeEmpty = computed(() => !activeItems.value.some((item) => Number(item.count) > 0))
const radarMetric = computed(() =>
  radarTab.value === 'first' ? projectRadar.value.first : projectRadar.value.overall
)
const radarDimensions = computed<ReportDimension[]>(() => {
  const metric = radarMetric.value
  if (!metric) return []
  return projectRadar.value.dimensions
    .filter((name) => metric.dimScores[name] != null)
    .map((name, index) => ({
      dimensionName: name,
      weight: 0,
      score: metric.dimScores[name] ?? null,
      comment: '',
      goodPoints: [],
      improvements: [],
      sortOrder: index
    }))
})

const valueOrDash = (value: number | null | undefined) => value ?? '--'

const finishClass = (status: number) => {
  if (status === 2) return 'done'
  if (status === 1) return 'doing'
  return 'pending'
}

const renderTimesChart = () => {
  if (!timesChartRef.value) return
  if (!timesAverages.value.length) {
    timesChart?.clear()
    return
  }
  timesChart ??= echarts.init(timesChartRef.value)
  timesChart.setOption(resolveChartColors<echarts.EChartsCoreOption>(
    {
      grid: { left: 44, right: 20, top: 24, bottom: 34 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const item = params?.[0]
          return `第 ${item?.axisValue ?? '-'} 次<br/>平均分 ${item?.data ?? '-'} 分`
        }
      },
      xAxis: {
        type: 'category',
        data: timesAverages.value.map((item) => item.times),
        axisLabel: { formatter: (value: string) => `第${value}次`, color: 'var(--color-ink-2)' },
        axisLine: { lineStyle: { color: 'var(--color-rule)' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: 'var(--color-ink-2)' },
        splitLine: { lineStyle: { color: 'var(--color-rule)' } }
      },
      series: [
        {
          type: 'bar',
          data: timesAverages.value.map((item) => Number(item.average.toFixed(1))),
          barMaxWidth: 36,
          itemStyle: {
            color: 'var(--color-accent)',
            borderRadius: [5, 5, 0, 0]
          }
        }
      ]
    }
  ), true)
}

const renderActiveChart = () => {
  if (!activeChartRef.value) return
  activeChart ??= echarts.init(activeChartRef.value)
  const hours = Array.from({ length: 24 }, (_, hour) => hour)
  const countMap = new Map(activeItems.value.map((item) => [Number(item.hour), Number(item.count)]))
  activeChart.setOption(resolveChartColors<echarts.EChartsCoreOption>(
    {
      grid: { left: 44, right: 24, top: 24, bottom: 34 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const item = params?.[0]
          return `${String(item?.axisValue ?? '').padStart(2, '0')}:00<br/>学习 ${item?.data ?? 0} 次`
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: hours,
        axisLabel: {
          color: 'var(--color-ink-2)',
          formatter: (value: string) => `${String(value).padStart(2, '0')}:00`,
          interval: 2
        },
        axisLine: { lineStyle: { color: 'var(--color-rule)' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: 'var(--color-ink-2)' },
        splitLine: { lineStyle: { color: 'var(--color-rule)' } }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: hours.map((hour) => countMap.get(hour) ?? 0),
          lineStyle: { color: 'var(--color-accent-2)', width: 2 },
          itemStyle: { color: 'var(--color-accent-2)' },
          areaStyle: { color: 'var(--color-accent-wash)' }
        }
      ]
    }
  ), true)
}

const loadSummary = async () => {
  const data = await getProjectSummary(projectId)
  summary.value = data
}

const loadCharts = async () => {
  const [times, radar, active] = await Promise.all([
    getTimesAverages(projectId),
    getProjectRadar(projectId),
    getActiveStats(projectId)
  ])
  timesAverages.value = times?.datas ?? []
  projectRadar.value = radar ?? { dimensions: [], overall: null, first: null }
  activeItems.value = active?.datas ?? []
  await nextTick()
  renderTimesChart()
  renderActiveChart()
}

const loadOptions = async () => {
  const [deptData, positionData] = await Promise.all([getDepartmentTree(), getPositionOptions()])
  departments.value = deptData?.list ?? []
  positions.value = positionData?.list ?? []
}

const buildTableQuery = () => ({
  keyword: filters.keyword || undefined,
  finishStatus: tableMode.value === 'student' ? filters.finishStatus : null,
  deptIds: selectedDeptIds.value,
  postIds: tableMode.value === 'student' ? selectedPostIds.value : [],
  page: page.value,
  pageSize
})

const loadTable = async () => {
  tableLoading.value = true
  try {
    if (tableMode.value === 'student') {
      const data = await getOverviewStudents(projectId, buildTableQuery())
      studentRows.value = data.records
      tableTotal.value = data.total
    } else {
      const data = await getDeptStats(projectId, buildTableQuery())
      deptRows.value = data.records
      tableTotal.value = data.total
    }
  } finally {
    tableLoading.value = false
  }
}

const searchTable = () => {
  page.value = 1
  void loadTable()
}

const switchTableMode = (mode: 'student' | 'dept') => {
  if (tableMode.value === mode) return
  tableMode.value = mode
  page.value = 1
  void loadTable()
}

const changePage = (nextPage: number) => {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  void loadTable()
}

const openFilterPicker = (mode: 'dept' | 'position') => {
  picker.mode = mode
  picker.title = mode === 'dept' ? '选择部门' : '选择岗位'
  picker.values = [...(mode === 'dept' ? selectedDeptIds.value : selectedPostIds.value)]
  picker.visible = true
}

const applyPicker = (values: string[]) => {
  if (picker.mode === 'dept') {
    selectedDeptIds.value = values
  } else {
    selectedPostIds.value = values
  }
  picker.visible = false
  searchTable()
}

const resizeCharts = () => {
  timesChart?.resize()
  activeChart?.resize()
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadCharts(), loadOptions(), loadTable()])
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  timesChart?.dispose()
  activeChart?.dispose()
  timesChart = null
  activeChart = null
})
</script>

<style scoped lang="scss">
.project-overview {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card,
.chart-panel,
.table-panel {
  border: 1px solid var(--color-paper-2);
  border-radius: 8px;
  background: var(--color-paper);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-graphite) 4%, transparent);
}

.summary-card {
  padding: 20px 22px;
}

.summary-label {
  margin: 0 0 10px;
  color: var(--color-muted);
  font-size: 14px;
}

.summary-value {
  margin: 0;
  color: var(--color-ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.summary-foot {
  margin: 10px 0 0;
  color: var(--color-muted);
  font-size: 13px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-panel,
.table-panel {
  min-width: 0;
  padding: 18px 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  margin-bottom: 10px;

  h3 {
    margin: 0;
    color: var(--color-ink);
    font-size: 16px;
    font-weight: 600;
  }
}

/* 批注（2026-11-20）：学习雷达「总均分/记录」与学员表「学员模式/部门模式」都做成 tab 切换；
 * 选中态用一块滑块（thumb）位移来「转移」，而不是整块底色硬切。
 * 两个实例都是 2 项，取 50% 宽 + translateX(100%) 即可精确落位。 */
.tab-switch {
  position: relative;
  display: inline-flex;
  padding: 3px;
  border-radius: 7px;
  background: var(--color-paper-2);

  &__thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc(50% - 3px);
    border-radius: 5px;
    background: var(--color-paper);
    box-shadow: 0 1px 4px color-mix(in oklab, var(--color-graphite) 10%, transparent);
    pointer-events: none;
    transition: transform var(--dur-short) var(--ease-out);
  }

  &__item {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    min-width: 68px;
    height: 28px;
    padding: 0 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--color-muted);
    font-size: 13px;
    cursor: pointer;
    transition: color var(--dur-short) var(--ease-out);

    &.is-active { color: var(--color-accent); }
  }
}

.chart-box {
  position: relative;
  min-height: 300px;
}

.chart-canvas {
  width: 100%;
  height: 300px;
}

.chart-canvas-active {
  height: 240px;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.chart-empty-inline {
  position: static;
  min-height: 300px;
}

.active-panel {
  padding-bottom: 6px;
}

.table-header {
  margin-bottom: 14px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;

  :deep(.el-select) {
    flex: 0 0 180px;
    width: 180px;
  }

  :deep(.el-input) {
    flex: 0 0 220px;
    width: 220px;
  }

  select,
  input,
  .filter-picker,
  .primary-btn {
    height: 34px;
    box-sizing: border-box;
    border: 1px solid var(--color-rule);
    border-radius: 6px;
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: 13px;
    outline: none;
  }

  select,
  input {
    padding: 0 10px;
  }

  input {
    width: 210px;

    &:focus,
    select:focus {
      border-color: var(--color-accent);
    }
  }

  .filter-picker {
    padding: 0 12px;
    cursor: pointer;
  }

  .primary-btn {
    padding: 0 18px;
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
    cursor: pointer;
  }
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
}

.data-table {
  /* t23 表格规范 */
  :deep(.el-table__header th) {
    background: var(--color-paper-2);
    color: var(--color-ink-2);
    font-size: 13px;
    font-weight: 500;
  }
  :deep(.el-table__row td) {
    height: 44px;
    border-bottom: 1px solid var(--color-rule);
  }
  :deep(.el-table .cell) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :deep(.el-table__row:hover > td) { background: var(--color-accent-wash) !important; }

  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 11px 12px;
    border-bottom: 1px solid var(--color-paper-2);
    color: var(--color-ink-2);
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: var(--color-paper-2);
    color: var(--color-muted);
    font-weight: 600;
  }

  tbody tr:hover {
    background: var(--color-paper-2);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
}

.path-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name-cell {
  color: var(--color-ink);
  font-weight: 500;
}

.status-chip,
.finish-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  font-size: 12px;
}

.status-chip.disabled {
  margin-left: 6px;
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  color: var(--color-error);
}

.finish-chip {
  &.done {
    background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper));
    color: var(--color-success);
  }

  &.doing {
    background: var(--color-accent-wash);
    color: var(--color-accent);
  }

  &.pending {
    background: var(--color-paper-2);
    color: var(--color-muted);
  }
}

.empty-cell {
  height: 120px;
  text-align: center !important;
  color: var(--color-muted) !important;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  color: var(--color-ink-2);
  font-size: 12px;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;

  button {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--color-rule);
    border-radius: 6px;
    background: var(--color-paper);
    color: var(--color-ink-2);
    cursor: pointer;

    &:disabled {
      color: var(--color-muted);
      cursor: not-allowed;
    }
  }
}

@media (max-width: 1100px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .chart-panel,
  .table-panel {
    padding: 16px 14px;
  }

  .filter-bar input {
    width: 100%;
  }
}
</style>
