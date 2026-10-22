<template>
  <footer class="pagination-bar">
    <span>共 {{ total }} 条</span>
    <el-pagination
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[10, 20, 30, 40]"
      :total="total"
      layout="sizes, prev, pager, next, jumper"
      background
      @current-change="go"
      @size-change="changeSize"
    />
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

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

  :deep(.el-pagination) {
    margin-left: auto;
  }
}

@media (max-width: 640px) {
  .pagination-bar {
    min-height: 0;
    flex-wrap: wrap;
    justify-content: center;
    padding: 12px 0;
  }

  :deep(.el-pagination__jump),
  :deep(.el-pagination__sizes) {
    display: none;
  }
}
</style>
