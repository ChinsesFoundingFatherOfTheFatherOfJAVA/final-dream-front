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
        <img class="empty-avatar" :src="sageAvatar" alt="" />
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
            >{{ s }}</el-button
          >
        </div>
      </div>

      <template v-else>
        <MessageBubble v-for="msg in visibleMessages" :key="msg.id" :message="msg" />
        <div v-if="showWaitingRow" class="generating-row">
          <img class="avatar" :src="sageAvatar" alt="" />
          <div class="generating-tip"><span class="spinner"></span>助手正在回复…</div>
        </div>
      </template>
    </div>

    <el-button
      v-if="showScrollBtn"
      class="scroll-bottom-btn"
      aria-label="滚动到底部"
      @click="scrollToBottom(true)"
      >↓</el-button
    >

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
          <!-- 上传资料菜单：在线课堂 / 知识空间（置灰）/ 本地上传（原平台同一菜单，2026-10-28 接入） -->
          <el-dropdown
            trigger="click"
            placement="top-start"
            :disabled="store.inputDisabled || uploading"
            @command="onUploadCommand"
          >
            <el-button class="tool-btn" :disabled="store.inputDisabled || uploading">
              <span v-if="uploading">上传中…</span>
              <template v-else><el-icon aria-hidden="true"><Paperclip /></el-icon> 上传资料</template>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="kng">从在线课堂选择</el-dropdown-item>
                <el-dropdown-item command="kspace" disabled>从知识空间选择</el-dropdown-item>
                <el-dropdown-item command="local" divided>本地上传</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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

        <el-button class="send-btn" :disabled="store.inputDisabled || !draft.trim()" @click="send"
          >发送</el-button
        >
      </div>
    </div>

    <!-- 在线课堂资源选择（设计助手：文档类，上限 5） -->
    <KngSourcePickerDrawer
      v-if="pickerOpen"
      purpose="designAssistant"
      variant="designAssistant"
      :max-select="5"
      :exclude-ids="importedCoursewareIds"
      @cancel="pickerOpen = false"
      @confirm="onKngConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { isAllowedAssistantFile, uploadAssistantFile } from '@/api/assistant'
import type { KngAiSourceItem } from '@/api/kngAiSource'
import { useAssistantStore } from '../composables/useAssistantStore'
import { useVoiceInput } from '../composables/useVoiceInput'
import KngSourcePickerDrawer from '@/components/business/onlineClassroom/KngSourcePickerDrawer.vue'
import MessageBubble from './MessageBubble.vue'
import { showToast } from '../../components/ui'
import sageAvatar from '@/assets/sage-avatar.jpg'
import { Paperclip } from '@element-plus/icons-vue'

const store = useAssistantStore()

const draft = ref('')
const fileError = ref('')
const uploading = ref(false)
const recordSeconds = ref(0)
const scrollRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
const showScrollBtn = ref(false)
/** 在线课堂选择抽屉（设计助手上限 5，只列文档类课件） */
const pickerOpen = ref(false)
/** 抽屉打开时排除已导入过的在线课堂材料，避免重复点选 */
const importedCoursewareIds = computed<string[]>(() =>
  (store.materials ?? [])
    .map((m) => String(m.fileId ?? ''))
    .filter((fileId) => fileId.startsWith('kng_'))
    .map((fileId) => fileId.slice('kng_'.length)),
)
let recordTimer: number | null = null

const samples = [
  '我想做一个面向新入职销售的训练主题',
  '给订单运营部做一版职能培训演练',
  '基于我上传的材料生成训练主题',
]

const acceptAttr = '.ppt,.pptx,.doc,.docx,.pdf,.txt,.md'

/** 没有内容块的消息不画：流式占位也会剩一颗头像，等待态由下面那一行负责 */
const visibleMessages = computed(() => store.messages.filter((m) => m.blocks.length > 0))
const showWaitingRow = computed(
  () =>
    store.generating &&
    !store.messages.some((m) => m.role === 'agent' && m.streaming && m.blocks.length > 0),
)

const voice = useVoiceInput(
  (text) => {
    // 识别文本回填输入框，用户确认后发送（FP-32）
    draft.value = draft.value ? `${draft.value}${text}` : text
    void nextTick(() => textareaRef.value?.focus())
  },
  (msg) => showToast(msg),
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
  if (!force && !isNearBottom()) return
  const stick = () => {
    const current = scrollRef.value
    if (!current) return
    current.scrollTop = current.scrollHeight
    showScrollBtn.value = false
  }
  // 历史回补会整表替换消息。一次 nextTick 时新高度还没落地，scrollTop 会被浏览器夹回 0。
  void nextTick(stick)
  window.setTimeout(stick, 80)
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
watch(
  () => store.sessionId,
  () => scrollToBottom(true),
)

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
/** 上传资料菜单：在线课堂开抽屉，知识空间置灰，本地上传走原流程 */
function onUploadCommand(command: string | number | object) {
  if (command === 'kng') {
    pickerOpen.value = true
    return
  }
  if (command === 'local') {
    pickFile()
  }
}

function pickFile() {
  fileError.value = ''
  fileRef.value?.click()
}

/**
 * 在线课堂选择确认：调后端导入（同步抽取 + 落材料 + 推解析完成卡片）。
 * 成功后关抽屉并切到"培训材料"tab —— 用户点了确定，就应该立刻看到材料进来了。
 */
async function onKngConfirm(items: KngAiSourceItem[]) {
  if (!items.length) return
  const ids = items.map((item) => item.id)
  pickerOpen.value = false
  fileError.value = ''
  try {
    const resp = await store.importKngMaterials(ids)
    const ok = resp.materials.length
    const failed = resp.failures.length
    if (ok) {
      store.requestPanelTab('materials')
      showToast(
        failed ? `已导入 ${ok} 份材料，${failed} 个课件解析失败` : `已导入 ${ok} 份培训材料`,
      )
    } else {
      fileError.value = resp.failures[0]?.reason ?? '在线课堂材料导入失败，请重试'
    }
  } catch (e) {
    fileError.value = e instanceof Error && e.message ? e.message : '在线课堂材料导入失败，请重试'
  }
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
  background: var(--color-paper-2);
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-rule);
  background: var(--color-paper);

  .ai-notice {
    font-size: 12px;
    color: var(--color-muted);
    background: var(--color-paper-2);
    border-radius: 10px;
    padding: 3px 10px;
  }

  .connection {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-muted);

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-rule-2);
    }

    &.status-open .dot {
      background: var(--color-success);
    }
    &.status-connecting .dot,
    &.status-reconnecting .dot {
      background: var(--color-warning);
      animation: pulse 1.2s infinite;
    }
    &.status-closed .dot {
      background: var(--color-error);
    }
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.reconnect-banner {
  padding: 8px 20px;
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  border-bottom: 1px solid color-mix(in oklab, var(--color-warning) 30%, var(--color-paper));
  color: var(--color-warning);
  font-size: 13px;
}

.message-scroll {
  flex: 1;
  min-height: 0;
  overflow-anchor: none;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

.history-tip {
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
  padding: 40px 0;
}

.chat-empty {
  max-width: 560px;
  margin: 8vh auto 0;
  text-align: center;

  .empty-avatar {
    width: 72px;
    height: 72px;
    margin: 0 auto 16px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center 18%;
    display: block;
    border: 1px solid var(--color-rule);
  }

  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 8px;
  }

  .empty-sub {
    font-size: 14px;
    color: var(--color-muted);
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
      background: var(--color-paper);
      border: 1px solid var(--color-rule);
      border-radius: 8px;
      font-size: 14px;
      color: var(--color-ink-2);
      cursor: pointer;
      text-align: left;
      transition:
        border-color 0.2s,
        color 0.2s;

      &:hover:not(:disabled) {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

.generating-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 18%;
  flex-shrink: 0;
  border: 1px solid var(--color-rule);
}

.generating-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-muted);

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-accent-wash);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.scroll-bottom-btn {
  position: absolute;
  right: 30px;
  bottom: 178px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  color: var(--color-ink-2);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  cursor: pointer;
  font-size: 15px;

  &:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
}

.chat-input-area {
  border-top: 1px solid var(--color-rule);
  background: var(--color-paper);
  padding: 12px 16px 14px;
}

.input-error {
  font-size: 13px;
  color: var(--color-error);
  margin-bottom: 6px;
}

.input-box {
  width: 100%;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
  color: var(--color-ink);
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--color-accent);
  }

  &:disabled,
  &.disabled {
    background: var(--color-paper-2);
    color: var(--color-muted);
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

    .hidden-file {
      display: none;
    }

    .tool-btn {
      padding: 6px 12px;
      background: var(--color-paper);
      border: 1px solid var(--color-rule);
      border-radius: 6px;
      font-size: 13px;
      color: var(--color-ink-2);
      cursor: pointer;
      white-space: nowrap;
      transition:
        color 0.2s,
        border-color 0.2s,
        background 0.2s;

      &:hover:not(:disabled) {
        color: var(--color-accent);
        border-color: var(--color-accent);
      }
      &:disabled {
        color: var(--color-muted);
        border-color: var(--color-rule);
        cursor: not-allowed;
      }
      &.recording {
        color: var(--color-error);
        border-color: var(--color-error);
        background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
      }
    }

    .tool-hint {
      font-size: 12px;
      color: var(--color-muted);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .send-btn {
    padding: 7px 22px;
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    color: var(--color-paper);
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition:
      opacity 0.2s,
      background 0.2s,
      border-color 0.2s;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
    &:disabled {
      background: var(--color-rule);
      border-color: var(--color-rule);
      cursor: not-allowed;
    }
  }
}
</style>
