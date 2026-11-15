<template>
  <!-- F22 列设置抽屉：显隐 + 排序；account/fullname/operation 为保留列，勾选框禁用 -->
    <el-drawer
    :model-value="true"
    size="420px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>请选择需要展示的列</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <p class="tip">账号、姓名、操作列为固定列，不可隐藏。</p>
        <!-- 原平台面板首项是「全部」全选开关，下面才是具体列；保留列不受影响 -->
        <div class="col-all">
          <el-checkbox
            :model-value="allVisible"
            :indeterminate="someVisible"
            @change="toggleAll(Boolean($event))"
          >
            全部
          </el-checkbox>
        </div>
        <ul class="col-list">
          <li v-for="(c, i) in columns" :key="c.key" class="col-item"
              :class="{ dragging: dragIndex === i, 'drag-over': overIndex === i && dragIndex !== i }"
              draggable="true"
              @dragstart="onDragStart(i, $event)"
              @dragover.prevent="onDragOver(i)"
              @drop.prevent="onDrop(i)"
              @dragend="onDragEnd">
            <span class="drag-handle" title="拖拽调整顺序" aria-hidden="true">⠿</span>
            <label class="col-check">
              <el-checkbox :disabled="isLocked(c.key)" :model-value="c.visible"
                     @change="toggle(i, Boolean($event))" />
              <span :class="{ locked: isLocked(c.key) }">{{ labelOf(c.key) }}</span>
            </label>
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
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'
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

// 「全部」全选只作用于可隐藏列：保留列本来就恒为可见，不计入全选状态判断，
// 否则永远不会出现「已全选」也无法取消。
const toggleable = computed(() => columns.value.filter(c => !isLocked(c.key)))
const allVisible = computed(() =>
  toggleable.value.length > 0 && toggleable.value.every(c => c.visible))
const someVisible = computed(() =>
  toggleable.value.some(c => c.visible) && !allVisible.value)

const toggleAll = (checked: boolean) => {
  for (const col of columns.value) {
    if (isLocked(col.key)) continue
    col.visible = checked
  }
  // 就地改属性不会新增响应依赖，整体替换一份让模板重新求值
  columns.value = [...columns.value]
}

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

/**
 * 打开抽屉时加载列设置，并**补齐库里没有的新列**（2026-11-13，用户批注）。
 *
 * <p>问题现象：抽屉里只显示「账号 / 姓名 / 部门 / 操作」4 项，
 * 而这一版实际支持 26 列。原因是列设置持久化在库里，用户早期只保存过 4 条记录，
 * 直接按它渲染就只剩 4 项 —— 用户根本看不到（也打不开）后面那 22 列。
 *
 * <p>处理与表格侧 `tableColumns` 保持一致：以库里的设置（顺序 + 显隐）为准，
 * 把「库里没有、当前版本已支持」的列按默认顺序补在末尾、默认可见，
 * 且「操作」列压尾。这样用户手动隐藏的列不会被翻出来，新列也不会凭空消失。
 */
onMounted(async () => {
  const allKeys = Object.keys(STUDENT_COLUMN_LABELS)
  try {
    const res = await getStudentColumns()
    const saved = (res.columns || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (!saved.length) {
      resetDefault()
      return
    }
    const savedKeys = new Set(saved.map((c) => c.key))
    const missing = allKeys.filter((k) => !savedKeys.has(k))
    const merged: ArrangeColumnSetting[] = [
      ...saved,
      ...missing.map((key, i) => ({ key, visible: true, order: saved.length + i + 1 }))
    ]
    // 「操作」压尾，与表格侧一致
    const opIdx = merged.findIndex((c) => c.key === 'operation')
    if (opIdx >= 0) {
      const [op] = merged.splice(opIdx, 1)
      if (op) merged.push(op)
    }
    columns.value = merged
  } catch {
    resetDefault()
  }
})
</script>

<style scoped lang="scss">
/* 2026-11-14 Hallmark Cobalt 重构：裸色值清零，颜色统一走 token 层 */
.drawer { width: 420px; height: 100%; background: var(--color-paper); display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: var(--rule-hair) solid var(--color-rule); font-size: 15px; font-weight: 600; .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; border-radius: 4px; } } }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.tip { margin: 0 0 12px; font-size: 12px; color: var(--color-muted); }
// 原平台面板首项是「全部」全选开关，与列表之间用细分割线隔开
.col-all { padding: 2px 4px 10px; border-bottom: var(--rule-hair) solid var(--color-paper-3); margin-bottom: 4px; :deep(.el-checkbox__label) { font-size: 13px; font-weight: 500; color: var(--color-ink-2); } }
.col-list { margin: 0; padding: 0; list-style: none; }
.col-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 4px; border-bottom: 1px dashed var(--color-rule);
  &.dragging { opacity: .45; }
  &.drag-over { box-shadow: inset 0 2px 0 var(--color-accent); }
}
.drag-handle { flex: none; color: var(--color-rule-2); font-size: 14px; cursor: grab; user-select: none; &:active { cursor: grabbing; } }
.col-check { flex: 1; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-ink-2); cursor: pointer; .locked { color: var(--color-rule-2); } }
.col-actions { display: flex; gap: 6px; }
// 幽灵图标按钮（与 QuesBodyForm 口径一致）
.mini { width: 26px; height: 24px; padding: 0; border: none; border-radius: 4px; background: transparent; cursor: pointer; color: var(--color-muted); .el-icon { font-size: 14px; } &:hover:not(:disabled) { color: var(--color-accent-deep); background: var(--color-accent-wash); } &:disabled { color: var(--color-rule-2); cursor: not-allowed; } &:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; } }
.drawer-footer { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: var(--rule-hair) solid var(--color-rule); .spacer { flex: 1; } }
.btn { padding: 7px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; &:disabled { opacity: .6; } }
</style>
