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
              <span class="dm-prepare__avatar">{{ userInitial }}</span>
              <span class="dm-prepare__role-name">{{ userRoleName || '学员' }}</span>
            </div>
            <p class="dm-prepare__role-desc">{{ userRoleDesc || '本次练习中的你' }}</p>
          </div>
          <div class="dm-prepare__role dm-prepare__role--ai">
            <h3>AI 演员角色</h3>
            <div class="dm-prepare__role-head">
              <!-- U2（设计 §9.1）：AI 演员形象，无图 / 加载失败时组件内部自动回退首字圆形占位 -->
              <ActorAvatar
                class="dm-prepare__avatar dm-prepare__avatar--ai"
                :src="actorAvatarSrc"
                :name="actorName"
              />
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
            <!--
              U1（设计 §9.1）：运行时主区形象。有图 → 168px 圆形 cover 裁切；无图或加载失败
              （404 / URL 过期）→ 组件内部回退「角色名首字」，绝不出现破图图标。
            -->
            <ActorAvatar :src="actorAvatarSrc" :name="actorName" />
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
            <!--
              R10-1 录音识别语言：语义是「这段录音交给语音识别按哪个语种听」，
              与 AI 演员说什么话无关（不要理解成切换 AI 回复语言）。
              原平台默认「混合」，点开可切中文/英文。
            -->
            <div ref="langBox" class="dm-run__lang">
              <div
                class="dm-run__mode"
                :class="{ 'is-open': langMenuOpen }"
                role="button"
                tabindex="0"
                :aria-label="`录音识别语言：${asrLangLabel}`"
                aria-haspopup="menu"
                :aria-expanded="langMenuOpen"
                @click="toggleLangMenu"
                @keydown.enter.prevent="toggleLangMenu"
                @keydown.space.prevent="toggleLangMenu"
              >
                <svg
                  class="dm-run__mode-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="M3.2 12h17.6M12 3c2.4 2.4 3.7 5.6 3.7 9s-1.3 6.6-3.7 9M12 3c-2.4 2.4-3.7 5.6-3.7 9s1.3 6.6 3.7 9"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
                <span>{{ asrLangLabel }}</span>
                <span class="dm-run__mode-caret" aria-hidden="true">⌄</span>
              </div>
              <div
                v-show="langMenuOpen"
                class="dm-run__lang-menu"
                role="menu"
                aria-label="录音识别语言"
              >
                <button
                  v-for="item in ASR_LANG_OPTIONS"
                  :key="item.key"
                  type="button"
                  role="menuitemradio"
                  class="dm-run__lang-option"
                  :class="{ 'is-active': item.key === asrLang }"
                  :aria-checked="item.key === asrLang ? 'true' : 'false'"
                  @click="selectAsrLang(item.key)"
                >
                  <span class="dm-run__lang-option-label">{{ item.label }}</span>
                  <span class="dm-run__lang-option-hint">{{ item.hint }}</span>
                  <span
                    v-if="item.key === asrLang"
                    class="dm-run__lang-option-check"
                    aria-hidden="true"
                    >✓</span
                  >
                </button>
              </div>
              <!-- 首次进运行态提示一次：只解释识别语种，不涉及 AI 回复语言 -->
              <div v-if="langTipOpen" class="dm-run__lang-tip" role="note">
                <p>已默认「{{ asrLangLabel }}」识别，中英粤都能听懂，点此可切换语种。</p>
                <button type="button" class="dm-run__lang-tip-btn" @click="langTipOpen = false">
                  我知道了
                </button>
              </div>
            </div>
            <button
              type="button"
              class="dm-run__tools-btn"
              :class="{ 'is-active': asideView === 'chat' }"
              aria-label="聊天记录"
              title="聊天记录"
              :aria-pressed="asideView === 'chat' ? 'true' : 'false'"
              @click="showChat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 5.5h16v10H9l-4 3v-3H4z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="dm-run__tools-btn"
              :class="{ 'is-active': asideView === 'intro' }"
              aria-label="场景介绍"
              title="场景介绍"
              :aria-pressed="asideView === 'intro' ? 'true' : 'false'"
              @click="showIntro"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
                <path
                  d="M12 7.6v5.2"
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

      <!--
        R6-4/R6-5/R6-6：右侧 aside 是「聊天记录 / 场景介绍」共用的同一个面板。
        asideView 决定渲染哪一屏，两个工具条按钮各自打开对应视图；
        关闭只隐藏面板（asideOpen=false），不丢当前视图，再次点开保持原位。
      -->
      <aside v-show="asideOpen" class="dm-run__aside">
        <div class="dm-run__aside-head">
          <span class="dm-run__aside-title">{{ asideTitle }}</span>
          <button
            type="button"
            class="dm-run__aside-close"
            aria-label="收起右侧面板"
            title="收起"
            @click="asideOpen = false"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- ===== 聊天记录（R6-5）：完整对话历史，不止当前可见的 40 条 ===== -->
        <div v-if="asideView === 'chat'" class="dm-run__aside-body dm-run__aside-body--chat">
          <div class="dm-run__chat-meta">
            <span>共 {{ chatTranscript.length }} 条 · 对话 {{ currentRound }} 轮</span>
            <button
              v-if="chatTranscript.length"
              type="button"
              class="dm-run__chat-copy"
              aria-label="复制聊天记录"
              title="复制聊天记录"
              @click="copyTranscript"
            >
              复制
            </button>
          </div>
          <div v-if="!chatTranscript.length" class="dm-run__chat-empty">
            本轮练习还没有对话内容。AI 演员开口后，这里会按时间顺序列出完整记录。
          </div>
          <div
            v-for="item in chatTranscript"
            :key="item.key"
            class="dm-run__chat-row"
            :class="`is-${item.role}`"
          >
            <div class="dm-run__chat-row-head">
              <span class="dm-run__chat-who">{{ item.who }}</span>
              <span v-if="item.role === 'coach'" class="dm-run__chat-tag">教练点评</span>
            </div>
            <div class="dm-run__chat-text">{{ item.text }}</div>
          </div>
        </div>

        <!-- ===== 场景介绍 = 背景介绍（R6-1/R6-6，与练习准备页同源） ===== -->
        <div v-else class="dm-run__aside-body">
          <h2 class="dm-run__aside-scenario">{{ scenarioName || '本次练习场景' }}</h2>

          <section class="dm-run__aside-section">
            <div class="dm-run__aside-section-title">
              <span class="dm-run__aside-badge">1</span>
              <span>角色介绍</span>
            </div>
            <!-- R6-1：原平台角色介绍比"姓名（身份）"更细，需要身份/年龄段/描述分行展示 -->
            <div class="dm-run__role-card">
              <span class="dm-run__role-tag">你的角色</span>
              <div class="dm-run__role-line">
                <span class="dm-run__role-avatar">{{ userInitial }}</span>
                <span class="dm-run__role-name">{{ userRoleName || '学员' }}</span>
              </div>
              <dl class="dm-run__role-fields">
                <div v-if="userRoleIdentity" class="dm-run__role-field">
                  <dt>身份</dt>
                  <dd>{{ userRoleIdentity }}</dd>
                </div>
                <div v-if="userRoleAge" class="dm-run__role-field">
                  <dt>年龄段</dt>
                  <dd>{{ userRoleAge }}</dd>
                </div>
                <div v-if="userRoleProfile" class="dm-run__role-field dm-run__role-field--block">
                  <dd>{{ userRoleProfile }}</dd>
                </div>
              </dl>
            </div>
            <div class="dm-run__role-card">
              <span class="dm-run__role-tag">AI扮演角色</span>
              <div class="dm-run__role-line">
                <ActorAvatar
                  class="dm-run__role-avatar dm-run__role-avatar--ai"
                  :src="actorAvatarSrc"
                  :name="actorName"
                />
                <span class="dm-run__role-name">{{ actorName || '对练对象' }}</span>
              </div>
              <dl class="dm-run__role-fields">
                <div v-if="actorIdentity" class="dm-run__role-field">
                  <dt>身份</dt>
                  <dd>{{ actorIdentity }}</dd>
                </div>
                <div v-if="actorCompany" class="dm-run__role-field">
                  <dt>公司</dt>
                  <dd>{{ actorCompany }}</dd>
                </div>
                <div v-if="actorPersonality" class="dm-run__role-field">
                  <dt>性格</dt>
                  <dd>{{ actorPersonality }}</dd>
                </div>
                <div v-if="actorProfile" class="dm-run__role-field dm-run__role-field--block">
                  <dd>{{ actorProfile }}</dd>
                </div>
              </dl>
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
import { finishAttempt, getAttempt, startAttempt, type AttemptResp } from '@/api/actStudent'
import { useDrillSocket } from '@/composables/useDrillSocket'
import { useAntiCheat } from '@/composables/useAntiCheat'
import request, { resolveAssetUrl } from '@/api/request'
import ActorAvatar from './components/ActorAvatar.vue'

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
/** 右侧 aside 内容视图：场景介绍（背景介绍）与聊天记录共用同一块面板（R6-5/R6-6） */
const asideView = ref<'intro' | 'chat'>('intro')
/** 录音识别语言下拉开关（R10-1） */
const langMenuOpen = ref(false)
const langBox = ref<HTMLElement | null>(null)
/** 首次进入运行态时的语种说明气泡（原平台默认展开一次，点「我知道了」关闭） */
const langTipOpen = ref(true)

type AsrLang = 'mixed' | 'zh' | 'en' | 'yue'

/**
 * 录音识别语言候选（R10-1）。
 * 后端口径：SpeechTraining 的 ASR 是豆包单模型多语种，language 只做日志比对/质检，
 * 传 'mandarin' 与 'mixed' 识别结果一致；这里给用户的是「识别语种」而非 AI 回复语言。
 */
const ASR_LANG_OPTIONS: Array<{
  key: AsrLang
  label: string
  hint: string
  apiValue: string | null
}> = [
  { key: 'mixed', label: '混合', hint: '中英粤都能听懂（默认）', apiValue: null },
  { key: 'zh', label: '中文', hint: '普通话为主', apiValue: 'mandarin' },
  { key: 'yue', label: '粤语', hint: '粤语为主', apiValue: 'cantonese' },
  { key: 'en', label: '英文', hint: '英文为主', apiValue: 'en' },
]
const asrLang = ref<AsrLang>('mixed')

// ==== 下拉面板的点击外部收起（不额外接管 Esc，避免与输入框快捷键冲突） ====
function onDocPointerDown(event: MouseEvent) {
  if (!langMenuOpen.value) return
  const box = langBox.value
  if (box && event.target instanceof Node && box.contains(event.target)) return
  langMenuOpen.value = false
}

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
const guidanceList = computed(() =>
  (attempt.value?.behaviorGuidance ?? []).filter(Boolean).slice(0, 8),
)
const dimensions = computed(() => attempt.value?.dimensions ?? [])
const passScore = computed(() => attempt.value?.passScore ?? null)
const targetProgress = computed(() => attempt.value?.targetProgress ?? 0)
const currentRound = computed(() => attempt.value?.currentRound ?? 0)
const totalDuration = computed(() => attempt.value?.maxDurationSeconds || 1200)
const durationMinutes = computed(() => Math.round(totalDuration.value / 60))
const actorInitial = computed(() => (actorName.value ? actorName.value.slice(0, 1) : 'AI'))
/**
 * AI 演员形象图地址（设计 §9.1 数据通路）：后端下发 `/avatar/m-A3-04.webp` 这类相对路径，
 * 必须经 resolveAssetUrl 补 `/api` 前缀才能过网关；空值统一成空串，交给 ActorAvatar 走首字兜底。
 */
const actorAvatarSrc = computed(() => resolveAssetUrl(attempt.value?.actorAvatarUrl))
const userInitial = computed(() => (userRoleName.value ? userRoleName.value.slice(0, 1) : '学'))
/** 只显示对话内容，教练点评单独呈现（气泡样式不同） */
const visibleMessages = computed(() => messages.value.slice(-40))

// ==== R6-1 背景介绍「角色介绍」细化 ====
/*
 * 原平台角色卡是「姓名 + 身份 + 年龄段 + 描述」，AI 侧还有「公司 + 性格 + 详细背景长文」。
 * 后端 AttemptResp 现在只下发两个摘要串（userRoleDesc = 身份，actorDesc = 身份＋沟通风格），
 * 所以这里分两层取值：
 *   1. 若后端扩了细分字段（下面 RoleDetail 的可选字段），优先用结构化值；
 *   2. 否则从摘要串按中文顿号/逗号拆出「身份」「性格」，拆不出就整块不渲染，
 *      不猜内容、不把 businessBackground 顶替成人物背景（那会让两个分区重复同一段话）。
 * 缺的年龄段/公司/长文在交付说明里标为「需后端 AttemptResp 扩字段」，前端不做补写。
 */
type RoleDetail = AttemptResp & {
  userRoleIdentity?: string | null
  userRoleAge?: string | null
  userRoleBackground?: string | null
  actorIdentity?: string | null
  actorAge?: string | null
  actorCompany?: string | null
  actorPersonality?: string | null
  actorBackground?: string | null
}

const detail = computed<RoleDetail | null>(() => attempt.value as RoleDetail | null)

/** 摘要串按中文逗号/顿号/分号拆段（后端 actorDesc 的拼法是「身份，沟通风格」） */
function splitSummary(text: string): string[] {
  return text
    .split(/[，,、；;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const actorParts = computed(() => splitSummary(actorDesc.value))
const userParts = computed(() => splitSummary(userRoleDesc.value))

const userRoleIdentity = computed(() => detail.value?.userRoleIdentity || userParts.value[0] || '')
const userRoleAge = computed(() => detail.value?.userRoleAge || '')
const userRoleProfile = computed(
  () => detail.value?.userRoleBackground || userParts.value.slice(1).join('，'),
)

const actorIdentity = computed(() => detail.value?.actorIdentity || actorParts.value[0] || '')
const actorCompany = computed(() => detail.value?.actorCompany || '')
const actorPersonality = computed(
  () => detail.value?.actorPersonality || actorParts.value.slice(1).join('，'),
)
const actorProfile = computed(() => detail.value?.actorBackground || '')

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

// ==== R6-4 / R6-5 / R6-6：右侧面板视图切换 ====
const asideTitle = computed(() => (asideView.value === 'chat' ? '聊天记录' : '背景介绍'))

/** 打开聊天记录视图（已在该视图时再点一次 = 收起面板，交互与原平台工具条一致） */
function showChat() {
  if (asideOpen.value && asideView.value === 'chat') {
    asideOpen.value = false
    return
  }
  asideView.value = 'chat'
  asideOpen.value = true
}

/** 打开场景介绍视图（与 R6-1 同源，就是背景介绍面板本身） */
function showIntro() {
  if (asideOpen.value && asideView.value === 'intro') {
    asideOpen.value = false
    return
  }
  asideView.value = 'intro'
  asideOpen.value = true
}

const chatWho = (role: string) => {
  if (role === 'user') return userRoleName.value || '学员'
  if (role === 'coach') return '教练'
  return actorName.value || 'AI 演员'
}

/**
 * 聊天记录面板数据（R6-5）。
 * 不截断：气泡区为了性能只留最近 40 条（visibleMessages），
 * 聊天记录要能回溯整轮，所以直接用 messages 全量。
 */
const chatTranscript = computed(() =>
  messages.value.map((item) => ({
    key: `chat-${item.key}`,
    role: item.role,
    who: chatWho(item.role),
    text: item.text,
  })),
)

/** 复制完整对话（剪贴板不可用时不静默失败，给一次提示） */
async function copyTranscript() {
  const text = chatTranscript.value.map((item) => `${item.who}：${item.text}`).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('聊天记录已复制')
  } catch {
    ElMessage.warning('浏览器不允许访问剪贴板，请手动选择文本复制')
  }
}

// ==== R10-1：录音识别语言 ====
const asrLangLabel = computed(
  () => ASR_LANG_OPTIONS.find((item) => item.key === asrLang.value)?.label ?? '混合',
)
/** 提交给 ASR 接口的 language 参数：混合不传（豆包多语种单模型，缺省即覆盖中英粤） */
const asrLangParam = computed(
  () => ASR_LANG_OPTIONS.find((item) => item.key === asrLang.value)?.apiValue ?? null,
)

function toggleLangMenu() {
  langMenuOpen.value = !langMenuOpen.value
  // 用户主动点了语种入口，说明已经理解提示，顺手收起教学气泡
  langTipOpen.value = false
}

function selectAsrLang(key: AsrLang) {
  asrLang.value = key
  langMenuOpen.value = false
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
    await ElMessageBox.confirm(
      '结束后本轮练习将生成报告，且成绩按未通过计算。确定结束？',
      '结束练习',
      {
        confirmButtonText: '结束练习',
        cancelButtonText: '继续练习',
        type: 'warning',
      },
    )
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
    // R10-1：把当前选中的识别语种带给 ASR；混合时不传，走后端缺省的多语种识别
    const lang = asrLangParam.value
    const result = await request.post<unknown, { text: string }>(
      `/act/student/attempts/${attemptId.value}/voice/transcribe`,
      form,
      lang ? { params: { language: lang } } : undefined,
    )
    if (result.text) draft.value = (draft.value ? draft.value + ' ' : '') + result.text
  } finally {
    transcribing.value = false
    input.value = ''
  }
}

onMounted(async () => {
  document.addEventListener('pointerdown', onDocPointerDown)
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
  document.removeEventListener('pointerdown', onDocPointerDown)
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
    /* AI 侧换成形象图时同样 40px 圆、cover 裁切（U2）；用户侧仍是首字 */
    object-fit: cover;
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

    /* 首字占位与形象图共用同一尺寸/圆框，保证「有图/无图」不改变布局 */
    span,
    img {
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

    /* 1024×1024 方图铺进圆框：cover 裁圆，不拉伸变形（U1） */
    img {
      object-fit: cover;
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

  /* 录音识别语言胶囊：原平台与「对话模式」同尺寸同外形（宽 88 / 高 34 / 圆角 10） */
  &__lang {
    position: relative;
  }

  &__mode {
    gap: 4px;
    min-width: 88px;
    font-weight: 400;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #fff;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid rgba(139, 92, 246, 0.9);
      outline-offset: 2px;
    }

    &.is-open {
      background: rgba(10, 14, 26, 0.6);
    }
  }

  &__mode-icon {
    flex: none;
    color: rgba(255, 255, 255, 0.82);
  }

  &__mode-caret {
    font-size: 12px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.72);
  }

  /* 语种菜单：深色卡片，浮在工具条下方 */
  &__lang-menu {
    position: absolute;
    right: 0;
    top: 42px;
    z-index: 6;
    width: 208px;
    padding: 6px;
    border-radius: 12px;
    background: rgba(16, 20, 34, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }

  &__lang-option {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px 8px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #fff;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    &.is-active {
      background: rgba(99, 102, 241, 0.22);
    }
  }

  &__lang-option-label {
    font-size: 13px;
    font-weight: 700;
    line-height: 20px;
  }

  &__lang-option-hint {
    font-size: 11px;
    line-height: 16px;
    color: rgba(255, 255, 255, 0.55);
  }

  &__lang-option-check {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 12px;
    color: #a78bfa;
  }

  /* 首次进入的说明气泡（原平台同位置的气泡文案：挂在语种胶囊下方并带小尖角） */
  &__lang-tip {
    position: absolute;
    left: -8px;
    top: 44px;
    z-index: 5;
    width: 236px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, #7c3aed, #3b82f6);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);

    /* 指向胶囊的小菱形尖角（纯装饰，读屏忽略） */
    &::before {
      content: '';
      position: absolute;
      left: 48px;
      top: -5px;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: #7c3aed;
      transform: rotate(45deg);
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: #fff;
    }
  }

  &__lang-tip-btn {
    display: block;
    margin: 8px 0 0 auto;
    padding: 4px 12px;
    border: 0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    color: #3b2c9b;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  /* 工具条图标按钮：待机半透明，激活时原平台用紫色填充（聊天记录/场景介绍） */
  &__tools-btn {
    width: 34px;
    height: 34px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: rgba(10, 14, 26, 0.6);
    color: rgba(255, 255, 255, 0.9);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid rgba(139, 92, 246, 0.9);
      outline-offset: 2px;
    }

    &.is-active {
      background: #6366f1;
      border-color: rgba(255, 255, 255, 0.22);
      color: #fff;
    }
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
    /* AI 侧换成形象图时同样 32px 圆、cover 裁切（U3）；用户侧仍是首字 */
    object-fit: cover;
  }

  &__role-avatar--ai {
    background: #7e22ce;
  }

  &__role-name {
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    color: #1d2129;
  }

  /* R6-1：角色卡的细分字段（身份/公司/年龄段/性格/描述） */
  &__role-fields {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__role-field {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;

    dt {
      flex: none;
      width: 52px;
      font-size: 12px;
      line-height: 20px;
      color: #86909c;
    }

    dd {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: #4e5969;
    }
  }

  /* 长文描述不缩进，整行给正文；原平台这段是没有标签的灰字长文 */
  &__role-field--block {
    dt {
      display: none;
    }

    dd {
      font-size: 13px;
      line-height: 21px;
      color: #4e5969;
    }
  }

  /* ===== 聊天记录面板（R6-5） ===== */
  &__aside-body--chat {
    gap: 12px;
  }

  &__chat-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    line-height: 18px;
    color: #86909c;
  }

  &__chat-copy {
    flex: none;
    padding: 2px 10px;
    border: 1px solid #d9dce1;
    border-radius: 6px;
    background: #fff;
    color: #4e5969;
    font-size: 12px;
    line-height: 18px;
    cursor: pointer;

    &:hover {
      border-color: #436bff;
      color: #436bff;
    }

    &:focus-visible {
      outline: 2px solid rgba(67, 107, 255, 0.6);
      outline-offset: 1px;
    }
  }

  &__chat-empty {
    padding: 16px 12px;
    border-radius: 12px;
    background: #f7f8fa;
    font-size: 13px;
    line-height: 21px;
    color: #86909c;
  }

  &__chat-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #f7f8fa;

    &.is-user {
      background: #f0f6ff;
    }

    &.is-coach {
      background: #fff7e6;
      border: 1px solid #ffe7ba;
    }
  }

  &__chat-row-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__chat-who {
    font-size: 12px;
    font-weight: 700;
    line-height: 18px;
    color: #4e5969;
  }

  &__chat-tag {
    padding: 0 6px;
    border-radius: 4px;
    background: #ffe7ba;
    color: #ad6800;
    font-size: 11px;
    line-height: 16px;
  }

  &__chat-text {
    font-size: 13px;
    line-height: 21px;
    color: #1d2129;
    white-space: pre-wrap;
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
