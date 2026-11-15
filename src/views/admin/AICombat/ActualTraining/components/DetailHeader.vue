<template>
  <!-- 双根节点：.dm-header（信息+操作）与 .dm-stats（四统计卡），对齐原平台两段结构 -->
  <div class="dm-header">
    <div class="dm-header__info">
      <div class="dm-header__title-row">
        <h2 class="dm-header__title">{{ detail.themeName }}</h2>
        <span class="dm-badge">{{ ACT_STATUS_TEXT[detail.status] }}</span>
        <span class="dm-badge">{{ ACT_ASSIGN_MODE_TEXT[detail.assignMode] }}</span>
        <span class="dm-badge">{{ difficultyStars(detail.difficulty) }} {{ ACT_DIFFICULTY_TEXT[detail.difficulty] }}</span>
        <span class="dm-badge">{{ ACT_THEME_MODE_TEXT[detail.themeMode] }}</span>
      </div>
      <p class="dm-header__desc">{{ detail.themeDesc || '暂无描述' }}</p>
      <div class="dm-header__time">
        <span>创建于 {{ detail.createdAt || '--' }}</span>
        <span>更新于 {{ detail.updatedAt || '--' }}</span>
      </div>
    </div>

    <!-- FP-09/FP-41/FP-43 按钮组按状态呈现；AI 设计助手是唯一主按钮 -->
    <div class="dm-header__actions">
      <!-- 草稿：发布主题 + AI 设计助手 -->
      <template v-if="detail.status === 0">
        <button type="button" class="dm-btn" @click="openPublish">发布主题</button>
        <button type="button" class="dm-btn dm-btn--primary" @click="goAssistant">AI 设计助手</button>
      </template>

      <!-- 发布中（初始化中）：AI 设计助手 + 导出报表(禁用) -->
      <template v-else-if="detail.status === 1">
        <button type="button" class="dm-btn dm-btn--primary" @click="goAssistant">AI 设计助手</button>
        <button type="button" class="dm-btn" disabled title="初始化完成后可导出">导出报表</button>
      </template>

      <!-- 已结束：仅导出报表 -->
      <template v-else-if="detail.status === 5">
        <button type="button" class="dm-btn" @click="comingSoon('功能建设中')">导出报表</button>
      </template>

      <!-- 已发布 / 已暂停：既有按钮组 -->
      <template v-else>
        <button type="button" class="dm-btn" @click="onPauseResume">
          {{ detail.status === 4 ? '恢复' : '暂停' }}
        </button>
        <button type="button" class="dm-btn dm-btn--danger" @click="onFinish">结束</button>
        <button type="button" class="dm-btn" @click="comingSoon('功能建设中')">分享</button>
        <button type="button" class="dm-btn" @click="comingSoon('功能建设中')">导出报表</button>
        <button type="button" class="dm-btn dm-btn--primary" @click="goAssistant">AI 设计助手</button>
      </template>
    </div>

    <!-- FP-41 初始化横幅：发布中蓝色（0/N 场景 · 5s 轮询）→ 完成绿色 -->
    <div v-if="showInitBanner" class="init-banner" :class="initBannerClass">
      <div class="banner-main">
        <span v-if="progressStatus === 1" class="banner-spinner"></span>
        <span v-else-if="progressFailed" class="banner-icon" aria-hidden="true"><el-icon><WarningFilled /></el-icon></span>
        <span v-else class="banner-icon" aria-hidden="true">✓</span>
        <span class="banner-text">{{ initBannerText }}</span>
      </div>
      <div class="banner-right">
        <button
          v-if="progressFailed"
          type="button"
          class="banner-action"
          :disabled="retrying"
          @click="onRetryInit"
        >
          {{ retrying ? '重试中…' : '重新初始化' }}
        </button>
        <button v-else-if="progressStatus === 1" type="button" class="banner-action" @click="bannerCollapsed = !bannerCollapsed">
          {{ bannerCollapsed ? '展开' : '收起' }}
        </button>
        <button v-else type="button" class="banner-action" @click="dismissDoneBanner">知道了</button>
      </div>
      <div v-if="progressStatus === 1 && !bannerCollapsed" class="banner-bar">
        <div class="bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </div>

  <!-- FP-08 四个统计板块（只展示）：文案与配色照原平台，值统一青色 -->
  <div class="dm-stats">
    <div class="dm-stats__cards">
      <div class="dm-stats__card">
        <div class="dm-stats__label">主题通过率</div>
        <div class="dm-stats__value">{{ detail.stats.passRate }}%</div>
        <div class="dm-stats__sub">通过 {{ detail.stats.passUserCount }} 人 / 参与 {{ detail.stats.participantCount }} 人</div>
      </div>
      <div class="dm-stats__card">
        <div class="dm-stats__label">场景单元</div>
        <div class="dm-stats__value">{{ detail.scenarioUnitCount }}个</div>
      </div>
      <div class="dm-stats__card">
        <div class="dm-stats__label">平均得分</div>
        <!-- 台账 R1-3：训考一体大号＝训练+考核合计均值，小号淡色补两套口径；单模式大号即该模式均分，不出小号 -->
        <div class="dm-stats__value">{{ formatAverage(averageMain) }}分</div>
        <div v-if="isDualMode" class="dm-stats__sub">
          训练均分 {{ formatAverage(detail.stats.trainingAverage) }} 分 / 考核均分
          {{ formatAverage(detail.stats.examAverage) }} 分
        </div>
      </div>
      <div class="dm-stats__card">
        <div class="dm-stats__label">练习总次数</div>
        <div class="dm-stats__value">{{ practiceTotal }}次</div>
        <div v-if="isDualMode" class="dm-stats__sub">
          训练 {{ detail.stats.trainingCount ?? 0 }} 次 / 考核 {{ detail.stats.examCount ?? 0 }} 次
        </div>
      </div>
    </div>
  </div>

  <!-- FP-41 发布弹窗（照线上：主题名/场景数/参与学员/预估时间 + 三条说明） -->
  <el-dialog
    :model-value="publishVisible"
    title="发布主题"
    width="520px"
    append-to-body
    @close="publishVisible = false"
  >
    <div class="publish-body">
      <div class="publish-theme">{{ detail.themeName }}</div>
      <div class="publish-stats">
        <div class="publish-stat">
          <div class="publish-label">场景数</div>
          <div class="publish-value">{{ detail.scenarioUnitCount }} 个</div>
        </div>
        <div class="publish-stat">
          <div class="publish-label">参与学员</div>
          <div class="publish-value">{{ detail.stats.participantCount }} 人</div>
        </div>
        <div class="publish-stat">
          <div class="publish-label">预估初始化</div>
          <div class="publish-value">≈ {{ estimatedMinutes }} 分钟</div>
        </div>
      </div>
      <ul class="publish-notes">
        <li v-for="(n, i) in publishNotes" :key="i">{{ n }}</li>
      </ul>
    </div>
    <template #footer>
      <el-button @click="publishVisible = false">取消</el-button>
      <el-button type="primary" :disabled="publishing" @click="doPublish">
        {{ publishing ? '发布中…' : '确认发布' }}
      </el-button>
    </template>
  </el-dialog>

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
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { finishTheme, pauseTheme } from '@/api/actTheme'
import { getScriptProgress, publishAssistantTheme, retryScriptInit } from '@/api/assistant'
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
import { WarningFilled } from '@element-plus/icons-vue'
import {
  averageOf as modeAverage,
  isDualMode as modeIsDual,
  practiceCountOf as modePracticeCount
} from './studentModeDisplay'

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

/** FP-30/FP-43：AI 设计助手 → 对话页（携带主题 ID） */
const goAssistant = () => {
  router.push(`/sparring/freesimulate/assistant/${props.detail.id}`)
}

// ---------- 统计卡展示 ----------

/** 练习总次数 / 平均分 / 训考一体判定统一走 studentModeDisplay（与学员列表同一口径） */
const practiceTotal = computed(() =>
  modePracticeCount({
    themeMode: props.detail.themeMode,
    trainingCount: props.detail.stats.trainingCount,
    examCount: props.detail.stats.examCount,
    totalPracticeCount: props.detail.stats.totalPracticeCount,
    totalTrainingCount: props.detail.stats.totalTrainingCount
  })
)

/** 训考一体：平均得分/练习次数需要同时呈现训练与考核两套口径 */
const isDualMode = computed(() => modeIsDual(props.detail.themeMode))

/** 大号平均分：训考一体取合计均值，单模式取该模式均分（无样本回落合计均值） */
const averageMain = computed(() =>
  modeAverage({
    themeMode: props.detail.themeMode,
    averageScore: props.detail.stats.avgScore,
    trainingAverage: props.detail.stats.trainingAverage,
    examAverage: props.detail.stats.examAverage
  })
)

/** 均分：无样本时后端给 null，展示 -- 而不是 0 分 */
const formatAverage = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : value

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
const sceneTotal = computed(() => progress.value?.sceneTotal ?? props.detail.scenarioUnitCount)
const sceneCompleted = computed(() => progress.value?.sceneCompleted ?? 0)
const progressPercent = computed(() => progress.value?.progress ?? 0)
const progressFailed = computed(() => (progress.value?.failed ?? 0) > 0)

/** 预计剩余按还没完成的场景算。进度接口的 total 是案例数，不能拿来当场景数 */
const remainMinutes = computed(() => Math.max(0, sceneTotal.value - sceneCompleted.value) * 2)

const showInitBanner = computed(() => {
  if (props.detail.status === 1) return true
  // 初始化刚完成（已转为已发布）且用户未关闭 → 绿色横幅；
  // 暂停/已结束等其它状态下不再显示这条"刚完成"提示
  return (
    props.detail.status === 3 &&
    progressStatus.value === 3 &&
    !doneDismissed.value &&
    progress.value != null
  )
})

const initBannerClass = computed(() => {
  if (progressFailed.value) return 'banner-error'
  return progressStatus.value === 1 ? 'banner-running' : 'banner-done'
})

const initBannerText = computed(() => {
  if (progressFailed.value) {
    return `初始化失败 ${progress.value?.failed ?? 0} 个案例，请重试（已完成 ${sceneCompleted.value}/${sceneTotal.value} 个场景）`
  }
  if (progressStatus.value === 1) {
    return `主题初始化中 · ${sceneCompleted.value}/${sceneTotal.value} 个场景已完成${
      remainMinutes.value > 0 ? ` · 预计剩余 ${remainMinutes.value} 分钟` : ''
    }`
  }
  return `${sceneTotal.value} 个场景全部就绪，主题已发布`
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
/* 尺寸全部取自 visual/measured/admin-theme-detail.json（原平台 viewport 1509x887） */

.dm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0;
  margin-top: 24px;
  width: 100%;

  &__info {
    flex: 1;
    min-width: 0;
    max-width: 660px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
  }

  &__title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    line-height: 32px;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    margin: 8px 0;
    max-width: 658px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 22px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    margin-left: 24px;
    height: 32px;
  }
}

.dm-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 2px 8px;
  border: 1px solid color-mix(in oklab, var(--color-success) 30%, var(--color-paper));
  border-radius: 4px;
  background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper));
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-success);
  white-space: nowrap;

  & + & { border-color: var(--color-accent-wash); background: var(--color-accent-wash); color: var(--color-accent); }
  & + & + & { border-color: color-mix(in oklab, var(--color-warning) 40%, var(--color-paper)); background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper)); color: var(--color-warning); }
  & + & + & + & { border-color: var(--color-accent-wash); background: var(--color-accent-wash); color: var(--color-accent-deep); }
}

.dm-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover:not(:disabled) { border-color: var(--color-accent); color: var(--color-accent); }
  &:disabled { color: var(--color-rule-2); cursor: not-allowed; }

  &--danger { border-color: color-mix(in oklab, var(--color-error) 30%, var(--color-paper)); color: var(--color-error); }

  &--primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);

    &:hover:not(:disabled) { border-color: var(--color-accent); background: var(--color-accent); color: var(--color-paper); }
  }
}

/* FP-41 初始化横幅 */
.init-banner {
  flex-basis: 100%;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 22px;

  &.banner-running { background: var(--color-accent-wash); color: var(--color-accent); }
  &.banner-done { background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper)); color: var(--color-success); }
  &.banner-error { background: color-mix(in oklab, var(--color-error) 8%, var(--color-paper)); color: var(--color-error); }

  .banner-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .banner-right {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .banner-action {
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    color: inherit;
    cursor: pointer;
    text-decoration: underline;
  }

  .banner-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: dm-spin 0.8s linear infinite;
  }

  .banner-bar {
    margin-top: 8px;
    height: 4px;
    border-radius: 2px;
    background: color-mix(in oklab, var(--color-accent) 15%, transparent);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 2px;
    background: currentColor;
    transition: width 0.3s;
  }
}

@keyframes dm-spin {
  to { transform: rotate(360deg); }
}

/* FP-08 四统计卡 */
.dm-stats {
  display: block;
  margin-top: 24px;
  width: 100%;

  &__cards {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  &__card {
    flex: 1;
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--color-rule);
    border-radius: 12px;
    background: var(--color-paper);
  }

  &__label {
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  &__value {
    margin-top: 4px;
    font-size: 20px;
    font-weight: 700;
    line-height: 20px;
    color: var(--color-accent-2);
    font-variant-numeric: tabular-nums;
  }

  &__sub {
    margin-top: 6px;
    font-size: 13px;
    line-height: 22px;
    color: var(--color-muted);
  }
}

/* 发布弹窗 */
.publish-body {
  .publish-theme {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .publish-stats {
    display: flex;
    gap: 16px;
    margin: 16px 0;
  }

  .publish-stat {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    background: var(--color-paper-2);
  }

  .publish-label {
    font-size: 13px;
    color: var(--color-muted);
  }

  .publish-value {
    margin-top: 4px;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .publish-notes {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 22px;
    color: var(--color-muted);
  }
}

@media (max-width: 1200px) {
  .dm-stats__cards { flex-wrap: wrap; }
  .dm-stats__card { flex: 1 1 45%; }
  .dm-header__actions { margin-left: 0; margin-top: 12px; }
}
</style>
