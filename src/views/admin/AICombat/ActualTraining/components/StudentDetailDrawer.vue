<template>
  <div class="student-detail" v-loading="loading">
    <template v-if="detail">
      <div class="head-card">
        <div class="user-line">
          <span class="name">{{ detail.name }}</span>
          <el-tag size="small" :type="detail.source === 'public' ? 'success' : 'primary'">
            {{ detail.source === 'public' ? '公开加入' : '指派' }}
          </el-tag>
        </div>
        <div class="metrics">
          <div class="metric">
            <span class="value">{{ detail.reportCount }}</span>
            <span class="label">报告数</span>
          </div>
          <div class="metric">
            <span class="value">{{ detail.passedCount }}</span>
            <span class="label">通过数</span>
          </div>
          <div class="metric">
            <span class="value">{{ formatScore(detail.averageScore) }}</span>
            <span class="label">平均分</span>
            <!-- 台账 R1-3：训考一体大号是合计均值，小号淡色补训练/考核两套口径；单模式不出小号 -->
            <span v-if="dualMode" class="sub">
              训练 {{ formatScore(detail.trainingAverage) }} 分 / 考核 {{ formatScore(detail.examAverage) }} 分
            </span>
          </div>
          <div class="metric">
            <span class="value">{{ detail.extraExamAttemptCount }}</span>
            <span class="label">追加考核</span>
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <!-- tab 懒加载：records 首次激活才请求（契约 02 §5.10） -->
        <el-tab-pane label="对练记录" name="records">
          <el-table v-if="recordsLoaded" :data="records" size="small" max-height="360">
            <!-- 列宽：抽屉内容宽 640，场景（ID 较长）+ 状态（report_generating 等长串）都必须
                 省略而不是换行，否则 72 高的行被撑成两行、整张表看起来错位。 -->
            <el-table-column label="场景" prop="scenarioId" min-width="132" show-overflow-tooltip />
            <el-table-column label="模式" width="80">
              <template #default="{ row }">{{ row.studyMode === 2 ? '考核' : '训练' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="140" show-overflow-tooltip />
            <el-table-column label="得分" width="88">
              <template #default="{ row }">{{ row.totalScore ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="时间" min-width="142">
              <template #default="{ row }">{{ formatTime(row.startedAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="场景分布" name="distribution">
          <div
            v-for="(count, scenarioId) in scenarioDistribution"
            :key="scenarioId"
            class="dist-row"
          >
            <span class="scenario">{{ scenarioId }}</span>
            <el-progress :percentage="distPercent(count)" :stroke-width="8" :show-text="false" />
            <span class="count">{{ count }} 次</span>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
// 学员详情抽屉（AD05 + AD06）：汇总/场景分布/对练记录，records tab 懒加载
import { computed, onMounted, ref, watch } from 'vue'
import {
  getThemeStudentDetail,
  listStudentRecords,
  type StudentRecordItem,
} from '@/api/actStudentAdmin'
import { formatScore as modeFormatScore } from './studentModeDisplay'

const props = defineProps<{
  themeId: string
  userId: string
  /** 训考一体：平均分需要补训练/考核两套口径（单模式大号即该模式均分） */
  dualMode?: boolean
}>()

const loading = ref(true)
const detail = ref<Record<string, unknown> | null>(null)
const activeTab = ref('records')
const records = ref<StudentRecordItem[]>([])
const recordsLoaded = ref(false)

const scenarioDistribution = computed(
  () => (detail.value?.scenarioDistribution ?? {}) as Record<string, number>,
)
const totalScenarios = computed(() =>
  Object.values(scenarioDistribution.value).reduce((sum, count) => sum + Number(count), 0),
)
const distPercent = (count: number) =>
  totalScenarios.value ? Math.round((Number(count) / totalScenarios.value) * 100) : 0

/** 均分渲染与列表同一口径：无样本显示 —，0 分保留 */
const formatScore = (value: unknown) =>
  modeFormatScore(value === null || value === undefined ? null : Number(value))

const formatTime = (value: string | null) => value?.replace('T', ' ').slice(0, 16) ?? '—'

async function loadRecords() {
  if (recordsLoaded.value) return
  const page = await listStudentRecords(props.themeId, props.userId, { page: 1, size: 50 })
  records.value = page.records ?? []
  recordsLoaded.value = true
}

watch(activeTab, (tab) => {
  if (tab === 'records') loadRecords()
})

onMounted(async () => {
  try {
    detail.value = await getThemeStudentDetail(props.themeId, props.userId)
    await loadRecords()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
/* 台账 #8：抽屉体在 .exam-drawer 里 padding 被全局置 0，内容会贴边。
   这里由组件自己补内边距（20px 与接头像卡/表格的 16 拉开层级），宽度由宿主给 680px。 */
.student-detail {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;

  .head-card {
    background: var(--el-fill-color-light);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    .user-line {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
      .name {
        font-size: 16px;
        font-weight: 600;
      }
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      .metric {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .value {
          font-size: 18px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .label {
          color: var(--el-text-color-secondary);
          font-size: 12px;
        }
        /* 小号淡色：比大号低两级字号，仅训考一体出现 */
        .sub {
          color: var(--el-text-color-secondary);
          font-size: 12px;
          line-height: 16px;
        }
      }
    }
  }
  .dist-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    .scenario {
      width: 130px;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .el-progress {
      flex: 1;
    }
    .count {
      width: 48px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
