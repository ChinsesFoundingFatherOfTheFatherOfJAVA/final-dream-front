<template>
  <!-- F22 列设置抽屉：显隐 + 排序；account/fullname/operation 为保留列，勾选框禁用 -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>列设置</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <p class="tip">账号、姓名、操作列为固定列，不可隐藏。</p>
        <ul class="col-list">
          <li v-for="(c, i) in columns" :key="c.key" class="col-item"
              :class="{ dragging: dragIndex === i, 'drag-over': overIndex === i && dragIndex !== i }"
              draggable="true"
              @dragstart="onDragStart(i, $event)"
              @dragover.prevent="onDragOver(i)"
              @drop.prevent="onDrop(i)"
              @dragend="onDragEnd">
            <span class="drag-handle" title="拖拽调整顺序">⠿</span>
            <label class="col-check">
              <el-checkbox :disabled="isLocked(c.key)" :model-value="c.visible"
                     @change="toggle(i, Boolean($event))" />
              <span :class="{ locked: isLocked(c.key) }">{{ labelOf(c.key) }}</span>
            </label>
            <span class="col-actions">
              <el-button class="mini" :disabled="i === 0" @click="move(i, -1)">↑</el-button>
              <el-button class="mini" :disabled="i === columns.length - 1" @click="move(i, 1)">↓</el-button>
            </span>
          </li>
        </ul>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="resetDefault">恢复默认</el-button>
        <span class="spacer"></span>
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '确定' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  getStudentColumns, saveStudentColumns, LOCKED_STUDENT_COLUMNS, STUDENT_COLUMN_LABELS,
  type ArrangeColumnSetting
} from '@/api/arrange'

const emit = defineEmits<{ close: []; saved: [] }>()

const columns = ref<ArrangeColumnSetting[]>([])
const saving = ref(false)
/** 拖拽排序状态：dragIndex 为起点，overIndex 为当前悬停目标。 */
const dragIndex = ref(-1)
const overIndex = ref(-1)

const isLocked = (key: string) => LOCKED_STUDENT_COLUMNS.includes(key)
const labelOf = (key: string) => STUDENT_COLUMN_LABELS[key] ?? key

const toggle = (index: number, checked: boolean) => {
  const col = columns.value[index]
  if (col) col.visible = checked
}

const move = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= columns.value.length) return
  const list = columns.value
  const [item] = list.splice(index, 1)
  if (!item) return
  list.splice(target, 0, item)
  columns.value = [...list]
}

/**
 * 原生 HTML5 拖拽排序（不引第三方库）。
 *
 * <p>拖到目标位置时"取出一条、插入到目标下标"，与 ↑/↓ 复用同一套数组语义；
 * dragstart 必须在 dataTransfer 里写点东西，否则 Firefox 不会触发 drop。
 */
const onDragStart = (index: number, event: DragEvent) => {
  dragIndex.value = index
  overIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}
const onDragOver = (index: number) => {
  if (dragIndex.value >= 0) overIndex.value = index
}
const onDrop = (index: number) => {
  const from = dragIndex.value
  if (from < 0 || from === index) {
    onDragEnd()
    return
  }
  const list = [...columns.value]
  const [item] = list.splice(from, 1)
  if (item) list.splice(index, 0, item)
  columns.value = list
  onDragEnd()
}
const onDragEnd = () => {
  dragIndex.value = -1
  overIndex.value = -1
}

const resetDefault = () => {
  const order = Object.keys(STUDENT_COLUMN_LABELS)
  columns.value = order.map((key, i) => ({ key, visible: true, order: i + 1 }))
}

const save = async () => {
  saving.value = true
  try {
    const payload = columns.value.map((c, i) => ({ key: c.key, visible: c.visible, order: i + 1 }))
    await saveStudentColumns(payload)
    toast.success('列设置已保存')
    emit('saved')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getStudentColumns()
    columns.value = (res.columns || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch {
    resetDefault()
  }
})
</script>

<style scoped lang="scss">
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3200; }
.drawer { width: 420px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600; .close-btn { font-size: 22px; color: #999; cursor: pointer; } }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.tip { margin: 0 0 12px; font-size: 12px; color: #a0a7b8; }
.col-list { margin: 0; padding: 0; list-style: none; }
.col-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 4px; border-bottom: 1px dashed #f0f2f5;
  &.dragging { opacity: .45; }
  &.drag-over { box-shadow: inset 0 2px 0 #1890ff; }
}
.drag-handle { flex: none; color: #b0b7c3; font-size: 14px; cursor: grab; user-select: none; &:active { cursor: grabbing; } }
.col-check { flex: 1; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #4a5368; cursor: pointer; input { accent-color: #1890ff; } .locked { color: #b0b7c3; } }
.col-actions { display: flex; gap: 6px; }
.mini { width: 26px; height: 24px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; color: #4a5368; &:disabled { opacity: .45; cursor: not-allowed; } }
.drawer-footer { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: 1px solid #eee; .spacer { flex: 1; } }
.btn { padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer; &.primary { background: #1890ff; border-color: #1890ff; color: #fff; } &:disabled { opacity: .6; } }
</style>
