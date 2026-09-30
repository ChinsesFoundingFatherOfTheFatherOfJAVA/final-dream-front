<template>
  <footer class="pagination-bar">
    <span>共 {{ total }} 条</span>
    <button type="button" :disabled="page <= 1" @click="go(page - 1)">‹</button>
    <button
      v-for="item in pages"
      :key="item.key"
      type="button"
      :class="{ active: item.page === page }"
      :disabled="item.page === null"
      @click="item.page && go(item.page)"
    >
      {{ item.label }}
    </button>
    <button type="button" :disabled="page >= pageCount" @click="go(page + 1)">›</button>
    <select :value="pageSize" @change="changeSize(Number(($event.target as HTMLSelectElement).value))">
      <option :value="10">10 条/页</option>
      <option :value="20">20 条/页</option>
      <option :value="30">30 条/页</option>
      <option :value="40">40 条/页</option>
    </select>
    <span class="jump-label">前往</span>
    <input
      v-model.number="jump"
      type="number"
      min="1"
      :max="pageCount"
      @keyup.enter="jumpPage"
    />
    <span>页</span>
  </footer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  page: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
  change: []
}>()

const jump = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => {
  const result: Array<{ key: string; label: string; page: number | null }> = []
  const count = pageCount.value
  const current = props.page
  const numbers = new Set<number>([1, count, current - 1, current, current + 1])
  const sorted = [...numbers].filter(value => value >= 1 && value <= count).sort((a, b) => a - b)
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push({ key: `gap-${previous}`, label: '...', page: null })
    result.push({ key: `page-${value}`, label: String(value), page: value })
    previous = value
  }
  return result
})

function go(next: number) {
  const value = Math.max(1, Math.min(pageCount.value, next))
  if (value === props.page) return
  emit('update:page', value)
  emit('change')
}

function changeSize(size: number) {
  emit('update:pageSize', size)
  emit('update:page', 1)
  emit('change')
}

function jumpPage() {
  go(jump.value || 1)
}
</script>

<style scoped lang="scss">
.pagination-bar {
  min-height: 66px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: #667085;
  font-size: 13px;

  button,
  select,
  input {
    height: 32px;
    border: 1px solid #d9deea;
    border-radius: 5px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
  }

  button {
    min-width: 32px;
    padding: 0 8px;
    cursor: pointer;

    &:disabled {
      color: #c1c7d1;
      cursor: not-allowed;
    }

    &.active {
      border-color: #2e7cf6;
      background: #2e7cf6;
      color: #fff;
    }
  }

  select {
    margin-left: 6px;
    padding: 0 8px;
  }

  input {
    width: 54px;
    padding: 0 8px;
    text-align: center;
  }
}

.jump-label {
  margin-left: 6px;
}

@media (max-width: 640px) {
  .pagination-bar {
    min-height: 0;
    flex-wrap: wrap;
    justify-content: center;
    padding: 12px 0;
  }

  .jump-label,
  .pagination-bar > input,
  .pagination-bar > span:last-child {
    display: none;
  }

  .pagination-bar select {
    margin-left: 0;
  }
}
</style>
