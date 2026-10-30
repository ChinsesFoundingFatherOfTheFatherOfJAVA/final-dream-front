<template>
  <div class="dm-report" v-loading="loading">
    <!-- 顶栏（契约 F18：返回 / 报告标题 / 再练一次） -->
    <header class="dm-topbar">
      <button class="dm-topbar__back" type="button" @click="goBack">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M10 3.5 5.5 8l4.5 4.5"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        返回
      </button>
      <div class="dm-topbar__title">{{ pageTitle }}</div>
      <button class="dm-topbar__action" type="button" @click="rePractice">再练一次</button>
    </header>

    <div class="dm-scroll">
      <div class="dm-sheet" v-if="report">
        <!-- 报告头：场景 + 元信息 + 结论卡 -->
        <div class="dm-hero">
          <div class="dm-hero__inner">
            <div class="dm-hero__left">
              <div class="dm-hero__title">{{ report.scenarioName || '训练报告' }}</div>
              <div class="dm-hero__meta">
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">训练主题</div>
                  <div class="dm-hero__meta-value">{{ report.themeName || '--' }}</div>
                </div>
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">学员</div>
                  <div class="dm-hero__meta-value">{{ report.studentName || '--' }}</div>
                </div>
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">完成时间</div>
                  <div class="dm-hero__meta-value">{{ formatTime(report.generatedAt) }}</div>
                </div>
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">练习时长</div>
                  <div class="dm-hero__meta-value">{{ durationText }}</div>
                </div>
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">对话轮次</div>
                  <div class="dm-hero__meta-value">{{ report.roundCount || 0 }} 轮</div>
                </div>
                <div class="dm-hero__meta-item">
                  <div class="dm-hero__meta-label">演练模式 · 类型</div>
                  <div class="dm-hero__meta-value">
                    <span class="dm-hero__mode" :class="isExam ? 'is-exam' : 'is-train'">{{
                      isExam ? '考核' : '训练'
                    }}</span>
                    <span class="dm-hero__type">{{ practiceTypeText }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="dm-hero__card" :class="passed ? 'is-pass' : 'is-fail'">
              <div class="dm-hero__verdict">
                <span class="dm-verdict__icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      v-if="passed"
                      d="M3 8.5 6.5 12 13 4.5"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      v-else
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
                <span class="dm-verdict__text">{{ passed ? '通过' : '未通过' }}</span>
              </div>
              <div class="dm-hero__facts">
                <div class="dm-hero__fact">
                  <span class="dm-hero__fact-value">{{
                    report.targetReached === 1 ? '已达成' : '未达成'
                  }}</span>
                  <span class="dm-hero__fact-label">练习目标</span>
                </div>
                <span class="dm-hero__divider"></span>
                <div class="dm-hero__fact">
                  <span class="dm-hero__fact-value is-score">{{ formatScore }} 分</span>
                  <span class="dm-hero__fact-label">通过线 {{ report.passScore }} 分</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dm-body">
          <!-- 未通过 / 中止原因（契约 F18：主动结束、切屏违规、系统失败都要显示具体原因） -->
          <section class="dm-section" v-if="!passed || abortReason">
            <div class="dm-reason">
              <div class="dm-reason__title">{{ reasonTitle }}</div>
              <div class="dm-reason__text">{{ abortReason || reasonTitle }}</div>
            </div>
          </section>

          <!-- 总体评价 -->
          <section class="dm-section">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M9 8.2v4"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                  <circle cx="9" cy="5.6" r="0.9" fill="currentColor" />
                </svg>
              </span>
              <span class="dm-section__title-text">总体评价</span>
            </div>
            <p class="dm-summary">{{ report.summary || '本次练习暂无总体评价。' }}</p>
          </section>

          <!-- 能力维度评分 -->
          <section class="dm-section" v-if="dimensions.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3 15V9M9 15V4M15 15v-4"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="dm-section__title-text">能力维度评分</span>
            </div>
            <p class="dm-section__hint">综合得分由以下各维度得分逐项加权求和</p>
            <div class="dm-dim-grid">
              <div class="dm-dim-card" v-for="dimension in dimensions" :key="dimension.dimensionKey">
                <div class="dm-dim-card__score" :class="scoreClass(dimension.score)">
                  {{ formatNumber(dimension.score) }}
                </div>
                <div class="dm-dim-card__name">{{ dimension.dimensionName }}</div>
                <div class="dm-dim-card__weight">权重 {{ formatNumber(dimension.weight) }}%</div>
                <div class="dm-dim-card__track">
                  <div
                    class="dm-dim-card__fill"
                    :class="scoreClass(dimension.score)"
                    :style="{ width: clampPercent(dimension.score) }"
                  ></div>
                </div>
              </div>
            </div>
            <p class="dm-formula">
              <b>综合得分 {{ formatScore }} 分</b>
              <span>{{ formulaText }}</span>
            </p>
          </section>

          <!-- 评估标准详细分析 -->
          <section class="dm-section" v-if="dimensions.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 3.5h10v11H4z"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path d="M6.5 7h5M6.5 10h5" stroke="currentColor" stroke-width="1.4" />
                </svg>
              </span>
              <span class="dm-section__title-text">评估标准详细分析</span>
              <button class="dm-section__action" type="button" @click="toggleAll">
                {{ allExpanded ? '全部收起' : '全部展开' }}
              </button>
            </div>
            <div class="dm-detail-card" v-for="(dimension, index) in dimensions" :key="index">
              <button
                class="dm-detail-card__head"
                type="button"
                @click="toggleOne(index)"
                :aria-expanded="isExpanded(index)"
              >
                <span class="dm-detail-card__head-left">
                  <span class="dm-detail-card__name">{{ dimension.dimensionName }}</span>
                  <span class="dm-detail-card__score" :class="scoreClass(dimension.score)"
                    >{{ formatNumber(dimension.score) }} 分</span
                  >
                </span>
                <svg
                  class="dm-detail-card__arrow"
                  :class="{ 'is-open': isExpanded(index) }"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <div class="dm-detail-card__body" v-show="isExpanded(index)">
                <div class="dm-detail-card__block" v-if="dimension.evidence?.length">
                  <div class="dm-detail-card__block-label is-standard">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" />
                    </svg>
                    标准要求
                  </div>
                  <p class="dm-detail-card__block-text">
                    {{ (dimension.evidence as string[]).join('；') }}
                  </p>
                </div>
                <div class="dm-detail-card__block" v-if="dimension.strength">
                  <div class="dm-detail-card__block-label is-good">做得好的</div>
                  <p class="dm-detail-card__block-text">• {{ dimension.strength }}</p>
                </div>
                <div class="dm-detail-card__block" v-if="dimension.improvement">
                  <div class="dm-detail-card__block-label is-improve">待改进的</div>
                  <p class="dm-detail-card__block-text">{{ dimension.improvement }}</p>
                </div>
                <div class="dm-detail-card__block" v-if="dimension.reason">
                  <div class="dm-detail-card__block-label is-reason">得分原因</div>
                  <p class="dm-detail-card__block-text">{{ dimension.reason }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- 表现优秀 -->
          <section class="dm-section" v-if="strengths.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M9 2.5l2 4.2 4.5.6-3.3 3.2.8 4.5L9 12.9l-4 2.1.8-4.5L2.5 7.3l4.5-.6z"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="dm-section__title-text">表现优秀</span>
            </div>
            <div class="dm-strength">
              <p class="dm-strength__item" v-for="(item, index) in strengths" :key="index">
                ✦ {{ item }}
              </p>
            </div>
          </section>

          <!-- AI 改进建议 -->
          <section class="dm-section" v-if="suggestions.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M9 2.5a5 5 0 0 1 3 9v1.5H6V11.5a5 5 0 0 1 3-9z"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                  <path d="M7 15.5h4" stroke="currentColor" stroke-width="1.3" />
                </svg>
              </span>
              <span class="dm-section__title-text">AI 改进建议（{{ suggestions.length }} 项）</span>
            </div>
            <div class="dm-improve">
              <div class="dm-improve__item" v-for="(item, index) in suggestions" :key="index">
                <p class="dm-improve__title">{{ index + 1 }}. {{ item.title }}</p>
                <p class="dm-improve__detail">{{ item.detail }}</p>
                <p class="dm-improve__sample" v-if="item.sampleReply">
                  参考话术：{{ item.sampleReply }}
                </p>
              </div>
            </div>
          </section>

          <!-- 关键对话片段 -->
          <section class="dm-section" v-if="dialogues.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3 4.5h12v8H8l-3.5 2.5v-2.5H3z"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="dm-section__title-text">关键对话片段</span>
            </div>
            <div class="dm-dialogue" v-for="(item, index) in dialogues" :key="index">
              <span class="dm-dialogue__badge" :class="dialogueClass(item.type)">{{
                dialogueBadge(item.type)
              }}</span>
              <div class="dm-dialogue__body">
                <p class="dm-dialogue__quote">「{{ item.quote }}」</p>
                <p class="dm-dialogue__comment">{{ item.comment }}</p>
              </div>
            </div>
          </section>

          <!-- 推荐下一步训练 -->
          <section class="dm-section" v-if="nextSteps.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3 9h9M9 5.5 12.5 9 9 12.5"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="dm-section__title-text">推荐下一步训练</span>
            </div>
            <div class="dm-next">
              <div class="dm-next__item" v-for="(item, index) in nextSteps" :key="index">
                <span class="dm-next__index">{{ index + 1 }}</span>
                <div class="dm-next__main">
                  <span class="dm-next__title">{{ item.title }}</span>
                  <span class="dm-next__detail" v-if="item.detail">{{ item.detail }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 完整对话回放 -->
          <section class="dm-section" v-if="transcript.length">
            <div class="dm-section__title">
              <span class="dm-section__title-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.3" />
                  <path d="M9 5.5V9l2.5 1.5" stroke="currentColor" stroke-width="1.3" />
                </svg>
              </span>
              <span class="dm-section__title-text">完整对话回放</span>
              <span class="dm-section__meta">{{ transcript.length }} 条</span>
            </div>
            <div class="dm-replay">
              <div class="dm-replay__scene">
                <span class="dm-replay__scene-label">场景</span>
                <p class="dm-replay__scene-text">{{ report.sceneNarration || '—' }}</p>
              </div>
              <div
                class="dm-replay__row"
                :class="item.role === 'user' ? 'is-mine' : 'is-other'"
                v-for="(item, index) in transcript"
                :key="index"
              >
                <div class="dm-replay__avatar" :class="item.role === 'user' ? 'is-mine' : 'is-other'">
                  {{ avatarText(item.role) }}
                </div>
                <div class="dm-replay__bubble">
                  <span class="dm-replay__speaker">{{ speakerOf(item.role) }}</span>
                  <p class="dm-replay__text">{{ item.text }}</p>
                </div>
              </div>
            </div>
          </section>

          <div class="dm-footnote">
            <span>生成时间：{{ formatTime(report.generatedAt) }}</span>
            <span>由 AI 对练系统自动生成</span>
          </div>
        </div>
      </div>

      <el-empty v-else-if="!loading" description="报告尚未生成" />
    </div>
  </div>
</template>

<script setup lang="ts">
// 训练报告页（契约 01 §F18 / 02 §5.8）：分数、通过、目标达成全部来自后端，前端不做累加判定
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAttemptReport, type StudentReport } from '@/api/actStudent'

type Dimension = StudentReport['dimensions'][number]
type TranscriptItem = { role: string; text: string }

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const report = ref<StudentReport | null>(null)
const expandedKeys = ref<string[]>([])
const attemptId = computed(() => String(route.params.attemptId))

const passed = computed(() => report.value?.passed === 1)
const isExam = computed(() => report.value?.studyMode === 2)
const dimensions = computed<Dimension[]>(() => report.value?.dimensions ?? [])
const formatScore = computed(() => formatNumber(report.value?.totalScore))

const pageTitle = computed(() => (isExam.value ? '考核报告' : '训练报告'))

const practiceTypeText = computed(() => {
  const map: Record<string, string> = {
    case: '案例练习',
    random: '随机练习',
    custom: '自定义练习',
  }
  return map[report.value?.practiceType ?? ''] ?? '案例练习'
})

/** 用时：优先后端 durationSeconds（报告权威来源），格式「13分钟45秒」 */
const durationText = computed(() => {
  const seconds = Number(report.value?.durationSeconds ?? 0)
  if (!seconds || seconds < 0) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (!minutes) return `${rest} 秒`
  return rest ? `${minutes}分钟${rest}秒` : `${minutes} 分钟`
})

/** 中止/未通过原因：契约 F18 要求主动结束、切屏违规、系统失败都给出具体原因 */
const abortReason = computed(() => {
  const endReason = report.value?.endReason ?? ''
  const map: Record<string, string> = {
    manual_exit: '你主动结束了本次练习并提交，当前成绩判定为未通过。',
    screen_violation: '练习过程中检测到切屏违规，本次成绩判定为未通过。',
    system_error: '练习因系统异常中断，本次成绩判定为未通过。',
    timeout: '练习到时自动结束并提交，未达成本次练习目标。',
    plan_ended: '主题计划已结束，本次练习被强制结束。',
  }
  return map[endReason] ?? (report.value?.targetReason || '')
})

const reasonTitle = computed(() => {
  const endReason = report.value?.endReason ?? ''
  if (endReason === 'manual_exit') return '主动结束'
  if (endReason === 'screen_violation') return '切屏违规'
  if (endReason === 'system_error') return '系统异常'
  if (endReason === 'timeout') return '到时结束'
  return '未通过原因'
})

/** 表现优秀：优先取维度里的 strength，其次取关键对话里的优秀片段 */
const strengths = computed<string[]>(() => {
  const fromDimensions = dimensions.value
    .map((item) => (item.strength ?? '').trim())
    .filter((text) => text && text !== '无')
  if (fromDimensions.length) return fromDimensions.slice(0, 5)
  return dialogues.value
    .filter((item) => item.type === 'excellent')
    .map((item) => item.comment)
    .slice(0, 5)
})

const suggestions = computed(() => (report.value?.improvement ?? []) as NonNullable<
  StudentReport['improvement']
>)

const dialogues = computed(
  () =>
    (report.value?.keyDialogues ?? []) as NonNullable<StudentReport['keyDialogues']>
)

/** 推荐下一步：schema 里是纯字符串数组，按「：」拆成「标题 + 说明」两行（原平台就是两行） */
const nextSteps = computed(() => {
  const list = (report.value?.recommendations ?? []) as string[]
  return list.map((raw) => {
    const text = String(raw ?? '').trim()
    const index = text.search(/[：:]/)
    if (index > 0) {
      return { title: text.slice(0, index), detail: text.slice(index + 1).trim() }
    }
    return { title: text, detail: '' }
  })
})

const transcript = computed<TranscriptItem[]>(() => {
  const list = report.value?.transcript
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => ({ role: String(item.role ?? ''), text: String(item.text) }))
})

const formulaText = computed(() => {
  const parts = dimensions.value.map(
    (item) =>
      `${item.dimensionName} ${formatNumber(item.score)} 分 × ${formatNumber(item.weight)}%`
  )
  return parts.length ? `= ${parts.join(' + ')}` : ''
})

const allExpanded = computed(
  () => dimensions.value.length > 0 && expandedKeys.value.length === dimensions.value.length
)

const isExpanded = (index: number) => expandedKeys.value.includes(keyOf(index))
const keyOf = (index: number) => String(dimensions.value[index]?.dimensionKey ?? index)
const toggleOne = (index: number) => {
  const key = keyOf(index)
  expandedKeys.value = expandedKeys.value.includes(key)
    ? expandedKeys.value.filter((item) => item !== key)
    : [...expandedKeys.value, key]
}
const toggleAll = () => {
  expandedKeys.value = allExpanded.value
    ? []
    : dimensions.value.map((_, index) => keyOf(index))
}

const dialogueBadge = (type: string) =>
  ({ excellent: '优', attention: '注', rewrite: '改' })[type] ?? '注'
const dialogueClass = (type: string) =>
  ({ excellent: 'is-excellent', attention: 'is-attention', rewrite: 'is-rewrite' })[type] ??
  'is-attention'

const clampPercent = (value: unknown) => {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return '0%'
  return `${Math.max(0, Math.min(100, Math.round(number)))}%`
}

const scoreClass = (value: unknown) => {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return 'is-low'
  if (number >= 80) return 'is-high'
  if (number >= 60) return 'is-mid'
  return 'is-low'
}

const speakerOf = (role: string) =>
  role === 'user'
    ? report.value?.userRoleName || '我'
    : report.value?.actorName || '对练对象'

const avatarText = (role: string) => {
  if (role === 'user') return '我'
  const name = report.value?.actorName ?? ''
  return name ? name.slice(0, 1) : 'AI'
}

function formatNumber(value: unknown) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return '0'
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function formatTime(value: string | null | undefined) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

const goBack = () => router.push('/sparring/web/drillmate/history')
// AC-14：再练一次 = 回主题详情重新选择场景（每次开始都会创建新 attempt）
const rePractice = () =>
  router.push(`/sparring/web/drillmate/detail/${report.value?.themeId ?? ''}`)

onMounted(async () => {
  try {
    report.value = await getAttemptReport(attemptId.value)
    // 默认展开第一个维度（原平台首条即展开）
    if (dimensions.value.length) {
      expandedKeys.value = [keyOf(0)]
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.dm-report {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #f5f5f7;
  color: #333;
  font-family:
    -apple-system, blinkmacsystemfont, 'Helvetica Neue', helvetica, 'segoe ui', arial, roboto,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
}

.dm-report *,
.dm-report *::before,
.dm-report *::after {
  box-sizing: border-box;
}

/* ===== 顶栏 ===== */
.dm-topbar {
  display: flex;
  align-items: center;
  flex: none;
  gap: 16px;
  height: 56px;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.dm-topbar__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #595959;
  font-size: 14px;
  line-height: 16px;
  cursor: pointer;

  &:hover {
    color: #436bff;
  }
}

.dm-topbar__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #1d2129;
}

.dm-topbar__action {
  height: 32px;
  margin-left: auto;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background: linear-gradient(90deg, #436bff, #8b5cf6);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  line-height: 32px;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
}

/* ===== 滚动区 + 报告纸 ===== */
.dm-scroll {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
}

.dm-sheet {
  width: 1000px;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 12px;
  background: #fff;
}

/* ===== 报告头 ===== */
.dm-hero {
  padding: 32px;
}

.dm-hero__inner {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}

.dm-hero__left {
  flex: 1;
  min-width: 0;
}

.dm-hero__title {
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  color: #1d2129;
}

.dm-hero__meta {
  display: grid;
  grid-template-columns: repeat(3, 184px);
  gap: 12px;
  margin-top: 16px;
}

.dm-hero__meta-item {
  min-width: 0;
}

.dm-hero__meta-label {
  font-size: 14px;
  line-height: 22px;
  color: #86909c;
}

.dm-hero__meta-value {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: #1d2129;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-hero__mode {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;

  &.is-exam {
    background: #fff7e6;
    color: #ff7d00;
  }

  &.is-train {
    background: #e8f0ff;
    color: #436bff;
  }
}

.dm-hero__type {
  margin-left: 8px;
  padding: 0 8px;
  border-radius: 4px;
  background: #f7f8fa;
  font-size: 13px;
  line-height: 20px;
  color: #6b7785;
}

.dm-hero__card {
  flex: none;
  width: 320px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);

  &.is-pass {
    color: #22c55e;
  }

  &.is-fail {
    color: #ff7d00;
  }
}

.dm-hero__verdict {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 24px 0;
}

.dm-verdict__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: currentColor;
  color: #fff;
}

.dm-verdict__text {
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  color: currentColor;
}

/* 原平台事实块两列固定 158px + 1px 分隔线 = 317（卡宽 320），不设 gap 才能放下 */
.dm-hero__facts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 24px;
}

.dm-hero__fact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 158px;
}

.dm-hero__fact-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  color: #ff7d00;

  &.is-score {
    color: #22c55e;
  }
}

.dm-hero__fact-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 22px;
  color: #6b7785;
}

.dm-hero__divider {
  display: inline-block;
  width: 1px;
  height: 28px;
  background: #e5e6eb;
}

/* ===== 正文 ===== */
.dm-body {
  padding: 24px 32px 0;
}

.dm-section {
  padding-bottom: 32px;
}

.dm-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.dm-section__title-icon {
  display: inline-flex;
  color: #446bff;
}

.dm-section__title-text {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #1d2129;
}

.dm-section__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 21px;
  color: #86909c;
}

.dm-section__meta {
  margin-left: auto;
  font-size: 14px;
  line-height: 22px;
  color: #86909c;
}

.dm-section__action {
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #436bff;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
}

/* 未通过 / 中止原因 */
.dm-reason {
  padding: 16px;
  border-radius: 12px;
  background: rgba(245, 34, 45, 0.04);
}

.dm-reason__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #cf1322;
}

.dm-reason__text {
  margin-top: 2px;
  font-size: 14px;
  line-height: 24px;
  color: #a8071a;
}

.dm-summary {
  margin: 0;
  font-size: 14px;
  line-height: 24px;
  color: #1d2129;
}

/* 维度卡 */
.dm-dim-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.dm-dim-card {
  padding: 16px;
  border: 1px solid #f0f2f5;
  border-radius: 12px;
  background: #fff;
}

.dm-dim-card__score {
  font-size: 26px;
  font-weight: 700;
  line-height: 26px;

  &.is-high {
    color: #22c55e;
  }

  &.is-mid {
    color: #fa8c16;
  }

  &.is-low {
    color: #f5222d;
  }
}

.dm-dim-card__name {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1d2129;
}

.dm-dim-card__weight {
  font-size: 13px;
  line-height: 21px;
  color: #86909c;
}

.dm-dim-card__track {
  height: 4px;
  margin-top: 8px;
  border-radius: 4px;
  background: #f2f3f5;
  overflow: hidden;
}

.dm-dim-card__fill {
  height: 4px;
  border-radius: 4px;

  &.is-high {
    background: #22c55e;
  }

  &.is-mid {
    background: #fa8c16;
  }

  &.is-low {
    background: #f5222d;
  }
}

.dm-formula {
  margin: 0;
  padding-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: #4e5969;

  b {
    margin-right: 6px;
    font-weight: 700;
    color: #1d2129;
  }
}

/* 评估标准明细 */
.dm-detail-card {
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fff;

  & + & {
    margin-top: 8px;
  }
}

.dm-detail-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.dm-detail-card__head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dm-detail-card__name {
  font-size: 15px;
  font-weight: 700;
  line-height: 17px;
  color: #0f172a;
}

.dm-detail-card__score {
  padding: 2px 8px;
  border-radius: 6px;
  background: #f0fdf4;
  font-size: 14px;
  font-weight: 600;

  &.is-high {
    background: #f0fdf4;
    color: #22c55e;
  }

  &.is-mid {
    background: #fff7e6;
    color: #d46b08;
  }

  &.is-low {
    background: #fff1f0;
    color: #f5222d;
  }
}

.dm-detail-card__arrow {
  color: #86909c;
  transition: transform 0.2s;

  &.is-open {
    transform: rotate(180deg);
  }
}

.dm-detail-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}

.dm-detail-card__block {
  padding: 12px;
  border-radius: 8px;
  background: #f7f8fa;
}

.dm-detail-card__block-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #4e5969;

  &.is-good {
    color: #059669;
  }

  &.is-improve {
    color: #d46b08;
  }

  &.is-reason {
    color: #1d4ed8;
  }
}

.dm-detail-card__block:has(.is-good) {
  background: #ecfdf5;
}

.dm-detail-card__block:has(.is-improve) {
  background: #fff7e6;
}

.dm-detail-card__block:has(.is-reason) {
  background: #eff6ff;
}

.dm-detail-card__block-text {
  margin: 0;
  font-size: 14px;
  line-height: 24px;
  color: #86909c;
  white-space: pre-wrap;
}

.dm-detail-card__block:has(.is-good) .dm-detail-card__block-text {
  color: #065f46;
}

.dm-detail-card__block:has(.is-improve) .dm-detail-card__block-text {
  color: #ad4e00;
}

.dm-detail-card__block:has(.is-reason) .dm-detail-card__block-text {
  color: #1e40af;
}

/* 表现优秀 */
.dm-strength {
  padding: 16px;
  border-radius: 12px;
  background: #ecfdf5;
}

.dm-strength__item {
  margin: 0;
  font-size: 14px;
  line-height: 24px;
  color: #065f46;

  & + & {
    margin-top: 4px;
  }
}

/* 改进建议 */
.dm-improve {
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff5f5 0%, #f7f9ff 100%);
}

.dm-improve__item {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);

  & + & {
    margin-top: 10px;
  }
}

.dm-improve__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #cf1322;
}

.dm-improve__detail {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 24px;
  color: #1e3a8a;
}

.dm-improve__sample {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 22px;
  color: #4e5969;
}

/* 关键对话 */
.dm-dialogue {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fafbfc;

  & + & {
    margin-top: 8px;
  }
}

.dm-dialogue__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 23px;
  height: 24px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;

  &.is-excellent {
    background: #22c55e;
  }

  &.is-attention {
    background: #fa8c16;
  }

  &.is-rewrite {
    background: #436bff;
  }
}

.dm-dialogue__body {
  min-width: 0;
}

.dm-dialogue__quote {
  margin: 0;
  font-size: 14px;
  line-height: 24px;
  color: #1d2129;
}

.dm-dialogue__comment {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 24px;
  color: #4e5969;
}

.dm-dialogue:has(.is-attention) .dm-dialogue__comment {
  color: #d46b08;
}

/* 推荐下一步 */
.dm-next {
  padding: 16px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
}

.dm-next__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);

  & + & {
    margin-top: 10px;
  }
}

.dm-next__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #dbeafe;
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
}

.dm-next__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dm-next__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1d2129;
}

.dm-next__detail {
  font-size: 14px;
  line-height: 24px;
  color: #4e5969;
}

/* 完整对话回放 */
.dm-replay {
  padding: 16px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fff;
}

.dm-replay__scene {
  padding: 12px 16px;
  border-radius: 8px;
  background: #f0f5ff;
}

.dm-replay__scene-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: #4338ca;
}

.dm-replay__scene-text {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 24px;
  color: #272e3b;
}

.dm-replay__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;

  &.is-mine {
    flex-direction: row-reverse;
  }
}

.dm-replay__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  color: #fff;

  &.is-other {
    background: #c9cdd4;
  }

  &.is-mine {
    background: #446bff;
  }
}

.dm-replay__bubble {
  max-width: 649px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f7f8fa;
}

.dm-replay__row.is-mine .dm-replay__bubble {
  background: #ebf0ff;
}

.dm-replay__speaker {
  display: block;
  margin-bottom: 2px;
  font-size: 13px;
  line-height: 20px;
  color: #6b7785;
}

.dm-replay__text {
  margin: 0;
  font-size: 14px;
  line-height: 24px;
  color: #272e3b;
  white-space: pre-wrap;
}

/* 页脚 */
.dm-footnote {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0 24px;
  font-size: 12px;
  line-height: 20px;
  color: #a9aeb8;
}

/* ===== 自适应 ===== */
@media (max-width: 1080px) {
  .dm-scroll {
    padding: 16px;
  }

  .dm-sheet {
    width: 100%;
  }

  .dm-hero {
    padding: 24px;
  }

  .dm-hero__inner {
    flex-direction: column;
    gap: 20px;
  }

  .dm-hero__card {
    width: 100%;
  }

  .dm-hero__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dm-body {
    padding: 16px 24px 0;
  }

  .dm-dim-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dm-topbar {
    padding: 0 16px;
  }

  .dm-hero {
    padding: 16px;
  }

  .dm-hero__title {
    font-size: 20px;
    line-height: 28px;
  }

  .dm-hero__meta {
    grid-template-columns: minmax(0, 1fr);
  }

  .dm-body {
    padding: 12px 16px 0;
  }

  .dm-dim-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dm-replay__bubble {
    max-width: 100%;
  }
}
</style>
