<template>
  <div class="dm-attempt">
    <!-- ===== 准备中：AI 生成四阶段（深色过渡屏） ===== -->
    <div v-if="attempt?.status === 'preparing'" class="dm-prep-dark">
      <div class="dm-prep-dark__card">
        <div class="dm-prep-dark__icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1m-8.6 8.6l-2.1 2.1"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h1 class="dm-prep-dark__title">{{ stageTitle }}</h1>
        <p class="dm-prep-dark__sub">{{ stageSub }}</p>
        <div class="dm-prep-dark__pill">AI 生成演练场景需要一些时间，请耐心等待</div>
        <div class="dm-prep-dark__steps">
          <div
            v-for="(step, index) in prepSteps"
            :key="step.key"
            class="dm-prep-dark__step"
            :class="{ 'is-active': step.active, 'is-done': step.done }"
          >
            <span class="dm-prep-dark__step-name">{{ step.name }}</span>
            <span v-if="step.active" class="dm-prep-dark__step-bar">
              <i :style="{ width: `${percent}%` }" />
            </span>
            <span v-else-if="step.done" class="dm-prep-dark__step-ok">已完成</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 准备完成：练习准备页（浅色，932 内容列） ===== -->
    <div v-else-if="attempt?.status === 'ready'" class="dm-prepare">
      <header class="dm-prepare__top">
        <button class="dm-prepare__back" type="button" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class="dm-prepare__top-main">
          <h1 class="dm-prepare__top-title">练习准备</h1>
          <p class="dm-prepare__top-sub">{{ scenarioName }} · {{ themeName }}</p>
        </div>
      </header>

      <div class="dm-prepare__scroll">
        <section class="dm-prepare__goal">
          <h2>✦ 练习目标</h2>
          <p>{{ businessGoal || '完成本次场景练习，达成对话目标。' }}</p>
        </section>

        <section v-if="guidanceList.length" class="dm-prepare__card">
          <h2>沟通指南</h2>
          <ul class="dm-prepare__guide">
            <li v-for="(item, index) in guidanceList" :key="index">
              <span class="dm-prepare__guide-no">{{ index + 1 }}</span>
              <span class="dm-prepare__guide-text">{{ item }}</span>
            </li>
          </ul>
        </section>

        <section v-if="backgroundText" class="dm-prepare__card">
          <h2>业务背景</h2>
          <p class="dm-prepare__para">{{ backgroundText }}</p>
        </section>

        <section class="dm-prepare__roles">
          <div class="dm-prepare__role dm-prepare__role--me">
            <h3>你的角色</h3>
            <div class="dm-prepare__role-head">
              <span class="dm-prepare__avatar">{{ userRoleName ? userRoleName.slice(0, 1) : '我' }}</span>
              <span class="dm-prepare__role-name">{{ userRoleName || '我' }}</span>
            </div>
            <p class="dm-prepare__role-desc">{{ userRoleDesc || '本次练习中的你' }}</p>
          </div>
          <div class="dm-prepare__role dm-prepare__role--ai">
            <h3>AI 演员角色</h3>
            <div class="dm-prepare__role-head">
              <span class="dm-prepare__avatar dm-prepare__avatar--ai">{{
                actorName ? actorName.slice(0, 1) : 'AI'
              }}</span>
              <span class="dm-prepare__role-name">{{ actorName || '对练对象' }}</span>
            </div>
            <p class="dm-prepare__role-desc">{{ actorDesc || 'AI 扮演的对话对象' }}</p>
            <div v-if="actorDesc" class="dm-prepare__tone">语气与沟通风格：{{ actorDesc }}</div>
          </div>
        </section>

        <section v-if="dimensions.length" class="dm-prepare__card">
          <h2>评估标准</h2>
          <p class="dm-prepare__hint">
            {{
              passScore
                ? `综合得分由以下各维度得分逐项加权求和，最低通过分数 ${passScore} 分`
                : '综合得分由以下各维度得分逐项加权求和'
            }}
          </p>
          <div v-for="dim in dimensions" :key="dim.name ?? ''" class="dm-prepare__dim">
            <span class="dm-prepare__dim-weight">{{ formatWeight(dim.weight) }}</span>
            <span class="dm-prepare__dim-name">{{ dim.name }}</span>
          </div>
        </section>
      </div>

      <footer class="dm-prepare__footer">
        <span class="dm-prepare__limit">⏱ 预计用时 {{ durationMinutes }} 分钟</span>
        <button class="dm-prepare__start" type="button" :disabled="starting" @click="confirmStart">
          {{ starting ? '开始中…' : '开始练习' }}
        </button>
      </footer>
    </div>

    <!-- ===== 对练运行时（深色舞台 + 右侧资料栏） ===== -->
    <div v-else-if="attempt?.status === 'in_progress'" class="dm-run">
      <div class="dm-run__main">
        <div class="dm-run__video">
          <div class="dm-run__actor">
            <span>{{ actorName ? actorName.slice(0, 1) : 'AI' }}</span>
          </div>
          <button class="dm-run__back" type="button" title="结束练习" @click="finish">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div class="dm-run__tools">
            <div class="dm-run__timer">⏱ {{ clock }}</div>
            <div class="dm-run__progress">{{ targetProgress }}%</div>
            <div class="dm-run__mode" @click="toggleAside">混合 ⌄</div>
            <button type="button" title="资料栏" @click="toggleAside">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button type="button" title="帮助" @click="showHelp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
                <path
                  d="M9.5 9.5a2.5 2.5 0 113.4 2.3c-.6.3-.9.8-.9 1.4v.6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="16.6" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div class="dm-run__overlay">
            <div class="dm-run__scene-card">
              <div class="dm-run__scene-label">场景</div>
              <div class="dm-run__scene-text">{{ sceneNarration || '场景信息加载中…' }}</div>
            </div>
            <div ref="bubbleBox" class="dm-run__bubbles">
              <div
                v-for="message in visibleMessages"
                :key="message.key"
                class="dm-run__bubble-row"
                :class="`is-${message.role}`"
              >
                <span class="dm-run__bubble-avatar">{{
                  message.role === 'user' ? userInitial : actorInitial
                }}</span>
                <div class="dm-run__bubble">{{ message.text }}</div>
              </div>
              <div v-if="thinking" class="dm-run__bubble-row is-assistant">
                <span class="dm-run__bubble-avatar">{{ actorInitial }}</span>
                <div class="dm-run__bubble is-thinking">对方正在输入…</div>
              </div>
            </div>
          </div>
        </div>

        <div class="dm-run__input-area">
          <div class="dm-run__input-bar">
            <textarea
              v-model="draft"
              rows="1"
              :disabled="thinking"
              placeholder="AI 正在说话，说完即可作答"
              @keydown.enter.exact.prevent="send"
            />
            <div class="dm-run__input-actions">
              <button type="button" class="dm-run__input-btn" title="结束练习" @click="finish">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="8" y="8" width="8" height="8" rx="1.6" fill="currentColor" />
                </svg>
              </button>
              <div class="dm-run__input-pair">
                <label
                  class="dm-run__input-mic"
                  :class="{ 'is-disabled': transcribing }"
                  title="语音转写"
                >
                  <input
                    type="file"
                    accept=".wav,audio/wav"
                    :disabled="transcribing"
                    @change="transcribeVoice"
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="9"
                      y="3"
                      width="6"
                      height="11"
                      rx="3"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                    <path
                      d="M5 11a7 7 0 0014 0M12 18v3"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </label>
                <button type="button" class="dm-run__input-mic" title="发送" @click="send">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 19V5m0 0l-6 6m6-6l6 6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="dm-run__footnote">内容由AI生成</div>
        </div>
      </div>

      <aside v-show="asideOpen" class="dm-run__aside">
        <div class="dm-run__aside-head">
          <span class="dm-run__aside-title">背景介绍</span>
          <button type="button" class="dm-run__aside-close" @click="asideOpen = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="dm-run__aside-body">
          <h2 class="dm-run__aside-scenario">{{ scenarioName || '本次练习场景' }}</h2>

          <section class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">1</span>
              <span>角色介绍</span>
            </div>
            <div class="dm-run__role-card">
              <span class="dm-run__role-tag">你的角色</span>
              <div class="dm-run__role-line">
                <span class="dm-run__role-avatar">{{ userInitial }}</span>
                <span>{{ userRoleName || '我' }}<template v-if="userRoleDesc">（{{ userRoleDesc }}）</template></span>
              </div>
            </div>
            <div class="dm-run__role-card">
              <span class="dm-run__role-tag">AI扮演角色</span>
              <div class="dm-run__role-line">
                <span class="dm-run__role-avatar dm-run__role-avatar--ai">{{ actorInitial }}</span>
                <span>{{ actorName || '对练对象' }}<template v-if="actorDesc">（{{ actorDesc }}）</template></span>
              </div>
            </div>
          </section>

          <section v-if="backgroundText" class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">2</span>
              <span>业务背景</span>
            </div>
            <p>{{ backgroundText }}</p>
          </section>

          <section v-if="businessGoal" class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">3</span>
              <span>对话目标</span>
            </div>
            <p>{{ businessGoal }}</p>
          </section>

          <section v-if="guidanceList.length" class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">4</span>
              <span>沟通指南</span>
            </div>
            <p v-for="(item, index) in guidanceList" :key="index">{{ index + 1 }}. {{ item }}</p>
          </section>

          <section v-if="dimensions.length" class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">5</span>
              <span>评估标准</span>
            </div>
            <p v-for="dim in dimensions" :key="dim.name ?? ''">
              {{ dim.name }} · {{ formatWeight(dim.weight) }}
            </p>
          </section>

          <section class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">6</span>
              <span>练习进度</span>
            </div>
            <div class="dm-run__progress-row">对话轮次 {{ currentRound }} 轮</div>
            <div class="dm-run__progress-row">剩余时间 {{ clock }} / {{ totalClock }}</div>
            <div class="dm-run__progress-row">目标达成度 {{ targetProgress }}%</div>
            <div class="dm-run__progress-row">
              <span class="dm-run__progress-track">
                <i :style="{ width: `${targetProgress}%` }" />
              </span>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <!-- ===== 报告生成中 / 已结束 ===== -->
    <div v-else-if="attempt" class="dm-done">
      <div class="dm-done__card">
        <h1>{{ attempt.status === 'report_generating' ? '正在生成报告…' : '练习已结束' }}</h1>
        <p v-if="attempt.endReason" class="dm-done__reason">{{ endReasonText }}</p>
        <div class="dm-done__actions">
          <button
            v-if="attempt.status === 'report_generating'"
            type="button"
            class="dm-done__btn"
            @click="pollOnce"
          >
            刷新
          </button>
          <button
            v-if="attempt.status === 'completed'"
            type="button"
            class="dm-done__btn dm-done__btn--primary"
            @click="router.push(`/sparring/web/drillmate/report/${attemptId}`)"
          >
            查看报告
          </button>
          <button
            v-if="['failed', 'cancelled'].includes(attempt.status)"
            type="button"
            class="dm-done__btn"
            @click="goBack"
          >
            返回
          </button>
        </div>
      </div>
    </div>

    <div v-if="fatalError" class="dm-attempt__error">{{ fatalError }}</div>
  </div>
</template>

<script setup lang="ts">
// 对练运行时（契约 02 §5.5/§5.6，视觉契约 visual/contracts/drillmate-runtime.json）：
// 状态分屏 + WS 一轮链路 + 本地倒计时平滑显示；DOM/样式对齐原平台实测值（1524x727）。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  finishAttempt,
  getAttempt,
  startAttempt,
  type AttemptResp,
} from '@/api/actStudent'
import { useDrillSocket } from '@/composables/useDrillSocket'
import { useAntiCheat } from '@/composables/useAntiCheat'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()
const attemptId = computed(() => String(route.params.attemptId))

const attempt = ref<AttemptResp | null>(null)
const messages = ref<Array<{ key: string; role: string; text: string }>>([])
const draft = ref('')
const thinking = ref(false)
const starting = ref(false)
const fatalError = ref('')
const remainingSeconds = ref(0)
const bubbleBox = ref<HTMLElement | null>(null)
const asideOpen = ref(true)

let pollTimer: number | null = null
let clockTimer: number | null = null

// ==== 只读上下文（后端从 attempt 冻结快照裁出） ====
const themeName = computed(() => attempt.value?.themeName ?? '')
const scenarioName = computed(() => attempt.value?.scenarioName ?? '')
const sceneNarration = computed(() => attempt.value?.sceneNarration ?? '')
const backgroundText = computed(() => attempt.value?.businessBackground ?? '')
const businessGoal = computed(() => attempt.value?.businessGoal ?? '')
const actorName = computed(() => attempt.value?.actorName ?? '')
const actorDesc = computed(() => attempt.value?.actorDesc ?? '')
const userRoleName = computed(() => attempt.value?.userRoleName ?? '')
const userRoleDesc = computed(() => attempt.value?.userRoleDesc ?? '')
const guidanceList = computed(() => (attempt.value?.behaviorGuidance ?? []).filter(Boolean).slice(0, 8))
const dimensions = computed(() => attempt.value?.dimensions ?? [])
const passScore = computed(() => attempt.value?.passScore ?? null)
const targetProgress = computed(() => attempt.value?.targetProgress ?? 0)
const currentRound = computed(() => attempt.value?.currentRound ?? 0)
const totalDuration = computed(() => attempt.value?.maxDurationSeconds || 1200)
const durationMinutes = computed(() => Math.round(totalDuration.value / 60))
const actorInitial = computed(() => (actorName.value ? actorName.value.slice(0, 1) : 'AI'))
const userInitial = computed(() => (userRoleName.value ? userRoleName.value.slice(0, 1) : '我'))
/** 只显示对话内容，教练点评单独呈现（气泡样式不同） */
const visibleMessages = computed(() => messages.value.slice(-40))

const percent = computed(() => attempt.value?.preparationPercent ?? 3)

const prepSteps = computed(() => {
  const stage = attempt.value?.preparationStage ?? 'analyze_scene'
  const order = ['analyze_scene', 'build_script', 'build_actor', 'ready']
  const index = Math.max(0, order.indexOf(stage))
  const names = ['分析场景信息', '构建对话剧本', '生成角色身份', '准备就绪']
  return order.map((key, i) => ({
    key,
    name: names[i],
    active: i === index,
    done: i < index,
  }))
})

const stageTitle = computed(() => {
  const stage = attempt.value?.preparationStage ?? 'analyze_scene'
  const map: Record<string, string> = {
    analyze_scene: '分析场景信息',
    build_script: '构建对话剧本',
    build_actor: '生成角色身份',
    ready: '准备就绪',
  }
  return map[stage] ?? '分析场景信息'
})

const stageSub = computed(() => {
  const stage = attempt.value?.preparationStage ?? 'analyze_scene'
  const map: Record<string, string> = {
    analyze_scene: '解析场景需求和学习目标',
    build_script: '生成符合场景的多轮对话走向',
    build_actor: '为对话对象构建身份与性格',
    ready: '即将进入练习',
  }
  return map[stage] ?? '解析场景需求和学习目标'
})

const endReasonText = computed(() => {
  const map: Record<string, string> = {
    timeout: '练习时间已到，系统已自动结束并生成报告',
    manual_exit: '你主动结束了练习',
    target_reached: '练习目标已达成',
    round_limit: '达到最大对话轮次',
    screen_violation: '检测到切屏违规，练习已结束',
    plan_ended: '主题练习期已结束',
    system_error: '系统异常结束',
    system_failed: '系统异常结束',
  }
  return map[attempt.value?.endReason ?? ''] ?? ''
})

const formatWeight = (weight: number | null | undefined) =>
  weight === null || weight === undefined ? '权重 --' : `权重 ${weight}%`

/** 服务端 deadline 平滑倒计时（契约 02 §5.6：前端只做显示，不判定结束） */
const clock = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const totalClock = computed(() => {
  const total = Math.max(0, totalDuration.value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const pushMessage = (role: string, text: string) => {
  messages.value.push({ key: `${role}-${messages.value.length}-${text.slice(0, 8)}`, role, text })
  nextTick(() => bubbleBox.value?.scrollTo({ top: bubbleBox.value.scrollHeight }))
}

const socket = useDrillSocket(attemptId.value, (event, _seq, data) => {
  switch (event) {
    case 'assistant_delta':
      thinking.value = false
      pushMessage('assistant', String(data.delta ?? ''))
      break
    case 'coach_delta':
      if (attempt.value?.studyMode === 1) pushMessage('coach', String(data.delta ?? ''))
      break
    case 'progress':
      if (attempt.value) {
        attempt.value.targetProgress = Number(data.targetProgress ?? 0)
        if (typeof data.remainingSeconds === 'number') {
          remainingSeconds.value = data.remainingSeconds
        }
      }
      break
    case 'turn_finished':
      thinking.value = false
      if (attempt.value && typeof data.turnNo === 'number') {
        attempt.value.currentRound = data.turnNo
      }
      break
    case 'error':
      thinking.value = false
      ElMessage.error(String(data.message ?? '生成失败，请重试'))
      break
    default:
      break
  }
})

// 防作弊：切屏上报在 attempt 进行中才生效（forbid/allow 结算由服务端判定，D21 强制 passed=false）
useAntiCheat(
  attemptId.value,
  {
    enabled: () => attempt.value?.status === 'in_progress',
    faceOngoingEnabled: () => false,
  },
  {
    onViolation: () => {
      ElMessage.warning('检测到切屏违规，练习将由服务端结束')
    },
  },
)

async function pollOnce() {
  const next = await getAttempt(attemptId.value)
  attempt.value = next
  if ((next.status === 'ready' || next.status === 'completed') && pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

async function confirmStart() {
  try {
    await ElMessageBox.confirm(
      `点击确认开始后将立即开始倒计时，到时自动结束并生成报告。\n本次练习限时 ${durationMinutes.value} 分钟，需达成练习目标且综合得分达到最低通过分数 ${passScore.value ?? 60} 分。`,
      '本次练习有时间限制',
      { confirmButtonText: '确认开始', cancelButtonText: '再看看', type: 'warning' },
    )
  } catch {
    return
  }
  await start()
}

async function start() {
  starting.value = true
  try {
    attempt.value = await startAttempt(attemptId.value)
    remainingSeconds.value = computeRemaining(attempt.value)
    seedOpeningLine()
    startClock()
    socket.connect()
  } finally {
    starting.value = false
  }
}

function startClock() {
  if (clockTimer) window.clearInterval(clockTimer)
  clockTimer = window.setInterval(() => {
    if (remainingSeconds.value > 0) remainingSeconds.value--
  }, 1000)
}

async function send() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  pushMessage('user', text)
  thinking.value = true
  // clientMessageId 幂等（服务端 uk_attempt_client_message）
  socket.sendChat(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text)
}

async function finish() {
  try {
    await ElMessageBox.confirm('结束后本轮练习将生成报告，且成绩按未通过计算。确定结束？', '结束练习', {
      confirmButtonText: '结束练习',
      cancelButtonText: '继续练习',
      type: 'warning',
    })
  } catch {
    return
  }
  const next = await finishAttempt(attemptId.value)
  attempt.value = next
  socket.close()
  if (next.status === 'report_generating') {
    pollTimer = window.setInterval(pollOnce, 3000)
  }
}

const goBack = () => router.push('/sparring/web/drillmate')
const toggleAside = () => (asideOpen.value = !asideOpen.value)
const showHelp = () =>
  ElMessage.info('按 Enter 发送，Shift+Enter 换行；随时可点左上角返回结束练习')

/** 语音转写（AC-10）：上传录音 → ASR 文本回填输入框（不自动发送，契约 02 §5.6） */
const transcribing = ref(false)
async function transcribeVoice(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  transcribing.value = true
  try {
    const form = new FormData()
    form.append('audio', file)
    const result = await request.post<unknown, { text: string }>(
      `/act/student/attempts/${attemptId.value}/voice/transcribe`,
      form,
    )
    if (result.text) draft.value = (draft.value ? draft.value + ' ' : '') + result.text
  } finally {
    transcribing.value = false
    input.value = ''
  }
}

onMounted(async () => {
  try {
    attempt.value = await getAttempt(attemptId.value)
  } catch (error) {
    fatalError.value = error instanceof Error ? error.message : '练习加载失败'
    return
  }
  if (attempt.value.status === 'preparing') {
    pollTimer = window.setInterval(pollOnce, 2500)
  } else if (attempt.value.status === 'in_progress') {
    remainingSeconds.value = computeRemaining(attempt.value)
    seedOpeningLine()
    startClock()
    socket.connect()
  } else if (attempt.value.status === 'report_generating') {
    pollTimer = window.setInterval(pollOnce, 3000)
  }
})

/**
 * 进入运行态先呈现 AI 的开场白（脚本快照里的 scene.openingLine / scriptOpening）。
 * 不造文案：快照没存就不显示，等 WS 的 assistant_delta 到达再出现。
 */
function seedOpeningLine() {
  if (messages.value.length) return
  const opening = attempt.value?.openingLine
  if (opening && opening.trim()) pushMessage('assistant', opening.trim())
}

function computeRemaining(value: AttemptResp): number {
  if (!value.deadlineAt) return value.maxDurationSeconds || 1200
  const deadline = new Date(value.deadlineAt.replace(' ', 'T')).getTime()
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000))
}

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  if (clockTimer) window.clearInterval(clockTimer)
  socket.close()
})
</script>

<style scoped lang="scss">
$run-bg: #12141d;
$run-panel: rgba(13, 17, 30, 0.82);

.dm-attempt {
  position: relative;
  width: 100%;
  min-height: 100vh;
}

.dm-attempt__error {
  position: fixed;
  left: 50%;
  top: 24px;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 8px;
  background: #fff1f0;
  color: #cf1322;
  font-size: 14px;
  z-index: 30;
}

/* ===== 准备中（深色过渡屏） ===== */
.dm-prep-dark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at 50% 30%, #1b1f38 0%, #0c1020 60%);
  color: #fff;

  &__card {
    width: 560px;
    padding: 40px;
    text-align: center;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.18);
    color: #a78bfa;
  }

  &__title {
    margin: 20px 0 0;
    font-size: 22px;
    font-weight: 700;
    line-height: 32px;
  }

  &__sub {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: rgba(255, 255, 255, 0.65);
  }

  &__pill {
    display: inline-block;
    margin-top: 20px;
    padding: 6px 16px;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.14);
    color: #c4b5fd;
    font-size: 13px;
  }

  &__steps {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__step {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    font-size: 14px;
    color: rgba(255, 255, 255, 0.62);

    &.is-active {
      background: rgba(99, 102, 241, 0.18);
      color: #fff;
    }

    &.is-done {
      color: rgba(255, 255, 255, 0.42);
    }
  }

  &__step-bar {
    width: 120px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      background: #8b5cf6;
    }
  }

  &__step-ok {
    font-size: 12px;
    color: #34d399;
  }
}

/* ===== 练习准备页（浅色） ===== */
.dm-prepare {
  min-height: 100vh;
  background: #f5f5f7;
  color: #333;
  padding-bottom: 108px;

  &__top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 108px;
    background: #fff;
    border-bottom: 1px solid #e9e9e9;
  }

  &__back {
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    background: #f5f5f5;
    color: #595959;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  &__top-main {
    text-align: center;
  }

  &__top-title {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    line-height: 24px;
    color: #262626;
  }

  &__top-sub {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 20px;
    color: #8c8c8c;
  }

  &__scroll {
    width: 932px;
    max-width: 100%;
    margin: 0 auto;
    padding: 24px 0 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__goal {
    padding: 24px;
    border-radius: 12px;
    background: #f0f6ff;

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      line-height: 24px;
      color: #2e4dd9;
    }

    p {
      margin: 12px 0 0;
      font-size: 15px;
      line-height: 24px;
      color: #595959;
    }
  }

  &__card {
    padding: 24px;
    border-radius: 12px;
    background: #fff;

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      line-height: 24px;
      color: #262626;
    }
  }

  &__guide {
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;

    li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
  }

  &__guide-no {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    border-radius: 6px;
    background: #e8f0ff;
    color: #436bff;
    font-size: 12px;
    font-weight: 700;
  }

  &__guide-text {
    font-size: 15px;
    line-height: 24px;
    color: #595959;
  }

  &__para {
    margin: 12px 0 0;
    font-size: 15px;
    line-height: 24px;
    color: #595959;
  }

  &__roles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  &__role {
    padding: 24px;
    border-radius: 12px;

    h3 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 800;
      line-height: 24px;
    }
  }

  &__role--me {
    background: #f0f6ff;

    h3 {
      color: #2e4dd9;
    }
  }

  &__role--ai {
    background: #faf5ff;

    h3 {
      color: #7e22ce;
    }
  }

  &__role-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #436bff;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
  }

  &__avatar--ai {
    background: #7e22ce;
  }

  &__role-name {
    font-size: 16px;
    font-weight: 800;
    line-height: 24px;
    color: #262626;
  }

  &__role-desc {
    margin: 12px 0 0;
    font-size: 15px;
    line-height: 24px;
    color: #595959;
  }

  &__tone {
    margin-top: 12px;
    padding: 6px 12px;
    border-radius: 6px;
    background: #eadcff;
    color: #7e22ce;
    font-size: 13px;
    font-weight: 500;
    line-height: 22px;
  }

  &__hint {
    margin: 12px 0 16px;
    font-size: 14px;
    line-height: 22px;
    color: #86909c;
  }

  &__dim {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 0;
  }

  &__dim-weight {
    flex: none;
    width: 64px;
    font-size: 13px;
    color: #8c8c8c;
  }

  &__dim-name {
    font-size: 16px;
    font-weight: 800;
    color: #262626;
  }

  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 108px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #fff;
    border-top: 1px solid #e9e9e9;
  }

  &__limit {
    font-size: 14px;
    line-height: 22px;
    color: #595959;
  }

  &__start {
    width: 932px;
    max-width: calc(100% - 32px);
    height: 48px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(90deg, #436bff, #8b5cf6);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}

/* ===== 对练运行时 ===== */
.dm-run {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 100vh;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  background: $run-bg;
  color: #fff;

  &__main {
    display: flex;
    flex: 1;
    min-width: 0;
    height: 100%;
    flex-direction: column;
    gap: 8px;
  }

  &__video {
    position: relative;
    flex: 1;
    min-height: 0;
    border-radius: 16px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 40%, #2b3350 0%, #10131f 72%);
  }

  &__actor {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 168px;
      height: 168px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.72);
      font-size: 64px;
      font-weight: 700;
    }
  }

  &__back {
    position: absolute;
    left: 14px;
    top: 14px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: rgba(10, 14, 26, 0.55);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 3;
  }

  &__tools {
    position: absolute;
    right: 125px;
    top: 14px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__timer,
  &__progress,
  &__mode {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    font-size: 13px;
    white-space: nowrap;
  }

  &__timer {
    font-weight: 800;
    background: rgba(10, 14, 26, 0.55);
  }

  &__progress {
    min-width: 67px;
    font-weight: 800;
    background: rgba(10, 14, 26, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  &__mode {
    min-width: 88px;
    font-weight: 400;
    background: transparent;
    cursor: pointer;
  }

  &__tools > button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 10px;
    background: rgba(10, 14, 26, 0.6);
    color: rgba(255, 255, 255, 0.9);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  &__overlay {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    transform: translateX(-50%);
    width: 800px;
    display: flex;
    flex-direction: column;
    z-index: 2;
  }

  &__scene-card {
    margin-top: 56px;
    padding: 12px 16px;
    border-radius: 12px;
    background: $run-panel;
  }

  &__scene-label {
    font-size: 13px;
    font-weight: 900;
    line-height: 20px;
    color: #fbbf24;
  }

  &__scene-text {
    margin-top: 6px;
    font-size: 13px;
    line-height: 23px;
    color: rgba(255, 255, 255, 0.9);
  }

  &__bubbles {
    margin-top: auto;
    padding: 48px 4px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 62%;
    overflow-y: auto;
  }

  &__bubble-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;

    &.is-user {
      flex-direction: row-reverse;
    }
  }

  &__bubble-avatar {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.86);
    font-size: 13px;
    font-weight: 700;
  }

  &__bubble {
    flex-shrink: 0;
    max-width: 748px;
    padding: 11px 14px;
    border-radius: 4px 14px 14px;
    background: rgba(13, 17, 30, 0.7);
    font-size: 13px;
    line-height: 20px;
    color: #fff;
    white-space: pre-wrap;

    &.is-thinking {
      color: rgba(255, 255, 255, 0.6);
    }
  }

  &__bubble-row.is-user &__bubble {
    background: rgba(67, 107, 255, 0.72);
    border-radius: 14px 4px 14px 14px;
  }

  &__bubble-row.is-coach &__bubble {
    background: rgba(250, 140, 22, 0.18);
    border: 1px solid rgba(250, 140, 22, 0.4);
    color: #ffd591;
  }

  &__input-area {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__input-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);

    textarea {
      width: calc(100% - 2px);
      height: 24px;
      padding: 0;
      border: 0;
      outline: none;
      resize: none;
      overflow-y: auto;
      background: transparent;
      color: #f3f4f6;
      font-family: inherit;
      font-size: 15px;
      line-height: 24px;

      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
    }
  }

  &__input-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 38px;
  }

  &__input-pair {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__input-btn,
  &__input-mic {
    position: relative;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.85);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    input[type='file'] {
      display: none;
    }

    &.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__footnote {
    height: 18px;
    text-align: center;
    font-size: 12px;
    line-height: 18px;
    color: rgba(255, 255, 255, 0.32);
  }

  &__aside {
    flex: none;
    width: 438px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    background: #fff;
    color: #1d2129;
    overflow: hidden;
  }

  &__aside-head {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 16px;
    border-bottom: 1px solid #f0f1f4;
  }

  &__aside-title {
    font-size: 14px;
    font-weight: 800;
    line-height: 22px;
    color: #1d2129;
  }

  &__aside-close {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #86909c;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  &__aside-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  &__aside-scenario {
    margin: 0;
    font-size: 16px;
    font-weight: 850;
    line-height: 24px;
    color: #1d2129;
  }

  &__aside-section {
    display: flex;
    flex-direction: column;
    gap: 10px;

    > p {
      margin: 0;
      font-size: 14px;
      line-height: 24px;
      color: #4e5969;
    }
  }

  &__aside-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 800;
    line-height: 22px;
    color: #1d2129;
  }

  &__aside-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    background: #3b82f6;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  &__role-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: #f7f8fa;
  }

  &__role-tag {
    font-size: 12px;
    line-height: 18px;
    color: #86909c;
  }

  &__role-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    line-height: 22px;
    color: #1d2129;
  }

  &__role-avatar {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #436bff;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  &__role-avatar--ai {
    background: #7e22ce;
  }

  &__progress-row {
    display: flex;
    align-items: center;
    height: 21px;
    font-size: 14px;
    line-height: 21px;
    color: #4e5969;
  }

  &__progress-track {
    display: block;
    width: 100%;
    height: 5px;
    border-radius: 5px;
    background: #f0f1f4;
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      background: #6366f1;
    }
  }
}

/* ===== 结束/生成中 ===== */
.dm-done {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f7;

  &__card {
    width: 420px;
    padding: 32px;
    border-radius: 12px;
    background: #fff;
    text-align: center;

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #262626;
    }
  }

  &__reason {
    margin: 12px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: #8c8c8c;
  }

  &__actions {
    margin-top: 24px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  &__btn {
    height: 36px;
    padding: 0 20px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
    color: #595959;
    font-size: 14px;
    cursor: pointer;

    &--primary {
      border-color: #436bff;
      background: #436bff;
      color: #fff;
    }
  }
}

@media (max-width: 1240px) {
  .dm-run {
    flex-direction: column;

    &__aside {
      width: 100%;
      max-height: 320px;
    }

    &__overlay {
      width: 100%;
    }

    &__tools {
      right: 14px;
    }
  }

  .dm-prepare__roles {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
