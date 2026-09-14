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
        <!-- 陪练者消息：左侧头像 + 气泡 -->
        <template v-if="msg.role === 1">
          <span class="avatar trainer-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4" fill="#b8c7e8"/>
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" fill="#b8c7e8"/>
            </svg>
          </span>
          <div class="bubble trainer-bubble">{{ msg.content }}</div>
        </template>
        <!-- 学员消息：气泡 + 右侧头像 -->
        <template v-else>
          <div class="bubble student-bubble">{{ msg.content }}</div>
          <span class="avatar student-avatar">员</span>
        </template>
      </div>
    </div>

    <!-- 底部输入区 -->
    <div class="input-area">
      <div class="input-row">
        <input
          v-model="inputText"
          type="text"
          class="chat-input"
          placeholder="请输入"
          maxlength="2000"
          :disabled="store.sending"
          @keyup.enter="onSend"
        />
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
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sendMessage } from '@/api/student'
import { useTrainingStore } from '@/stores/training'
import type { SessionMessage } from '@/types/student'

const emit = defineEmits<{ tip: [keyPoints: string[]] }>()

const router = useRouter()
const store = useTrainingStore()
const inputText = ref('')
const scrollRef = ref<HTMLElement>()

const canSend = computed(() => inputText.value.trim().length > 0 && !store.sending)

/** 滚动到底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

watch(() => store.messages.length, scrollToBottom)

/** FP-12 发送流程：乐观渲染学员气泡 → 判定 → 撤回弹窗 / 追加陪练者消息 / 结束跳报告 */
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
      store.withdrawLastStudentMessage()
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

    if (res.nextTrainerMessage) {
      store.appendMessage(res.nextTrainerMessage)
    }
  } catch {
    // 请求失败：撤回乐观气泡，恢复输入
    store.withdrawLastStudentMessage()
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
  overflow: hidden;
}

.student-avatar {
  background: #2ec5b6;
  color: #fff;
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
}

.student-bubble {
  background: #43485c;
  color: #eef0f6;
  border-top-right-radius: 4px;
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
</style>
