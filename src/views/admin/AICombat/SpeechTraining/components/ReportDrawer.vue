<template>
  <el-drawer
    :model-value="visible"
    size="640px"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
    <template #header>
      <div class="drawer-header">
        <h3>训练详情</h3>
        <p v-if="report?.projectName">{{ report.projectName }}</p>
      </div>
    </template>

    <div v-if="loading" class="drawer-state">报告加载中...</div>
    <div v-else-if="error" class="drawer-state">{{ error }}</div>
    <div v-else-if="report && report.reportStatus !== 2" class="drawer-state">
      {{ report.reportStatus === 3 ? '报告生成失败' : '报告生成中，请稍后再查看' }}
    </div>
    <template v-else-if="report">
      <div class="score-banner">
        <div>
          <span class="banner-label">本次总分</span>
          <strong>{{ report.totalScore ?? '--' }}</strong>
        </div>
        <span v-if="scoreChangeRised > 0" class="change-tag">
          较上次提升 {{ scoreChangeRised }} 分
        </span>
      </div>

      <div class="drawer-tabs">
        <el-button :class="{ active: activeTab === 'score' }" @click="activeTab = 'score'">
          AI分析报告
        </el-button>
        <el-button :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
          对话记录
        </el-button>
        <el-button class="consistency-link" @click="consistencyVisible = true">
          要点命中详情
        </el-button>
      </div>

      <div class="drawer-body">
        <template v-if="activeTab === 'score'">
                <section class="report-section">
                  <h4>维度雷达</h4>
                  <RadarChart
                    :dimensions="report.dimensions ?? []"
                    :last-dimensions="report.lastDimensions ?? null"
                  />
                </section>
                <section class="report-section">
                  <h4>评分明细</h4>
                  <ScoreDetail :dimensions="report.dimensions ?? []" />
                </section>
        </template>
        <section v-else class="report-section chat-section">
                <ChatRecord
                  :messages="chatMessages"
                  :round-suggestions="report.roundSuggestions ?? []"
                  :trainer-avatar="report.trainerAvatar"
                  :likes-disabled="Boolean(userId)"
                />
        </section>
      </div>
    </template>
  </el-drawer>

  <ConsistencyDetail
    :visible="consistencyVisible"
    :report-id="report?.reportId || reportId || ''"
    :user-id="userId"
    @close="consistencyVisible = false"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RadarChart from '@/views/student/AICombat/RadarChart.vue'
import ScoreDetail from '@/views/student/AICombat/ScoreDetail.vue'
import ChatRecord from '@/views/student/AICombat/ChatRecord.vue'
import ConsistencyDetail from '@/views/student/AICombat/ConsistencyDetail.vue'
import { getReport, getReportMessages } from '@/api/student'
import type { ReportResp, SessionMessage } from '@/types/student'

const props = defineProps<{
  visible: boolean
  sessionId: string
  reportId?: string
  userId?: string
}>()

const emit = defineEmits<{ close: [] }>()

const report = ref<ReportResp | null>(null)
const chatMessages = ref<SessionMessage[]>([])
const loading = ref(false)
const error = ref('')
const activeTab = ref<'score' | 'chat'>('score')
const consistencyVisible = ref(false)

const scoreChangeRised = computed(() => {
  const change = report.value?.scoreChange
  if (change == null || change <= 0) return 0
  return Math.round(change)
})

const close = () => emit('close')

const handleVisibleChange = (visible: boolean) => {
  if (!visible) close()
}

const load = async () => {
  if (!props.sessionId) {
    error.value = '缺少会话参数'
    return
  }
  loading.value = true
  error.value = ''
  report.value = null
  chatMessages.value = []
  try {
    const [reportData, messageData] = await Promise.all([
      getReport(props.sessionId, { userId: props.userId }),
      getReportMessages(props.sessionId, { userId: props.userId }).catch(() => [])
    ])
    report.value = reportData
    chatMessages.value = messageData ?? []
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '报告加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.sessionId, props.userId],
  ([visible]) => {
    if (!visible) {
      consistencyVisible.value = false
      return
    }
    activeTab.value = 'score'
    void load()
  }
)
</script>

<style scoped lang="scss">
.drawer-header {
  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 17px;
  }

  p {
    margin: 5px 0 0;
    color: #8a92a5;
    font-size: 12px;
  }
}

.drawer-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #8a92a5;
  font-size: 14px;
}

.score-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 16px 18px 0;
  padding: 18px 20px;
  border-radius: 10px;
  background: linear-gradient(120deg, #4f6ee8 0%, #3386d5 100%);
  color: #fff;

  .banner-label {
    display: block;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
  }

  strong {
    font-size: 32px;
    line-height: 1;
  }
}

.change-tag {
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
}

.drawer-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px 0;
  background: #fff;

  button {
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 6px;
    background: #f2f4f8;
    color: #667085;
    font-size: 13px;
    cursor: pointer;

    &.active {
      background: #eaf1ff;
      color: #2e7cf6;
      font-weight: 600;
    }
  }

  .consistency-link {
    margin-left: auto;
    padding: 0;
    background: transparent;
    color: #2e7cf6;
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  padding: 16px 18px 30px;
  overflow-y: auto;
}

.report-section {
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid #edf0f5;
  border-radius: 9px;
  background: #fff;

  h4 {
    margin: 0 0 14px;
    color: #253047;
    font-size: 14px;
    font-weight: 600;
  }
}

.chat-section {
  min-height: 200px;
}

@media (max-width: 760px) {
  :deep(.el-drawer) {
    width: 100% !important;
  }
}
</style>
