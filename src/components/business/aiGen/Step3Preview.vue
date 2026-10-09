<template>
  <!-- SG-07 第三步话术预览：气泡对话流（学员右/陪练者左）+ 勾选导入 -->
  <div class="step3">
    <div class="header-row">
      <span class="ai-tag">AI生成</span>
      <button class="btn-text-back" :disabled="generating" @click="emit('back')">‹ 返回上一页</button>
    </div>

    <div class="notice-bar">
      以下为AI生成的话术，如不符合预期，可点击左侧按钮返回上一页更改/补充相关信息后重新生成。AI生成内容不完全可靠，导入话术后，建议仔细审查及修改！
    </div>

    <div class="dialog-list">
      <div v-for="(round, i) in rounds" :key="round.round" class="round-block">
        <div class="round-divider">第 {{ i + 1 }} 轮</div>

        <!-- 陪练者气泡：固定左侧（浅紫底） -->
        <div class="bubble-row trainer">
          <div class="avatar trainer-avatar">陪</div>
          <div class="bubble trainer-bubble">
            <p class="speaker-name">陪练者</p>
            <p class="bubble-text">{{ round.trainerQuestion }}</p>
          </div>
        </div>

        <!-- 学员卡片：checkbox + 白底气泡（右侧）+ 要点/解析 -->
        <div class="student-block">
          <input
            type="checkbox"
            class="round-check"
            :checked="checked.has(i)"
            @change="toggle(i, ($event.target as HTMLInputElement).checked)"
          />
          <div class="bubble-row student">
            <div class="bubble student-bubble">
              <p class="speaker-name">学员</p>
              <p class="bubble-text">{{ round.standardScript }}</p>
            </div>
            <div class="avatar student-avatar">学</div>
          </div>
          <div class="analysis-block">
            <p class="analysis-title">要点</p>
            <p class="analysis-text">
              <template v-if="round.keyPoints?.length">
                {{ round.keyPoints.map((k) => k.content).join('；') }}
              </template>
              <template v-else>--</template>
            </p>
            <p class="analysis-title">解析</p>
            <p class="analysis-text">{{ round.analysis || '--' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <label class="check-all">
        <input type="checkbox" :checked="allChecked" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
        全选
      </label>
      <button class="btn-gradient" :disabled="!checked.size" :title="!checked.size ? '请勾选要导入的话术' : ''" @click="handleImport">
        导入已选话术
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from '@/utils/toast'
import { importScript, type RoundItem } from '@/api/aiGen'

/**
 * 第三步话术预览（SG-07/08）：
 * 微信式气泡（学员右白底/陪练者左浅紫底——与原平台镜像，用户拍板）；
 * 勾选轮次调后端 import-script 编排，拿 nodes/edges 透传流程设计器（沿用旧导入链路）。
 */
const props = defineProps<{
  rounds: RoundItem[]
  language: string
  firstSpeaker: string
  sessionId: string
  generating: boolean
}>()

const emit = defineEmits<{
  back: []
  imported: [nodes: any[], edges: any[]]
}>()

const checked = ref(new Set<number>())

const allChecked = computed(
  () => props.rounds.length > 0 && props.rounds.every((_, i) => checked.value.has(i))
)

const toggle = (index: number, value: boolean) => {
  if (value) checked.value.add(index)
  else checked.value.delete(index)
}

const toggleAll = (value: boolean) => {
  checked.value = value ? new Set(props.rounds.map((_, i) => i)) : new Set()
}

const handleImport = async () => {
  const selected = Array.from(checked.value).sort((a, b) => a - b)
    .map((i) => props.rounds[i])
    .filter((r): r is RoundItem => !!r)
  try {
    const res: any = await importScript({
      sessionId: props.sessionId,
      firstSpeaker: props.firstSpeaker,
      rounds: selected
    })
    emit('imported', res.nodes || [], res.edges || [])
  } catch (e: any) {
    toast.error(e?.message || '导入失败')
  }
}
</script>

<style scoped lang="scss">
.step3 {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .ai-tag {
    background: #6b5ce7;
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
    padding: 2px 8px;
  }
}

.btn-text-back {
  border: none;
  background: none;
  color: #6b5ce7;
  font-size: 13px;
  cursor: pointer;
}

.notice-bar {
  background: #f5f5f7;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.7;
}

.dialog-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
}

.round-block { margin-bottom: 6px; }

.round-divider {
  text-align: center;
  font-size: 12px;
  color: #bbb;
  margin: 10px 0;
}

.bubble-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;

  &.student { justify-content: flex-end; } // 学员固定右
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;

  &.trainer-avatar { background: linear-gradient(135deg, #ffa76b, #ff7a45); }
  &.student-avatar { background: linear-gradient(135deg, #69c0ff, #1e6fff); }
}

.bubble {
  max-width: 68%;
  border-radius: 10px;
  padding: 10px 14px;

  .speaker-name { margin: 0 0 4px; font-size: 11px; color: #999; }
  .bubble-text { margin: 0; font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap; }

  &.trainer-bubble { background: #efeaff; } // 陪练者浅紫底
  &.student-bubble { background: #fff; border: 1px solid #e8e8e8; } // 学员白底
}

.student-block {
  position: relative;
  padding-left: 26px;

  .round-check {
    position: absolute;
    left: 0;
    top: 24px;
    accent-color: #1e6fff;
  }
}

.analysis-block {
  margin: 0 44px 14px 44px;
  background: #fafafa;
  border-radius: 6px;
  padding: 8px 12px;

  .analysis-title {
    margin: 0 0 2px;
    font-size: 12px;
    color: #999;
    font-weight: 500;

    & + .analysis-text { margin-bottom: 8px; }
  }

  .analysis-text {
    margin: 0;
    font-size: 12px;
    color: #8c8c8c;
    line-height: 1.7;
  }
}

.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;

  .check-all {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #333;
    cursor: pointer;

    input { accent-color: #1e6fff; }
  }
}

.btn-gradient {
  padding: 10px 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #8f7bff, #6b5ce7);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { opacity: 0.92; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
