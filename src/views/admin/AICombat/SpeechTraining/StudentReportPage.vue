<template>
  <div class="student-report-page">
    <div class="page-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <div>
        <h2>训练详情</h2>
        <p v-if="projectName">{{ projectName }}</p>
      </div>
    </div>

    <div v-if="initialLoading" class="state-card">加载中...</div>
    <div v-else-if="initialError" class="state-card">{{ initialError }}</div>
    <template v-else>
      <section class="profile-card">
        <div class="profile-main">
          <span class="avatar">{{ (tops?.fullname || '员').slice(0, 1) }}</span>
          <div class="profile-info">
            <div class="name-line">
              <strong>{{ tops?.fullname || '--' }}</strong>
              <span v-if="tops?.userStatus === 0" class="disabled-tag">已禁用</span>
            </div>
            <div class="meta-line">
              <span>工号：{{ tops?.userNo || '--' }}</span>
              <span>岗位：{{ tops?.positionName || '--' }}</span>
            </div>
            <div class="meta-line">
              <span :title="tops?.deptFullName">部门：{{ tops?.deptFullName || '--' }}</span>
            </div>
          </div>
        </div>
        <div class="profile-metrics">
          <div class="metric">
            <span>最高得分</span>
            <strong>{{ tops?.highestScore ?? '--' }}</strong>
          </div>
          <div class="metric">
            <span>最高排名</span>
            <strong>{{ tops?.rank ?? '--' }}</strong>
          </div>
          <span class="finish-badge" :class="tops?.finishStatus === 2 ? 'done' : 'pending'">
            {{ tops?.finishStatusText || '未完成' }}
          </span>
        </div>
      </section>

      <section class="content-card analysis-card">
        <header class="card-header">
          <div>
            <h3>训练分析</h3>
            <p>共 {{ tops?.reportCount ?? 0 }} 次已完成训练</p>
          </div>
          <el-select v-model="analysisDimension" placeholder="总分" @change="loadAnalysis">
            <el-option label="总分" value="" />
            <el-option v-for="dimension in dimensionNames" :key="dimension" :label="dimension" :value="dimension" />
          </el-select>
        </header>
        <div class="chart-box">
          <div ref="analysisChartRef" class="analysis-chart"></div>
          <p v-if="!analysisLoading && !analysisItems.length" class="chart-empty">
            学员尚未开始练习哦～
          </p>
        </div>
      </section>

      <section class="content-card practice-card">
        <header class="card-header">
          <div>
            <h3>各次训练</h3>
            <p>点击第 n 次查看该次维度雷达</p>
          </div>
          <el-button
            class="detail-btn"
            :disabled="!selectedRecord"
            @click="openSelectedReport"
          >
            查看详情
          </el-button>
        </header>

        <div v-if="allRecords.length" class="time-tabs">
          <el-button
            v-for="record in allRecords"
            :key="record.reportId"
           
            :class="{ active: selectedRecord?.reportId === record.reportId }"
            @click="selectRecord(record)"
          >
            第{{ record.times }}次
          </el-button>
        </div>

        <div class="radar-section">
          <RadarChart
            v-if="selectedRadarDimensions.length"
            :dimensions="selectedRadarDimensions"
            :last-dimensions="null"
          />
          <div v-else class="radar-empty">暂无该次维度数据</div>
        </div>
      </section>

      <section class="content-card">
        <header class="card-header">
          <div>
            <h3>训练记录</h3>
            <p>报告数据按完成时间倒序排列</p>
          </div>
        </header>
        <div class="table-wrap">
          <el-table
            v-loading="recordsLoading"
            :data="pagedRecords"
            row-key="reportId"
            class="record-table"
            empty-text="暂无训练记录"
          >
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ row.time || '--' }}</template>
            </el-table-column>
            <el-table-column label="次数" width="90">
              <template #default="{ row }">第 {{ row.times }} 次</template>
            </el-table-column>
            <el-table-column label="总分" width="90">
              <template #default="{ row }"><span class="score-cell">{{ row.totalScore ?? '--' }}</span></template>
            </el-table-column>
            <el-table-column
              v-for="dimension in dimensionNames"
              :key="dimension"
              :label="dimension"
              width="110"
            >
              <template #default="{ row }">{{ row.dimScores?.[dimension] ?? '--' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button link type="primary" @click="openReport(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <footer class="pagination">
          <span>共 {{ allRecords.length }} 条</span>
          <el-pagination
            v-model:current-page="recordPage"
            :page-size="recordPageSize"
            :total="allRecords.length"
            layout="prev, pager, next"
            background
          />
        </footer>
      </section>
    </template>

    <ReportDrawer
      :visible="drawerVisible"
      :session-id="activeSessionId"
      :report-id="activeReportId"
      :user-id="targetUserId"
      @close="drawerVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import RadarChart from '@/views/student/AICombat/RadarChart.vue'
import ReportDrawer from './components/ReportDrawer.vue'
import {
  getAdminAttendRecords,
  getAdminPracticeAnalysis,
  getAdminStudentTops,
  getStudentAttendRecords,
  getStudentPracticeAnalysis,
  getStudentTops
} from '@/api/speechAdmin'
import { getProjectDetail } from '@/api/project'
import { getStudentProjectDetail } from '@/api/student'
import type { AttendRecordRow, PracticeItem, Tops } from '@/types/speechAdmin'
import type { ReportDimension } from '@/types/student'

const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => route.name === 'AdminStudentDetail')
const projectId = computed(() =>
  isAdmin.value ? String(route.params.id || '') : String(route.query.pid || '')
)
const targetUserId = computed(() =>
  isAdmin.value ? String(route.query.userId || '') : undefined
)

const initialLoading = ref(true)
const initialError = ref('')
const projectName = ref('')
const tops = ref<Tops | null>(null)
const analysisItems = ref<PracticeItem[]>([])
const analysisLoading = ref(false)
const analysisDimension = ref('')
const allRecords = ref<AttendRecordRow[]>([])
const recordsLoading = ref(false)
const selectedRecord = ref<AttendRecordRow | null>(null)
const recordPage = ref(1)
const recordPageSize = 10
const drawerVisible = ref(false)
const activeSessionId = ref('')
const activeReportId = ref('')

const analysisChartRef = ref<HTMLElement>()
let analysisChart: echarts.ECharts | null = null

const dimensionNames = computed(() => {
  const names: string[] = []
  for (const record of allRecords.value) {
    for (const name of Object.keys(record.dimScores ?? {})) {
      if (!names.includes(name)) names.push(name)
    }
  }
  return names
})

const recordTotalPages = computed(() =>
  Math.max(1, Math.ceil(allRecords.value.length / recordPageSize))
)
const pagedRecords = computed(() => {
  const start = (recordPage.value - 1) * recordPageSize
  return allRecords.value.slice(start, start + recordPageSize)
})
const selectedRadarDimensions = computed<ReportDimension[]>(() => {
  const scores = selectedRecord.value?.dimScores ?? {}
  return dimensionNames.value
    .filter((name) => scores[name] != null)
    .map((name, index) => ({
      dimensionName: name,
      weight: 0,
      score: scores[name] ?? null,
      comment: '',
      goodPoints: [],
      improvements: [],
      sortOrder: index
    }))
})

const renderAnalysis = async () => {
  if (!analysisChartRef.value) return
  if (!analysisItems.value.length) {
    analysisChart?.clear()
    return
  }
  await nextTick()
  analysisChart ??= echarts.init(analysisChartRef.value)
  analysisChart.setOption(
    {
      grid: { left: 44, right: 24, top: 26, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const item = params?.[0]
          return `第 ${item?.axisValue ?? '-'} 次<br/>${analysisDimension.value || '总分'} ${
            item?.data ?? '--'
          } 分`
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: analysisItems.value.map((item) => item.times),
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
          type: 'line',
          smooth: true,
          connectNulls: false,
          symbolSize: 7,
          data: analysisItems.value.map((item) =>
            item.score == null ? null : Number(item.score.toFixed(1))
          ),
          lineStyle: { color: 'var(--color-accent)', width: 2 },
          itemStyle: { color: 'var(--color-accent)' },
          areaStyle: { color: 'color-mix(in oklab, var(--color-accent) 12%, transparent)' }
        }
      ]
    },
    true
  )
}

const loadAnalysis = async () => {
  analysisLoading.value = true
  try {
    const data = isAdmin.value
      ? await getAdminPracticeAnalysis(projectId.value, targetUserId.value || '', analysisDimension.value)
      : await getStudentPracticeAnalysis(projectId.value, analysisDimension.value)
    analysisItems.value = data?.datas ?? []
    await renderAnalysis()
  } finally {
    analysisLoading.value = false
  }
}

const loadAllRecords = async () => {
  recordsLoading.value = true
  try {
    const pageSize = 500
    const rows: AttendRecordRow[] = []
    let total = Number.POSITIVE_INFINITY
    let page = 1

    while (rows.length < total && page <= 1000) {
      const data = isAdmin.value
        ? await getAdminAttendRecords(projectId.value, targetUserId.value || '', page, pageSize)
        : await getStudentAttendRecords(projectId.value, page, pageSize)
      rows.push(...data.records)
      total = data.total
      if (!data.records.length) break
      page += 1
    }

    allRecords.value = rows
    selectedRecord.value = rows[0] ?? null
    recordPage.value = 1
  } finally {
    recordsLoading.value = false
  }
}

const loadProject = async () => {
  try {
    if (isAdmin.value) {
      const data: any = await getProjectDetail(Number(projectId.value))
      projectName.value = data?.name || ''
    } else {
      const data = await getStudentProjectDetail(projectId.value, { silent: true })
      projectName.value = data?.name || ''
    }
  } catch {
    projectName.value = ''
  }
}

const loadInitial = async () => {
  if (!projectId.value) {
    initialError.value = isAdmin.value ? '缺少项目参数' : '缺少项目参数，请从项目详情进入'
    initialLoading.value = false
    return
  }
  if (isAdmin.value && !targetUserId.value) {
    initialError.value = '缺少学员参数'
    initialLoading.value = false
    return
  }

  initialLoading.value = true
  initialError.value = ''
  try {
    const topData = isAdmin.value
      ? await getAdminStudentTops(projectId.value, targetUserId.value || '')
      : await getStudentTops(projectId.value)
    tops.value = topData
    await Promise.all([loadProject(), loadAnalysis(), loadAllRecords()])
  } catch (e: unknown) {
    initialError.value = e instanceof Error ? e.message : '训练详情加载失败'
  } finally {
    initialLoading.value = false
  }
  if (!initialError.value) {
    // 首屏加载期间图表容器尚未挂载，loading 结束后补一次总分折线图渲染。
    await nextTick()
    await renderAnalysis()
  }
}

const selectRecord = (record: AttendRecordRow) => {
  selectedRecord.value = record
}

const openReport = (record: AttendRecordRow) => {
  selectedRecord.value = record
  activeSessionId.value = record.sessionId
  activeReportId.value = record.reportId
  drawerVisible.value = true
}

const openSelectedReport = () => {
  if (selectedRecord.value) openReport(selectedRecord.value)
}

const goBack = () => {
  if (isAdmin.value) {
    router.push(`/sparring/newmanage/console/${projectId.value}/student`)
  } else {
    router.push(`/sparring/web/script/detail/${projectId.value}`)
  }
}

const resizeChart = () => analysisChart?.resize()

watch(recordTotalPages, (pages) => {
  if (recordPage.value > pages) recordPage.value = pages
})

onMounted(async () => {
  await loadInitial()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  analysisChart?.dispose()
  analysisChart = null
})
</script>

<style scoped lang="scss">
.student-report-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;

  .back-btn {
    width: 34px;
    height: 34px;
    border: 1px solid var(--color-rule);
    border-radius: 50%;
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }

  h2 {
    margin: 0;
    color: var(--color-ink);
    font-size: 18px;
  }

  p {
    margin: 4px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }
}

.state-card,
.content-card,
.profile-card {
  border: 1px solid var(--color-paper-2);
  border-radius: 9px;
  background: var(--color-paper);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-graphite) 4%, transparent);
}

.state-card {
  padding: 90px 24px;
  color: var(--color-muted);
  font-size: 14px;
  text-align: center;
}

.profile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.avatar {
  width: 58px;
  height: 58px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent));
  color: var(--color-paper);
  font-size: 22px;
  font-weight: 600;
}

.profile-info {
  min-width: 0;
}

.name-line,
.meta-line,
.profile-metrics {
  display: flex;
  align-items: center;
}

.name-line {
  gap: 8px;
  margin-bottom: 7px;

  strong {
    color: var(--color-ink);
    font-size: 18px;
  }
}

.disabled-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  color: var(--color-error);
  font-size: 11px;
}

.meta-line {
  flex-wrap: wrap;
  gap: 8px 20px;
  max-width: 680px;
  color: var(--color-ink-2);
  font-size: 13px;
  line-height: 1.8;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.profile-metrics {
  gap: 24px;
  flex-shrink: 0;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 74px;

  span {
    color: var(--color-muted);
    font-size: 12px;
  }

  strong {
    color: var(--color-ink);
    font-size: 22px;
    line-height: 1;
  }
}

.finish-badge {
  padding: 5px 11px;
  border-radius: 13px;
  font-size: 12px;

  &.done {
    background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper));
    color: var(--color-success);
  }

  &.pending {
    background: var(--color-paper-2);
    color: var(--color-ink-2);
  }
}

.content-card {
  min-width: 0;
  padding: 18px 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h3 {
    margin: 0;
    color: var(--color-ink);
    font-size: 16px;
  }

  p {
    margin: 5px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }

  select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--color-rule);
    border-radius: 6px;
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: 13px;
    outline: none;
  }
}

.detail-btn,
.text-btn {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    color: var(--color-muted);
    cursor: not-allowed;
  }
}

.detail-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  background: var(--color-accent-wash);
}

.chart-box {
  position: relative;
  min-height: 280px;
}

.analysis-chart {
  width: 100%;
  height: 280px;
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

.time-tabs {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
  overflow-x: auto;

  button {
    flex-shrink: 0;
    height: 30px;
    padding: 0 13px;
    border: 1px solid var(--color-rule);
    border-radius: 15px;
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: 12px;
    cursor: pointer;

    &.active {
      border-color: var(--color-accent);
      background: var(--color-accent-wash);
      color: var(--color-accent);
    }
  }
}

.radar-section {
  min-height: 300px;
}

.radar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-muted);
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
}

.record-table {
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
  min-width: 880px;
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

.score-cell {
  color: var(--color-ink) !important;
  font-weight: 600;
}

.empty-cell {
  height: 120px;
  color: var(--color-muted) !important;
  text-align: center !important;
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

@media (max-width: 760px) {
  .profile-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-main,
  .profile-info,
  .meta-line {
    width: 100%;
  }

  .meta-line {
    max-width: 100%;

    span {
      overflow-wrap: anywhere;
      white-space: normal;
    }
  }

  .profile-metrics {
    width: 100%;
    justify-content: space-between;
  }

  .content-card {
    padding: 16px 14px;
  }
}
</style>
