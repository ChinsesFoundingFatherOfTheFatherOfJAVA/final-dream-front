<template>
  <div class="practice-report">
    <!-- 顶部返回栏 -->
    <div class="report-topbar">
      <span
        class="back-arrow"
        role="button"
        tabindex="0"
        aria-label="返回"
        @click="goBack"
        @keydown.enter.prevent="goBack"
      >‹</span>
      <span
        class="topbar-label"
        role="button"
        tabindex="0"
        @click="goBack"
        @keydown.enter.prevent="goBack"
      >话术训练</span>
      <span class="topbar-title">{{ report?.projectName || '训练报告' }}</span>
    </div>

    <!-- 报告生成中：等待态 -->
    <div v-if="phase === 'waiting'" class="waiting-card">
      <div class="waiting-icon" aria-hidden="true">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#7a6cf0"/>
              <stop offset="100%" stop-color="#4a7dff"/>
            </linearGradient>
          </defs>
          <path d="M6 2h9l5 5v15H6V2Z" fill="url(#docGrad)" opacity="0.9"/>
          <path d="M15 2v5h5" fill="#cfd9ff"/>
          <line x1="9" y1="12" x2="16" y2="12" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="9" y1="16" x2="14" y2="16" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="waiting-title">报告生成中，请耐心等待</p>
      <p class="waiting-sub">报告生成可能需要一些时间，请稍候...</p>
    </div>

    <!-- 报告生成失败 -->
    <div v-else-if="phase === 'failed'" class="waiting-card">
      <p class="waiting-title">报告生成失败</p>
      <p class="waiting-sub">{{ failedHint || '报告生成出现问题，请重试' }}</p>
      <el-button class="retry-btn" :disabled="retrying" @click="onRegenerate">
        {{ retrying ? '重新生成中...' : '重新生成' }}
      </el-button>
    </div>

    <!-- 加载失败/无会话 -->
    <div v-else-if="phase === 'error'" class="waiting-card">
      <p class="waiting-title">{{ errorMsg || '报告加载失败' }}</p>
      <el-button class="retry-btn" @click="startPolling">刷新重试</el-button>
    </div>

    <!-- 报告已生成 -->
    <template v-else-if="phase === 'done' && report">
      <!-- FP-14 成绩概览卡 -->
      <div class="overview-card">
        <div class="overview-main">
          <div class="pill-row">
            <span class="pill solid">话术训练</span>
            <span class="pill outline">{{ report.projectType === 1 ? '通关考核' : '日常训练' }}</span>
          </div>
          <h1 class="overview-title">{{ report.projectName }}</h1>
          <p class="overview-rank">排名第{{ report.rankNo }}，超过了{{ report.exceedPercent }}%的同学</p>
          <div class="overview-meta">
            <span class="meta-item">
              <span class="meta-avatar">{{ (report.studentName || '学员').slice(0, 1) }}</span>
              {{ report.studentName || '学员' }}
            </span>
            <span class="meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.8"/>
                <path d="M12 7v5l3.5 2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              练习时长：{{ formatDuration(report.durationSeconds) }}
            </span>
            <span class="meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5h16v11H9l-4 4v-4H4V5Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
              对话轮次：{{ report.roundCount }}轮
            </span>
          </div>
        </div>
        <div class="overview-score">
          <span class="done-pill">已完成</span>
          <div class="score-value">
            {{ report.totalScore }}<span class="score-unit">分</span>
          </div>
          <span v-if="scoreChangeRised > 0" class="change-pill">较上次上升 {{ scoreChangeRised }} 分</span>
        </div>
      </div>

      <!-- FP-15 雷达图 + 维度得分卡 -->
      <div class="white-card">
        <div class="card-title">维度得分</div>
        <RadarChart :dimensions="report.dimensions ?? []" :last-dimensions="report.lastDimensions ?? null" />
        <p v-if="unscoredDimensions.length" class="dim-skip-note">
          {{ unscoredDimensions.map((d) => d.dimensionName).join('、') }}未参与本次评分——{{ unscoredDimensions[0]?.comment }}
        </p>
        <div class="score-cards">
          <div v-for="dim in sortedDimensions" :key="dim.dimensionName" class="score-card">
            <div class="score-card-head">
              <span class="dim-name">{{ dim.dimensionName }}</span>
              <span v-if="dim.score == null" class="dim-score dim-score-na">未参与</span>
              <span v-else class="dim-score" :class="{ low: dim.score < 60 }">{{ dim.score }}</span>
            </div>
            <div class="score-bar">
              <div v-if="dim.score != null" class="score-bar-fill" :style="{ width: `${Math.min(100, dim.score)}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- FP-16/17 评分明细 / 对话记录 Tab -->
      <div class="white-card">
        <div class="tabs">
          <span
            class="tab"
            :class="{ active: activeTab === 'score' }"
            role="button"
            tabindex="0"
            @click="activeTab = 'score'"
            @keydown.enter.prevent="activeTab = 'score'"
          >评分明细</span>
          <span
            class="tab"
            :class="{ active: activeTab === 'chat' }"
            role="button"
            tabindex="0"
            @click="activeTab = 'chat'"
            @keydown.enter.prevent="activeTab = 'chat'"
          >对话记录</span>
          <!--
            要点命中详情是"逐轮"数据（接口 4.2 按会话轮次返回），与某个维度叫什么名字无关，
            因此入口挂在 Tab 行而非某个维度块下：维度改名或新建自定义维度都不会让入口消失。
          -->
          <span
            v-if="reportId"
            class="consistency-entry"
            role="button"
            tabindex="0"
            @click="consistencyVisible = true"
            @keydown.enter.prevent="consistencyVisible = true"
          >
            查看逐轮要点命中详情 ›
          </span>
        </div>

        <ScoreDetail v-if="activeTab === 'score'" :dimensions="report.dimensions ?? []" />
        <ChatRecord
          v-else
          :messages="chatMessages"
          :round-suggestions="report.roundSuggestions ?? []"
          :trainer-avatar="report.trainerAvatar"
        />
      </div>

      <p class="page-footer">以上内容均由AI生成，仅供参考</p>
    </template>

    <!-- FP-16 话术一致性查看详情弹层 -->
    <ConsistencyDetail
      :visible="consistencyVisible"
      :report-id="reportId || ''"
      @close="consistencyVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RadarChart from './RadarChart.vue'
import ScoreDetail from './ScoreDetail.vue'
import ChatRecord from './ChatRecord.vue'
import ConsistencyDetail from './ConsistencyDetail.vue'
import { getReport, getReportMessages, regenerateReport } from '@/api/student'
import type { ReportResp, SessionMessage } from '@/types/student'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const sessionId = (route.query.sessionId as string) || ''

type Phase = 'initial' | 'waiting' | 'done' | 'failed' | 'error'
const phase = ref<Phase>('initial')
const report = ref<ReportResp | null>(null)
const chatMessages = ref<SessionMessage[]>([])
const activeTab = ref<'score' | 'chat'>('score')
const consistencyVisible = ref(false)
const errorMsg = ref('')
const failedHint = ref('')
const retrying = ref(false)

/** "较上次上升 N 分"（四舍五入取整，仅上升时显示） */
const scoreChangeRised = computed(() => {
  const change = report.value?.scoreChange
  if (change == null || change <= 0) return 0
  return Math.round(change)
})

const sortedDimensions = computed(() =>
  [...(report.value?.dimensions ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

/** 本次未参与评分的维度（如纯文字作答时的语音维度）：不进雷达图也不计入总分，页面需说明原因 */
const unscoredDimensions = computed(() => sortedDimensions.value.filter((d) => d.score == null))

/** 秒 → mm:ss */
const formatDuration = (seconds?: number | null) => {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 返回学员端 AI对练-话术训练列表，状态筛选定位到"已结束"（本次练习已完成） */
const goBack = () => {
  router.push('/sparring/web/speech/list?status=finished')
}

// ===== 轮询（FP-13/21/22）：3s 间隔，超时 5 分钟提示失败 =====
let pollTimer: number | null = null
const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 5 * 60 * 1000
/** 连续查询失败达到此次数即停止轮询并给出重试入口（此前错误被静默吞掉，会无限转圈） */
const MAX_POLL_ERRORS = 3
let pollStartAt = 0
let pollErrors = 0
/** 响应序号：慢响应不得覆盖后到的新响应，否则 phase 会从 done 被冲回 waiting */
let pollSeq = 0
/** 报告 ID：后端在生成中/失败态也返回，用于"重新生成"（此时 report 尚未填充） */
const reportId = ref<string | null>(null)

const stopPolling = () => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const fetchReport = async () => {
  const seq = ++pollSeq
  const data = await getReport(sessionId)
  if (seq !== pollSeq) return

  if (data.reportId) reportId.value = data.reportId

  if (data.reportStatus === 2) {
    report.value = data
    phase.value = 'done'
    stopPolling()
    // 对话记录 Tab 数据懒加载（先取，失败不阻塞）
    getReportMessages(sessionId)
      .then((msgs) => (chatMessages.value = msgs ?? []))
      .catch(() => (chatMessages.value = []))
    return
  }

  if (data.reportStatus === 3) {
    failedHint.value = ''
    phase.value = 'failed'
    stopPolling()
    return
  }

  // 0=未开始 / 1=生成中 → 等待态（超时判定由 tick 负责，不依赖本次请求是否成功）
  phase.value = 'waiting'
}

/** 单次轮询：先判超时，再发请求；查询异常累计到阈值后落到可重试的状态 */
const tick = async () => {
  if (Date.now() - pollStartAt > POLL_TIMEOUT) {
    failedHint.value = '报告生成超时，请点击重新生成'
    phase.value = 'failed'
    stopPolling()
    return
  }
  try {
    await fetchReport()
    pollErrors = 0
  } catch (e: unknown) {
    pollErrors++
    if (pollErrors < MAX_POLL_ERRORS) return
    if (reportId.value) {
      failedHint.value = '报告状态查询失败，可点击重新生成'
      phase.value = 'failed'
    } else {
      errorMsg.value = e instanceof Error ? e.message : '报告查询失败'
      phase.value = 'error'
    }
    stopPolling()
  }
}

const startPolling = () => {
  stopPolling()
  pollStartAt = Date.now()
  pollErrors = 0
  phase.value = 'waiting'
  void tick()
  pollTimer = window.setInterval(() => {
    void tick()
  }, POLL_INTERVAL)
}

/** FP-21 重新生成 */
const onRegenerate = async () => {
  if (retrying.value) return
  if (!reportId.value) {
    toast.warn('报告尚未建立，无法重新生成')
    return
  }
  retrying.value = true
  try {
    await regenerateReport(reportId.value)
    failedHint.value = ''
    startPolling()
  } catch {
    /* 重新生成失败已由 api/request.ts 的 toast 提示，这里只需保留失败态供再次点击 */
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  if (!sessionId) {
    errorMsg.value = '缺少会话参数'
    phase.value = 'error'
    return
  }
  startPolling()
})

onBeforeUnmount(stopPolling)
</script>

<script lang="ts">
export default { name: 'PracticeReport' }
</script>

<style scoped lang="scss">
.practice-report {
  min-height: 100vh;
  background: #f2f3f5;
  padding: 16px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1080px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 顶部返回栏 */
.report-topbar {
  display: flex;
  align-items: center;
  gap: 10px;

  .back-arrow {
    font-size: 24px;
    color: #555;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;

    &:hover {
      color: #2e7cf6;
    }

    // 图标返回按钮：补键盘焦点环
    &:focus-visible {
      outline: 2px solid #2e7cf6;
      outline-offset: 2px;
    }
  }

  .topbar-label {
    color: #2e7cf6;
    font-size: 15px;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid #2e7cf6;
      outline-offset: 2px;
    }
  }

  .topbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #222;
  }
}

/* 等待/失败/错误态 */
.waiting-card {
  background: #fff;
  border-radius: 14px;
  padding: 90px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .waiting-icon {
    animation: float 2.2s ease-in-out infinite;
    margin-bottom: 8px;
  }

  .waiting-title {
    font-size: 17px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .waiting-sub {
    font-size: 13px;
    color: #999;
    margin: 0;
  }

  .retry-btn {
    margin-top: 12px;
    padding: 10px 36px;
    border: none;
    border-radius: 22px;
    background: linear-gradient(90deg, #7a6cf0 0%, #4a7dff 100%);
    color: #fff;
    font-size: 14px;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 成绩概览卡 */
.overview-card {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 24px;
  border-radius: 14px;
  padding: 26px 30px;
  background: linear-gradient(115deg, #6d7cf0 0%, #5b8df5 45%, #57c8e8 100%);
  color: #fff;
}

.overview-main {
  min-width: 0;

  .pill-row {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;

    .pill {
      padding: 3px 14px;
      border-radius: 14px;
      font-size: 12px;

      &.solid {
        background: #3b5bd6;
        color: #fff;
      }

      &.outline {
        background: rgba(255, 255, 255, 0.92);
        color: #3b5bd6;
      }
    }
  }

  .overview-title {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 8px;
    color: #fff;
  }

  .overview-rank {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 16px;
  }

  .overview-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.95);

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
  }
}

.overview-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  flex-shrink: 0;
  gap: 8px;

  .done-pill {
    padding: 3px 12px;
    border-radius: 12px;
    background: #3ec46d;
    color: #fff;
    font-size: 12px;
  }

  .score-value {
    font-size: 44px;
    font-weight: 700;
    line-height: 1;
    color: #fff;

    .score-unit {
      font-size: 16px;
      font-weight: 400;
      margin-left: 4px;
    }
  }

  .change-pill {
    padding: 3px 12px;
    border-radius: 12px;
    background: #fff;
    color: #2fae5d;
    font-size: 12px;
  }
}

/* 白卡通用 */
.white-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}

/* 未参与评分维度的说明 */
.dim-skip-note {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
  margin: 6px 0 2px;
}

/* 维度得分小卡网格 */
.score-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }

  .score-card {
    background: #f8f9fc;
    border-radius: 10px;
    padding: 14px 16px;

    .score-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .dim-name {
        font-size: 13px;
        color: #555;
      }

      .dim-score {
        font-size: 15px;
        font-weight: 700;
        color: #333;

        &.low {
          color: #e54545;
        }

        &.dim-score-na {
          font-size: 12px;
          font-weight: 400;
          color: #999;
        }
      }
    }

    .score-bar {
      height: 6px;
      border-radius: 3px;
      background: #eceff5;
      overflow: hidden;

      .score-bar-fill {
        height: 100%;
        border-radius: 3px;
        background: linear-gradient(90deg, #4a7dff 0%, #57c8e8 100%);
        transition: width 0.4s ease;
      }
    }
  }
}

/* Tab */
.tabs {
  display: flex;
  align-items: center;
  gap: 32px;
  border-bottom: 1px solid #ececec;
  margin-bottom: 20px;

  .consistency-entry {
    margin-left: auto;
    align-self: center;
    padding-bottom: 10px;
    font-size: 13px;
    color: #2e7cf6;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid #2e7cf6;
      outline-offset: 2px;
    }
  }

  .tab {
    padding: 10px 0;
    font-size: 15px;
    color: #666;
    cursor: pointer;
    position: relative;

    &:focus-visible {
      outline: 2px solid #2e7cf6;
      outline-offset: -2px;
    }

    &.active {
      color: #2e7cf6;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: #2e7cf6;
      }
    }
  }
}

.page-footer {
  text-align: center;
  font-size: 12px;
  color: #b0b5c0;
  margin: 8px 0 0;
}
</style>
