<template>
  <div class="chat-record">
    <div
      v-for="msg in messages"
      :key="msg.messageId"
      class="msg-row"
      :class="msg.role === 2 ? 'student' : 'trainer'"
    >
      <!-- 陪练者：左头像 + 浅紫气泡（形象与训练页左栏同源，来自报告接口的 trainerAvatar） -->
      <div v-if="msg.role === 3" class="narration-tip">{{ msg.content }}</div>
      <template v-else-if="msg.role === 1">
        <img class="avatar trainer-avatar" :src="trainerFace(trainerAvatar)" alt="陪练者头像" loading="lazy" />
        <div class="bubble trainer-bubble">{{ msg.content }}</div>
      </template>

      <!-- 学员：灰气泡 + 右头像 + 操作行 -->
      <template v-else>
        <div class="student-msg">
          <div class="bubble student-bubble">{{ msg.content }}</div>
          <div class="msg-actions">
            <!-- 改进建议 -->
            <span
              v-if="suggestionOf(msg)"
              class="action-item"
              :class="{ expanded: expanded[msg.messageId] }"
              role="button"
              tabindex="0"
              @click="toggleExpand(msg.messageId)"
              @keydown.enter.prevent="toggleExpand(msg.messageId)"
            >
              <el-icon class="btn-caret"><MagicStick /></el-icon> <span class="action-text">改进建议</span>
            </span>
            <span v-else class="action-item"><el-icon class="btn-caret"><MagicStick /></el-icon> <span class="action-text action-disabled">改进建议</span></span>
            <!-- 点赞 -->
            <span
              class="action-item like"
              :class="{ liked: likedIds.has(msg.messageId), disabled: likesDisabled }"
              role="button"
              tabindex="0"
              @click="onLike(msg)"
              @keydown.enter.prevent="onLike(msg)"
            >
              <el-icon aria-hidden="true"><Pointer /></el-icon> <span class="action-text">{{ msg.likeCount }}</span>
            </span>
          </div>
          <!-- 改进建议展开区 -->
          <div v-if="expanded[msg.messageId] && suggestionOf(msg)" class="suggestion-box">
            {{ suggestionOf(msg) }}
          </div>
        </div>
        <span class="avatar student-avatar">员</span>
      </template>
    </div>

    <div v-if="!messages.length" class="empty-hint">暂无对话记录</div>
  </div>
</template>

<script setup lang="ts">
import { MagicStick, Pointer } from '@element-plus/icons-vue'
import { computed, reactive, ref } from 'vue'
import { likeMessage } from '@/api/student'
import { trainerFace } from './trainerFace'
import type { RoundSuggestion, SessionMessage } from '@/types/student'

const props = defineProps<{
  messages: SessionMessage[]
  roundSuggestions: RoundSuggestion[]
  /** 陪练者形象（报告接口带回）；为空时回落内置默认形象 */
  trainerAvatar?: string | null
  /** 管理端代查报告时只读展示，不触发点赞 */
  likesDisabled?: boolean
}>()

const expanded = reactive<Record<string, boolean>>({})
const likedIds = ref(new Set<string>())

/**
 * 学员消息 → 轮次序号（第 N 条学员消息 = 第 N 轮）。
 * 必须是 computed：对话记录在报告页是懒加载的，组件挂载时 messages 还可能是空数组，
 * 一次性求值会让"改进建议"永远找不到轮次。
 */
const studentRoundSeqs = computed(() => {
  const map = new Map<string, number>()
  let round = 0
  for (const m of props.messages ?? []) {
    if (m.role === 2) {
      round += 1
      map.set(m.messageId, round)
    }
  }
  return map
})

const suggestionOf = (msg: SessionMessage): string | undefined => {
  const round = studentRoundSeqs.value.get(msg.messageId)
  if (!round) return undefined
  return props.roundSuggestions?.find((s) => s.seq === round)?.suggestion
}

const toggleExpand = (messageId: string) => {
  expanded[messageId] = !expanded[messageId]
}

/** FP-17 点赞：+1 落库，重复点击不叠加 */
const onLike = async (msg: SessionMessage) => {
  if (props.likesDisabled) return
  if (likedIds.value.has(msg.messageId)) return
  likedIds.value.add(msg.messageId)
  try {
    const res = await likeMessage(msg.messageId)
    msg.likeCount = res?.likeCount ?? msg.likeCount + 1
  } catch {
    likedIds.value.delete(msg.messageId)
  }
}
</script>

<style scoped lang="scss">
.chat-record {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
}

.msg-row {
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
  background: var(--color-accent-wash);
  object-fit: cover;
  overflow: hidden;
}

.student-avatar {
  background: var(--color-accent-2);
  color: var(--color-paper);
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
  background: var(--color-accent-wash);
  color: var(--color-ink);
  border-top-left-radius: 4px;
}

.student-bubble {
  background: var(--color-paper-2);
  color: var(--color-ink);
  border-top-right-radius: 4px;
}

.student-msg {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 78%;
}

.msg-actions {
  display: flex;
  gap: 14px;
  margin-top: 6px;

  .action-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    cursor: pointer;
    color: var(--color-muted);
    user-select: none;

    // 可点操作项已转为按钮语义，补键盘焦点环
    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .action-text {
      color: var(--color-accent);

      &.action-disabled {
        color: var(--color-muted);
        cursor: default;
      }
    }

    &.expanded .action-text {
      font-weight: 500;
    }

    &.like {
      color: var(--color-muted);

      .action-text {
        color: var(--color-muted);
      }

      &.liked {
        opacity: 0.55;
        cursor: not-allowed;
      }

      &.disabled {
        cursor: default;
        opacity: 0.75;
      }
    }
  }
}

.suggestion-box {
  margin-top: 8px;
  background: var(--color-paper-2);
  border: 1px solid var(--color-rule);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.7;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.empty-hint {
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
  padding: 30px 0;
}
.narration-tip {
  /* v1.2 嵌入式文字（报告页白底：中灰无底块） */
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: var(--color-muted);
  padding: 2px 12px;
  line-height: 1.6;
}

.btn-caret { vertical-align: -2px; margin-left: 2px; font-size: 12px; }
</style>
