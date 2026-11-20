<template>
  <div class="drillmate-home">
    <div class="layout">
      <!-- 左栏：学员信息 + 四项统计（契约 F02） -->
      <aside class="col-left">
        <div class="user-block">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-name">{{ displayName }}</div>
          <div class="user-meta">{{ deptPosition }}</div>
        </div>
        <div class="stat-grid">
          <div v-for="cell in statCells" :key="cell.label" class="stat-cell">
            <div class="stat-value-row">
              <span class="stat-value">{{ cell.value }}</span>
              <span v-if="cell.unit" class="stat-unit">{{ cell.unit }}</span>
            </div>
            <div class="stat-label">{{ cell.label }}</div>
          </div>
        </div>
      </aside>

      <!-- 中栏：快捷入口 + 我的训练主题 -->
      <main class="col-main">
        <!-- 快捷入口（契约 F03）：竞技场/荣誉榜为占位，练习历程进真实页面 -->
        <div class="quick-bar">
          <div
            v-for="entry in quickEntries"
            :key="entry.title"
            class="quick-entry"
            role="button"
            tabindex="0"
            @click="entry.go"
            @keydown.enter.prevent="entry.go"
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="entry.icon"
            ></svg>
            <div class="quick-text">
              <div class="quick-title">{{ entry.title }}</div>
              <div class="quick-sub">{{ entry.sub }}</div>
            </div>
          </div>
        </div>

        <!-- 我的训练主题（契约 F04） -->
        <section class="theme-panel">
          <div class="theme-panel__head">
            <span class="theme-panel__title">我的训练主题</span>
            <span class="theme-panel__count">{{ themes.length }} 个</span>
          </div>

          <el-skeleton v-if="loading" :rows="3" animated />
          <el-alert v-else-if="error" type="error" :title="error" :closable="false" />
          <div v-else-if="!themes.length" class="theme-empty">
            <el-empty description="暂未加入训练主题，可在下方学习机会中加入" :image-size="72" />
          </div>
          <template v-else>
            <div class="theme-list">
              <div
                v-for="theme in visibleThemes"
                :key="theme.themeId"
                class="theme-card"
                role="button"
                tabindex="0"
                @click="goDetail(theme.themeId)"
                @keydown.enter.prevent="goDetail(theme.themeId)"
              >
                <div class="theme-head">
                  <div class="theme-name">{{ theme.name }}</div>
                  <span class="theme-status" :class="`is-${theme.status}`">
                    {{ statusText(theme.status) }}
                  </span>
                </div>
                <div class="theme-meta">
                  {{ theme.scenarioCount }} 个场景 · 已通过 {{ theme.myPassedScenarios }} 个
                </div>
                <div class="theme-track">
                  <div class="theme-fill" :style="{ width: `${theme.progress}%` }"></div>
                </div>
                <div class="theme-progress-label">进度 {{ theme.progress }}%</div>
              </div>
            </div>
            <div v-if="themes.length > THEME_PREVIEW" class="theme-more">
              <button type="button" class="link-btn" @click="showAllThemes = !showAllThemes">
                {{ showAllThemes ? '收起' : '显示更多' }}
              </button>
            </div>
          </template>
        </section>

        <!-- 更多学习机会（契约 F05）：最多 6 个 -->
        <section v-if="opportunities.length" class="opps">
          <div class="opps__head">
            <span class="opps__title">更多学习机会</span>
          </div>
          <div class="opp-list">
            <div v-for="theme in opportunities" :key="theme.themeId" class="opp-card">
              <div class="opp-name">{{ theme.name }}</div>
              <div class="opp-meta">
                <span>{{ theme.scenarioCount }} 个场景</span>
                <span v-if="theme.planEndTime">截止 {{ formatTime(theme.planEndTime) }}</span>
              </div>
              <button type="button" class="join-btn" @click="join(theme.themeId)">立即加入</button>
            </div>
          </div>
        </section>
      </main>

      <!-- 右栏：最近练习（契约 F06，只展示最新 1 条） -->
      <aside class="col-right">
        <section class="recent-panel">
          <div class="recent-head-row">
            <span class="recent-title">最近练习</span>
            <span class="recent-more" role="button" tabindex="0" @click="goHistory">
              查看全部
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>

          <el-empty v-if="!recent" description="还没有练习记录" :image-size="60" />
          <div
            v-else
            class="recent-card"
            role="button"
            tabindex="0"
            @click="openRecent(recent)"
            @keydown.enter.prevent="openRecent(recent)"
          >
            <div class="recent-head">
              <div class="recent-scenario">{{ recent.scenarioName || recent.scenarioId }}</div>
              <span class="recent-status" :class="`is-${recent.status}`">
                {{ attemptStatusText(recent) }}
              </span>
            </div>
            <div class="recent-theme">主题：{{ recent.themeName || recent.themeId }}</div>
            <div class="recent-score">
              <span v-if="recent.totalScore != null" class="score" :class="{ fail: recent.passed !== 1 }">
                {{ recent.totalScore }} 分
              </span>
              <span class="time">{{ relativeTime(recent.startedAt) }}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
// 学员端首页（契约 02 §5.2 三栏；04 §3 API-S01 一次聚合）。
// 结构与尺寸对齐原平台：visual/measured/drillmate-home.json 是唯一期望来源，
// visual/contracts/drillmate-home.json 只声明映射；改动后必须跑 scripts/visual-audit.mjs。
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getStudentHomeSummary,
  joinStudentTheme,
  type AttemptStatus,
  type StudentHistoryItem,
  type StudentThemeCard,
} from '@/api/actStudent'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

/** 契约 F04：默认最多展示 4 个主题，超出提供"显示更多/收起" */
const THEME_PREVIEW = 4

const loading = ref(true)
const error = ref('')
const themes = ref<StudentThemeCard[]>([])
const opportunities = ref<StudentThemeCard[]>([])
const recent = ref<StudentHistoryItem | null>(null)
const stats = ref<{ totalHours: number | null; practiceCount: number; themeCount: number; honorScore: number | null }>({
  totalHours: null,
  practiceCount: 0,
  themeCount: 0,
  honorScore: null,
})
const showAllThemes = ref(false)

const displayName = computed(() => auth.displayName)
const userInitial = computed(() => auth.userInitial)

/** 契约 F02：部门/岗位任一缺失显示 -- */
const deptPosition = computed(() => {
  const dept = auth.deptName || '--'
  const position = auth.user?.positionName || '--'
  return `${dept} · ${position}`
})

/** 数字超过 1 万用 万/亿 缩写（契约 F02） */
function abbreviate(value: number | null): string {
  const n = value ?? 0
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)} 亿`
  if (n >= 10_000) return `${(n / 10_000).toFixed(2)} 万`
  return String(n)
}

/** 四项统计（契约 F02）：累计学时 / 练习次数 / 参与主题 / 总荣誉分 */
const statCells = computed(() => [
  {
    label: '累计学时',
    value: stats.value.totalHours != null ? Number(stats.value.totalHours).toFixed(2) : '0.00',
    unit: 'h',
  },
  { label: '练习次数', value: abbreviate(stats.value.practiceCount), unit: '次' },
  { label: '参与主题', value: abbreviate(stats.value.themeCount), unit: '个' },
  // 契约 F02：荣誉分首期可用固定展示值
  { label: '总荣誉分', value: abbreviate(stats.value.honorScore ?? 20), unit: '分' },
])

const visibleThemes = computed(() =>
  showAllThemes.value ? themes.value : themes.value.slice(0, THEME_PREVIEW)
)

/** 契约 F04 状态四态 */
function statusText(status: string): string {
  const map: Record<string, string> = {
    passed: '已通过',
    ended: '已结束',
    in_progress: '进行中',
    not_started: '未开始',
  }
  return map[status] ?? '未开始'
}

const quickEntries = [
  {
    title: '竞技场',
    sub: 'PK 对战',
    // 契约 F03：竞技场为占位卡，点击提示功能建设中（不创建伪造排名）
    go: () => ElMessage.info('功能建设中'),
    icon: '<path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M18 5h2a2 2 0 0 1 0 4h-2"/><path d="M6 5H4a2 2 0 0 0 0 4h2"/><path d="M12 16v4"/><path d="M9 20h6"/>',
  },
  {
    title: '荣誉榜',
    sub: '查看排名',
    go: () => ElMessage.info('功能建设中'),
    icon: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  },
  {
    title: '练习历程',
    sub: '历史记录',
    go: () => router.push('/sparring/web/drillmate/history'),
    icon: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  },
]

const formatTime = (value: string | null) => value?.replace('T', ' ').slice(0, 16) ?? ''

/** 相对时间：3天前 / 2小时前 / 刚刚（契约 F06） */
function relativeTime(value: string | null): string {
  if (!value) return ''
  const then = new Date(value.replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) return formatTime(value)
  const diff = Date.now() - then
  const minute = 60_000
  if (diff < minute) return '刚刚'
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}分钟前`
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))}小时前`
  return `${Math.floor(diff / (24 * 60 * minute))}天前`
}

function attemptStatusText(item: StudentHistoryItem): string {
  const map: Record<AttemptStatus, string> = {
    preparing: '准备中',
    ready: '待开始',
    in_progress: '进行中',
    paused: '进行中',
    report_generating: '出报告中',
    completed: item.passed === 1 ? '已通过' : '未通过',
    failed: '异常',
    cancelled: '已取消',
  }
  return map[item.status] ?? item.status
}

/** 最近练习：进行中优先续练，有报告进报告页，否则回主题详情 */
function openRecent(item: StudentHistoryItem) {
  if (['preparing', 'ready', 'in_progress'].includes(item.status)) {
    router.push(`/sparring/web/drillmate/attempt/${item.attemptId}`)
  } else if (item.status === 'completed') {
    router.push(`/sparring/web/drillmate/report/${item.attemptId}`)
  } else {
    router.push(`/sparring/web/drillmate/detail/${item.themeId}`)
  }
}

const goDetail = (themeId: string) => router.push(`/sparring/web/drillmate/detail/${themeId}`)
const goHistory = () => router.push('/sparring/web/drillmate/history')

/** 加入公开主题（契约 F05「立即加入」），成功后刷新首页 */
async function join(themeId: string) {
  try {
    await joinStudentTheme(themeId)
    ElMessage.success('已加入该主题')
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加入失败')
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getStudentHomeSummary()
    themes.value = data.themes ?? []
    opportunities.value = data.opportunities ?? []
    recent.value = data.recentPractice ?? null
    if (data.stats) stats.value = data.stats
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 尺寸来源：visual/measured/drillmate-home.json（原平台 1524x727 实测）
   内容区 1320px 居中，三栏 280 | 1fr | 320，栏距 24 */
.drillmate-home {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0;
}

@media (max-width: 1360px) {
  .drillmate-home {
    padding-inline: 16px;
  }
}

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
  padding-block: 24px 56px;
}

.col-left,
.col-right,
.quick-bar,
.theme-panel {
  background: var(--color-paper);
  border-radius: 12px;
}

.col-left {
  padding: 24px;
}

.col-right {
  padding: 24px;
}

/* ── 左栏：学员信息 + 统计四宫格 ───────────────────────────── */
.user-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 20px;
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-paper);
  font-size: 28.8px;
  line-height: 72px;
  text-align: center;
}

.user-name {
  margin-top: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
  color: var(--color-ink);
}

.user-meta {
  margin-top: 8px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stat-cell {
  min-width: 0;
  padding: 14px 8px;
  border-radius: 8px;
  background: var(--color-paper-2);
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  height: 20px;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  line-height: 1;
  font-weight: 700;
  color: var(--color-ink);
  white-space: nowrap;
}

.stat-unit {
  font-size: 11px;
  line-height: 1;
  font-weight: 500;
  color: var(--color-muted);
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-muted);
  text-align: center;
}

/* ── 中栏 ───────────────────────────────────────────────── */
.col-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.quick-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 16px;
}

.quick-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-accent);
  /* 批注（2026-11-20）：快捷入口（练习历程/竞技场等）也要悬停与按下反馈 */
  transition:
    translate var(--dur-short) var(--ease-out),
    background-color var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);

  &:hover {
    translate: 0 -1px;
    background: var(--color-accent-wash);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  }

  &:active {
    translate: 0 1px;
    box-shadow: none;
  }
}

.quick-text {
  min-width: 0;
}

.quick-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
}

.quick-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-muted);
}

.theme-panel {
  padding: 24px;
}

.theme-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.theme-panel__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.theme-panel__count {
  font-size: 13px;
  color: var(--color-muted);
}

.theme-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.theme-card {
  padding: 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  cursor: pointer;
  /* 批注（2026-11-20）：训练主题卡统一悬停/按下动效（与项目卡同一套数值）。
   * 用 translate 而非 transform，避免和卡片自身定位变换互相覆盖。 */
  transition:
    translate var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);

  &:hover {
    translate: 0 -2px;
    border-color: var(--color-accent-wash);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--color-graphite) 12%, transparent);
  }

  &:active {
    translate: 0 0;
    box-shadow: 0 1px 2px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  }
}

.theme-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.theme-name {
  min-width: 0;
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-status {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  background: var(--color-paper-2);
  color: var(--color-muted);

  &.is-in_progress {
    background: var(--color-accent-wash);
    color: var(--color-accent);
  }

  &.is-passed {
    background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper));
    color: var(--color-success);
  }
}

.theme-meta {
  margin-top: 4px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-muted);
}

.theme-track {
  height: 5px;
  margin-top: 10px;
  border-radius: 3px;
  background: var(--color-rule);
  overflow: hidden;
}

.theme-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.theme-progress-label {
  margin-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-accent);
}

.theme-empty {
  padding: 8px 0;
}

.theme-more {
  margin-top: 12px;
  text-align: center;
}

.link-btn {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-accent);
}

/* 更多学习机会（契约 F05） */
.opps {
  background: var(--color-paper);
  border-radius: 12px;
  padding: 24px;
}

.opps__head {
  margin-bottom: 16px;
}

.opps__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.opp-list {
  display: grid;
  gap: 16px;
}

.opp-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
}

.opp-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opp-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--color-muted);
}

.join-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  background: var(--color-accent);
  color: var(--color-paper);
  font-size: 13px;
  cursor: pointer;
}

/* ── 右栏：最近练习 ──────────────────────────────────────── */
.recent-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.recent-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.recent-more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: var(--color-accent);
  cursor: pointer;
}

.recent-card {
  padding: 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  cursor: pointer;
  /* 最近一次练习卡：与训练主题卡同一套悬停/按下反馈 */
  transition:
    translate var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);

  &:hover {
    translate: 0 -2px;
    border-color: var(--color-accent-wash);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--color-graphite) 12%, transparent);
  }

  &:active {
    translate: 0 0;
    box-shadow: 0 1px 2px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  }
}

.recent-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  height: 22px;
}

.recent-scenario {
  min-width: 0;
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-status {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
  color: var(--color-error);

  &.is-completed.is-passed,
  &.is-in_progress,
  &.is-ready,
  &.is-preparing {
    background: var(--color-accent-wash);
    color: var(--color-accent);
  }
}

.recent-theme {
  margin-top: 4px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recent-score {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 2px;

  .score {
    font-size: 14px;
    line-height: 22px;
    font-weight: 600;
    color: var(--color-success);

    &.fail {
      color: var(--color-error);
    }
  }

  .time {
    font-size: 13px;
    line-height: 20px;
    color: var(--color-muted);
  }
}

/* ── 自适应 ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .col-right {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .col-left,
  .col-right {
    grid-column: 1;
  }

  .quick-bar {
    grid-template-columns: 1fr;
  }
}
</style>
