<!--
  答题页（契约 01 §S4、02 §8B.1/§8B.3）。

  两种作答样式都由后端 `AttemptPaper.layout` 决定，**前端不读配置**：
  - `single` 一页平铺：全部题目纵向平铺，答题卡跳题用滚动定位；
  - `paged` 单题分页：只渲染当前题，底部「上一题 / 下一题」，答题卡仍可跳题。
  分页粒度是**逐题**（原平台实测：切页后大题标题仍在，见勘探记录 §19）。

  视觉基线来自原平台截图逐像素实测（`观察素材/施工比对/原平台-答题页-一页.png`）：
  页面底 #F5F5F5；顶部条白底 44px；左内容列 894px + 24px 间距 + 右答题卡 282px；
  信息卡与题目区都是白卡（圆角 4px），块间距 16px；节标题 14px/500 + 括号统计 12px #8C8C8C。
-->
<template>
  <div class="attempt-page">
    <!-- 顶部条：退出 + 考试名（契约 01 §S4 顶部固定：退出、考试名、考生、工号、部门、总分、通过分数） -->
    <header class="attempt-top">
      <button type="button" class="attempt-top__exit" @click="onExit">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M8.5 2.5L4 7l4.5 4.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>退出</span>
      </button>
    </header>

    <div class="attempt-body">
      <!-- 载入 / 失败 -->
      <el-skeleton v-if="loading" class="attempt-main" :rows="8" animated />
      <el-alert
        v-else-if="loadError"
        class="attempt-main"
        type="error"
        :title="loadError"
        :closable="false"
        show-icon
      />

      <template v-else>
        <main class="attempt-main">
          <!-- 试卷头信息卡：考试名 + 考生/工号/部门 + 总分/通过分数 -->
          <section class="exam-info">
            <!-- 后端未下发 name 时整行不渲染：空 h1 会在页面上留一段莫名空白 -->
            <h1 v-if="paperName" class="exam-info__name">{{ paperName }}</h1>
            <p class="exam-info__row">
              <span class="exam-info__lbl">考生</span>
              <span class="exam-info__val">{{ candidate.name }}</span>
              <span class="exam-info__paren">（{{ candidate.account }}）</span>
              <span class="exam-info__lbl">工号</span>
              <span class="exam-info__val">{{ candidate.employeeNo }}</span>
              <span class="exam-info__lbl">部门</span>
              <span class="exam-info__val">{{ candidate.deptName }}</span>
            </p>
            <p class="exam-info__row">
              <span class="exam-info__lbl">总分</span>
              <span class="exam-info__val">{{ totalScoreText }}</span>
              <span class="exam-info__lbl">通过分数</span>
              <span class="exam-info__val">{{ passScoreText }}</span>
            </p>
          </section>

          <!-- 已交卷提示：交卷后页面不跳转（契约 01 §S5），靠这层说明当前不可再改。
               「查看结果」按 DER-31 由学员主动点击才跳，不自动导航：
               批阅中时结果页是中间态，被动看到会让学员误以为没答上；
               自动交卷/强制交卷时学员可能不在屏幕前，回来发现页面跳走更困惑。 -->
          <el-alert
            v-if="submitted"
            class="attempt-submitted-tip"
            type="success"
            :closable="false"
            show-icon
          >
            <template #title>
              <div class="submitted-row">
                <span>已成功交卷 · 本次答卷已提交，答案不可再修改。</span>
                <el-button type="primary" plain size="small" class="submitted-result-btn" @click="goResult">
                  {{ resultButtonText }}
                </el-button>
              </div>
            </template>
          </el-alert>

          <!-- ===== 单题分页（paged）：只渲染当前一题 ===== -->
          <template v-if="layout === 'paged'">
            <section v-if="currentFlat" class="exam-card exam-card--paged">
              <h3 class="sec-head">
                <span class="sec-head__name">{{ currentFlat.sectionName }}</span>
              </h3>

              <!-- 组合题子题：带出父题干，否则单题分页时子题没有上下文 -->
              <div
                v-if="currentFlat.parentContent"
                class="q-parent"
                v-html="currentFlat.parentContent"
              />

              <article class="q">
                <div class="q__head">
                  <span class="q__index">{{ currentFlat.no }}.</span>
                  <div class="q__stem" v-html="currentFlat.card.content" />
                  <span class="q__score">（{{ currentFlat.score }}分）</span>
                  <button
                    type="button"
                    class="q__flag"
                    :class="{ 'is-on': isMarked(currentFlat.quesId) }"
                    :aria-pressed="isMarked(currentFlat.quesId)"
                    :aria-label="isMarked(currentFlat.quesId) ? '取消标记' : '标记本题'"
                    :disabled="submitted"
                    @click="toggleMark(currentFlat.quesId)"
                  >
                    <svg viewBox="0 0 12 12" width="14" height="14">
                      <g fill="currentColor">
                        <path d="M5.2 1h1.1v10.2H5.2z" />
                        <path d="M6.3 1h3.9v3.6H6.3z" />
                        <path d="M6.3 4.6h2.6v1.6H6.3z" />
                        <ellipse cx="5.75" cy="11.1" rx="3.2" ry="0.9" />
                      </g>
                    </svg>
                  </button>
                  <span v-if="syncOf(currentFlat.quesId)" class="q__sync" :class="`is-${syncOf(currentFlat.quesId)}`">
                    {{ syncOf(currentFlat.quesId) === 'saving' ? '保存中…' : '保存失败' }}
                  </span>
                </div>

                <QuestionRenderer
                  :key="currentFlat.quesId"
                  :card="currentFlat.card"
                  :model-value="answers[currentFlat.quesId] || emptyDraft()"
                  :mode="submitted ? 'readonly' : 'edit'"
                  @update:model-value="onPagedDraftChange"
                />
              </article>

              <!-- 底部「上一题 / 下一题」（末题给「提交考试」） -->
              <div class="pager">
                <el-button v-if="index > 0" plain @click="goIndex(index - 1)">上一题</el-button>
                <el-button v-if="index < flats.length - 1" type="primary" @click="goIndex(index + 1)">
                  下一题
                </el-button>
                <el-button v-else type="primary" :disabled="submitted" @click="askSubmit">
                  提交考试
                </el-button>
              </div>
            </section>
            <el-empty v-else description="本卷暂无题目" :image-size="96" />
          </template>

          <!-- ===== 一页平铺（single）：全部题目纵向平铺 ===== -->
          <template v-else>
            <section
              v-for="sec in sections"
              :key="sec.sectionIndex"
              class="exam-card exam-card--single"
            >
              <h3 class="sec-head">
                <span class="sec-head__name">{{ sec.sectionName }}</span>
                <span class="sec-head__meta">
                  （本题共{{ cardCountOf(sec) }}小题，共{{ sectionScore(sec.cards) }}分）
                </span>
              </h3>

              <div class="sec-body">
                <!-- 组合题父题干：原平台先显示父题干，再依次列子题（勘探 §11） -->
                <template v-for="card in sec.cards" :key="card.quesId">
                  <div v-if="card.type === COMBO_TYPE" class="q-combo">
                    <div class="q-combo__stem" v-html="card.content" />

                    <article
                      v-for="sub in card.subQuestions || []"
                      :id="`q-${sub.quesId}`"
                      :key="sub.quesId"
                      class="q q--sub"
                    >
                      <div class="q__head">
                        <span class="q__index">{{ noOf(sub.quesId) }}.</span>
                        <div class="q__stem" v-html="sub.content" />
                        <span class="q__score">（{{ Number(sub.score) || 0 }}分）</span>
                        <button
                          type="button"
                          class="q__flag"
                          :class="{ 'is-on': isMarked(sub.quesId) }"
                          :aria-pressed="isMarked(sub.quesId)"
                          :aria-label="isMarked(sub.quesId) ? '取消标记' : '标记本题'"
                          :disabled="submitted"
                          @click="toggleMark(sub.quesId)"
                        >
                          <svg viewBox="0 0 12 12" width="14" height="14">
                            <g fill="currentColor">
                              <path d="M5.2 1h1.1v10.2H5.2z" />
                              <path d="M6.3 1h3.9v3.6H6.3z" />
                              <path d="M6.3 4.6h2.6v1.6H6.3z" />
                              <ellipse cx="5.75" cy="11.1" rx="3.2" ry="0.9" />
                            </g>
                          </svg>
                        </button>
                        <span v-if="syncOf(sub.quesId)" class="q__sync" :class="`is-${syncOf(sub.quesId)}`">
                          {{ syncOf(sub.quesId) === 'saving' ? '保存中…' : '保存失败' }}
                        </span>
                      </div>
                      <QuestionRenderer
                        :card="sub"
                        :model-value="answers[sub.quesId] || emptyDraft()"
                        :mode="submitted ? 'readonly' : 'edit'"
                        @update:model-value="(v: AnswerDraft) => onDraftChange(sub.quesId, v)"
                      />
                    </article>
                  </div>

                  <article v-else :id="`q-${card.quesId}`" :key="card.quesId" class="q">
                    <div class="q__head">
                      <span class="q__index">{{ noOf(card.quesId) }}.</span>
                      <div class="q__stem" v-html="card.content" />
                      <span class="q__score">（{{ Number(card.score) || 0 }}分）</span>
                      <button
                        type="button"
                        class="q__flag"
                        :class="{ 'is-on': isMarked(card.quesId) }"
                        :aria-pressed="isMarked(card.quesId)"
                        :aria-label="isMarked(card.quesId) ? '取消标记' : '标记本题'"
                        :disabled="submitted"
                        @click="toggleMark(card.quesId)"
                      >
                        <svg viewBox="0 0 12 12" width="14" height="14">
                          <g fill="currentColor">
                            <path d="M5.2 1h1.1v10.2H5.2z" />
                            <path d="M6.3 1h3.9v3.6H6.3z" />
                            <path d="M6.3 4.6h2.6v1.6H6.3z" />
                            <ellipse cx="5.75" cy="11.1" rx="3.2" ry="0.9" />
                          </g>
                        </svg>
                      </button>
                      <span v-if="syncOf(card.quesId)" class="q__sync" :class="`is-${syncOf(card.quesId)}`">
                        {{ syncOf(card.quesId) === 'saving' ? '保存中…' : '保存失败' }}
                      </span>
                    </div>
                    <QuestionRenderer
                      :card="card"
                      :model-value="answers[card.quesId] || emptyDraft()"
                      :mode="submitted ? 'readonly' : 'edit'"
                      @update:model-value="(v: AnswerDraft) => onDraftChange(card.quesId, v)"
                    />
                  </article>
                </template>
              </div>
            </section>
            <el-empty v-if="!sections.length" description="本卷暂无题目" :image-size="96" />
          </template>
        </main>

        <AnswerSheet
          :sections="sheetSections"
          :total="flats.length"
          :answered-count="answeredCount"
          :current-ques-id="currentQuesId"
          :answers="answers"
          :countdown-text="countdownText"
          :urgent="countdownUrgent"
          :submitting="submitting"
          :submitted="submitted"
          @jump="jumpTo"
          @submit="askSubmit"
        />
      </template>

      <!-- 考后签名（契约 §S3 / DER-31）。放在容器末尾避免影响答题区布局 -->
      <PreExamSignDialog
        v-if="postSignVisible"
        v-model="postSignVisible"
        stage="post"
        :submit="onPostSignSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 学员答题页。
 *
 * <p>三条硬口径（契约 02 §8B.3），实现方式都在下面逐条对应：
 * 1. **倒计时以服务端时间为准**：进页面把 `serverNow` 与本地时钟的差值记下来，之后每次重算
 *    都用 `本地时间 + 偏移`，并每 30s 打心跳把偏移与剩余时间校正回来。**不用 setInterval 自减**，
 *    因为标签页休眠/改系统时间/刷新都会让自减值漂移，而限时考试的漂移等于判错。
 * 2. **逐题保存是乐观更新**：先写本地 `answers` 让 UI 立刻响应，再异步提交；失败只标记该题
 *    `syncState='error'`，不阻塞其他题，也不回滚已输入内容（回滚会让学员白答一遍）。
 * 3. **答题卡状态由本地 answers 派生**：不额外存一份，见 AnswerSheet 组件。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import QuestionRenderer from './components/QuestionRenderer.vue'
import AnswerSheet from './components/AnswerSheet.vue'
import {
  COMBO_TYPE,
  buildSaveItem,
  buildSheetSections,
  countAnswered,
  countUnanswered,
  emptyDraft,
  flattenQuestions,
  formatCountdown,
  formatScore,
  normalizeDrafts,
  parseServerTime,
  remainingSeconds,
  resolveServerOffset,
  sectionScore
} from './attemptModel'
import type { FlatQuestion } from './attemptModel'
import {
  flagAttemptQuestion,
  getAttemptPaper,
  heartbeatAttempt,
  reportAttemptAntiCheat,
  saveAttemptAnswers,
  submitAttempt,
  submitExamSign
} from '@/api/studentExam'
import { uploadExamFile } from '@/api/exam'
import PreExamSignDialog from './components/PreExamSignDialog.vue'
import { toast } from '@/utils/toast'
import { useAuthStore } from '@/stores/auth'
import type { AnswerDraft, AttemptPaper } from '@/types/studentExam'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const attemptId = computed(() => String(route.params.attemptId ?? ''))

const loading = ref(true)
const loadError = ref('')
const paper = ref<AttemptPaper | null>(null)

/**
 * 考后签名弹窗。
 *
 * <p>为什么在交卷**成功之后**才弹：签名的作用是“确认本次答卷由本人完成”，
 * 交卷前弹无法关联到已完成的卷；且 DER-31 定的是交卷后停留原页，正好可以弹。
 */
const postSignVisible = ref(false)
/** 是否需要弹考后签名（来自取卷响应的 `postExamSign`） */
const needPostSign = computed(() => (paper.value?.postExamSign ?? 0) === 1)
/** 已签过就不再重复弹（刷新重进时不骚扰） */
const postSigned = ref(false)

/** 本地作答草稿：**唯一事实源**，答题卡与题目区都从它派生（契约 02 §8B.3） */
const answers = reactive<Record<string, AnswerDraft>>({})

/** 逐题的保存状态；不放进 answers，避免每次保存状态变化都触发题目区重渲染 */
const syncState = reactive<Record<string, 'saving' | 'error'>>({})

const index = ref(0)
const submitting = ref(false)
const submitted = ref(false)

/**
 * 交卷响应的 status（契约 01 §S5 / DER-31）：2=批阅中、3=已出分。
 *
 * <p>只用来决定「查看结果」按钮的文案，不用它推断别的——
 * 后端 `submitResultOf` 读的是判分收口后的真实 status（DER-18 全客观题卷交卷即 3），
 * 前端自己按「有没有主观题」猜一遍必然与后端分叉。
 */
const submitStatus = ref<number | null>(null)

/** 按钮文案：批阅中不给「查看成绩」，否则学员点进去看到「批阅中」会觉得被骗 */
const resultButtonText = computed(() =>
  submitStatus.value === 2 ? '查看批阅进度' : '查看成绩'
)

/** 交卷后不自动跳转（契约 §S5），由学员点按钮主动去结果页 */
const goResult = () => {
  if (!attemptId.value) return
  router.push(`/exam/student/attempts/${attemptId.value}/result`)
}

/** 服务端时间 − 本地时间（毫秒），所有「现在几点」都加它 */
const serverOffset = ref(0)
/** 截止时间（本地时基换算后）；null=不限时 */
const deadlineAtMs = ref<number | null>(null)
/** 每秒自增，仅用于驱动倒计时重新计算，本身不代表时间 */
const tick = ref(0)
/** 已用秒数：心跳给的基准值 + 距上次心跳的本地增量 */
const usedSeconds = ref(0)
/** 上次心跳落地的本地时刻，与 usedSeconds 配对使用 */
const usedSecondsAtMs = ref(0)

let tickTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
/** 已发出但未落库的题目，切题/交卷前要等等它们，避免「切题丢答案」 */
const inFlight = new Map<string, Promise<void>>()

const layout = computed(() => paper.value?.layout ?? 'single')
const sections = computed(() => paper.value?.sections ?? [])
const flats = computed<FlatQuestion[]>(() => flattenQuestions(sections.value))
const sheetSections = computed(() => buildSheetSections(sections.value))
const answeredCount = computed(() => countAnswered(flats.value, answers))

/** 单题分页的当前题 */
const currentFlat = computed<FlatQuestion | null>(() => flats.value[index.value] ?? null)

/**
 * 当前题 quesId。
 * `paged` 直接取分页指针；`single` 由滚动观察者写回 `index`，两模式共用一个指针，
 * 这样切换布局配置后行为仍然一致。
 */
const currentQuesId = computed(() => currentFlat.value?.quesId ?? '')

/**
 * 考试名（契约 01 §S4 顶部固定显示）。
 *
 * <p>后端 `Paper` 自 2026-11-11 起下发 `name`（从 arrange 现读，不读快照——考试改名后要显示新名）。
 * 仍保留 `v-if` 兜底：万一 arrange 被删导致字段缺失，宁可不显示，也不留一个空 `<h1>`
 * 在页面上留一段莫名空白。
 */
const paperName = computed(() => {
  const name = paper.value?.name
  return typeof name === 'string' ? name.trim() : ''
})

const candidate = computed(() => ({
  name: auth.displayName || '--',
  account: auth.user?.account || '--',
  employeeNo: auth.user?.userId || '--',
  deptName: auth.deptName || '--'
}))

/**
 * 试卷总分：**优先用后端 `totalScore`**，缺失时才由题面分值求和兜底。
 * 后端给的是权威值（含未渲染进来的题），前端求和只是降级方案，不能反客为主。
 */
const totalScoreText = computed(() => {
  const fromServer = paper.value?.totalScore
  if (fromServer !== null && fromServer !== undefined) return `${formatScore(fromServer)}分`
  const sum = flats.value.reduce((acc, q) => acc + q.score, 0)
  return `${formatScore(sum)}分`
})

/**
 * 通过分数（契约 01 §S4 顶部固定显示）。
 *
 * <p>后端自 2026-11-11 起下发 `passScore`。仍在真缺失时显示 `--`（**不拼「分」**）：
 * 「--分」看起来像 0 分，容易被误读成「不可能通过」。
 */
const passScoreText = computed(() => {
  const value = paper.value?.passScore
  if (value === null || value === undefined) return '--'
  return `${formatScore(value)}分`
})

/** 倒计时文案：不限时显示「不限时」而不是空白（契约 01 §S4 验收 3） */
const countdownText = computed(() => {
  if (!paper.value) return ''
  if (deadlineAtMs.value === null) return '不限时'
  void tick.value
  const remain = remainingSeconds(deadlineAtMs.value, Date.now() + serverOffset.value)
  return formatCountdown(remain ?? 0)
})

/** 剩余不足 5 分钟标红 */
const countdownUrgent = computed(() => {
  if (deadlineAtMs.value === null) return false
  void tick.value
  const remain = remainingSeconds(deadlineAtMs.value, Date.now() + serverOffset.value)
  return remain !== null && remain <= 300
})

const noMap = computed(() => {
  const map: Record<string, number> = {}
  for (const q of flats.value) map[q.quesId] = q.no
  return map
})
const noOf = (quesId: string) => noMap.value[quesId] ?? 0

const cardCountOf = (sec: { cards: { type: number; subQuestions?: unknown[] }[] }) =>
  sec.cards.reduce((acc, c) => acc + (c.type === COMBO_TYPE ? (c.subQuestions?.length ?? 0) : 1), 0)

const isMarked = (quesId: string) => Number(answers[quesId]?.marked) === 1

const syncOf = (quesId: string) => syncState[quesId]

/**
 * 载入卷面。
 *
 * <p>刷新即续答（契约 01 §S4「断线恢复：刷新/重进即续答」）：已答内容由接口的
 * `answer` 字段回显，前端不缓存不补写，避免本地脏数据盖掉服务端。
 */
const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getAttemptPaper(attemptId.value)
    paper.value = data

    // 草稿整体重置：reactive 对象不能换引用，逐键写入
    for (const key of Object.keys(answers)) delete answers[key]
    Object.assign(answers, normalizeDrafts(data.sections))

    // 时间基准：以接口返回的 serverNow 对齐，再按 deadlineAt 换算出「本地时基的截止时刻」。
    // 之后判断剩余时间一律用 `Date.now() + 偏移`，不再碰服务端字符串。
    const localNow = Date.now()
    serverOffset.value = resolveServerOffset(data.serverNow, localNow)
    const deadlineMs = parseServerTime(data.deadlineAt)
    deadlineAtMs.value = deadlineMs === null ? null : deadlineMs - serverOffset.value

    // 用时基准先按「从本次进入页面起算」初始化：心跳若失败，上报值也不会变成
    // `Date.now()/1000` 这种天文数字（usedSecondsAtMs 若留在 0 就会这样）。
    usedSeconds.value = 0
    usedSecondsAtMs.value = Date.now()

    /**
     * 已交卷的答卷重新进来时要呈**只读 + 已交卷**态（契约 01 §S5「交卷即终态，不可再改答案」）。
     * 后端 `Paper` 下发了 `submitted`，不接这个字段就会出现「重进后控件可点、点了保存被 40053 拒绝」
     * ——学员会以为还能改，白改一遍才被告知不行。
     */
    if (data.submitted === true) {
      submitted.value = true
      // 重进已交卷的答卷时 `Paper` 只给 submitted 布尔、不给 status，
      // 不再为此多打一次 /result（交卷后本就不该再产生网络依赖）。
      // 文案按「查看成绩」兜底：结果页自己会按 graded 显示真实状态，按钮文案不影响数据正确性。
      submitStatus.value = null
      // 不再心跳、不再倒计时：交卷后这些都没有意义，还会持续打接口
      stopTimers()
    } else {
      startTimers()
      // 立刻打一次心跳拿准 `usedSeconds`：取卷接口不下发已用时长，
      // 而交卷要上报它。等 30s 后的第一次心跳会让续答场景少算起步时间。
      void heartbeat()
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '取卷失败，请返回重试'
  } finally {
    loading.value = false
  }
}

/**
 * 心跳校正（契约 04 §11.10）。
 *
 * <p>每 30s 一次，用返回的 `serverNow` 重算偏移、用 `usedSeconds` 覆盖本地估算；
 * `forceSubmit=true`（切屏超限/管理员强制）时立即按超时交卷。
 */
const heartbeat = async () => {
  if (!paper.value || submitted.value) return
  try {
    const state = await heartbeatAttempt(attemptId.value)
    serverOffset.value = resolveServerOffset(state.serverNow, Date.now())
    usedSeconds.value = state.usedSeconds
    usedSecondsAtMs.value = Date.now()
    if (state.remainingSeconds === null) {
      deadlineAtMs.value = null
    } else if (deadlineAtMs.value !== null) {
      // 以服务端剩余秒数反向校正截止时刻，抵消长时间挂起后的漂移
      deadlineAtMs.value = Date.now() + serverOffset.value + state.remainingSeconds * 1000
    }
    if (state.forceSubmit && !submitted.value) {
      await doSubmit(2, true)
    }
  } catch {
    // 心跳失败是常态（网络抖动），静默；下一次心跳会自然补上
  }
}

/** 切屏上报（契约 04 §11.10）。失败静默：上报失败不能影响答题。 */
const reportScreenSwitch = (eventType: string) => {
  if (!paper.value || submitted.value) return
  const now = new Date(Date.now() + serverOffset.value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const occurredAt =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  void reportAttemptAntiCheat(attemptId.value, {
    eventType,
    occurredAt,
    clientEventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }).catch(() => undefined)
}

/** 逐题保存（乐观更新）。返回的 Promise 会进 inFlight，切题前可等待。 */
const pushAnswer = (flat: FlatQuestion): Promise<void> => {
  if (submitted.value) return Promise.resolve()
  const draft = answers[flat.quesId]
  if (!draft) return Promise.resolve()

  syncState[flat.quesId] = 'saving'
  const job = saveAttemptAnswers(attemptId.value, [
    buildSaveItem(flat, draft, Date.now())
  ])
    .then(() => {
      if (syncState[flat.quesId] === 'saving') delete syncState[flat.quesId]
    })
    .catch(() => {
      // 只标记该题失败，不阻塞其他题；内容保留，学员可继续编辑触发重试
      syncState[flat.quesId] = 'error'
    })
    .finally(() => {
      inFlight.delete(flat.quesId)
    })

  inFlight.set(flat.quesId, job)
  return job
}

/**
 * 作答变化：**先改本地**（模板已 v-model 到 answers，这里只补持久化）。
 *
 * <p>问答/填空是连续输入，每次按键都发请求会把接口打爆，所以按题型区分：
 * 客观题（点选即完整）立刻保存；填空/问答做 600ms 防抖，切换题目前强制 flush。
 */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

const onDraftChange = (quesId: string, value: AnswerDraft) => {
  answers[quesId] = value
  const flat = flats.value.find((q) => q.quesId === quesId)
  if (!flat) return

  const pending = saveTimers.get(quesId)
  if (pending) clearTimeout(pending)

  const type = flat.type
  if (type === 3 || type === 4) {
    saveTimers.set(
      quesId,
      setTimeout(() => {
        saveTimers.delete(quesId)
        void pushAnswer(flat)
      }, 600)
    )
    return
  }
  void pushAnswer(flat)
}

/** 单题分页下的作答变化：当前题就是 index 指向的那题，直接用它的 quesId */
const onPagedDraftChange = (value: AnswerDraft) => {
  const flat = currentFlat.value
  if (flat) onDraftChange(flat.quesId, value)
}

/** 切题/交卷前把该题待发保存立刻发出，避免防抖窗口内丢答案 */
const flushPending = async () => {
  for (const [quesId, timer] of saveTimers) {
    clearTimeout(timer)
    saveTimers.delete(quesId)
    const flat = flats.value.find((q) => q.quesId === quesId)
    if (flat) void pushAnswer(flat)
  }
  await Promise.all([...inFlight.values()])
}

/** 题目标记（契约 04 §11.9）：独立接口，只标不答也要能存 */
const toggleMark = async (quesId: string) => {
  if (submitted.value) return
  const draft = answers[quesId] ?? emptyDraft()
  const next = Number(draft.marked) === 1 ? 0 : 1
  answers[quesId] = { ...draft, marked: next }
  try {
    await flagAttemptQuestion(attemptId.value, quesId, next)
  } catch {
    // 回滚标记：标记是学员主动动作，失败了必须让他看到没生效
    answers[quesId] = { ...answers[quesId], marked: next === 1 ? 0 : 1 }
  }
}

/** 跳题：paged 切指针，single 滚动定位（契约 02 §8B.4） */
const jumpTo = async (quesId: string) => {
  await flushPending()
  const flatIndex = flats.value.findIndex((q) => q.quesId === quesId)
  if (flatIndex < 0) return
  index.value = flatIndex
  if (layout.value === 'paged') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  await nextTick()
  const el = document.getElementById(`q-${quesId}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 上一题 / 下一题 */
const goIndex = async (target: number) => {
  const clamped = Math.min(Math.max(target, 0), Math.max(flats.value.length - 1, 0))
  const flat = flats.value[clamped]
  if (!flat) return
  await jumpTo(flat.quesId)
}

/**
 * 交卷（契约 01 §S5）。
 *
 * <p>提示语按契约原文「还有 N 道题未做，是否确认交卷？」，**N=0 也提示一次**；
 * 「全部答完才能交卷」的拦截由后端按 config_snapshot 判定（40054），前端不重复判，
 * 否则改了配置后前后端口径会不一致。
 */
const askSubmit = async () => {
  if (submitted.value || submitting.value) return
  const missing = countUnanswered(flats.value, answers)
  try {
    await ElMessageBox.confirm(`还有 ${missing} 道题未做，是否确认交卷？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await doSubmit(1, false)
}

/**
 * 考后签名提交：dataURL → 上传拿 URL → 落签名记录。
 *
 * <p>与考前签名（ExamEntryPage）同一套两步走：契约 §11.5 的 `imageUrl` 由前端上传得到，
 * 签名接口只接收 URL。`stage='post'` 让后端把签名绑定到**最近一次已交卷的答卷**。
 *
 * <p>**不把 URL 转成显示态**：这里存的是要回显给批阅人的证据，
 * 必须保留 `/api/...` 前缀（`normalizeExamFileUrl` 去 `/api` 是给 `<img src>` 用的，混用会导致取图 404）。
 */
const onPostSignSubmit = async (dataUrl: string): Promise<boolean> => {
  const arrangeId = paper.value?.arrangeId
  if (!arrangeId) {
    toast.error('缺少考试信息，无法提交签名')
    return false
  }
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `sign-post-${Date.now()}.png`, { type: 'image/png' })
    const uploaded = await uploadExamFile(file)
    const imageUrl = uploaded?.fileUrl
    if (!imageUrl) {
      toast.error('签名上传失败，请重试')
      return false
    }
    await submitExamSign(arrangeId, imageUrl, 'post')
    postSigned.value = true
    toast.success('签名已提交')
    return true
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '签名提交失败，请重试')
    return false
  }
}

/**
 * 真正交卷。`submitType`：1 主动 / 2 超时自动 / 3 管理员（契约 04 §11.11）。
 * 交卷后**停留原页**并显示已交卷（契约 01 §S5「不自动跳转」）。
 */
const doSubmit = async (submitType: number, silent: boolean) => {
  if (submitting.value || submitted.value) return
  submitting.value = true
  try {
    await flushPending()
    const used = currentUsedSeconds()
    const result = await submitAttempt(attemptId.value, used, submitType)
    submitted.value = true
    // 记下后端收口后的真实 status，供「查看结果」按钮选文案（DER-31）。
    // 静默强制交卷（submitType=2/3 且 silent=true）时同样要记，否则学员回来看到的是默认「查看成绩」。
    submitStatus.value = result?.status ?? null
    stopTimers()
    // 不再弹「已成功交卷」模态框：提示条已经写了同一句话，弹窗只是重复，
    // 而且它会盖住提示条里的「查看结果」按钮（DER-31 实测发现），学员得先关弹窗才能点。
    // 失败时仍保留模态提示——错误信息需要打断，且此时没有结果入口可点。
    // silent 参数保留给自动交卷/强制交卷：将来若补静默提示可在此分支加，不影响主流程。

    // 考后签名（DER-31 遗留项）：只在**主动交卷**且配置开启时弹。
    // 自动/强制交卷不弹：学员可能不在屏前，弹了也只是静默停在原地，
    // 反而把页面卡在一个他不知道为什么出现的弹窗上。
    if (!silent && needPostSign.value && !postSigned.value) {
      postSignVisible.value = true
    }
  } catch (e) {
    if (!silent) {
      // 后端 40054 会说明具体原因（答题时间不足 / 还有 N 道题未做），原样展示
      const text = e instanceof Error ? e.message : '交卷失败，请重试'
      await ElMessageBox.alert(text, '交卷失败', { confirmButtonText: '知道了' }).catch(
        () => undefined
      )
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 交卷上报的用时（秒）。
 *
 * <p>以心跳返回的 `usedSeconds` 为基准，加上「距上次心跳的本地增量」：
 * 只报心跳值会漏掉最多 30s，只用本地估算则会因休眠/改时而偏。两者结合误差不超过 1s。
 */
const currentUsedSeconds = () => {
  const drift = Math.max(0, Math.round((Date.now() - usedSecondsAtMs.value) / 1000))
  return usedSeconds.value + drift
}

const onExit = async () => {
  await flushPending()
  try {
    await ElMessageBox.confirm(
      submitted.value ? '确认退出本场考试？' : '当前考试未交卷，是否确定退出？',
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  router.back()
}

/** 倒计时到 0 自动交卷一次，不重复触发 */
let autoSubmitted = false
const startTimers = () => {
  stopTimers()
  tickTimer = setInterval(() => {
    tick.value += 1
    if (deadlineAtMs.value === null || submitted.value) return
    const remain = remainingSeconds(deadlineAtMs.value, Date.now() + serverOffset.value)
    if (remain !== null && remain <= 0 && !autoSubmitted) {
      autoSubmitted = true
      void doSubmit(2, false)
    }
  }, 1000)
  heartbeatTimer = setInterval(() => void heartbeat(), 30_000)
}

const stopTimers = () => {
  if (tickTimer) clearInterval(tickTimer)
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  tickTimer = null
  heartbeatTimer = null
}

/** 切屏检测：页面隐藏时上报（契约 04 §11.10 anti-cheat） */
const onVisibility = () => {
  if (document.visibilityState === 'hidden') reportScreenSwitch('screen.hidden')
}

/**
 * 一页平铺模式下，当前题由**滚动位置**决定（原平台答题卡「当前」会随滚动跟着走）。
 *
 * <p>用 IntersectionObserver 而不是 scroll 事件：滚动事件每秒几十次，
 * 每次都算所有题的 getBoundingClientRect 会在 10 题卷上就出现掉帧；
 * observer 只在题块进出视口时回调。取「已进入视口的题里最靠上的那题」作当前题。
 */
let observer: IntersectionObserver | null = null
const visibleSet = new Set<string>()

const setupObserver = () => {
  observer?.disconnect()
  visibleSet.clear()
  if (layout.value !== 'single') return
  if (typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const quesId = (entry.target as HTMLElement).dataset.quesId
        if (!quesId) continue
        if (entry.isIntersecting) visibleSet.add(quesId)
        else visibleSet.delete(quesId)
      }
      // 按全卷顺序取第一个可见题，避免跳到卷末后「当前」还停在上面
      const firstVisible = flats.value.find((q) => visibleSet.has(q.quesId))
      if (firstVisible) index.value = flats.value.indexOf(firstVisible)
    },
    // 顶部条 44px 会盖住题块顶部，rootMargin 让判定基准下移，避免第一题永远「未进入」
    { rootMargin: '-56px 0px -60% 0px', threshold: 0 }
  )

  for (const q of flats.value) {
    const el = document.getElementById(`q-${q.quesId}`)
    if (el) {
      el.dataset.quesId = q.quesId
      observer.observe(el)
    }
  }
}

onMounted(async () => {
  await load()
  document.addEventListener('visibilitychange', onVisibility)
  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  stopTimers()
  observer?.disconnect()
  observer = null
  document.removeEventListener('visibilitychange', onVisibility)
  for (const timer of saveTimers.values()) clearTimeout(timer)
  saveTimers.clear()
})
</script>

<style scoped lang="scss">
/* 尺寸全部为原平台截图实测值（比例已用 ph16=16px 与 282px 卡宽双重校验） */
$primary: #436bff;
$danger: #f5222d;
$text: #262626;
$text-sub: #8c8c8c;

.attempt-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40px;
}

.attempt-top {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e9e9e9;
}

.attempt-top__exit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #595959;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;

  &:hover {
    color: $primary;
  }

  &:focus-visible {
    outline: 2px solid $primary;
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.attempt-body {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  /* 内容列 894 + 间距 24 + 答题卡 282 = 1200，与原平台实测横向跨度一致 */
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 16px 0;
}

.attempt-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  /* 块间距 16px：实测信息卡 60..176、题目卡 192..481，间隔 16 */
  gap: 16px;
}

.exam-info {
  padding: 20px 24px;
  background: #fff;
  border-radius: 4px;
  text-align: center;
}

.exam-info__name {
  margin: 0 0 16px;
  font-size: 20px;
  line-height: 28px;
  font-weight: 500;
  color: $text;
}

.exam-info__row {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.exam-info__lbl {
  color: $text-sub;
  margin-right: 8px;

  /* 组间要拉开：原平台同一行里「考生 管理员（admin）  工号 --  部门 X」 */
  &:not(:first-child) {
    margin-left: 24px;
  }
}

.exam-info__val {
  color: $text;
}

.exam-info__paren {
  color: $text;
}

.attempt-submitted-tip {
  margin: 0;

  /* 提示文字与「查看结果」按钮同一行：交卷后学员视线本就落在这条提示上，
     把按钮放在里面比另起一行少一次寻找，也不改变「页面不跳转」的语义。 */
  :deep(.el-alert__title) {
    width: 100%;
  }
}

.submitted-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.submitted-result-btn {
  flex: none;
}

.exam-card {
  padding: 16px 24px 24px;
  background: #fff;
  border-radius: 4px;
}

.exam-card--paged {
  padding-bottom: 16px;
}

.sec-head {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 0 0 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9e9e9;
  font-size: 14px;
  font-weight: 500;
  color: $text;
}

.sec-head__meta {
  font-size: 12px;
  font-weight: 400;
  color: $text-sub;
}

.sec-body {
  padding-top: 16px;
}

.q {
  padding-top: 24px;

  &:first-child {
    padding-top: 16px;
  }
}

.q--sub {
  padding-top: 16px;
}

.q__head {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 14px;
  line-height: 22px;
  color: $text;
}

.q__index {
  flex: 0 0 auto;
  min-width: 20px;
}

.q__stem {
  flex: 1 1 auto;
  min-width: 0;
  word-break: break-word;
}

.q__score {
  flex: 0 0 auto;
  color: $text-sub;
}

/* 标记按钮：原平台题号行右端是灰色旗形图标（实测 1198..1211 / 14px 见方） */
.q__flag {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -1px 0 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #bfbfbf;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: $danger;
  }

  &:focus-visible {
    outline: 2px solid $primary;
    outline-offset: 1px;
    border-radius: 2px;
  }

  &.is-on {
    color: $danger;
  }

  /* 已交卷：标记不再可点，视觉上也要退掉，否则学员会以为是按钮坏了 */
  &:disabled {
    color: #d9d9d9;
    cursor: not-allowed;

    &.is-on {
      color: #ffa39e;
    }
  }
}

.q__sync {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 22px;

  &.is-saving {
    color: $text-sub;
  }

  &.is-error {
    color: $danger;
  }
}

.q-combo__stem {
  padding-top: 16px;
  font-size: 14px;
  line-height: 22px;
  color: $text;
  word-break: break-word;
}

.q-parent {
  padding-top: 16px;
  font-size: 14px;
  line-height: 22px;
  color: $text;
}

/* 单题分页底部按钮条：居中，与契约「底部居中上一题/下一题」一致 */
.pager {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e9e9e9;
}

@media (max-width: 1180px) {
  .attempt-body {
    flex-direction: column;
  }
}
</style>
