<template>
  <div class="dept-tree" role="tree">
    <label v-if="searchable" class="tree-search">
      <span class="sr-only">搜索部门</span>
      <input v-model.trim="keyword" type="search" :placeholder="searchPlaceholder" />
    </label>

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
        <button
          v-if="row.hasChildren"
          type="button"
          class="tree-arrow"
          :class="{ expanded: row.expanded }"
          :aria-label="row.expanded ? '收起' : '展开'"
          @click.stop="toggleExpanded(row.node.deptId)"
        >
          <span />
        </button>
        <span v-else class="tree-arrow placeholder" />

        <input
          v-if="mode === 'check'"
          type="checkbox"
          :checked="row.checked"
          :indeterminate.prop="row.indeterminate"
          @click.stop
          @change="toggleChecked(row, ($event.target as HTMLInputElement).checked)"
        />

        <span class="tree-label" :style="{ paddingLeft: `${row.depth * 16}px` }">
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
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tree-search {
  display: block;
  padding: 0 10px 10px;

  input {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #374151;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
      box-shadow: 0 0 0 2px rgba(46, 124, 246, 0.1);
    }
  }
}

.tree-body {
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

.tree-row input[type='checkbox'] {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  margin: 0 8px 0 0;
  accent-color: #2e7cf6;
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
