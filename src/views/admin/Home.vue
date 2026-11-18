<template>
  <div class="admin-home">
    <!-- 常用应用区域 -->
    <section class="section common-apps">
      <div class="section-header">
        <h2 class="section-title">常用应用</h2>
        <el-icon class="edit-icon" aria-hidden="true" title="敬请期待"><Setting /></el-icon>
      </div>
      <div class="apps-content">
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToAIPractice"
          @keydown.enter.prevent="goToAIPractice"
        >
          <div class="app-icon">
            <ChatIcon :size="24" />
          </div>
          <div class="app-info">
            <h3 class="app-title">AI对练</h3>
            <p class="app-desc">轻松提升沟通技巧</p>
          </div>
        </div>
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToActualTraining"
          @keydown.enter.prevent="goToActualTraining"
        >
          <div class="app-icon">
            <TrophyIcon :size="24" />
            <span class="ai-badge">AI</span>
          </div>
          <div class="app-info">
            <h3 class="app-title">AI实战训练场</h3>
            <p class="app-desc">围绕真实业务场景展开动态实战训练</p>
          </div>
        </div>
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="router.push('/exam/queslib')"
          @keydown.enter.prevent="router.push('/exam/queslib')"
        >
          <div class="app-icon">
            <EditIcon :size="24" />
          </div>
          <div class="app-info">
            <h3 class="app-title">测练中心</h3>
            <p class="app-desc">题库与考试管理</p>
          </div>
        </div>
        <div
          v-if="hasKngAccess"
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToOnlineClassroom"
          @keydown.enter.prevent="goToOnlineClassroom"
        >
          <div class="app-icon">
            <ReadingIcon :size="24" />
          </div>
          <div class="app-info">
            <h3 class="app-title">在线课堂</h3>
            <p class="app-desc">专业的企业学习资源运营</p>
          </div>
        </div>
        <div class="app-guide cut">
          <div class="guide-text">
            <span class="guide-title">我需要</span>
            <span class="guide-content">课程内容 ></span>
            <CourseIcon class="guide-icon" :size="20" />
          </div>
        </div>
      </div>
    </section>

    <!-- 常用功能区域 -->
    <section class="section common-functions">
      <div class="section-header">
        <h2 class="section-title">常用功能</h2>
        <el-icon class="edit-icon" aria-hidden="true" title="敬请期待"><Setting /></el-icon>
      </div>
      <div class="functions-grid">
        <div class="function-card" title="敬请期待">
          <el-icon class="function-icon" aria-hidden="true"><User /></el-icon>
          <span class="function-name">员工名册</span>
        </div>
        <div class="function-card" title="敬请期待">
          <el-icon class="function-icon" aria-hidden="true"><PriceTag /></el-icon>
          <span class="function-name">标签列表</span>
        </div>
        <div class="function-card" title="敬请期待">
          <el-icon class="function-icon" aria-hidden="true"><Bell /></el-icon>
          <span class="function-name">公告消息</span>
        </div>
        <div class="function-card" title="敬请期待">
          <el-icon class="function-icon" aria-hidden="true"><Setting /></el-icon>
          <span class="function-name">个性化装修</span>
        </div>
      </div>
    </section>

    <!-- 平台总览区域 -->
    <section class="section platform-overview">
      <div class="section-header">
        <h2 class="section-title">平台总览</h2>
        <el-icon class="info-icon" aria-hidden="true" title="敬请期待"><InfoFilled /></el-icon>
      </div>

      <!-- 时间筛选标签 -->
      <el-radio-group :model-value="selectedTime" size="small" class="time-filter" @change="onTimeChange">
        <el-radio-button v-for="item in TIME_OPTIONS" :key="item" :value="item">
          {{ item }}
        </el-radio-button>
      </el-radio-group>
      <!-- 区间被后端上限截断时如实告知，避免把「截断后的数」当成「累计数」 -->
      <p v-if="truncated" class="time-hint">统计区间已按上限截断</p>
      <!-- 任一域取数失败：如实提示，避免把「部分域的 0」当成完整口径 -->
      <p v-if="degraded" class="time-hint">部分数据源暂时不可用，相关指标显示为「—」</p>

      <!-- 数据统计卡片：记分牌（数字是本页最响的类型） -->
      <div class="stats-cards">
        <div class="stat-card cut family-headcount">
          <div class="stat-label">活跃人数 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value">{{ fmtInt(activeUsers) }}</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path class="stroke-series-a" d="M0,30 Q25,10 50,25 T100,20" fill="none" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card cut family-headcount">
          <div class="stat-label">学习人数 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value">{{ fmtInt(studiedUsers) }}</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path class="stroke-series-b" d="M0,35 Q25,15 50,30 T100,25" fill="none" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card cut family-headcount">
          <div class="stat-label">启用人数 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value">{{ fmtInt(staffEnabled) }}</div>
          <div class="stat-bar">
            <div class="bar-fill" :style="{ width: staffBarWidth }"></div>
          </div>
        </div>
        <div class="stat-card cut family-duration">
          <div class="stat-label">活跃时长 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value">{{ fmtHour(activeHours) }}<span class="stat-unit">h</span></div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path class="stroke-series-a" d="M0,20 Q25,35 50,15 T100,25" fill="none" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card cut family-duration">
          <div class="stat-label">学习时长 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value">{{ fmtHour(studyHours) }}<span class="stat-unit">h</span></div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path class="stroke-series-b" d="M0,25 Q25,10 50,30 T100,20" fill="none" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card cut family-credit">
          <div class="stat-label">总学分 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></div>
          <div class="stat-value placeholder">—</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path class="stroke-series-a" d="M0,30 Q25,20 50,35 T100,15" fill="none" stroke-width="2"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 数据图表 -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">活跃人数/学习人数</h3>
          <div ref="chartUsersRef" class="chart-box"></div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color legend-a"></span>
              活跃人数
            </span>
            <span class="legend-item">
              <span class="legend-color legend-b"></span>
              学习人数
            </span>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">活跃时长/学习时长 (h)</h3>
          <div ref="chartHoursRef" class="chart-box"></div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color legend-a"></span>
              活跃时长
            </span>
            <span class="legend-item">
              <span class="legend-color legend-b"></span>
              学习时长
            </span>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="detail-cards">
        <div class="detail-card cut">
          <div class="card-header">
            <h3 class="card-title">课程情况 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></h3>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">课程总量</span><span class="stat-num fig">{{ fmtInt(kngCards?.courseTotal) }}</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-num fig">{{ fmtInt(kngCards?.courseNew) }}</span></div>
            <div class="stat-row"><span class="stat-label">学习人次</span><span class="stat-num fig">{{ fmtInt(kngCards?.studyVisits) }}</span></div>
            <div class="stat-row"><span class="stat-label">学习时长 (h)</span><span class="stat-num fig">{{ fmtHour(kngCards?.studyHours) }}</span></div>
            <div class="stat-row"><span class="stat-label">完成人次</span><span class="stat-num fig">{{ fmtInt(kngCards?.finishedVisits) }}</span></div>
            <!-- 评论数无数据表，恒 0（契约 DER-03），保留行位以便后续接入 -->
            <div class="stat-row"><span class="stat-label">评论数</span><span class="stat-num fig">{{ fmtInt(kngCards?.commentCount) }}</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke-width="20" class="stroke-rule"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke-width="20" stroke-dasharray="314" :stroke-dashoffset="314 * (1 - (courseFinishRate ?? 0))" transform="rotate(-90 60 60)" class="stroke-series-a"/>
              <text class="center-label" x="60" y="65" text-anchor="middle" font-size="14">{{ fmtPct(courseFinishRate) }}</text>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color legend-a"></span>完课率</span>
            </div>
          </div>
        </div>

        <div class="detail-card cut">
          <div class="card-header">
            <h3 class="card-title">项目情况 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></h3>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">项目总量</span><span class="stat-num fig">{{ fmtInt(speechCards?.projectTotal) }}</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-num fig">{{ fmtInt(speechCards?.projectNew) }}</span></div>
            <div class="stat-row"><span class="stat-label">覆盖人次</span><span class="stat-num fig">{{ fmtInt(speechCards?.coveredUsers) }}</span></div>
            <div class="stat-row"><span class="stat-label">学习人次</span><span class="stat-num fig">{{ fmtInt(speechCards?.studyVisits) }}</span></div>
            <div class="stat-row"><span class="stat-label">完成人次</span><span class="stat-num fig">{{ fmtInt(speechCards?.finishedVisits) }}</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <polygon points="20,20 100,20 80,60 40,60" class="fill-series-a" opacity="0.8"/>
              <polygon points="40,60 80,60 70,100 50,100" class="fill-series-b" opacity="0.8"/>
              <text class="on-fill-label" x="60" y="45" text-anchor="middle" font-size="12">{{ fmtPct(speechCards?.studyRate) }}</text>
              <text class="on-fill-label" x="60" y="85" text-anchor="middle" font-size="12">{{ fmtPct(speechCards?.finishRate) }}</text>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color legend-a"></span>学习率</span>
              <span class="legend-item"><span class="legend-color legend-b"></span>完成率</span>
            </div>
          </div>
        </div>

        <div class="detail-card cut">
          <div class="card-header">
            <h3 class="card-title">考试情况 <el-icon class="tip" aria-hidden="true"><InfoFilled /></el-icon></h3>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">考试总量</span><span class="stat-num fig">{{ fmtInt(examCards?.examTotal) }}</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-num fig">{{ fmtInt(examCards?.examNew) }}</span></div>
            <div class="stat-row"><span class="stat-label">覆盖人次</span><span class="stat-num fig">{{ fmtInt(examCards?.coveredUsers) }}</span></div>
            <div class="stat-row"><span class="stat-label">参考人次</span><span class="stat-num fig">{{ fmtInt(examCards?.attemptVisits) }}</span></div>
            <div class="stat-row"><span class="stat-label">通过人次</span><span class="stat-num fig">{{ fmtInt(examCards?.passedVisits) }}</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke-width="15" class="stroke-rule"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke-width="15" stroke-dasharray="314" :stroke-dashoffset="314 * (1 - (examPassRate ?? 0))" transform="rotate(-90 60 60)" class="stroke-series-a"/>
              <text class="center-label" x="60" y="65" text-anchor="middle" font-size="14">{{ fmtPct(examPassRate) }}</text>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color legend-a"></span>考试通过率 {{ fmtPct(examPassRate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { chartColor } from '@/utils/chartColor'
import { useAuthStore } from '@/stores/auth'
import { TIME_OPTIONS, usePlatformOverview } from '@/composables/usePlatformOverview'
import ChatIcon from '@/components/icons/ChatIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'
import EditIcon from '@/components/icons/EditIcon.vue'
import ReadingIcon from '@/components/icons/ReadingIcon.vue'
import CourseIcon from '@/components/icons/CourseIcon.vue'
// 批注18/t17：emoji 图标全部组件化（gate30a），统一 @element-plus/icons-vue 一处图标库
import { ChatDotRound, Trophy, EditPen, Reading, Setting, InfoFilled, User, PriceTag, Bell } from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()

/**
 * 平台总览取数：时间标签换算、四域并发、失败降级与竞态丢弃都在 composable 内，
 * 组件只负责展示（契约见 D:/JACK/plan/平台预览看板/01-需求文档.md 第 4 节）。
 */
const overview = usePlatformOverview()
const {
  selectedTime,
  truncated,
  degraded,
  activeUsers,
  activeHours,
  studiedUsers,
  studyHours,
  kng: kngDomain,
  speech: speechDomain,
  exam: examDomain,
  staff: staffDomain,
  buckets,
  activeUsersSeries,
  activeHoursSeries,
  studiedUsersSeries,
  studyHoursSeries,
  init,
  selectTime
} = overview

/** 各域卡片数据；域失败时为 null，模板显示占位符而不是 0，避免把「查不到」读成「没有」 */
const kngCards = computed(() => kngDomain.value.data?.cards ?? null)
const speechCards = computed(() => speechDomain.value.data?.cards ?? null)
const examCards = computed(() => examDomain.value.data?.cards ?? null)

/** 启用人数：账号口径，不随统计期变化 */
/** 启用人数/总数：账号口径，不随统计期变化；域失败时返回 null 让模板显示「—」而不是 0 */
const staffEnabled = computed<number | null>(() =>
  staffDomain.value.failed ? null : (staffDomain.value.data?.enabledUsers ?? 0)
)
const staffTotal = computed<number | null>(() =>
  staffDomain.value.failed ? null : (staffDomain.value.data?.totalUsers ?? 0)
)

/** 启用率进度条宽度；启用数或总数为空（域失败）时退回 0 宽度，避免 NaN% */
const staffBarWidth = computed(() => {
  const enabled = staffEnabled.value
  const total = staffTotal.value
  if (enabled === null || !total) return '0%'
  return `${Math.min(100, Math.round((enabled / total) * 100))}%`
})

/** 完课率 = 完成人次 / 学习人次；域失败返回 null（显示「—」），学习人次为 0 时返回 0 而不是 NaN */
const courseFinishRate = computed<number | null>(() => {
  const c = kngCards.value
  if (!c) return null
  if (!c.studyVisits) return 0
  return c.finishedVisits / c.studyVisits
})

/** 考试通过率由后端给出（后端按参考人次口径算）；域失败返回 null，不伪装成 0% */
const examPassRate = computed<number | null>(() =>
  examCards.value ? (examCards.value.passRate ?? 0) : null
)

/** 整数千分位；空值显示占位符而不是 0 */
function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('zh-CN')
}

/** 小时数保留 2 位；空值显示占位符 */
function fmtHour(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(2)
}

/** 比率转百分比，保留 1 位；空值显示占位符 */
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${(v * 100).toFixed(1)}%`
}

/** 切标签：走 composable 的统一入口，内部丢弃过期响应 */
function onTimeChange(value: string | number | boolean | undefined) {
  if (typeof value === 'string') void selectTime(value as (typeof TIME_OPTIONS)[number])
}

/* ===== 折线图：改用 echarts 后点数才能随统计期变化（原来的固定 SVG 只能画死数据） ===== */
const chartUsersRef = ref<HTMLElement>()
const chartHoursRef = ref<HTMLElement>()
let chartUsers: echarts.ECharts | null = null
let chartHours: echarts.ECharts | null = null

/* ===== 颜色：token → echarts 认得的格式（实现见 @/utils/chartColor） ===== */


/**
 * 系列颜色一律取 Hallmark Cobalt token（front-end AGENTS 第 4 节禁裸色值），
 * 经共享的 chartColor 归一化成 rgba 后交给 echarts（oklch 在 echarts 内部算不了色）。
 *
 * 不设 hex 兜底：token 层由 main.ts 全局引入，取不到只可能是样式没加载；
 * 此时返回空串，交给 echarts 回落到它自己的默认调色板，比在组件里埋一份重复的颜色定义更安全
 * ——埋了兜底，将来 token 改了而兜底没改，就会出现「主题换了但图没换」的静默不一致。
 */
function tokenColor(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? chartColor(raw) : ''
}

/** 两张折线图共用同一份样式底座：坐标轴、网格、提示框口径一致，只换数据 */
function baseLineOption(bucketList: string[], series: { name: string; data: number[]; color: string }[]) {
  return {
    grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: bucketList,
      boundaryGap: false,
      axisLine: { lineStyle: { color: tokenColor('--color-rule') } },
      axisTick: { show: false },
      axisLabel: { color: tokenColor('--color-muted'), fontSize: 11 }
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: tokenColor('--color-paper-2') } },
      axisLabel: { color: tokenColor('--color-muted'), fontSize: 11 }
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      data: s.data,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: { opacity: 0.08, color: s.color },
      // hover 只让被指的那条线加粗，不淡化其他系列（默认 focus='none'，这里显式声明，
      // 免得将来换 echarts 版本默认值变化导致「鼠标一上去另一条线看不清」）
      emphasis: { focus: 'none' as const, scale: false }
    }))
  }
}

/** 把当前数据刷进两张图；容器未挂载时直接返回，避免 echarts 拿不到 DOM */
function renderCharts() {
  if (!chartUsersRef.value || !chartHoursRef.value) return
  if (!chartUsers) chartUsers = echarts.init(chartUsersRef.value)
  if (!chartHours) chartHours = echarts.init(chartHoursRef.value)

  const bucketList = buckets.value
  chartUsers.setOption(
    baseLineOption(bucketList, [
      { name: '活跃人数', data: activeUsersSeries.value, color: tokenColor('--color-accent') },
      { name: '学习人数', data: studiedUsersSeries.value, color: tokenColor('--color-accent-2') }
    ]),
    true
  )
  chartHours.setOption(
    baseLineOption(bucketList, [
      { name: '活跃时长', data: activeHoursSeries.value, color: tokenColor('--color-accent') },
      { name: '学习时长', data: studyHoursSeries.value, color: tokenColor('--color-accent-2') }
    ]),
    true
  )
}

/**
 * 数据变化后重画；nextTick 保证容器已完成布局。
 *
 * 依赖里必须带上两个「学习」序列：它们只来自在线课堂域，当该域单独失败/恢复时
 * buckets 与活跃序列可能整体不变，只靠前三个依赖会漏掉这次重画，图上的学习线就停在旧值。
 */
watch([buckets, activeUsersSeries, activeHoursSeries, studiedUsersSeries, studyHoursSeries], () => {
  void nextTick(renderCharts)
})

/** 容器尺寸变化时让 echarts 重算（侧栏折叠、窗口缩放都会改变宽度） */
function handleResize() {
  chartUsers?.resize()
  chartHours?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await nextTick()
  renderCharts()
  // 首屏按「当月」取数；账号计数只取一次，四域并发
  await init()
  await nextTick()
  renderCharts()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartUsers?.dispose()
  chartHours?.dispose()
  chartUsers = null
  chartHours = null
})

const hasKngAccess = computed(() =>
  auth.hasPermission('kng:catalog') ||
  auth.hasPermission('kng:courseware') ||
  auth.hasPermission('kng:course') ||
  auth.hasPermission('kng:setting')
)

const goToAIPractice = () => {
  router.push('/sparring/newmanage')
}

const goToActualTraining = () => {
  router.push('/sparring/freesimulate/topic')
}

const goToOnlineClassroom = () => {
  router.push('/kng/catalog')
}
</script>

<style scoped lang="scss">
/* Hallmark Cobalt 首页样板：记分牌大数字 + 切角面板 + 单块 graphite CTA */
.admin-home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: var(--color-paper);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}

.edit-icon,
.info-icon {
  color: var(--color-muted);
  font-size: 14px;
}

.tip {
  font-size: 12px;
  color: var(--color-rule-2);
  cursor: help;
}

/* 常用应用 */
.apps-content {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}

.app-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius-card);
  cursor: pointer;
  /* 批注15：hover wash+抬升、active 键帽凹陷 */
  transition: background-color var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out);

  &:hover {
    background: var(--color-accent-wash);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  &:active {
    transform: translateY(2px);
    box-shadow: var(--shadow-key-press);
  }

  /* role="button" 的 div 拿不到全局 a/button 焦点环，键盘可达性自行补 outline */
  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
}

/* 批注20：四卡图标底座统一浅洗蓝底+深钴蓝线条（去四档深色色相，用户批注'太深弄成一样的'） */
.app-icon {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: var(--radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-wash);
  border: 1px solid var(--color-rule-2);
  /* 图标线条色：currentColor 跟随容器，深钴蓝在浅洗蓝底上对比度≥4.5 */
  color: var(--color-accent-deep);

  .icon-glyph {
    font-size: 24px;
  }

  .ai-badge {
    position: absolute;
    top: -4px;
    right: -6px;
    padding: 1px 5px;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-accent-ink);
    background: var(--color-accent-deep);
    border-radius: 6px;
    line-height: 1.4;
  }
}

.app-info {
  .app-title { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0 0 4px 0; }
  .app-desc { font-size: 12px; color: var(--color-muted); margin: 0; }
}

/* t17：CTA 卡改 graphite 深板（全页唯一一处 graphite） */
.app-guide {
  margin-left: auto;
  width: 200px;
  height: 120px;
  background: var(--color-graphite);
  display: flex;
  align-items: center;
  justify-content: center;

  .guide-text {
    text-align: center;
    .guide-title { font-size: 14px; color: var(--color-graphite-ink); display: block; }
    .guide-content { font-size: 16px; font-weight: 500; color: var(--color-accent-2); display: block; }
  }
}

/* 常用功能 */
.functions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.function-card {
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  /* 占位卡片暂无点击功能：不呈现 pointer/hover 伪交互 */

  .function-icon { font-size: 20px; color: var(--color-muted); }
  .function-name { font-size: 14px; color: var(--color-ink); }
}

/* 平台总览 */
/* 截断/降级提示：与时间筛选同排说明，弱化但可读 */
.time-hint {
  margin: -8px 0 12px 0;
  font-size: 12px;
  color: var(--color-muted);
}

.time-filter {
  margin-bottom: 20px;

  :deep(.el-radio-button__inner) {
    height: 30px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 28px;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

/* t17：记分牌——大数字是本页的视觉瞬间 */
.stat-card {
  position: relative;
  border: 1px solid var(--color-rule);
  padding: 16px;
  padding-top: 18px;
  transition: background-color var(--dur-micro) var(--ease-out);

  /* 顶部 2px 色条区分指标族（人数/时长/学分） */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-accent);
  }

  &.family-duration::before { background: var(--color-accent-deep); }
  &.family-credit::before { background: color-mix(in oklab, var(--color-accent) 50%, var(--color-graphite)); }

  /* hover 数字不动，卡片 wash 微亮 */
  &:hover {
    background: var(--color-accent-wash);
  }

  .stat-label { font-size: 12px; color: var(--color-muted); margin-bottom: 8px; }

  /* Familjen Grotesk 600 48px tabular——spec：count at 60px and over is the loudest type 的落地取 48px */
  .stat-value {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 48px;
    line-height: 1.02;
    letter-spacing: var(--tracking-display);
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    margin-bottom: 8px;
  }

  /* 单位小号 mono（JetBrains Mono 只上机器值） */
  .stat-unit {
    font-family: var(--font-outlier);
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-muted);
    margin-left: 4px;
  }

  .stat-trend { height: 40px; }
  .stat-bar { height: 8px; background: var(--color-rule); border-radius: var(--radius-pill); overflow: hidden; }
  .bar-fill { height: 100%; background: var(--color-accent); border-radius: var(--radius-pill); }
}

/* 图表线/图例统一冷区双系列（cobalt 主 + 提亮副），去第二信号色相 */
.stroke-series-a { stroke: var(--color-accent); }
.stroke-series-b { stroke: var(--color-accent-2); }
.stroke-rule { stroke: var(--color-rule); }
.fill-series-a { fill: var(--color-accent); }
.fill-series-b { fill: var(--color-accent-2); }
.tick-label { fill: var(--color-muted); }
.on-fill-label { fill: var(--color-accent-ink); }
.center-label { fill: var(--color-ink); }

.legend-a { background: var(--color-accent); }
.legend-b { background: var(--color-accent-2); }

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  padding: 16px;

  .chart-title { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0 0 16px 0; }
  /* echarts 容器必须有显式高度：div 默认高度为 0，echarts.init 会量到 0 高，
     画布虽已创建却看不见——这正是「代码接了图但页面上没图」的原因。
     200px 与改造前那张固定 SVG 的高度一致，视觉节奏不变。 */
  .chart-box { position: relative; height: 200px; }
}

.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-muted);

    .legend-color { width: 12px; height: 12px; border-radius: 2px; }
  }
}

.detail-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.detail-card {
  border: 1px solid var(--color-rule);
  padding: 16px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .card-title { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0; }
  }

  .card-tabs {
    :deep(.el-radio-button__inner) {
      height: 26px;
      padding: 0 8px;
      font-size: 12px;
      line-height: 24px;
    }
  }

  .card-content { margin-bottom: 16px; }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-paper-2);

    &:last-child { border-bottom: none; }
    .stat-label { font-size: 12px; color: var(--color-muted); }
    /* 行内数值 mono 等宽（t7 口径：机器值 JetBrains Mono） */
    .stat-num { font-size: 14px; font-weight: 500; color: var(--color-ink); }
  }

  .card-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .chart-legend-vertical {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-muted);

      .legend-color { width: 12px; height: 12px; border-radius: 2px; }
    }
  }
}


/* t17 gate27：组件自带的 transform 位移在减动效偏好下停用（全局基线管 hover 过渡时长，
   这里只关本组件的 translateY 动作） */
@media (prefers-reduced-motion: reduce) {
  .app-card,
  .stat-card {
    transform: none;
    transition: none;
  }
}
</style>
