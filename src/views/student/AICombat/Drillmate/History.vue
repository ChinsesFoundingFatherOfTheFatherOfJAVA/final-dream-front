<template>
  <div class="dm-history">
    <div class="dm-history__container">
      <nav class="dm-breadcrumb">
        <button type="button" class="dm-breadcrumb__link" @click="goBack">AI实战训练场</button>
        <svg class="dm-breadcrumb__sep" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="#c0c4cc" stroke-width="1.2" />
        </svg>
        <span class="dm-breadcrumb__current">练习历程</span>
      </nav>

      <div class="dm-history__card">
        <div class="dm-history__head">
          <h1 class="dm-history__title">练习历程</h1>
          <p class="dm-history__subtitle">回顾已完成报告与暂停中的练习，快速继续上次进度。</p>
        </div>

        <div class="dm-stat-grid">
          <div v-for="item in statCells" :key="item.label" class="dm-stat-cell">
            <div class="dm-stat-label">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="5.6" fill="none" stroke="#bfbfbf" stroke-width="1.2" />
              </svg>
              <span>{{ item.label }}</span>
            </div>
            <div class="dm-stat-value">{{ item.value }}</div>
          </div>
        </div>

        <div class="dm-history__body">
          <div class="dm-filter-row">
            <div class="dm-filter-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.value"
                type="button"
                class="dm-filter-tab"
                :class="{ 'is-active': query.status === tab.value }"
                @click="switchTab(tab.value)"
              >
                {{ tab.label }} {{ tab.count }}
              </button>
            </div>
            <div class="dm-theme-filter">
              <span>所属主题</span>
              <el-select
                v-model="query.themeId"
                class="dm-theme-select"
                placeholder="全部主题"
                clearable
                style="width: 240px"
                @change="reload"
              >
                <el-option
                  v-for="option in themeOptions"
                  :key="option.themeId"
                  :label="option.themeName || option.themeId"
                  :value="option.themeId"
                />
              </el-select>
            </div>
          </div>

          <el-alert v-if="error" class="dm-error" type="error" :closable="false" :title="error" />

          <div v-loading="loading" class="dm-history__table">
            <template v-if="rows.length">
              <table class="dm-table">
                <thead>
                  <tr>
                    <th>练习记录</th>
                    <th>学习模式</th>
                    <th>状态</th>
                    <th>得分</th>
                    <th>用时</th>
                    <th>开始时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.attemptId">
                    <td>
                      <div class="dm-record">
                        <span class="dm-record__name">{{ row.scenarioName || '未知场景' }}</span>
                        <span class="dm-record__theme">主题：{{ row.themeName || '未知主题' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="dm-record__mode">{{ row.studyMode === 2 ? '考核' : '训练' }}</span>
                    </td>
                    <td>
                      <span class="dm-record__status" :class="statusClass(row)">{{
                        statusText(row)
                      }}</span>
                    </td>
                    <td>
                      <span class="dm-record__score" :class="scoreClass(row)">{{
                        row.totalScore ?? '—'
                      }}</span>
                    </td>
                    <td><span class="dm-record__time">{{ durationText(row) }}</span></td>
                    <td><span class="dm-record__time">{{ formatTime(row.startedAt) }}</span></td>
                    <td>
                      <button
                        v-if="isRunning(row)"
                        type="button"
                        class="dm-record__action"
                        @click="resume(row.attemptId)"
                      >
                        继续练习
                      </button>
                      <button
                        v-else-if="hasReport(row)"
                        type="button"
                        class="dm-record__action"
                        @click="openReport(row.attemptId)"
                      >
                        查看报告
                      </button>
                      <span v-else class="dm-record__time">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <el-empty v-else-if="!loading" description="暂无练习记录" :image-size="96" />
          </div>

          <div v-if="total > query.pageSize" class="dm-pager">
            <el-pagination
              layout="prev, pager, next, total"
              :total="total"
              :page-size="query.pageSize"
              :current-page="query.page"
              @current-change="onPage"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 练习历程（契约 01 §F20 / 04 §API-S07）：统计 + 三 Tab + 主题下拉 + 服务端分页
// 统计与 Tab 计数固定按"我的全部记录"算（后端口径），不随筛选变化。
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getStudentPracticeRecords,
  type StudentHistoryItem,
  type StudentPracticeStats,
  type AttemptStatus,
} from '@/api/actStudent'

type TabValue = 'all' | 'passed' | 'failed' | 'in_progress'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const rows = ref<StudentHistoryItem[]>([])
const total = ref(0)
const stats = ref<StudentPracticeStats>({
  totalCount: 0,
  totalHours: null,
  averageScore: null,
  themeCount: 0,
  passedCount: 0,
  failedCount: 0,
  inProgressCount: 0,
})
const themeOptions = ref<{ themeId: string; themeName: string | null }[]>([])

const query = reactive({
  status: 'all' as TabValue,
  themeId: undefined as string | undefined,
  page: 1,
  pageSize: 20,
})

const tabs = computed(() => [
  { value: 'all' as TabValue, label: '全部', count: stats.value.totalCount },
  { value: 'passed' as TabValue, label: '已通过', count: stats.value.passedCount },
  { value: 'failed' as TabValue, label: '未通过', count: stats.value.failedCount },
  { value: 'in_progress' as TabValue, label: '练习中', count: stats.value.inProgressCount },
])

const statCells = computed(() => [
  { label: '总练习次数', value: `${stats.value.totalCount} 次` },
  { label: '累计用时', value: `${stats.value.totalHours ?? 0} h` },
  {
    label: '平均得分',
    value: stats.value.averageScore == null ? '— 分' : `${stats.value.averageScore} 分`,
  },
  { label: '覆盖主题', value: `${stats.value.themeCount} 个` },
])

const RUNNING: AttemptStatus[] = ['preparing', 'ready', 'in_progress', 'report_generating']
const isRunning = (row: StudentHistoryItem) => RUNNING.includes(row.status)
const hasReport = (row: StudentHistoryItem) => row.status === 'completed' || row.totalScore != null

const statusText = (row: StudentHistoryItem) => {
  const map: Record<AttemptStatus, string> = {
    preparing: '准备中',
    ready: '待开始',
    in_progress: '练习中',
    report_generating: '报告生成中',
    completed: row.passed === 1 ? '已通过' : '未通过',
    failed: '异常结束',
    cancelled: '已取消',
  }
  return map[row.status] ?? row.status
}

const statusClass = (row: StudentHistoryItem) => {
  if (isRunning(row)) return 'is-running'
  if (row.status === 'completed') return row.passed === 1 ? 'is-passed' : 'is-failed'
  return 'is-failed'
}

const scoreClass = (row: StudentHistoryItem) =>
  row.passed === 1 ? 'is-passed' : row.totalScore == null ? '' : 'is-failed'

/** 用时：优先报告 durationSeconds；否则用 startedAt/endedAt 差；都没有则「—」 */
const durationText = (row: StudentHistoryItem) => {
  let seconds = row.durationSeconds ?? null
  if (seconds == null && row.startedAt && row.endedAt) {
    const start = new Date(row.startedAt).getTime()
    const end = new Date(row.endedAt).getTime()
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      seconds = Math.round((end - start) / 1000)
    }
  }
  if (seconds == null) return '—'
  if (seconds < 60) return '不到 1 分钟'
  const minutes = Math.round(seconds / 60)
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)} 小时` : `${minutes} 分钟`
}

const formatTime = (value: string | null) => value?.replace('T', ' ').slice(0, 16) ?? '—'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getStudentPracticeRecords({
      status: query.status,
      themeId: query.themeId,
      page: query.page,
      pageSize: query.pageSize,
    })
    rows.value = data.records ?? []
    total.value = data.total ?? 0
    stats.value = data.stats ?? stats.value
    themeOptions.value = data.themes ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : '练习历程加载失败，请稍后重试'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function switchTab(value: TabValue) {
  if (query.status === value) return
  query.status = value
  reload()
}

function reload() {
  query.page = 1
  load()
}

function onPage(page: number) {
  query.page = page
  load()
}

const goBack = () => router.push('/sparring/web/drillmate')
const resume = (attemptId: string) => router.push(`/sparring/web/drillmate/attempt/${attemptId}`)
const openReport = (attemptId: string) => router.push(`/sparring/web/drillmate/report/${attemptId}`)

onMounted(load)
</script>

<style scoped lang="scss">
$primary: #436bff;
$text-1: #262626;
$text-2: #595959;
$text-3: #8c8c8c;
$border: #e9e9e9;

.dm-history {
  padding-bottom: 24px;
}

.dm-history__container {
  width: 1200px;
  max-width: 100%;
  margin: 0 auto;
}

.dm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 14px;
  font-size: 13px;

  &__link {
    padding: 0;
    border: 0;
    background: transparent;
    color: $text-3;
    font-size: 13px;
    line-height: 22px;
    cursor: pointer;

    &:hover {
      color: $primary;
    }
  }

  &__sep {
    display: block;
  }

  &__current {
    color: #1a1a1a;
    font-size: 13px;
    line-height: 22px;
  }
}

.dm-history__card {
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

.dm-history__title {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 800;
  color: $text-1;
}

.dm-history__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: $text-3;
}

.dm-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.dm-stat-cell {
  min-height: 74px;
  padding: 16px;
  border: 1px solid $border;
  border-radius: 8px;
}

.dm-stat-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 14px;
  line-height: 22px;
  color: $text-3;
}

.dm-stat-value {
  font-size: 22px;
  line-height: 1;
  font-weight: 800;
  color: $text-1;
  white-space: nowrap;
}

.dm-history__body {
  margin-top: 24px;
}

.dm-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.dm-filter-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dm-filter-tab {
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #f5f5f5;
  color: $text-2;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.is-active {
    border-color: $primary;
    background: $primary;
    color: #fff;
  }
}

.dm-theme-filter {
  display: flex;
  align-items: center;
  gap: 10px;

  > span {
    font-size: 14px;
    color: $text-3;
    white-space: nowrap;
  }

  // 原平台下拉是 240x32 / r4 / fs14 / border #d9d9d9（Element Plus default 尺寸而非 small）
  :deep(.dm-theme-select .el-select__wrapper) {
    width: 240px;
    min-height: 32px;
    height: 32px;
    padding: 0 30px 0 11px;
    border-radius: 4px;
    box-shadow: 0 0 0 1px #d9d9d9 inset;
    font-size: 14px;
  }

  :deep(.dm-theme-select .el-select__placeholder),
  :deep(.dm-theme-select .el-select__selected-item) {
    font-size: 14px;
    color: #595959;
  }
}

.dm-error {
  margin-bottom: 12px;
}

.dm-history__table {
  min-height: 120px;
}

.dm-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;

  th {
    height: 50px;
    padding: 14px 0 13px;
    border-bottom: 1px solid $border;
    background: #f9fafb;
    color: $text-1;
    font-size: 14px;
    font-weight: 700;
    text-align: left;

    &:first-child {
      padding-left: 16px;
    }

    &:last-child {
      padding-right: 16px;
      text-align: right;
    }
  }

  td {
    padding: 14px 0 13px;
    border-bottom: 1px solid $border;
    font-size: 14px;
    vertical-align: middle;

    &:first-child {
      padding-left: 16px;
    }

    &:last-child {
      padding-right: 16px;
      text-align: right;
    }
  }
}

.dm-record {
  display: flex;
  flex-direction: column;
  min-width: 0;

  &__name {
    display: block;
    overflow: hidden;
    color: $text-1;
    font-size: 14px;
    line-height: 22px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__theme {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: $text-3;
    font-size: 12px;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__mode {
    font-size: 14px;
    color: $text-2;
  }

  &__status {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
    line-height: 18px;
    font-weight: 500;
    background: #fff1f0;
    color: #f5222d;

    &.is-passed {
      background: #f6ffed;
      color: #52c41a;
    }

    &.is-running {
      background: #e8f0ff;
      color: $primary;
    }
  }

  &__score {
    color: #f5222d;
    font-size: 18px;
    font-weight: 800;

    &.is-passed {
      color: #52c41a;
    }
  }

  &__time {
    color: $text-3;
    font-size: 14px;
  }

  &__action {
    padding: 0;
    border: 0;
    background: transparent;
    color: $primary;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}

.dm-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1240px) {
  .dm-history {
    padding: 0 16px 24px;
  }

  .dm-history__container {
    width: 100%;
  }

  .dm-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dm-history__card {
    padding: 16px;
  }

  .dm-history__title {
    font-size: 20px;
    line-height: 28px;
  }

  .dm-filter-row {
    flex-wrap: wrap;
  }

  .dm-filter-tabs {
    flex-wrap: wrap;
  }

  .dm-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
