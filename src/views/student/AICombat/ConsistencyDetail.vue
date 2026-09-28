<template>
  <teleport to="body">
    <transition name="consistency-fade">
      <div v-if="visible" class="consistency-overlay" @click.self="close">
        <div class="consistency-modal">
          <div class="modal-header">
            <span class="modal-title">话术一致性详情</span>
            <span class="modal-close" @click="close">×</span>
          </div>
          <div class="modal-body">
            <div v-if="loading" class="state-hint">加载中...</div>
            <div v-else-if="error" class="state-hint">{{ error }}</div>
            <template v-else>
              <div v-for="round in rounds" :key="round.seq" class="round-block">
                <div class="round-title">第 {{ round.seq }} 轮</div>
                <div class="round-line">
                  <span class="role-label">陪练者问：</span>
                  <span class="role-text">{{ round.trainerQuestion }}</span>
                </div>
                <div class="round-line">
                  <span class="role-label">学员答：</span>
                  <span class="role-text">{{ round.studentAnswer }}</span>
                </div>
                <div class="round-points">
                  <span v-for="(point, i) in round.keyPoints" :key="i" class="point-tag" :class="point.hit ? 'hit' : 'miss'">
                    {{ point.hit ? '✓' : '✗' }} {{ point.content }}
                  </span>
                </div>
              </div>
              <div v-if="!rounds.length" class="state-hint">暂无数据</div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getConsistency } from '@/api/student'
import type { ConsistencyRound } from '@/types/student'

const props = defineProps<{
  visible: boolean
  reportId: string
  userId?: string
}>()

const emit = defineEmits<{ close: [] }>()

const rounds = ref<ConsistencyRound[]>([])
const loading = ref(false)
const error = ref('')

const close = () => emit('close')

watch(
  () => props.visible,
  async (val) => {
    if (!val || !props.reportId) return
    loading.value = true
    error.value = ''
    rounds.value = []
    try {
      const data = await getConsistency(props.reportId, { userId: props.userId })
      rounds.value = data?.rounds ?? []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }
)
</script>

<style scoped lang="scss">
.consistency-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.consistency-modal {
  width: 560px;
  max-width: calc(100vw - 48px);
  max-height: 78vh;
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #222;
  }

  .modal-close {
    font-size: 22px;
    color: #999;
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: #333;
    }
  }
}

.modal-body {
  padding: 16px 20px 20px;
  overflow-y: auto;
}

.round-block {
  background: #fafbfd;
  border: 1px solid #eef0f5;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .round-title {
    font-size: 13px;
    font-weight: 600;
    color: #2e7cf6;
    margin-bottom: 8px;
  }

  .round-line {
    display: flex;
    gap: 6px;
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 4px;

    .role-label {
      color: #999;
      flex-shrink: 0;
    }

    .role-text {
      color: #444;
    }
  }

  .round-points {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;

    .point-tag {
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 12px;

      &.hit {
        background: #eafaf0;
        color: #38b25c;
      }

      &.miss {
        background: #fff1f0;
        color: #e54545;
      }
    }
  }
}

.state-hint {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 30px 0;
}

.consistency-fade-enter-active,
.consistency-fade-leave-active {
  transition: opacity 0.18s ease;
}

.consistency-fade-enter-from,
.consistency-fade-leave-to {
  opacity: 0;
}
</style>
