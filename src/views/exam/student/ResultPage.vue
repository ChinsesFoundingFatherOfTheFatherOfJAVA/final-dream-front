<template>
  <!-- 结果页（契约 01 §S6 / 02 §8B.1 路由 /exam/student/attempts/:attemptId/result） -->
  <div class="result-page">
    <el-breadcrumb class="crumb" separator="/">
      <el-breadcrumb-item>我的学习</el-breadcrumb-item>
      <el-breadcrumb-item :to="{ path: '/exam/student/exams' }">测练中心</el-breadcrumb-item>
      <el-breadcrumb-item>考试结果</el-breadcrumb-item>
    </el-breadcrumb>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

    <template v-else-if="result">
      <!-- 主卡：考试名 + 印章 + 考生信息 + 试卷信息行 -->
      <section class="head-card">
        <header class="head-top">
          <h1 class="head-name">{{ result.name }}</h1>
          <div class="head-actions">
            <ResultStamp :state="stampState" />
            <!-- 「再次考试」在次数未用尽时出现；次数用完/尚未开始由入场页说明原因，
                 这里不猜测，直接按次数判断（0=不限次） -->
            <el-button v-if="canRetry" type="primary" class="btn-retry" @click="retryExam">
              再次考试
            </el-button>
          </div>
        </header>

        <div class="head-row">
          <span class="head-item"><em>考生</em>{{ candidateText }}</span>
          <span class="head-item"><em>工号</em>{{ jobNo }}</span>
          <span class="head-item"><em>部门</em>{{ deptName }}</span>
        </div>

        <div class="head-row head-row--meta">
          <span class="head-item"><em>试卷总分</em>{{ formatScore(result.totalScore) }}分</span>
          <span class="head-item"><em>最高分</em>{{ highestText }}</span>
          <span class="head-item"><em>考试次数</em>{{ attemptTimesText }}</span>
          <span class="head-item"><em>入场时间</em>{{ entryRangeText }}</span>
        </div>
      </section>

      <div class="layout">
        <!-- 左栏：考试历史。原平台这张卡是内容宽度（约 178px），不是等宽侧栏 -->
        <aside class="col-history">
          <section class="card history-card">
            <h2 class="card-title">考试历史{{ historyRows.length ? `(${historyRows.length})` : '' }}</h2>

            <p v-if="!historyRows.length" class="history-empty">暂无历史记录</p>

            <!--
              每条历史都可点击查看（2026-11-13 用户要求）。

              原来只能看不能点，学员想回看「上次考了多少、错在哪」得退出去重进。
              无障碍用 role=button + tabindex + Enter/Space，
              与全站自定义可点元素口径一致（AGENTS.md §4）。
              当前正在看的这条不给点击（跳到自己没意义），但保留高亮。
            -->
            <ul v-else class="history-list">
              <li
                v-for="row in historyRows"
                :key="row.attemptId"
                class="history-item"
                :class="{ 'is-current': row.attemptId === result.attemptId }"
                :role="row.attemptId === result.attemptId ? undefined : 'button'"
                :tabindex="row.attemptId === result.attemptId ? undefined : 0"
                @click="openHistory(row.attemptId)"
                @keydown.enter.prevent="openHistory(row.attemptId)"
                @keydown.space.prevent="openHistory(row.attemptId)"
              >
                <!-- 当前查看的那条有浅灰底；不是斑马纹（原平台实测） -->
                <p class="history-line">
                  <span class="history-key">成绩：</span>
                  <span class="history-score">{{ row.scoreText }}</span>
                  <span class="history-state" :class="`is-${row.stateKey}`">{{ row.stateText }}</span>
                </p>
                <p class="history-line">
                  <span class="history-key">时间：</span>
                  <span class="history-time">{{ row.timeText }}</span>
                </p>
              </li>
            </ul>
          </section>
        </aside>

        <main class="col-main">
          <!-- 四格指标 + 答题时间 + 操作按钮 -->
          <section class="card metrics-card">
            <ResultMetrics :cells="metricCells" />

            <!-- DER-03：批阅未完成时先给客观题分，并明确「最终成绩以批阅完成为准」 -->
            <p v-if="objectiveNote" class="objective-note">{{ objectiveNote }}</p>

            <p class="answer-time">答题时间：{{ answerRangeText }}</p>

            <div class="action-row">
              <!-- 「查看答卷详情」受 answerView 约束：后端给 available=false 时禁用，
                   并原样展示后端给的原因（契约 §S6 验收 3 要求 tooltip 与配置一致） -->
              <el-tooltip
                :disabled="result.answerDetailAvailable"
                :content="result.answerDetailBlockReason || '暂无查看权限'"
                placement="top"
              >
                <span class="detail-btn-wrap">
                  <el-button
                    class="btn-detail"
                    :disabled="!result.answerDetailAvailable"
                    @click="openAnswerPaper"
                  >
                    查看答卷详情
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </section>

          <!-- 考核点得分情况：后端按 answerView.viewPointScore 决定是否给数据，
               前端不自行判权限；空数组即空态 -->
          <section class="card block">
            <h2 class="card-title">
              考核点得分情况
              <el-tooltip content="按考核点汇总本卷的应得分与实得分" placement="top">
                <span class="help-icon" role="img" aria-label="计分口径说明">?</span>
              </el-tooltip>
            </h2>

            <p v-if="!pointRows.length" class="block-empty">暂无考核点得分数据</p>

            <table v-else class="point-table">
              <thead>
                <tr>
                  <th class="is-left">考核点</th>
                  <th>总分</th>
                  <th>得分</th>
                  <th>正确率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pointRows" :key="row.pointId">
                  <td class="is-left">{{ row.pointName }}</td>
                  <td>{{ row.totalText }}</td>
                  <td>{{ row.scoreText }}</td>
                  <td>{{ row.rateText }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 本次考试情况分析：批阅中不出分，显示「批阅中」空态而不是 0% -->
          <section class="card block">
            <h2 class="card-title">本次考试情况分析</h2>

            <p v-if="!result.graded" class="block-empty block-empty--pending">批阅中</p>

            <template v-else>
              <!-- 布局照原平台实测（观察素材/施工比对/原平台-本次考试情况分析.png）：
                   左侧环形图 + 题型 2 列卡片；底部一整行「用时 / 用时排名」。 -->
              <div class="analysis-body">
                <div class="analysis-left">
                  <div class="donut">
                    <svg viewBox="0 0 190 190" width="190" height="190" role="img" :aria-label="`总体正确率 ${overallRateText}`">
                      <!-- 轨道：浅灰整圆 -->
                      <circle cx="95" cy="95" :r="DONUT_R" fill="none" stroke="#F0F2F5" stroke-width="10" />
                      <!-- 进度弧：stroke-dasharray 控制弧长，rotate(-90) 让起点落在 12 点方向 -->
                      <circle
                        v-if="donutDash > 0"
                        cx="95" cy="95" :r="DONUT_R"
                        fill="none" stroke="#436BFF" stroke-width="10" stroke-linecap="round"
                        :stroke-dasharray="`${donutDash} ${donutCircumference}`"
                        transform="rotate(-90 95 95)"
                      />
                    </svg>
                    <div class="donut-center">
                      <p class="donut-label">总体正确率</p>
                      <p class="donut-value">{{ overallRateText }}</p>
                    </div>
                  </div>
                </div>

                <div class="analysis-right">
                  <p v-if="!typeStats.length" class="block-empty">暂无题型统计</p>
                  <div v-else class="type-grid">
                    <div v-for="row in typeCards" :key="row.type" class="type-card">
                      <p class="type-card__name">{{ row.typeName }}</p>
                      <div class="type-card__rate">
                        <span class="type-card__rate-label">正确率</span>
                        <span class="type-card__bar" aria-hidden="true">
                          <span class="type-card__bar-fill" :style="{ width: `${row.ratePercent}%` }" />
                        </span>
                        <span class="type-card__rate-value">{{ row.rateText }}</span>
                      </div>
                      <div class="type-card__meta">
                        <span>{{ row.correctText }}</span>
                        <span>{{ row.rankText }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 底部一整行：原平台在图表下方，不是顶部三格 -->
              <div class="analysis-foot">
                <span>用时 {{ usedText }}</span>
                <span>用时排名 {{ rankText }}</span>
              </div>
            </template>
          </section>
        </main>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 学员考试结果页。
 *
 * <p>取数只用 `getAttemptResult`（契约 04 §11.12）——原平台是三个接口拼的
 * （`/sta` + `/point/sta` + `/uem/list`），我方后端已聚合进一个响应，前端不再自己拼，
 * 避免字段口径漂移。
 *
 * <p>**成绩呈现口径（DER-03，有意偏离原平台）**：批阅未完成时先给客观题分，
 * 总分 / 是否通过 / 排名仍等批阅完成。原平台此时直接显示「4/18 + 未通过」，
 * 会让学员以为已定档，故本页改为「客观题 4/9 + 批阅中 + 排名 --」。
 *
 * <p>视觉基线见 `观察素材/原平台样式观察细节.md` §5 / §9：
 * 印章 66×66 `#FF7875` −20°、四格 32×32 内联 SVG、强调色 `#436BFF`（学员端，非 `#1890ff`）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAttemptResult, getExamEntry } from '@/api/studentExam'
import { useAuthStore } from '@/stores/auth'
import type { AttemptResult, StudentExamEntry } from '@/types/studentExam'
import ResultStamp from './components/ResultStamp.vue'
import ResultMetrics from './components/ResultMetrics.vue'
import {
  DASH,
  buildHistoryRows,
  buildMetricCells,
  buildObjectiveNote,
  buildPointScoreRows,
  buildTypeStatViews,
  formatAnswerRange,
  formatRate,
  formatScore,
  overallCorrectRate,
  parseDateTime,
  resolveStampState,
  usedMinutes
} from './resultModel'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/**
 * 当前答卷 id —— **必须是 computed**（2026-11-13 修）。
 *
 * <p>点考试历史只换路由参数、组件复用，写死成常量会让 load() 永远读创建时那个 id，
 * 表现为「点了另一条历史，页面还是原来那次」。（同一类错误在批阅页也犯过一次。）
 */
const attemptId = computed(() => String(route.params.attemptId ?? ''))
const result = ref<AttemptResult | null>(null)
/**
 * 入场信息单独取一次。
 *
 * <p>结果页要显示「考试次数」「入场时间」，但契约 §11.12 的 `AttemptResult` 里**没有**这两个字段
 * （它只覆盖成绩维度）。原平台这两项与入场页同源，故复用 `getExamEntry`（§11.3），
 * 而不是在前端从 history 长度瞎推次数——推错了会让学员以为还能再考。
 *
 * <p>**取不到不能连累结果页**：它只是补充信息，用 `silent` 静默失败，页面照常显示 `--`。
 */
const entry = ref<StudentExamEntry | null>(null)
const loading = ref(true)
const error = ref('')

const stampState = computed(() =>
  result.value ? resolveStampState(result.value) : ('pending' as const)
)
const metricCells = computed(() => (result.value ? buildMetricCells(result.value) : []))
const objectiveNote = computed(() => (result.value ? buildObjectiveNote(result.value) : ''))
const historyRows = computed(() => buildHistoryRows(result.value?.history))
const pointRows = computed(() => buildPointScoreRows(result.value?.pointScores))
const typeStats = computed(() => buildTypeStatViews(result.value?.typeStats))
const answerRangeText = computed(() =>
  result.value ? formatAnswerRange(result.value.submitAt, result.value.usedSeconds) : DASH
)

/**
 * 最高分：接口直接给 `highestScore`，不在前端遍历 history 取最大值。
 * 理由：历史里可能有「本次」还没算进去的边界情况，以服务端口径为准。
 */
const highestText = computed(() => {
  const v = result.value?.highestScore
  return v == null ? DASH : `${formatScore(v)}分`
})

/**
 * 考生 / 工号 / 部门不在 `AttemptResult` 里（契约 §11.12 未给），
 * 优先用入场信息（它是后端按 exam_arrange_student 算的权威口径），取不到再退回登录身份。
 */
const candidateText = computed(() => {
  const e = entry.value
  if (e?.fullname) {
    return e.account ? `${e.fullname}（${e.account}）` : e.fullname
  }
  const name = auth.user?.name || auth.displayName
  const account = auth.user?.account
  return account ? `${name}（${account}）` : name
})
const jobNo = computed(() => (auth.user as { jobNo?: string } | null)?.jobNo || DASH)
const deptName = computed(() => auth.deptName || DASH)

/** 入场时间：两端都有时用「A ~ B」，与原平台截图一致 */
const entryRangeText = computed(() => {
  const e = entry.value
  if (!e) return DASH
  const start = e.entryStartAt
  const end = e.entryEndAt
  if (!start && !end) return '不限时间'
  if (!start) return `截止 ${end}`
  if (!end) return `${start} 起`
  return `${start} ~ ${end}`
})

/** 考试次数：`已用/上限`，上限 0 显示「不限」（与原平台「1/不限」一致） */
const attemptTimesText = computed(() => {
  const e = entry.value
  if (!e) return DASH
  return `${e.usedTimes}/${e.attemptLimit > 0 ? e.attemptLimit : '不限'}`
})

/*
 * 环形图几何（SVG，不引入 echarts）。
 *
 * <p>弧长算法：周长 C = 2πr，进度段长度 = C × 正确率。
 * `stroke-dasharray="弧长 C"` 表示先画「弧长」实线、再留 C 空白；
 * 因为圆的周长恰好是 C，剩下的部分自然接回起点，不会画重或多出一圈。
 * 起点靠 `rotate(-90)` 拨到 12 点方向（SVG 圆的默认起点在 3 点）。
 *
 * <p>用 `stroke-linecap: round` 让弧的两端是圆头，与原平台截图一致；
 * 代价是极小时圆头会溢出一点点，所以 0% 直接不渲染进度弧。
 */
const DONUT_SIZE = 190
const DONUT_STROKE = 10
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2
const donutCircumference = 2 * Math.PI * DONUT_R

/** 总体正确率（0~1）；无题型数据时为 null，此时不画进度弧 */
const overallRateRatio = computed(() => overallCorrectRate(result.value?.typeStats))

const donutDash = computed(() => {
  const ratio = overallRateRatio.value
  if (ratio == null) return 0
  // 夹到 0~1：脏数据（负值/超过 1）不能把弧画到圆周外
  const safe = Math.min(1, Math.max(0, ratio))
  return donutCircumference * safe
})

/**
 * 题型卡片视图：在 `buildTypeStatViews` 的结果上补一个进度条宽度。
 *
 * <p>为什么不直接改 `resultModel.ts`：本任务约定只改本文件。
 * 也不从 `rateText`（"40%"）反向解析字符串——那是在做格式化又反格式化。
 * 改为按 `type` 把原始行匹配回来取真实比率，口径仍由 `formatRate` 统一（*100 四舍五入）。
 * 匹配不到时给 0（进度条空），不会因缺数据把条画满。
 */
const typeCards = computed(() => {
  const rawByType = new Map((result.value?.typeStats ?? []).map(r => [r.type, r]))
  return typeStats.value.map(v => ({
    ...v,
    ratePercent: toPercent(rawByType.get(v.type)?.rate)
  }))
})

function toPercent(rate: number | string | null | undefined): number {
  if (rate === null || rate === undefined || rate === '') return 0
  const n = Number(rate)
  if (Number.isNaN(n)) return 0
  // 夹到 0~100 防止脏数据把进度条溢出卡片
  return Math.min(100, Math.max(0, Math.round(n * 100)))
}

/**
 * 「再次考试」可用性：结果响应里没有 attemptLimit / usedTimes，改由入场信息判断。
 * 次数上限 0 表示不限次；有上限且已用满时不给按钮（入场页此时也会拦，
 * 但让学员点进去再看到「次数已用完」是多余的坏体验）。
 * 入场信息取不到时保守给按钮——入场页仍是唯一权威口径，不会让学员越权开考。
 */
const canRetry = computed(() => {
  const e = entry.value
  if (!e) return Boolean(result.value?.graded)
  if (e.attemptLimit > 0 && e.usedTimes >= e.attemptLimit) return false
  return Boolean(result.value?.graded)
})

const overallRateText = computed(() => {
  const rate = overallCorrectRate(result.value?.typeStats)
  return rate == null ? DASH : formatRate(rate)
})
const usedText = computed(() => {
  const minutes = usedMinutes(result.value?.usedSeconds)
  return minutes == null ? DASH : `${minutes}分`
})
/**
 * 用时排名（2026-11-13 后端已补字段，不再写死 `--`）。
 *
 * <p>两种 null 都要显示 `--` 而不是「0/0」：
 * ①未出分（`graded=false`）——还没批完，没有名次可言；
 * ②本卷用时无效（`usedSeconds` 为 null/0）——无效用时后端不参与排名，
 *   此时 `usedTimeRankTotal` 可能仍大于 0（别人有效），但本人没有名次。
 */
const rankText = computed(() => {
  const r = result.value
  if (!r || r.usedTimeRank == null || !r.usedTimeRankTotal) return DASH
  return `${r.usedTimeRank}/${r.usedTimeRankTotal}`
})

/**
 * 点开某条考试历史（2026-11-13 用户要求）。
 *
 * <p>同一个结果页路由只换 `attemptId` 参数，组件会被复用、`onMounted` 不会再跑，
 * 所以必须 watch 参数重取数据（本页已有该 watch）。这里只负责跳转。
 *
 * <p>点当前正在看的这条直接忽略：跳到自己没有意义，还会白跑一次请求。
 */
const openHistory = (attemptId: string) => {
  if (!attemptId || attemptId === result.value?.attemptId) return
  router.push(`/exam/student/attempts/${attemptId}/result`)
}

const load = async () => {
  if (!attemptId.value) {
    error.value = '缺少答卷 id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await getAttemptResult(attemptId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '考试结果加载失败'
    loading.value = false
    return
  }
  loading.value = false
  // 入场信息是补充展示（次数/入场时间/考生），失败不影响结果本身，故单独静默加载
  void loadEntry(result.value.arrangeId)
}

const loadEntry = async (arrangeId: string | undefined) => {
  if (!arrangeId) return
  try {
    entry.value = await getExamEntry(arrangeId)
  } catch {
    // silent：拦截器已按请求性质提示过；这里保留 -- 占位即可
  }
}

/** 再次考试回到入场页：入场页负责校验次数/时间窗并给出不可考原因 */
const retryExam = () => {
  const arrangeId = result.value?.arrangeId
  if (!arrangeId) return
  router.push(`/exam/student/exams/${arrangeId}/entry`)
}

const openAnswerPaper = () => {
  router.push(`/exam/student/attempts/${attemptId.value}/paper`)
}

onMounted(load)

/**
 * 切换答卷时重取（2026-11-13）。
 *
 * <p>点「考试历史」只换路由参数，组件复用、`onMounted` 不会再跑 ——
 * 不监听的话，点了另一条历史页面仍显示上一次的数据。
 *
 * <p>清空 `result` 再 load：否则 loading 期间会短暂闪出上一份卷的分数，
 * 学员会以为点错了。
 */
watch(
  () => route.params.attemptId,
  (next, prev) => {
    if (!next || next === prev) return
    result.value = null
    void load()
  }
)
</script>

<style scoped lang="scss">
/* 学员端强调色统一 #436BFF（fe-shell 实机复核：原平台主按钮就是它，不是 #1890ff） */
$brand: #436bff;

.result-page {
  max-width: 1320px;
  margin: 0 auto;
  padding-bottom: 48px;
}

.crumb {
  margin-bottom: 16px;
  font-size: 14px;
}

:deep(.el-breadcrumb__inner) {
  color: #8c8c8c;
  font-weight: 400;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #262626;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

/* 顶部主卡：白底、圆角 8px、无强阴影（原平台实测） */
.head-card {
  padding: 20px 24px 18px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
}

.head-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.head-name {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 0 12px;
  font-size: 20px;
  line-height: 28px;
  font-weight: 500;
  color: #262626;
  word-break: break-word;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 0 0 auto;
}

.btn-retry {
  background: $brand;
  border-color: $brand;
  border-radius: 4px;
  font-size: 14px;
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
}

.head-item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;

  em {
    font-style: normal;
    color: #8c8c8c;
  }
}

/* 第二行（总分/最高分/次数/入场时间）文字更淡，视觉上退到次要层 */
.head-row--meta .head-item {
  color: #595959;
}

.layout {
  display: grid;
  /* 左栏按原平台内容宽度约 178px（截图量取），不用等宽侧栏 */
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 16px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #262626;
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid #bfbfbf;
  border-radius: 50%;
  color: #bfbfbf;
  font-size: 10px;
  line-height: 1;
  cursor: help;
}

/* 考试历史 */
.history-card {
  padding: 16px;
}

.history-card .card-title {
  margin-bottom: 12px;
  font-size: 14px;
}

.history-empty {
  margin: 0;
  font-size: 13px;
  color: #8c8c8c;
}

.history-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/*
 * 历史条目（2026-11-13 起可点击）。
 *
 * 非当前项给手型 + hover 底色，让「能点」看得出来；
 * 当前项不加 hover、也不给 cursor:pointer —— 它点了没反应，给手型是骗人。
 * 键盘焦点环由全局层统一提供（AGENTS.md §4），这里不重复实现。
 */
.history-item {
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &[role="button"] {
    cursor: pointer;

    &:hover {
      background: #f0f4ff;
    }
  }

  &.is-current {
    background: #f7f8fa;
  }
}

.history-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 0;
  font-size: 14px;
  line-height: 22px;
}

.history-key {
  color: #8c8c8c;
}

.history-score,
.history-time {
  color: #262626;
}

.history-time {
  color: #595959;
}

/* 「未通过」12px / #F5222D；批阅中给灰，避免未出分被读成未通过 */
.history-state {
  font-size: 12px;
  line-height: 20px;

  &.is-failed {
    color: #f5222d;
  }

  &.is-passed {
    color: #52c41a;
  }

  &.is-pending {
    color: #fa8c16;
  }

  &.is-invalid {
    color: #8c8c8c;
  }
}

/* 四格卡片 */
.metrics-card {
  padding: 24px;
}

.objective-note {
  margin: 16px 0 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: #f0f4ff;
  color: $brand;
  font-size: 13px;
  line-height: 20px;
}

.answer-time {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: #8c8c8c;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

/* 次要按钮：白底 + 1px #D9D9D9 + 4px 圆角（原平台实测） */
.btn-detail {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #262626;
  font-size: 14px;

  &:hover:not(.is-disabled) {
    border-color: $brand;
    color: $brand;
  }
}

/* el-tooltip 需要一个可包裹元素；禁用按钮自身不触发 mouse 事件 */
.detail-btn-wrap {
  display: inline-flex;
}

.block {
  margin-top: 16px;
}

.block-empty {
  margin: 0;
  padding: 24px 0;
  text-align: center;
  font-size: 14px;
  color: #8c8c8c;
}

.block-empty--pending {
  color: #fa8c16;
}

/* 考核点表：表头 14px #262626 / 底 #F9FAFB / 行高 50px / 数值右对齐（原平台实测） */
.point-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: #262626;

  th,
  td {
    padding: 14px 16px;
    border: 1px solid #f0f0f0;
    text-align: right;
    font-weight: 400;
  }

  th {
    background: #f9fafb;
    line-height: 22px;
  }

  td {
    line-height: 22px;
  }

  .is-left {
    text-align: left;
  }
}

/* ---- 本次考试情况分析（布局照原平台截图实测） ---- */

/* 左图右卡：图表区定宽 190，右侧卡片网格吃掉剩余空间 */
.analysis-body {
  display: flex;
  align-items: stretch;
  gap: 32px;
}

/* 左侧：环形图，垂直方向与右侧卡片区大致居中 */
.analysis-left {
  flex: 0 0 190px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.donut {
  position: relative;
  width: 190px;
  height: 190px;
}
/* 中心文字绝对居中覆盖在 SVG 上 */
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}
.donut-label {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #8c8c8c;
}
.donut-value {
  margin: 0;
  font-size: 28px;
  line-height: 36px;
  font-weight: 700;
  color: #262626;
}

/* 右侧：题型卡片 2 列网格 */
.analysis-right {
  flex: 1 1 auto;
  min-width: 0;
}
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
/* 卡片：浅灰底 / 圆角 4 / 内边距 14（截图像素口径） */
.type-card {
  padding: 14px;
  border-radius: 4px;
  background: #fafafa;
}
.type-card__name {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
}
/* 第二行：标签 + 进度条 + 右端百分比 */
.type-card__rate {
  display: flex;
  align-items: center;
  gap: 8px;
}
.type-card__rate-label {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
}
/* 进度条：高 6 / 圆角 / 轨道 #F0F2F5 */
.type-card__bar {
  flex: 1 1 auto;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  background: #f0f2f5;
  overflow: hidden;
}
.type-card__bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: #436bff;
  /* 只过渡宽度，不用 transition: all */
  transition: width 0.3s ease;
}
/* 百分比固定宽度，让各卡片的进度条右端能对齐 */
.type-card__rate-value {
  flex: 0 0 44px;
  text-align: right;
  font-size: 12px;
  line-height: 20px;
  color: #262626;
}
/* 第三行：答对 + 排名，两段之间留空 */
.type-card__meta {
  display: flex;
  align-items: baseline;
  gap: 32px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
}

/* 底部一整行：用时 / 用时排名 */
.analysis-foot {
  display: flex;
  align-items: center;
  gap: 48px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 14px;
  line-height: 22px;
  color: #8c8c8c;
}

@media (max-width: 1000px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏：图表在上、卡片在下，2 列网格降为单列 */
  .analysis-body {
    flex-direction: column;
    align-items: center;
  }
  .analysis-left {
    flex: 0 0 auto;
  }
  .type-grid {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }
  .analysis-foot {
    gap: 24px;
  }
}
</style>
