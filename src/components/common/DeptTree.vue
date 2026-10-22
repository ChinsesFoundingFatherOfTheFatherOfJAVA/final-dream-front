<template>
  <div class="dept-tree" role="tree">
    <div v-if="searchable" class="tree-search">
      <el-input v-model.trim="keyword" :placeholder="searchPlaceholder" clearable />
    </div>

    <div class="tree-body">
      <div
        v-if="includeAll"
        class="tree-row all-row"
        :class="{ selected: mode === 'single' && modelValue === '' }"
        role="treeitem"
        tabindex="0"
        @click="selectAll"
        @keydown.enter="selectAll"
      >
        <span class="tree-arrow placeholder" />
        <span class="tree-label">全部部门</span>
      </div>

      <div
        v-for="row in rows"
        :key="row.node.deptId"
        class="tree-row"
        :class="{
          selected: mode === 'single' && modelValue === row.node.deptId,
          muted: keyword && !matchedPaths.has(row.node.deptPath)
        }"
        role="treeitem"
        :aria-expanded="row.hasChildren ? row.expanded : undefined"
        tabindex="0"
        @click="activate(row)"
        @keydown.enter="activate(row)"
      >
        <!-- 层级缩进放在箭头之前：箭头始终紧贴自己的文字，而不是全部贴在最左边 -->
        <span class="tree-indent" :style="{ width: `${row.depth * 16}px` }" />

        <el-button
          v-if="row.hasChildren"
          link
          class="tree-arrow"
          :class="{ expanded: row.expanded }"
          :aria-label="row.expanded ? '收起' : '展开'"
          @click.stop="toggleExpanded(row.node.deptId)"
        >
          <span />
        </el-button>
        <span v-else class="tree-arrow placeholder" />

        <el-checkbox
          v-if="mode === 'check'"
          :model-value="row.checked"
          :indeterminate="row.indeterminate"
          @click.stop
          @change="toggleChecked(row, Boolean($event))"
        />

        <span class="tree-label">
          {{ row.node.deptName }}
        </span>
        <span v-if="showCount" class="tree-count">{{ row.node.userCount }}</span>
      </div>

      <p v-if="!rows.length" class="tree-empty">暂无部门数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  buildDepartmentTree,
  collectSearchPaths,
  collectSubtreeIds,
  type DepartmentTreeNode,
  type DepartmentTreeSource
} from '@/utils/departmentTree'

interface TreeDepartment extends DepartmentTreeSource {
  userCount: number
}

const props = withDefaults(
  defineProps<{
    data: TreeDepartment[]
    mode?: 'single' | 'check'
    modelValue?: string | string[]
    showCount?: boolean
    searchable?: boolean
    searchPlaceholder?: string
    includeAll?: boolean
  }>(),
  {
    mode: 'single',
    modelValue: '',
    showCount: true,
    searchable: false,
    searchPlaceholder: '搜索部门名称',
    includeAll: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  change: [value: string | string[]]
}>()

interface FlatRow {
  node: TreeDepartment
  depth: number
  hasChildren: boolean
  expanded: boolean
  checked: boolean
  indeterminate: boolean
}

const keyword = ref('')
const expanded = ref<Record<string, boolean>>({})
const roots = computed(() => buildDepartmentTree(props.data))
const rootIds = computed(() => new Set(roots.value.map((root) => root.node.deptId)))
const matchedPaths = computed(() => collectSearchPaths(props.data, keyword.value))
const selectedIds = computed(() =>
  props.mode === 'check' && Array.isArray(props.modelValue) ? props.modelValue : []
)

function isExpanded(deptId: string) {
  return expanded.value[deptId] ?? rootIds.value.has(deptId)
}

function checkState(node: TreeDepartment) {
  const ids = collectSubtreeIds(props.data, node.deptPath)
  const selected = ids.filter((id) => selectedIds.value.includes(id)).length
  return {
    checked: ids.length > 0 && selected === ids.length,
    indeterminate: selected > 0 && selected < ids.length
  }
}

const rows = computed<FlatRow[]>(() => {
  const result: FlatRow[] = []
  const searching = Boolean(keyword.value.trim())
  const keep = matchedPaths.value

  const visit = (treeNode: DepartmentTreeNode<TreeDepartment>, depth: number) => {
    if (searching && !keep.has(treeNode.node.deptPath)) return
    const hasChildren = treeNode.children.length > 0
    const open = searching ? true : isExpanded(treeNode.node.deptId)
    const state = checkState(treeNode.node)
    result.push({
      node: treeNode.node,
      depth,
      hasChildren,
      expanded: open,
      checked: state.checked,
      indeterminate: state.indeterminate
    })
    if (open) {
      for (const child of treeNode.children) visit(child, depth + 1)
    }
  }

  for (const root of roots.value) visit(root, 0)
  return result
})

function toggleExpanded(deptId: string) {
  expanded.value = { ...expanded.value, [deptId]: !isExpanded(deptId) }
}

function activate(row: FlatRow) {
  if (props.mode === 'single') {
    emit('update:modelValue', row.node.deptId)
    emit('change', row.node.deptId)
  }
}

function selectAll() {
  if (props.mode !== 'single') return
  emit('update:modelValue', '')
  emit('change', '')
}

function toggleChecked(row: FlatRow, checked: boolean) {
  const ids = collectSubtreeIds(props.data, row.node.deptPath)
  const next = new Set(selectedIds.value)
  for (const id of ids) {
    if (checked) next.add(id)
    else next.delete(id)
  }
  const value = Array.from(next)
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped lang="scss">
.dept-tree {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tree-search {
  padding: 0 10px 10px;

  :deep(.el-input__wrapper) {
    min-height: 34px;
    border-radius: 6px;
    box-shadow: 0 0 0 1px #d9deea inset;
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #1890ff inset, 0 0 0 2px rgba(24, 144, 255, 0.1);
  }
}

.tree-body {
  flex: 1 1 auto;
  min-height: 80px;
  overflow: auto;
}

.tree-row {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 6px;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;
  outline: none;

  &:hover,
  &:focus-visible {
    background: #f3f7ff;
  }

  &.selected {
    color: #1f6fe8;
    background: #eaf2ff;
    font-weight: 600;
  }

  &.muted {
    opacity: 0.65;
  }
}

.all-row {
  margin-bottom: 2px;
}

.tree-indent {
  flex: 0 0 auto;
}

.tree-arrow {
  width: 22px;
  height: 28px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  span {
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid #8b95a7;
    transition: transform 0.16s ease;
  }

  &.expanded span {
    transform: rotate(90deg);
  }

  &.placeholder {
    cursor: default;
  }
}

.tree-row :deep(.el-checkbox) {
  flex: 0 0 auto;
  margin-right: 8px;
}

.tree-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-count {
  margin-left: 8px;
  color: #97a0b1;
  font-size: 12px;
  font-weight: 400;
}

.tree-empty {
  padding: 30px 10px;
  text-align: center;
  color: #9aa3b2;
  font-size: 13px;
}

</style>
