<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="480px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div class="picker-toolbar">
      <el-checkbox v-if="mode === 'position'" :model-value="allChecked" @change="toggleAll">
        全选
      </el-checkbox>
      <span>已选 {{ selected.length }} 项</span>
    </div>

    <div class="picker-body">
      <DeptTree
        v-if="mode === 'dept'"
        v-model="selected"
        :data="departments"
        mode="check"
        searchable
        show-count
        search-placeholder="搜索部门"
      />
      <template v-else>
        <el-checkbox
          v-for="item in options"
          :key="item.value"
          class="option-row"
          :model-value="selected.includes(item.value)"
          @change="toggle(item.value)"
        >
          <span class="option-label">{{ item.label }}</span>
          <span v-if="item.count != null" class="option-count">{{ item.count }}人</span>
        </el-checkbox>
        <el-empty v-if="!options.length" description="暂无可选项" :image-size="64" />
      </template>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeptTree from '@/components/common/DeptTree.vue'
import type { DepartmentNode, PositionOption } from '@/types/speechAdmin'

interface OptionRow {
  value: string
  label: string
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

const options = computed<OptionRow[]>(() => {
  if (props.mode === 'dept') return []
  return props.positions.map((position) => ({
    value: position.positionName,
    label: position.positionName,
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

const handleVisibleChange = (visible: boolean) => {
  if (!visible) close()
}

const confirm = () => {
  emit('update:modelValue', selected.value)
  close()
}
</script>

<style scoped lang="scss">
.picker-toolbar,
.picker-body {
  display: flex;
}

.picker-toolbar {
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #7a8396;
  font-size: 13px;
}

.picker-body {
  flex-direction: column;
  min-height: 160px;
  max-height: 460px;
  padding: 4px 12px 12px;
  overflow-y: auto;
}

.option-row {
  width: 100%;
  min-height: 40px;
  margin-right: 0;
  padding: 0 8px;
  border-radius: 7px;
  color: #374151;
  font-size: 14px;

  &:hover {
    background: #f5f8ff;
  }

  :deep(.el-checkbox__label) {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #374151;
    font-size: 14px;
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

</style>
