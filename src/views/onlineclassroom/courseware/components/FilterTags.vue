<template>
  <div v-if="tags.length" class="filter-tags">
    <button v-for="tag in tags" :key="tag.key" type="button" @click="emit('remove', tag.key)">
      <span>{{ tag.label }}</span>
      <i>×</i>
    </button>
    <button type="button" class="clear-all" @click="emit('clear')">清空</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CoursewareFilters } from './FilterDrawer.vue'

const props = defineProps<{ filters: Partial<CoursewareFilters> }>()
const emit = defineEmits<{ remove: [key: string]; clear: [] }>()

const tags = computed(() => {
  const result: Array<{ key: string; label: string }> = []
  if (props.filters.onSale !== null && props.filters.onSale !== undefined) {
    result.push({ key: 'onSale', label: `是否上架：${props.filters.onSale === 1 ? '是' : '否'}` })
  }
  if (props.filters.quoted !== null && props.filters.quoted !== undefined) {
    result.push({ key: 'quoted', label: `是否被课程引用：${props.filters.quoted === 1 ? '是' : '否'}` })
  }
  if (props.filters.uploadTimeStart || props.filters.uploadTimeEnd) {
    result.push({
      key: 'uploadTime',
      label: `上传时间：${props.filters.uploadTimeStart || '不限'} ~ ${props.filters.uploadTimeEnd || '不限'}`
    })
  }
  if (props.filters.updateTimeStart || props.filters.updateTimeEnd) {
    result.push({
      key: 'updateTime',
      label: `更新时间：${props.filters.updateTimeStart || '不限'} ~ ${props.filters.updateTimeEnd || '不限'}`
    })
  }
  return result
})
</script>

<style scoped lang="scss">
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;

  button {
    height: 30px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border: 1px solid #b9d3ff;
    border-radius: 5px;
    background: #f7faff;
    color: #426a9f;
    font-size: 12px;
    cursor: pointer;
  }

  i {
    color: #7b8ca5;
    font-style: normal;
  }

  .clear-all {
    border-color: transparent;
    background: transparent;
    color: #7b8496;
  }
}
</style>
