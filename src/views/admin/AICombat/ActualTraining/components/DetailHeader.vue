<template>
  <div class="detail-header">
    <!-- FP-07 面包屑 + 标题 + 徽章 + 描述 + 时间 -->
    <div class="breadcrumb">
      <span class="crumb-link" @click="goBack">训练主题</span>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">主题详情</span>
    </div>

    <div class="header-main">
      <div class="header-info">
        <div class="title-row">
          <h2 class="theme-title">{{ detail.themeName }}</h2>
          <span class="badge" :class="`badge-status-${detail.status}`">{{ ACT_STATUS_TEXT[detail.status] }}</span>
          <span class="badge badge-assign">{{ ACT_ASSIGN_MODE_TEXT[detail.assignMode] }}</span>
          <span class="badge badge-difficulty">{{ difficultyStars(detail.difficulty) }} {{ ACT_DIFFICULTY_TEXT[detail.difficulty] }}</span>
          <span class="badge badge-mode">{{ ACT_THEME_MODE_TEXT[detail.themeMode] }}</span>
        </div>
        <p class="theme-desc">{{ detail.themeDesc || '暂无描述' }}</p>
        <p class="theme-time">
          <span>创建于 {{ detail.createdAt || '--' }}</span>
          <span class="time-gap">更新于 {{ detail.updatedAt || '--' }}</span>
        </p>
      </div>

      <!-- FP-09/FP-41/FP-43 按钮组按状态呈现 -->
      <div class="header-actions">
        <!-- 草稿：发布主题 + AI 设计助手 -->
        <template v-if="detail.status === 0">
          <button class="btn btn-primary" @click="openPublish">🚀 发布主题</button>
          <button class="btn btn-outline btn-ai" @click="goAssistant">AI 设计助手</button>
        </template>

        <!-- 发布中（初始化中）：AI 设计助手 + 导出报表(禁用) -->
        <template v-else-if="detail.status === 1">
          <button class="btn btn-outline btn-ai" @click="goAssistant">AI 设计助手</button>
          <button class="btn btn-outline" disabled title="初始化完成后可导出">导出报表</button>
        </template>

        <!-- 已结束：仅导出报表 -->
        <template v-else-if="detail.status === 5">
          <button class="btn btn-outline" @click="comingSoon('功能建设中')">导出报表</button>
        </template>

        <!-- 已发布 / 已暂停：既有按钮组 -->
        <template v-else>
          <button class="btn btn-outline" @click="onPauseResume">
            {{ detail.status === 4 ? '恢复' : '暂停' }}
          </button>
          <button class="btn btn-outline btn-danger" @click="onFinish">结束</button>
          <button class="btn btn-outline" @click="comingSoon('功能建设中')">分享</button>
          <button class="btn btn-outline" @click="comingSoon('功能建设中')">导出报表</button>
          <button class="btn btn-outline btn-ai" @click="goAssistant">AI 设计助手</button>
        </template>
      </div>
    </div>

    <!-- FP-41 初始化横幅：发布中蓝色（0/N 场景 · 5s 轮询）→ 完成绿色 -->
    <div v-if="showInitBanner" class="init-banner" :class="initBannerClass">
      <div class="banner-main">
        <span v-if="progressStatus === 1" class="banner-spinner"></span>
        <span v-else-if="progressFailed" class="banner-icon">⚠️</span>
        <span v-else class="banner-icon">✓</span>
        <span class="banner-text">{{ initBannerText }}</span>
      </div>
      <div class="banner-right">
        <button
          v-if="progressFailed"
          class="banner-action"
          :disabled="retrying"
          @click="onRetryInit"
        >
          {{ retrying ? '重试中…' : '重新初始化' }}
        </button>
        <button v-else-if="progressStatus === 1" class="banner-toggle" @click="bannerCollapsed = !bannerCollapsed">
          {{ bannerCollapsed ? '展开' : '收起' }}
        </button>
        <button v-else class="banner-toggle" @click="dismissDoneBanner">知道了</button>
      </div>
      <div v-if="progressStatus === 1 && !bannerCollapsed" class="banner-bar">
        <div class="bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- FP-08 四个统计板块（只展示） -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">主题通过率 <span class="info-icon">ⓘ</span></div>
        <div class="stat-value value-purple">{{ detail.stats.passRate }}<span class="unit">%</span></div>
        <div class="stat-progress">
          <div class="progress-fill" :style="{ width: Math.min(100, detail.stats.passRate) + '%' }"></div>
        </div>
        <div class="stat-foot">通过 {{ detail.stats.passUserCount }} 人 / 参与 {{ detail.stats.participantCount }} 人</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">场景单元 <span class="info-icon">ⓘ</span></div>
        <div class="stat-value value-blue">{{ detail.scenarioUnitCount }}<span class="unit">个</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均得分 <span class="info-icon">ⓘ</span></div>
        <div class="stat-value value-orange">{{ detail.stats.avgScore }}<span class="unit">分</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">训练总次数 <span class="info-icon">ⓘ</span></div>
        <div class="stat-value value-blue">{{ detail.stats.totalTrainingCount }}<span class="unit">次</span></div>
      </div>
    </div>

    <!-- FP-41 发布弹窗（照线上：主题名/场景数/参与学员/预估时间 + 三条说明） -->
    <Teleport to="body">
      <div v-if="publishVisible" class="publish-overlay" @click.self="publishVisible = false">
        <div class="publish-dialog">
          <div class="publish-header">发布主题</div>
          <div class="publish-body">
            <div class="publish-theme">{{ detail.themeName }}</div>
            <div class="publish-stats">
              <div class="publish-stat">
                <div class="stat-label">场景数</div>
                <div class="stat-value">{{ detail.scenarioUnitCount }} <span class="unit">个</span></div>
              </div>
              <div class="publish-stat">
                <div class="stat-label">参与学员</div>
                <div class="stat-value">{{ detail.stats.participantCount }} <span class="unit">人</span></div>
              </div>
              <div class="publish-stat">
                <div class="stat-label">预估初始化</div>
                <div class="stat-value">≈ {{ estimatedMinutes }} <span class="unit">分钟</span></div>
              </div>
            </div>
            <ul class="publish-notes">
              <li v-for="(n, i) in publishNotes" :key="i">{{ n }}</li>
            </ul>
          </div>
          <div class="publish-footer">
            <button class="btn-cancel" @click="publishVisible = false">取消</button>
            <button class="btn-publish" :disabled="publishing" @click="doPublish">
              {{ publishing ? '发布中…' : '确认发布' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <ConfirmDialog
      :visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmText"
      :danger="confirmDanger"
      :loading="actionLoading"
      @confirm="doAction"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { finishTheme, pauseTheme } from '@/api/actTheme'
import {
  getScriptProgress,
  publishAssistantTheme,
  retryScriptInit
} from '@/api/assistant'
import {
  ACT_ASSIGN_MODE_TEXT,
  ACT_DIFFICULTY_TEXT,
  ACT_STATUS_TEXT,
  ACT_THEME_MODE_TEXT,
  difficultyStars
} from '@/types/actTheme'
import type { ActThemeDetail } from '@/types/actTheme'
import type { AssistantScriptProgressResp } from '@/types/assistant'
import ConfirmDialog from './ConfirmDialog.vue'
import { initNotified, readInitProgress, writeInitProgress, clearInitProgress } from './initProgress'
import { comingSoon, showToast } from './ui'

const props = defineProps<{ detail: ActThemeDetail }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const router = useRouter()
const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmText = ref('确定')
const confirmDanger = ref(false)
const actionLoading = ref(false)
let actionType: 'pause' | 'resume' | 'finish' | null = null

const goBack = () => {
  router.push('/sparring/freesimulate/topic')
}

/** FP-30/FP-43：AI 设计助手 → 对话页（携带主题 ID） */
const goAssistant = () => {
  router.push(`/sparring/freesimulate/assistant/${props.detail.id}`)
}

// ---------- FP-41 发布与初始化进度 ----------

const publishVisible = ref(false)
const publishing = ref(false)

/** 预估初始化时长 ≈ 场景数 × 2 分钟 */
const estimatedMinutes = computed(() => Math.max(1, props.detail.scenarioUnitCount * 2))

/** 发布说明三条（照线上弹窗结构） */
const publishNotes = [
  '发布后系统将为每个场景的实战案例初始化训练剧本，期间主题状态为「发布中」。',
  '初始化期间学员暂不能参与该主题训练，请保持页面开启以便查看进度。',
  '初始化完成后主题自动变为「已发布」，本次内容会在版本历史中生成新版本。'
]

/**
 * 初始化进度取自跨实例缓存（见 initProgress.ts）：父级 refreshAll 会把 loading 置真，
 * 导致本组件被卸载重建，进度状态不能存活在组件实例里。
 */
const progress = computed<AssistantScriptProgressResp | null>(() => readInitProgress(props.detail.id))
const bannerCollapsed = ref(false)
const retrying = ref(false)
const doneDismissed = ref(false)
let pollTimer: number | null = null

const progressStatus = computed(() => progress.value?.status ?? props.detail.status)
const progressTotal = computed(() => progress.value?.total ?? props.detail.scenarioUnitCount)
const progressCompleted = computed(() => progress.value?.completed ?? 0)
const progressPercent = computed(() => progress.value?.progress ?? 0)
const progressFailed = computed(() => (progress.value?.failed ?? 0) > 0)

/** 预计剩余：剩余场景数 × 2 分钟（场景数为 0 时不显示） */
const remainMinutes = computed(() => {
  const rest = Math.max(0, progressTotal.value - progressCompleted.value)
  return rest * 2
})

const showInitBanner = computed(() => {
  if (props.detail.status === 1) return true
  // 初始化刚完成（已转为已发布）且用户未关闭 → 绿色横幅；
  // 暂停/已结束等其它状态下不再显示这条"刚完成"提示
  return props.detail.status === 3 && progressStatus.value === 3 && !doneDismissed.value && progress.value != null
})

const initBannerClass = computed(() => {
  if (progressFailed.value) return 'banner-error'
  return progressStatus.value === 1 ? 'banner-running' : 'banner-done'
})

const initBannerText = computed(() => {
  if (progressFailed.value) {
    return `初始化失败 ${progress.value?.failed ?? 0} 个案例，请重试（已完成 ${progressCompleted.value}/${progressTotal.value}）`
  }
  if (progressStatus.value === 1) {
    return `主题初始化中 · ${progressCompleted.value}/${progressTotal.value} 个案例已完成${
      remainMinutes.value > 0 ? ` · 预计剩余 ${remainMinutes.value} 分钟` : ''
    }`
  }
  // total 的语义是"实战案例数"（后端 GetScriptProgress 按 act_case_script 统计，见 03 §3.3）：
  // 主题下没有案例时后端无需等待，直接置为已发布并返回 0。此处不能说成"0 个场景"——
  // 场景单元是另一张表（仍有 N 个），照抄会误导（实测用户以为发布丢了 6 个场景）。
  if (progressTotal.value === 0) {
    return '主题已发布（该主题下没有需要初始化的实战案例；生成并确认案例后再发布会一并编译）'
  }
  return `${progressTotal.value} 个案例全部就绪，主题已发布`
})

/** 5s 轮询进度；status 变为 3 停止并刷新详情 */
function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollProgress() {
  try {
    const resp = await getScriptProgress(props.detail.id)
    writeInitProgress(props.detail.id, resp)
    if (resp.status !== 1) {
      stopPolling()
      if (
        !initNotified.has(props.detail.id) &&
        resp.total > 0 &&
        resp.completed >= resp.total &&
        resp.failed === 0
      ) {
        initNotified.add(props.detail.id)
        showToast('主题初始化完成，已发布')
      }
      // 仅当服务端状态相对当前详情变化时才刷新，避免"刷新→重挂载→再轮询"循环
      if (resp.status !== props.detail.status) emit('refresh')
    }
  } catch {
    // 轮询失败保持静默，下一轮重试
  }
}

function startPolling() {
  if (pollTimer !== null) return
  void pollProgress()
  pollTimer = window.setInterval(() => void pollProgress(), 5000)
}

function dismissDoneBanner() {
  doneDismissed.value = true
}

function openPublish() {
  publishVisible.value = true
}

/** 发布：调 POST /publish → 状态转发布中 → 启动 5s 轮询 */
async function doPublish() {
  publishing.value = true
  try {
    await publishAssistantTheme(props.detail.id)
    publishVisible.value = false
    showToast('主题已提交发布，正在初始化')
    doneDismissed.value = false
    clearInitProgress(props.detail.id)
    emit('refresh')
    startPolling()
  } catch (e) {
    // 未确认内容时后端返回 code=1「请先在 AI 助手中确认内容」
    if (e instanceof Error && e.message) showToast(e.message)
  } finally {
    publishing.value = false
  }
}

/** 仅失败项重试 */
async function onRetryInit() {
  retrying.value = true
  try {
    await retryScriptInit(props.detail.id)
    showToast('已重新提交初始化')
    clearInitProgress(props.detail.id)
    emit('refresh')
    startPolling()
  } catch (e) {
    if (e instanceof Error && e.message) showToast(e.message)
  } finally {
    retrying.value = false
  }
}

// 进入详情即为发布中 → 直接开始轮询
watch(
  () => props.detail.status,
  (status) => {
    if (status === 1) {
      doneDismissed.value = false
      startPolling()
    } else {
      stopPolling()
    }
  },
  { immediate: true }
)

onBeforeUnmount(stopPolling)

// ---------- 暂停 / 恢复 / 结束 ----------

const onPauseResume = () => {
  actionType = props.detail.status === 4 ? 'resume' : 'pause'
  if (actionType === 'pause') {
    confirmTitle.value = '确认暂停'
    confirmMessage.value = `暂停后学员将无法继续练习「${props.detail.themeName}」，确定要暂停吗？`
    confirmText.value = '确认暂停'
    confirmDanger.value = false
  } else {
    confirmTitle.value = '确认恢复'
    confirmMessage.value = `恢复后学员可继续练习「${props.detail.themeName}」，确定要恢复吗？`
    confirmText.value = '确认恢复'
    confirmDanger.value = false
  }
  confirmVisible.value = true
}

const onFinish = () => {
  actionType = 'finish'
  confirmTitle.value = '确认结束'
  confirmMessage.value = '结束后主题不可恢复、无法再进行任何操作，确定要结束吗？'
  confirmText.value = '确认结束'
  confirmDanger.value = true
  confirmVisible.value = true
}

const doAction = async () => {
  if (!actionType) return
  actionLoading.value = true
  try {
    if (actionType === 'finish') {
      await finishTheme(props.detail.id)
      showToast('主题已结束')
    } else {
      await pauseTheme(props.detail.id)
      showToast(actionType === 'pause' ? '主题已暂停' : '主题已恢复')
    }
    confirmVisible.value = false
    emit('refresh')
  } catch (e) {
    if (e instanceof Error && e.message) showToast(e.message)
  } finally {
    actionLoading.value = false
    actionType = null
  }
}
</script>

<style scoped lang="scss">
.detail-header {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 14px;

  .crumb-link {
    color: #1890ff;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }

  .crumb-sep { color: #c0c4cc; }
  .crumb-current { color: #8a8f98; }
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  .theme-title {
    font-size: 22px;
    font-weight: 600;
    color: #1f2329;
    margin: 0;
  }

  .badge {
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 13px;
    white-space: nowrap;

    &.badge-status-0 { color: #8a8f98; background: #f2f3f5; }
    &.badge-status-1 { color: #1890ff; background: #e6f7ff; }
    &.badge-status-2 { color: #e5484d; background: #fdecec; }
    &.badge-status-3 { color: #52c41a; background: #f0fbe8; }
    &.badge-status-4 { color: #fa8c16; background: #fff7e6; }
    &.badge-status-5 { color: #8a8f98; background: #f2f3f5; }
    &.badge-assign { color: #1890ff; background: #e6f7ff; }
    &.badge-difficulty { color: #e8940c; background: #fff7e6; }
    &.badge-mode { color: #6b5ce7; background: #f0edff; }
  }
}

.theme-desc {
  font-size: 14px;
  color: #8a8f98;
  margin: 8px 0 6px;
}

.theme-time {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #a5a9b0;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;

  .btn {
    padding: 7px 14px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &.btn-outline {
      background: #fff;
      color: #4e5969;
      border: 1px solid #dcdfe6;

      &:hover:not(:disabled) { color: #1890ff; border-color: #1890ff; }
      &.btn-danger { color: #e5484d; border-color: #f5b5b5; }
      &.btn-danger:hover:not(:disabled) { background: #fff1f0; border-color: #e5484d; color: #e5484d; }
      &:disabled { color: #c0c4cc; border-color: #ebeef5; cursor: not-allowed; }
    }

    &.btn-primary {
      background: #1890ff;
      color: #fff;
      border: 1px solid #1890ff;

      &:hover { opacity: 0.85; }
    }

    /* AI 设计助手：入口按钮，统一样式（各状态组内可见） */
    &.btn-ai {
      color: #6b5ce7;
      border-color: #d6d2f2;
      background: #f8f7ff;

      &:hover:not(:disabled) { color: #6b5ce7; border-color: #6b5ce7; background: #f0edff; }
    }
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 18px;
}

/* FP-41 初始化横幅 */
.init-banner {
  position: relative;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  &.banner-running { background: #e6f7ff; border: 1px solid #bae0ff; color: #0b5b96; }
  &.banner-done { background: #f0fbe8; border: 1px solid #d3f0c0; color: #2e7d32; }
  &.banner-error { background: #fff1f0; border: 1px solid #ffccc7; color: #c0392b; }

  .banner-main {
    display: flex;
    align-items: center;
    gap: 9px;
    flex: 1;
    min-width: 0;

    .banner-icon { font-size: 15px; }
    .banner-text { font-size: 14px; }
  }

  .banner-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(24, 144, 255, 0.3);
    border-top-color: #1890ff;
    border-radius: 50%;
    animation: banner-spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  .banner-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .banner-toggle,
    .banner-action {
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid currentColor;
      border-radius: 4px;
      font-size: 13px;
      color: inherit;
      cursor: pointer;
      white-space: nowrap;

      &:hover:not(:disabled) { background: #fff; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
  }

  .banner-bar {
    flex-basis: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 3px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      background: #1890ff;
      border-radius: 3px;
      transition: width 0.4s;
    }
  }
}

@keyframes banner-spin {
  to { transform: rotate(360deg); }
}

/* FP-41 发布弹窗 */
.publish-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.publish-dialog {
  width: 520px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;

  .publish-header {
    padding: 18px 24px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2329;
  }

  .publish-body { padding: 14px 24px 20px; }

  .publish-theme {
    font-size: 15px;
    font-weight: 600;
    color: #1f2329;
    padding-bottom: 12px;
    border-bottom: 1px solid #f2f3f5;
  }

  .publish-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 14px 0;

    .publish-stat {
      background: #fafbfc;
      border: 1px solid #eef0f3;
      border-radius: 8px;
      padding: 10px 12px;

      .stat-label { font-size: 12px; color: #8a8f98; margin-bottom: 5px; }
      .stat-value {
        font-size: 20px;
        font-weight: 600;
        color: #1890ff;

        .unit { font-size: 12px; font-weight: 400; margin-left: 2px; }
      }
    }
  }

  .publish-notes {
    margin: 0;
    padding-left: 18px;

    li {
      font-size: 13px;
      color: #646a73;
      line-height: 1.9;
    }
  }

  .publish-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 12px 24px 18px;
    border-top: 1px solid #f0f0f0;

    button {
      padding: 7px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-cancel {
        background: #fff;
        color: #666;
        border: 1px solid #d9d9d9;

        &:hover { color: #1890ff; border-color: #1890ff; }
      }

      &.btn-publish {
        background: #1890ff;
        color: #fff;
        border: 1px solid #1890ff;

        &:hover:not(:disabled) { opacity: 0.85; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }
    }
  }
}

.stat-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 16px;

  .stat-label {
    font-size: 13px;
    color: #8a8f98;
    margin-bottom: 8px;

    .info-icon { color: #c9cdd4; cursor: help; }
  }

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 4px;

    .unit { font-size: 14px; font-weight: 400; margin-left: 2px; }
    &.value-purple { color: #6b5ce7; }
    &.value-blue { color: #1890ff; }
    &.value-orange { color: #e8940c; }
  }

  .stat-progress {
    height: 6px;
    background: #f2f3f5;
    border-radius: 3px;
    overflow: hidden;
    margin: 4px 0 6px;

    .progress-fill {
      height: 100%;
      background: #6b5ce7;
      border-radius: 3px;
      transition: width 0.3s;
    }
  }

  .stat-foot {
    font-size: 13px;
    color: #a5a9b0;
  }
}
</style>
