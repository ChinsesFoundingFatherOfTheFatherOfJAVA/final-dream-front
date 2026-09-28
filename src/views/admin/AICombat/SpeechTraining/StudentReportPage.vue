<template>
  <div class="student-report-page">
    <div class="page-header">
      <button type="button" class="back-btn" @click="goBack">‹</button>
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
          <select v-model="analysisDimension" @change="loadAnalysis">
            <option value="">总分</option>
            <option v-for="dimension in dimensionNames" :key="dimension" :value="dimension">
              {{ dimension }}
            </option>
          </select>
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
          <button
            type="button"
            class="detail-btn"
            :disabled="!selectedRecord"
            @click="openSelectedReport"
          >
            查看详情
          </button>
        </header>

        <div v-if="allRecords.length" class="time-tabs">
          <button
            v-for="record in allRecords"
            :key="record.reportId"
            type="button"
            :class="{ active: selectedRecord?.reportId === record.reportId }"
            @click="selectRecord(record)"
          >
            第{{ record.times }}次
          </button>
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
          <table class="record-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>次数</th>
                <th>总分</th>
                <th v-for="dimension in dimensionNames" :key="dimension">{{ dimension }}</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedRecords" :key="row.reportId">
                <td>{{ row.time || '--' }}</td>
                <td>第 {{ row.times }} 次</td>
                <td class="score-cell">{{ row.totalScore ?? '--' }}</td>
                <td v-for="dimension in dimensionNames" :key="dimension">
                  {{ row.dimScores?.[dimension] ?? '--' }}
                </td>
                <td>
                  <button type="button" class="text-btn" @click="openReport(row)">查看详情</button>
                </td>
              </tr>
              <tr v-if="!recordsLoading && !pagedRecords.length">
                <td :colspan="4 + dimensionNames.length" class="empty-cell">暂无训练记录</td>
              </tr>
              <tr v-if="recordsLoading">
                <td :colspan="4 + dimensionNames.length" class="empty-cell">加载中...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>共 {{ allRecords.length }} 条</span>
          <div class="page-actions">
            <button type="button" :disabled="recordPage <= 1" @click="recordPage -= 1">上一页</button>
            <span>{{ recordPage }} / {{ recordTotalPages }}</span>
            <button
              type="button"
              :disabled="recordPage >= recordTotalPages"
              @click="recordPage += 1"
            >
              下一页
            </button>
          </div>
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
        axisLabel: { formatter: (value: string) => `第${value}次`, color: '#7a8396' },
        axisLine: { lineStyle: { color: '#e4e8f0' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#7a8396' },
        splitLine: { lineStyle: { color: '#eef1f6' } }
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
          lineStyle: { color: '#4a7dff', width: 2 },
          itemStyle: { color: '#4a7dff' },
          areaStyle: { color: 'rgba(74, 125, 255, 0.12)' }
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
    border: 1px solid #dfe4ee;
    border-radius: 50%;
    background: #fff;
    color: #4d5568;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      border-color: #2e7cf6;
      color: #2e7cf6;
    }
  }

  h2 {
    margin: 0;
    color: #1f2937;
    font-size: 18px;
  }

  p {
    margin: 4px 0 0;
    color: #8a92a5;
    font-size: 12px;
  }
}

.state-card,
.content-card,
.profile-card {
  border: 1px solid #edf0f5;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(24, 39, 75, 0.04);
}

.state-card {
  padding: 90px 24px;
  color: #8a92a5;
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
  background: linear-gradient(135deg, #4a7dff, #6f62dc);
  color: #fff;
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
    color: #253047;
    font-size: 18px;
  }
}

.disabled-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: #fff7e6;
  color: #d46b08;
  font-size: 11px;
}

.meta-line {
  flex-wrap: wrap;
  gap: 8px 20px;
  max-width: 680px;
  color: #7a8396;
  font-size: 13px;
  line-height: 1.8;

  span {
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
    color: #8a92a5;
    font-size: 12px;
  }

  strong {
    color: #253047;
    font-size: 22px;
    line-height: 1;
  }
}

.finish-badge {
  padding: 5px 11px;
  border-radius: 13px;
  font-size: 12px;

  &.done {
    background: #eafaf0;
    color: #2f9e52;
  }

  &.pending {
    background: #f3f4f6;
    color: #7a8396;
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
    color: #253047;
    font-size: 16px;
  }

  p {
    margin: 5px 0 0;
    color: #98a1b2;
    font-size: 12px;
  }

  select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    outline: none;
  }
}

.detail-btn,
.text-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    color: #b8bfcc;
    cursor: not-allowed;
  }
}

.detail-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  background: #eaf1ff;
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
  color: #9aa3b2;
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
    border: 1px solid #d9deea;
    border-radius: 15px;
    background: #fff;
    color: #667085;
    font-size: 12px;
    cursor: pointer;

    &.active {
      border-color: #2e7cf6;
      background: #eaf1ff;
      color: #2e7cf6;
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
  color: #9aa3b2;
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #eef1f6;
  border-radius: 8px;
}

.record-table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #f1f3f7;
    color: #4d5568;
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: #fafbfd;
    color: #6b7280;
    font-weight: 600;
  }

  tbody tr:hover {
    background: #f8fbff;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
}

.score-cell {
  color: #253047 !important;
  font-weight: 600;
}

.empty-cell {
  height: 120px;
  color: #9aa3b2 !important;
  text-align: center !important;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  color: #7a8396;
  font-size: 12px;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;

  button {
    height: 30px;
    padding: 0 12px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &:disabled {
      color: #b8bfcc;
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
