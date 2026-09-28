<template>
  <teleport to="body">
    <div v-if="visible" class="picker-overlay" @click.self="close">
      <section class="picker-dialog">
        <header class="picker-header">
          <h3>{{ title }}</h3>
          <button type="button" class="icon-btn" aria-label="关闭" @click="close">×</button>
        </header>

        <div class="picker-toolbar">
          <label>
            <input
              type="checkbox"
              :checked="allChecked"
              @change="toggleAll"
            />
            全选
          </label>
          <span>已选 {{ selected.length }} 项</span>
        </div>

        <div class="picker-body">
          <label v-for="item in options" :key="item.value" class="option-row">
            <input
              type="checkbox"
              :checked="selected.includes(item.value)"
              @change="toggle(item.value)"
            />
            <span class="option-label" :style="{ paddingLeft: `${item.depth * 18}px` }">
              {{ item.label }}
            </span>
            <span v-if="item.count != null" class="option-count">{{ item.count }}人</span>
          </label>
          <p v-if="!options.length" class="empty-hint">暂无可选项</p>
        </div>

        <footer class="picker-footer">
          <button type="button" class="plain-btn" @click="close">取消</button>
          <button type="button" class="primary-btn" @click="confirm">确定</button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DepartmentNode, PositionOption } from '@/types/speechAdmin'

interface OptionRow {
  value: string
  label: string
  depth: number
  count?: number
}

const props = defineProps<{
  visible: boolean
  title: string
  mode: 'dept' | 'position'
  modelValue: string[]
  departments: DepartmentNode[]
  positions: PositionOption[]
}>()

const emit = defineEmits<{
  close: []
  'update:modelValue': [value: string[]]
}>()

const selected = ref<string[]>([])

const deptOptions = computed(() => {
  const byParent = new Map<string, DepartmentNode[]>()
  const codes = new Set(props.departments.map((dept) => dept.deptCode))
  for (const dept of props.departments) {
    const parent = dept.parentCode && codes.has(dept.parentCode) ? dept.parentCode : ''
    const list = byParent.get(parent) ?? []
    list.push(dept)
    byParent.set(parent, list)
  }

  const rows: OptionRow[] = []
  const visit = (parentCode: string, depth: number) => {
    for (const dept of byParent.get(parentCode) ?? []) {
      rows.push({
        value: dept.deptCode || dept.deptId,
        label: dept.deptName,
        depth,
        count: dept.userCount
      })
      visit(dept.deptCode, depth + 1)
    }
  }
  visit('', 0)
  return rows
})

const options = computed<OptionRow[]>(() => {
  if (props.mode === 'dept') return deptOptions.value
  return props.positions.map((position) => ({
    value: position.positionName,
    label: position.positionName,
    depth: 0,
    count: position.userCount
  }))
})

const allChecked = computed(
  () => options.value.length > 0 && options.value.every((item) => selected.value.includes(item.value))
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) selected.value = [...props.modelValue]
  }
)

const toggle = (value: string) => {
  selected.value = selected.value.includes(value)
    ? selected.value.filter((item) => item !== value)
    : [...selected.value, value]
}

const toggleAll = () => {
  selected.value = allChecked.value ? [] : options.value.map((item) => item.value)
}

const close = () => emit('close')

const confirm = () => {
  emit('update:modelValue', selected.value)
  close()
}
</script>

<style scoped lang="scss">
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.42);
}

.picker-dialog {
  width: 480px;
  max-width: 100%;
  max-height: min(680px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(15, 23, 42, 0.2);
}

.picker-header,
.picker-toolbar,
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.picker-header {
  border-bottom: 1px solid #eef0f5;

  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 16px;
  }
}

.icon-btn {
  border: none;
  background: transparent;
  color: #8a92a5;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.picker-toolbar {
  color: #7a8396;
  font-size: 13px;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #374151;
    cursor: pointer;
  }
}

.picker-body {
  flex: 1;
  min-height: 160px;
  max-height: 460px;
  padding: 4px 12px 12px;
  overflow-y: auto;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 8px;
  border-radius: 7px;
  color: #374151;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f5f8ff;
  }

  input {
    flex-shrink: 0;
  }
}

.option-label {
  flex: 1;
  min-width: 0;
}

.option-count {
  color: #9aa3b2;
  font-size: 12px;
}

.empty-hint {
  padding: 36px 0;
  text-align: center;
  color: #9aa3b2;
  font-size: 13px;
}

.picker-footer {
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eef0f5;
}

.plain-btn,
.primary-btn {
  min-width: 80px;
  height: 36px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 14px;
  cursor: pointer;
}

.plain-btn {
  border: 1px solid #d9deea;
  background: #fff;
  color: #4d5568;
}

.primary-btn {
  border: none;
  background: #2e7cf6;
  color: #fff;
}
</style>
