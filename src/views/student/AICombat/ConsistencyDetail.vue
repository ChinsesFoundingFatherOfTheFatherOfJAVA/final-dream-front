<template>
  <el-dialog
    :model-value="visible"
    title="话术一致性详情"
    width="560px"
    append-to-body
    @close="close"
  >
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
  </el-dialog>
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
.modal-body {
  max-height: 62vh;
  padding: 4px 0 0;
  overflow-y: auto;
}

.round-block {
  background: var(--color-paper-2);
  border: 1px solid var(--color-rule);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .round-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: 8px;
  }

  .round-line {
    display: flex;
    gap: 6px;
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 4px;

    .role-label {
      color: var(--color-muted);
      flex-shrink: 0;
    }

    .role-text {
      color: var(--color-ink-2);
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
        background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper));
        color: var(--color-success);
      }

      &.miss {
        background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
        color: var(--color-error);
      }
    }
  }
}

.state-hint {
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
  padding: 30px 0;
}

</style>
