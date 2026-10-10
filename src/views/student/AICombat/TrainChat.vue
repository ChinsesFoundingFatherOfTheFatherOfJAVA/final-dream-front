<template>
  <div class="train-chat">
    <!-- 消息列表 -->
    <div ref="scrollRef" class="message-list">
      <div
        v-for="msg in store.messages"
        :key="msg.messageId || `local-${msg.seq}-${msg.content}`"
        class="message-row"
        :class="msg.role === 2 ? 'student' : 'trainer'"
      >
        <!-- v1.2 旁白消息：微信"撤回了一条消息"式居中灰条，无头像无气泡 -->
        <div v-if="msg.role === 3" class="narration-tip">{{ msg.content }}</div>

        <!-- 陪练者消息：左侧头像 + 气泡（形象与训练页左栏同源） -->
        <template v-else-if="msg.role === 1">
          <img class="avatar trainer-avatar" :src="trainerFace(store.trainerAvatar)" alt="" />
          <div class="bubble trainer-bubble">
            <span class="bubble-text">{{ msg.content }}</span>
            <!-- FP-24 语音模式：陪练者气泡 🔊 重播（TTS） -->
            <span
              v-if="isVoiceMode"
              class="audio-icon"
              :class="{ active: !!msg.audioUrl && player.playingUrl.value === audioSrc(msg.audioUrl), loading: ttsLoadingId === msg.messageId }"
              :title="msg.audioUrl ? '点击重播' : '点击播放'"
              @click.stop="onTrainerAudioClick(msg)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>
                <path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </div>
        </template>
        <!-- 学员消息：气泡 + 右侧头像 -->
        <template v-else>
          <div class="bubble student-bubble" :class="{ 'voice-pending': msg === pendingPlaceholder }">
            <span class="bubble-text">{{ msg.content }}</span>
            <!-- FP-24 学员语音气泡 🔊 回放自己的录音 -->
            <span
              v-if="msg.audioUrl"
              class="audio-icon"
              :class="{ active: player.playingUrl.value === audioSrc(msg.audioUrl) }"
              title="点击回放录音"
              @click.stop="player.toggle(audioSrc(msg.audioUrl))"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>
                <path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </div>
          <span class="avatar student-avatar">员</span>
        </template>
      </div>
    </div>

    <!-- 底部输入区 -->
    <div class="input-area">
      <!-- 自动播报被浏览器拦掉时给一句解释，否则用户只会看到"有气泡没声音" -->
      <p v-if="player.blocked.value" class="input-note">
        浏览器已拦截自动播放，点击页面任意处即可听到陪练者播报
      </p>
      <!-- 服务端"没听到内容"：与"没答到点上"分开提示，后者走要点弹窗 -->
      <p v-if="noSpeechNotice" class="input-note">刚才没有听到你的声音，请再说一遍</p>

      <!-- v1.2 双输入：语音对话与文字对话项目都可录音，inputMode 决定当前展示哪种输入方式 -->
      <div v-if="inputMode === 'voice'" class="voice-row">
        <template v-if="recorder.recording.value">
          <!-- 录音中波形动画 + 剩余秒数 + 停止（发送）按钮 -->
          <div class="wave-box" @click="stopAndUpload">
            <span v-for="i in 7" :key="i" class="wave-bar" :style="{ animationDelay: `${(i - 1) * 0.12}s` }"></span>
          </div>
          <span class="record-countdown" :class="{ urgent: remainSec <= 10 }">{{ remainSec }}s</span>
          <button class="round-btn stop-btn" title="停止并发送" @click="stopAndUpload">
            <svg width="12" height="12" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/></svg>
          </button>
        </template>
        <template v-else>
          <span class="voice-hint">{{ voiceHint }}</span>
          <!-- 上传失败的录音留在本地，不必重说一遍 -->
          <button v-if="failedRecording && !store.sending" class="retry-btn" @click="retryUpload">
            重试上传
          </button>
          <!-- 键盘输入：与录音输入互为切换，两种对话方式都可用 -->
          <button class="round-btn ghost-btn" title="切换键盘输入" @click="switchInputMode('text')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/>
              <line x1="7" y1="10" x2="7" y2="10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="10" x2="12" y2="10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="17" y1="10" x2="17" y2="10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <!-- 麦克风按钮：判定中 loading 禁用 -->
          <button
            class="round-btn mic-btn"
            :class="{ loading: store.sending }"
            :disabled="store.sending"
            title="开始录音"
            @click="startRecord"
          >
            <span v-if="store.sending" class="spin-ring"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/>
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="12" y1="17.5" x2="12" y2="21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- v1.0 文字输入区（原样保留，条件渲染） -->
      <div v-else class="input-row">
        <input
          v-model="inputText"
          type="text"
          class="chat-input"
          placeholder="请输入"
          maxlength="2000"
          :disabled="store.sending"
          @keyup.enter="onSend"
        />
        <!-- 切换到录音输入：v1.2 起不再限对话方式 -->
        <button
          class="round-btn mic-inline-btn"
          title="切换语音输入"
          :disabled="store.sending"
          @click="switchInputMode('voice')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/>
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="12" y1="17.5" x2="12" y2="21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <button
          class="send-btn"
          :class="{ disabled: !canSend }"
          :disabled="!canSend"
          @click="onSend"
        >
          {{ store.sending ? '判定中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTts, sendMessage, sendVoiceMessage } from '@/api/student'
import { resolveAssetUrl } from '@/api/request'
import { trainerFace } from './trainerFace'
import { toast } from '@/utils/toast'
import { useTrainingStore } from '@/stores/training'
import { useRecorder } from '@/composables/useRecorder'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import type { SessionMessage } from '@/types/student'

/**
 * 后端音频地址是相对路径（/audio/tts/xx.mp3、/audio/asr/xx.wav），不带 /api 前缀时
 * 浏览器会打给前端自身（Vite / Nginx 未代理该路径）而 404，故统一补全为网关地址。
 */
const audioSrc = (url?: string | null) => resolveAssetUrl(url)

const emit = defineEmits<{ tip: [keyPoints: string[]] }>()

const router = useRouter()
const store = useTrainingStore()
const inputText = ref('')
const scrollRef = ref<HTMLElement>()

const canSend = computed(() => inputText.value.trim().length > 0 && !store.sending)

/** FP-24 语音模式：dialogueMode=0（语音对话）项目启用陪练者 TTS 播报；v1.2 起不再限制学员输入方式 */
const isVoiceMode = computed(() => store.dialogueMode === 0)

// ===== 语音输入（v1.1，v1.2 双输入改造） =====
/** 输入方式：voice=录音 / text=键盘；两种对话方式下都可切换 */
const inputMode = ref<'voice' | 'text'>('text')
/** 用户手动切换过输入方式后，不再被 dialogueMode 的异步加载结果覆盖 */
const inputModeTouched = ref(false)

const switchInputMode = (mode: 'voice' | 'text') => {
  inputModeTouched.value = true
  inputMode.value = mode
}

// 默认输入方式跟随对话方式：语音对话项目默认录音，文字对话项目默认键盘。
// dialogueMode 由 ScriptTraining 异步 getSession 后才写入，故加载完成时再纠正一次默认值。
watch(
  () => store.dialogueMode,
  (mode) => {
    if (!inputModeTouched.value) inputMode.value = mode === 0 ? 'voice' : 'text'
  },
  { immediate: true }
)

const recorder = useRecorder()
const player = useAudioPlayer()

/** 上传中的"语音识别中…"占位气泡（完成/失败后置空） */
const pendingPlaceholder = ref<SessionMessage | null>(null)
/** 上传失败的录音：留在本地，用户不必重说一遍 */
const failedRecording = ref<Blob | null>(null)
/** 过短录音（误触）被丢弃时的提示，下次录音自动清 */
const tooShort = ref(false)
/** 服务端返回"没识别到内容"：提示重说，不弹要点弹窗 */
const noSpeechNotice = ref(false)

/** 60s 上限倒计时 */
const remainSec = computed(() => Math.ceil(recorder.remainingMs.value / 1000))

const voiceHint = computed(() => {
  if (store.sending) return '语音识别中…'
  if (tooShort.value) return '没听清，请靠近麦克风再说一遍'
  return '点击麦克风开始录音'
})

// 60s 自动停止 → 视同手动停止并上传
recorder.setAutoStopHandler((r) => uploadRecording(r.blob))

/** 开始录音；麦克风权限被拒 → 提示并切到键盘输入 */
const startRecord = async () => {
  if (store.sending || recorder.recording.value) return
  // 先停掉正在播报的 TTS：外放的问题语音会被录进学员的回答里，污染转写与语速
  player.stop()
  tooShort.value = false
  try {
    await recorder.start()
  } catch (e: unknown) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      toast.error('无法访问麦克风，已切换到键盘输入，或在浏览器设置中授权后重试')
      switchInputMode('text')
    } else {
      toast.error('录音启动失败，已切换到键盘输入，可稍后重试')
      switchInputMode('text')
    }
  }
}

/** 停止录音并上传 */
const stopAndUpload = () => {
  const result = recorder.stop()
  if (!result || result.durationMs < 200) {
    // 过短的录音（误触）不上传，但要说一句，否则点了停止像没反应
    tooShort.value = true
    return
  }
  uploadRecording(result.blob)
}

/** 重试上一次上传失败的录音 */
const retryUpload = () => {
  const blob = failedRecording.value
  if (!blob) return
  failedRecording.value = null
  uploadRecording(blob)
}

/** 上传录音 → ASR → 与文字发送完全相同的流转判定分支 */
const uploadRecording = async (blob: Blob) => {
  if (store.sending) return

  // 占位气泡："语音识别中…"
  const placeholder: SessionMessage = {
    messageId: '',
    seq: -1,
    role: 2,
    content: '语音识别中…',
    passed: null,
    withdrawn: 0,
    likeCount: 0,
    inputMode: 2
  }
  pendingPlaceholder.value = placeholder
  store.appendMessage(placeholder)
  store.sending = true
  noSpeechNotice.value = false

  try {
    const res = await sendVoiceMessage(store.sessionId, blob)

    // 识别文本与音频信息替换占位内容
    placeholder.content = res.recognizedText
    placeholder.messageId = res.messageId
    placeholder.audioUrl = res.audioUrl
    placeholder.audioDurationMs = res.audioDurationMs
    pendingPlaceholder.value = null

    // —— 以下与文字发送（FP-12）分支完全一致 ——
    if (res.withdrawn) {
      store.withdrawMessage(placeholder)
      store.updateProgress(res.finishedRounds, res.totalRounds)
      if (res.noSpeech) noSpeechNotice.value = true
      else emit('tip', res.keyPoints ?? [])
      return
    }

    store.updateProgress(res.finishedRounds, res.totalRounds)

    if (res.finished) {
      router.replace(`/sparring/standpracticereport?sessionId=${store.sessionId}`)
      return
    }

    if (res.narrationMessages?.length) {
      for (const nm of res.narrationMessages) store.appendMessage(nm)
    }
    if (res.nextTrainerMessage) {
      store.appendMessage(res.nextTrainerMessage)
    }
  } catch {
    // 上传/识别失败：撤回占位气泡（api 层已 toast），录音留在本地供"重试上传"
    store.withdrawMessage(placeholder)
    failedRecording.value = blob
  } finally {
    pendingPlaceholder.value = null
    store.sending = false
  }
}

// ===== 陪练者 TTS 播报（v1.1，FP-24） =====
/** 已播报过的陪练者消息（避免重复播报） */
const spokenIds = new Set<string>()
/** TTS 请求中的消息（🔊 图标 loading 态） */
const ttsLoadingId = ref('')

/** 语音模式下自动播报最后一条陪练者消息（即当前待答问题；会话恢复时同样只播这一条，不重播历史） */
const autoSpeakLastTrainer = async () => {
  if (!isVoiceMode.value || store.sessionStatus !== 0) return
  const list = store.messages
  const last = list.length ? list[list.length - 1] : undefined
  if (!last || last.role !== 1 || !last.messageId) return
  if (spokenIds.has(last.messageId)) return
  spokenIds.add(last.messageId)
  await speakTrainerMessage(last, true)
}

/** 播报陪练者消息：调 TTS 拿 audioUrl 自动播放；auto=true 为自动播报（失败静默），否则为 🔊 手动重播 */
const speakTrainerMessage = async (msg: SessionMessage, auto: boolean) => {
  if (msg.audioUrl) {
    player.play(audioSrc(msg.audioUrl))
    return
  }
  if (!msg.messageId) return
  ttsLoadingId.value = msg.messageId
  try {
    const res = await getTts(store.sessionId, msg.messageId, { silent: auto })
    msg.audioUrl = res.audioUrl
    if (msg.audioDurationMs == null) msg.audioDurationMs = res.durationMs
    player.play(audioSrc(res.audioUrl))
  } catch {
    // 自动播报失败不打断训练（可点 🔊 重试）；手动点击时 api 层已 toast 提示
    if (!auto) throw new Error('tts failed')
  } finally {
    ttsLoadingId.value = ''
  }
}

/** 🔊 点击：已有音频直接重播，否则现场合成 */
const onTrainerAudioClick = (msg: SessionMessage) => {
  if (ttsLoadingId.value === msg.messageId) return
  speakTrainerMessage(msg, false).catch(() => undefined)
}

/** 滚动到底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

watch(() => store.messages.length, () => {
  scrollToBottom()
  autoSpeakLastTrainer()
})

// 挂载时（含会话恢复）：播报当前待答的陪练者问题
onMounted(() => {
  autoSpeakLastTrainer()
})

onBeforeUnmount(() => {
  recorder.stop()
  player.stop()
  recorder.setAutoStopHandler(null)
})

/** FP-12 发送流程：乐观渲染学员气泡 → 判定 → 撤回弹窗 / 追加陪练者消息 / 结束跳报告（v1.0 原样） */
const onSend = async () => {
  const content = inputText.value.trim()
  if (!content || store.sending) return

  // 乐观渲染学员气泡
  const optimistic: SessionMessage = {
    messageId: '',
    seq: -1,
    role: 2,
    content,
    passed: null,
    withdrawn: 0,
    likeCount: 0
  }
  store.appendMessage(optimistic)
  inputText.value = ''
  store.sending = true

  try {
    const res = await sendMessage(store.sessionId, content)

    if (res.withdrawn) {
      // 未通过：撤回消息 + 弹要点提示
      store.withdrawMessage(optimistic)
      store.updateProgress(res.finishedRounds, res.totalRounds)
      emit('tip', res.keyPoints ?? [])
      return
    }

    // 通过：消息保留，更新进度
    store.updateProgress(res.finishedRounds, res.totalRounds)

    if (res.finished) {
      // FP-13 流程结束：当前窗口跳转报告页
      router.replace(`/sparring/standpracticereport?sessionId=${store.sessionId}`)
      return
    }

    if (res.narrationMessages?.length) {
      for (const nm of res.narrationMessages) store.appendMessage(nm)
    }
    if (res.nextTrainerMessage) {
      store.appendMessage(res.nextTrainerMessage)
    }
  } catch {
    // 请求失败：撤回乐观气泡，恢复输入
    store.withdrawMessage(optimistic)
    inputText.value = content
  } finally {
    store.sending = false
  }
}
</script>

<style scoped lang="scss">
.train-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  &.student {
    justify-content: flex-end;
  }
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.trainer-avatar {
  background: #2b3350;
  object-fit: cover;
  overflow: hidden;
}

.student-avatar {
  background: #2ec5b6;
  color: #fff;
}

.narration-tip {
  /* v1.2 用户拍板：无底色块、嵌入背景的居中文字（微信"撤回了一条消息"式） */
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45); /* 深色训练背景上的可读灰白 */
  padding: 2px 12px;
  line-height: 1.6;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.trainer-bubble {
  background: #232b47;
  color: #e8ecf7;
  border-top-left-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;

  .bubble-text {
    white-space: pre-wrap;
  }
}

.student-bubble {
  background: #43485c;
  color: #eef0f6;
  border-top-right-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;

  .bubble-text {
    white-space: pre-wrap;
  }

  &.voice-pending .bubble-text {
    color: rgba(238, 240, 246, 0.55);
  }
}

/* 🔊 音频图标 */
.audio-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(232, 236, 247, 0.75);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.2);
  }

  &.active {
    color: #6ea8ff;
    background: rgba(110, 168, 255, 0.18);
  }

  &.loading {
    opacity: 0.45;
    cursor: wait;
  }
}

/* 自动播报被拦截时的说明条 */
.input-note {
  margin: 0 0 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(229, 169, 69, 0.14);
  color: #e9c37f;
  font-size: 12px;
}

/* 输入区 */
.input-area {
  padding: 12px 18px 16px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 26px;
  padding: 6px 6px 6px 20px;

  .chat-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: #eef0f6;
    font-size: 14px;
    height: 36px;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  .send-btn {
    height: 36px;
    padding: 0 22px;
    border: none;
    border-radius: 18px;
    background: #fff;
    color: #2e3a6e;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;

    &:hover:not(.disabled) {
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
    }

    &.disabled {
      background: rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.4);
      cursor: not-allowed;
    }
  }
}

/* ===== 语音输入区（v1.1） ===== */
.voice-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 50px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 26px;
  padding: 6px 10px 6px 20px;

  .voice-hint {
    margin-right: auto;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
  }

  /* 60s 上限倒计时：最后 10 秒变红，避免录音被自动截断而学员不知道 */
  .record-countdown {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.55);

    &.urgent {
      color: #ff8f8f;
      font-weight: 700;
    }
  }

  /* 上传失败后的重试入口 */
  .retry-btn {
    height: 28px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    color: #cdd5e8;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }
  }
}

/* 录音中波形动画：数根竖条随机高度 */
.wave-box {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  margin-right: auto;
  cursor: pointer;
  padding: 0 4px;

  .wave-bar {
    width: 4px;
    border-radius: 2px;
    background: #6ea8ff;
    animation: wave-jump 1s ease-in-out infinite;
  }

  &:hover .wave-bar {
    background: #9cc2ff;
  }
}

@keyframes wave-jump {
  0%,
  100% {
    height: 8px;
  }
  50% {
    height: 26px;
  }
}

/* 圆形按钮通用 */
.round-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

/* 麦克风主按钮：蓝紫渐变 */
.mic-btn,
.mic-inline-btn {
  background: linear-gradient(135deg, #7a6cf0 0%, #4a7dff 100%);
  color: #fff;

  &:hover:not(:disabled) {
    box-shadow: 0 0 14px rgba(110, 140, 255, 0.55);
  }

  &.loading {
    background: rgba(255, 255, 255, 0.2);
    color: transparent;
    cursor: wait;
  }
}

/* 录音中的停止按钮：白底红块 */
.stop-btn {
  background: #fff;
  color: #e54545;

  &:hover {
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.35);
  }
}

/* 键盘切换：幽灵描边 */
.ghost-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #cdd5e8;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

/* 发送按钮旁的切回麦克风按钮（复用 .round-btn） */
.mic-inline-btn {
  width: 34px;
  height: 34px;
}

/* 麦克风 loading 旋转环 */
.spin-ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
