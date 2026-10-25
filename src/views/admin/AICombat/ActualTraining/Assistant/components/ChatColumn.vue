<template>
  <div class="chat-column">
    <!-- FP-32 顶部声明（照线上） -->
    <div class="chat-topbar">
      <span class="ai-notice">AI 生成内容仅供参考</span>
      <span class="connection" :class="connectionClass">
        <span class="dot"></span>{{ connectionText }}
      </span>
    </div>

    <!-- 重连提示 -->
    <div v-if="store.wsStatus === 'reconnecting'" class="reconnect-banner">
      连接已断开，正在重连（第 {{ store.reconnectAttempt }} 次）… 已恢复的消息以服务端记录为准
    </div>

    <!-- 消息流 -->
    <div ref="scrollRef" class="message-scroll" @scroll="onScroll">
      <div v-if="store.loadingHistory" class="history-tip">正在加载历史消息…</div>

      <div v-else-if="store.isEmptyConversation" class="chat-empty">
        <div class="empty-avatar"></div>
        <h3 class="empty-title">你好，我是 无所不知的大贤者</h3>
        <p class="empty-sub">
          实战演练项目设计助手。告诉我这次训练的岗位、目标，或者直接上传产品资料，
          我来帮你把方向变成一套可演练的训练主题。
        </p>
        <div class="empty-samples">
          <el-button
            v-for="s in samples"
            :key="s"
            class="sample-chip"
            :disabled="store.inputDisabled"
            @click="useSample(s)"
          >{{ s }}</el-button>
        </div>
      </div>

      <template v-else>
        <MessageBubble v-for="msg in visibleMessages" :key="msg.id" :message="msg" />
        <div v-if="store.generating" class="generating-tip">
          <span class="spinner"></span>助手正在回复…
        </div>
      </template>
    </div>

    <el-button v-if="showScrollBtn" class="scroll-bottom-btn" aria-label="滚动到底部" @click="scrollToBottom(true)">↓</el-button>

    <!-- 输入区 -->
    <div class="chat-input-area">
      <div v-if="fileError" class="input-error">{{ fileError }}</div>
      <textarea
        ref="textareaRef"
        v-model="draft"
        class="input-box"
        :class="{ disabled: store.inputDisabled }"
        :disabled="store.inputDisabled"
        :placeholder="inputPlaceholder"
        aria-label="对话输入"
        rows="3"
        @keydown.enter.exact.prevent="send"
      ></textarea>

      <div class="input-actions">
        <div class="left-actions">
          <input
            ref="fileRef"
            type="file"
            class="hidden-file"
            :accept="acceptAttr"
            @change="onFileChange"
          />
          <el-button class="tool-btn" :disabled="store.inputDisabled || uploading" @click="pickFile">
            <span v-if="uploading">上传中…</span><template v-else><span aria-hidden="true">📎</span> 上传资料</template>
          </el-button>
          <el-button
            class="tool-btn"
            :class="{ recording }"
            :disabled="store.inputDisabled || recognizing"
            @click="toggleVoice"
          >
            {{ recording ? `⏹ 录音中 ${recordSeconds}s` : recognizing ? '识别中…' : ' 语音输入' }}
          </el-button>
          <span class="tool-hint">支持 ppt / pptx / doc / docx / pdf / txt / md</span>
        </div>

        <el-button class="send-btn" :disabled="store.inputDisabled || !draft.trim()" @click="send">发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { isAllowedAssistantFile, uploadAssistantFile } from '@/api/assistant'
import { useAssistantStore } from '../composables/useAssistantStore'
import { useVoiceInput } from '../composables/useVoiceInput'
import MessageBubble from './MessageBubble.vue'
import { showToast } from '../../components/ui'

const store = useAssistantStore()

const draft = ref('')
const fileError = ref('')
const uploading = ref(false)
const recordSeconds = ref(0)
const scrollRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
const showScrollBtn = ref(false)
let recordTimer: number | null = null

const samples = [
  '我想做一个面向新入职销售的训练主题',
  '给订单运营部做一版职能培训演练',
  '基于我上传的材料生成训练主题'
]

const acceptAttr = '.ppt,.pptx,.doc,.docx,.pdf,.txt,.md'

/** 渲染兜底：既无内容块又不在流式中的消息不画气泡（消息被合并空后只剩头像） */
const visibleMessages = computed(() =>
  store.messages.filter((m) => m.blocks.length > 0 || m.streaming)
)

const voice = useVoiceInput(
  (text) => {
    // 识别文本回填输入框，用户确认后发送（FP-32）
    draft.value = draft.value ? `${draft.value}${text}` : text
    void nextTick(() => textareaRef.value?.focus())
  },
  (msg) => showToast(msg)
)
const { recording, recognizing, toggle: toggleVoiceRaw } = voice

const inputPlaceholder = computed(() => {
  if (store.readOnly) return '该主题已结束，仅可查看历史对话'
  if (recording.value) return '正在录音，再次点击麦克风结束'
  if (store.generating) return '助手正在回复，请稍候…'
  if (store.wsStatus === 'reconnecting') return '连接已断开，正在重连…'
  if (!store.connected) return '正在连接对话服务…'
  return '描述你的训练需求，或上传资料让助手解析…（Enter 发送 / Shift+Enter 换行）'
})

const connectionText = computed(() => {
  switch (store.wsStatus) {
    case 'open':
      return '已连接'
    case 'connecting':
      return '连接中'
    case 'reconnecting':
      return '重连中'
    case 'closed':
      return '已断开'
    default:
      return '未连接'
  }
})
const connectionClass = computed(() => `status-${store.wsStatus}`)

// ---------- 滚动 ----------
function isNearBottom(): boolean {
  const el = scrollRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function scrollToBottom(force = false) {
  const el = scrollRef.value
  if (!el) return
  if (force || isNearBottom()) {
    void nextTick(() => {
      el.scrollTop = el.scrollHeight
      showScrollBtn.value = false
    })
  }
}

function onScroll() {
  showScrollBtn.value = !isNearBottom()
}

/** 消息数量 / 末条文本长度变化即滚动（打字机过程中跟随） */
const tailSignal = computed(() => {
  const visible = visibleMessages.value
  const last = visible[visible.length - 1]
  const tailBlock = last?.blocks[last.blocks.length - 1]
  const tailLen = tailBlock && tailBlock.kind === 'text' ? tailBlock.text.length : 0
  return `${visible.length}:${tailLen}:${store.generating ? 1 : 0}`
})

watch(tailSignal, () => scrollToBottom())
watch(() => store.sessionId, () => scrollToBottom(true))

// ---------- 发送 ----------
function send() {
  const text = draft.value.trim()
  if (!text || store.inputDisabled) return
  store.sendText(text)
  draft.value = ''
}

function useSample(text: string) {
  draft.value = text
  void nextTick(() => textareaRef.value?.focus())
}

// ---------- 文件上传 ----------
function pickFile() {
  fileError.value = ''
  fileRef.value?.click()
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // 不支持格式前端拦截（FP-42）
  if (!isAllowedAssistantFile(file.name)) {
    fileError.value = '不支持的文件类型，仅支持 ppt / pptx / doc / docx / pdf / txt / md'
    return
  }
  fileError.value = ''
  uploading.value = true
  try {
    // 带 sessionId：后端据此异步解析材料并推 parse-file 两态事件（AI助手WS接入说明 §4a）
    const resp = await uploadAssistantFile(file, store.sessionId)
    store.sendFile({ ...resp, fileSize: resp.fileSize || file.size })
  } catch (e) {
    fileError.value = e instanceof Error && e.message ? e.message : '上传失败，请重试'
  } finally {
    uploading.value = false
  }
}

// ---------- 语音 ----------
async function toggleVoice() {
  if (!recording.value) recordSeconds.value = 0
  try {
    await toggleVoiceRaw()
  } finally {
    if (recording.value) {
      recordTimer = window.setInterval(() => {
        recordSeconds.value += 1
      }, 1000)
    } else if (recordTimer !== null) {
      window.clearInterval(recordTimer)
      recordTimer = null
    }
  }
}

onBeforeUnmount(() => {
  if (recordTimer !== null) window.clearInterval(recordTimer)
})
</script>

<style scoped lang="scss">
.chat-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #f7f8fa;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid #eceef2;
  background: #fff;

  .ai-notice {
    font-size: 12px;
    color: #8a8f98;
    background: #f2f3f5;
    border-radius: 10px;
    padding: 3px 10px;
  }

  .connection {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #8a8f98;

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c9cdd4;
    }

    &.status-open .dot { background: #52c41a; }
    &.status-connecting .dot,
    &.status-reconnecting .dot { background: #fa8c16; animation: pulse 1.2s infinite; }
    &.status-closed .dot { background: #e5484d; }
  }
}

@keyframes pulse {
  50% { opacity: 0.3; }
}

.reconnect-banner {
  padding: 8px 20px;
  background: #fff7e6;
  border-bottom: 1px solid #ffe7ba;
  color: #b06a00;
  font-size: 13px;
}

.message-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

.history-tip {
  text-align: center;
  color: #a5a9b0;
  font-size: 13px;
  padding: 40px 0;
}

.chat-empty {
  max-width: 560px;
  margin: 8vh auto 0;
  text-align: center;

  .empty-avatar {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
    border-radius: 50%;
    background: #2b2f3a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: #1f2329;
    margin: 0 0 8px;
  }

  .empty-sub {
    font-size: 14px;
    color: #8a8f98;
    line-height: 1.8;
    margin: 0 0 20px;
  }

  .empty-samples {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;

    .sample-chip {
      width: 100%;
      max-width: 420px;
      padding: 10px 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      color: #4e5969;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s, color 0.2s;

      &:hover:not(:disabled) { border-color: #1890ff; color: #1890ff; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
  }
}

.generating-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #8a8f98;
  padding-left: 42px;

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #c7d2f5;
    border-top-color: #3b5bdb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scroll-bottom-btn {
  position: absolute;
  right: 30px;
  bottom: 178px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #4e5969;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 15px;

  &:hover { color: #1890ff; border-color: #1890ff; }
}

.chat-input-area {
  border-top: 1px solid #eceef2;
  background: #fff;
  padding: 12px 16px 14px;
}

.input-error {
  font-size: 13px;
  color: #e5484d;
  margin-bottom: 6px;
}

.input-box {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
  color: #1f2329;
  transition: border-color 0.2s;

  &:focus { border-color: #1890ff; }

  &:disabled,
  &.disabled {
    background: #f7f8fa;
    color: #a5a9b0;
    cursor: not-allowed;
  }
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;

  .left-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    .hidden-file { display: none; }

    .tool-btn {
      padding: 6px 12px;
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 6px;
      font-size: 13px;
      color: #4e5969;
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.2s, border-color 0.2s, background 0.2s;

      &:hover:not(:disabled) { color: #1890ff; border-color: #1890ff; }
      &:disabled { color: #c0c4cc; border-color: #ebeef5; cursor: not-allowed; }
      &.recording { color: #e5484d; border-color: #e5484d; background: #fff1f0; }
    }

    .tool-hint {
      font-size: 12px;
      color: #a5a9b0;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .send-btn {
    padding: 7px 22px;
    background: #1890ff;
    border: 1px solid #1890ff;
    color: #fff;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s;

    &:hover:not(:disabled) { opacity: 0.85; }
    &:disabled { background: #c8d6e8; border-color: #c8d6e8; cursor: not-allowed; }
  }
}
</style>