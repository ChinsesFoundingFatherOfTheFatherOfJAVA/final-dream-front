<template>
  <!-- 考核点选择器（对齐原平台）：
       点击输入框 → 弹出可滚动列表（已选项打勾）+ 底部「编辑」；
       「编辑」打开 PointEditorDrawer，里面可增/改/删该题库下的全部考核点。 -->
  <div class="point-picker">
    <div class="picker-field" @click.stop="toggleOpen">
      <template v-if="selected.length">
        <span v-for="point in selected" :key="point.id" class="point-tag">
          {{ point.name }}
          <i @click.stop="removePoint(point.id)">×</i>
        </span>
      </template>
      <span v-else class="placeholder">请选择考核点</span>
      <span class="caret" :class="{ open }">⌄</span>
    </div>

    <div v-if="open" class="picker-dropdown" @click.stop>
      <div class="point-list">
        <div v-for="point in allPoints" :key="point.id"
             class="point-option" :class="{ active: isSelected(point.id) }"
             @click="togglePoint(point.id)">
          <span class="name">{{ point.name }}</span>
          <span v-if="isSelected(point.id)" class="check">✓</span>
        </div>
        <p v-if="!allPoints.length" class="empty">该题库下暂无考核点</p>
      </div>

      <el-button class="edit-btn" @click="openEditor">
        <span class="pencil">✎</span> 编辑
      </el-button>
    </div>

    <PointEditorDrawer
      v-if="showEditor"
      :lib-id="libId"
      @close="showEditor = false"
      @changed="onPointsChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getPointList, type PointItem } from '@/api/exam'
import PointEditorDrawer from './PointEditorDrawer.vue'

const props = defineProps<{ libId: string, modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]], changed: [] }>()

const allPoints = ref<PointItem[]>([])
const open = ref(false)
const showEditor = ref(false)

const selected = computed(() => allPoints.value.filter(p => props.modelValue.includes(p.id)))

const isSelected = (id: string) => props.modelValue.includes(id)

const toggleOpen = () => { open.value = !open.value }

const togglePoint = (id: string) => {
  const next = isSelected(id)
    ? props.modelValue.filter(pid => pid !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}

const removePoint = (id: string) => {
  emit('update:modelValue', props.modelValue.filter(pid => pid !== id))
}

const loadPoints = async () => {
  try {
    allPoints.value = await getPointList(props.libId)
  } catch { /* 拦截器已提示 */ }
}

const openEditor = () => {
  open.value = false
  showEditor.value = true
}

/** 抽屉里改了考核点：重新拉列表，并清掉已经被删掉的选择。 */
const onPointsChanged = async () => {
  await loadPoints()
  const validIds = new Set(allPoints.value.map(p => p.id))
  const kept = props.modelValue.filter(id => validIds.has(id))
  if (kept.length !== props.modelValue.length) {
    emit('update:modelValue', kept)
  }
  emit('changed')
}

watch(() => props.libId, () => { loadPoints() })

onMounted(loadPoints)

defineExpose({ loadPoints })
</script>

<style scoped lang="scss">
.point-picker { position: relative; }

.picker-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 4px 26px 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover { border-color: #1890ff; }

  .placeholder { color: #b0b7c3; }

  .caret {
    position: absolute;
    right: 10px;
    color: #8a92a5;
    font-size: 12px;
    transition: transform .16s ease;

    &.open { transform: rotate(180deg); }
  }
}

.point-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid #d6e4ff;
  border-radius: 3px;
  background: #f0f5ff;
  color: #2f54eb;
  font-size: 12px;

  i { font-style: normal; color: #8a92a5; cursor: pointer; &:hover { color: #f5222d; } }
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  overflow: hidden;
}

/* 考核点多时列表自身滚动（原平台同款） */
.point-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.point-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  &:hover { background: #f3f7ff; }
  &.active { color: #1890ff; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .check { color: #1890ff; }
}

.empty { text-align: center; color: #b0b7c3; font-size: 12px; padding: 20px 0; margin: 0; }

.edit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-top: 1px solid #eef1f6;
  background: #fafbfd;
  font-size: 13px;
  color: #4a5368;
  text-align: left;
  cursor: pointer;

  &:hover { background: #f3f7ff; color: #1890ff; }
  .pencil { font-size: 12px; }
}
</style>