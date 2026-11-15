<template>
  <div class="department-page">
    <header class="page-header">
      <div>
        <h1>部门管理</h1>
        <p>组织数据由 Oracle 同步生成，本页只读</p>
      </div>
      <el-input
        v-model.trim="keyword"
        class="search-field"
        placeholder="请输入部门名称"
        clearable
      />
    </header>

    <section class="table-panel">
      <el-table
        :data="rows"
        :row-key="departmentRowKey"
        class="department-table"
        :empty-text="loading ? '正在加载...' : '暂无数据'"
      >
        <el-table-column label="部门名称" min-width="300">
          <template #default="{ row }">
            <div class="name-cell">
                <span class="indent" :style="{ width: `${row.depth * 20}px` }" />
                <el-button
                  v-if="row.hasChildren"
                  link
                  class="tree-arrow"
                  :class="{ expanded: row.expanded }"
                  :aria-label="row.expanded ? '收起' : '展开'"
                  @click="toggle(row.node.deptId)"
                >
                  <span />
                </el-button>
                <span v-else class="arrow-placeholder" />
                <span class="dept-name">{{ row.node.deptName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="部门编码" width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.node.deptCode || '-' }}</template>
        </el-table-column>
        <el-table-column label="人数" width="140">
          <template #default="{ row }">{{ row.node.userCount ?? 0 }}</template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDepartmentTree, type EnterpriseDepartment } from '@/api/sm'
import {
  buildDepartmentTree,
  collectSearchPaths,
  type DepartmentTreeNode
} from '@/utils/departmentTree'

interface FlatDepartmentRow {
  node: EnterpriseDepartment
  depth: number
  hasChildren: boolean
  expanded: boolean
}

const departments = ref<EnterpriseDepartment[]>([])
const keyword = ref('')
const loading = ref(false)
const expanded = ref<Record<string, boolean>>({})
const roots = computed(() => buildDepartmentTree(departments.value))
const rootIds = computed(() => new Set(roots.value.map((root) => root.node.deptId)))
const matchedPaths = computed(() => collectSearchPaths(departments.value, keyword.value))
const departmentRowKey = (row: FlatDepartmentRow) => row.node.deptId

function isExpanded(deptId: string) {
  return expanded.value[deptId] ?? rootIds.value.has(deptId)
}

function toggle(deptId: string) {
  expanded.value = { ...expanded.value, [deptId]: !isExpanded(deptId) }
}

const rows = computed<FlatDepartmentRow[]>(() => {
  const result: FlatDepartmentRow[] = []
  const searching = Boolean(keyword.value.trim())
  const keep = matchedPaths.value

  const visit = (treeNode: DepartmentTreeNode<EnterpriseDepartment>, depth: number) => {
    if (searching && !keep.has(treeNode.node.deptPath)) return
    const visibleChildren = searching
      ? treeNode.children.filter((child) => keep.has(child.node.deptPath))
      : treeNode.children
    const hasChildren = visibleChildren.length > 0
    const open = searching ? hasChildren : isExpanded(treeNode.node.deptId)
    result.push({ node: treeNode.node, depth, hasChildren, expanded: open })
    if (!open) return
    for (const child of visibleChildren) visit(child, depth + 1)
  }

  for (const root of roots.value) visit(root, 0)
  return result
})

onMounted(async () => {
  loading.value = true
  try {
    const result = await getDepartmentTree()
    departments.value = result.list ?? []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.department-page {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 5px;
    color: var(--color-ink);
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
  }
}

.search-field {
  width: 260px;
}

.table-panel {
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-paper);
}

.department-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 46px;
    background: var(--color-paper-2);
    color: var(--color-muted);
    font-size: 14px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 46px;
    color: var(--color-ink-2);
    font-size: 14px;
  }
}

.name-cell {
  display: flex;
  align-items: center;
}

.indent {
  flex: 0 0 auto;
}

.tree-arrow,
.arrow-placeholder {
  width: 24px;
  height: 30px;
  flex: 0 0 24px;
}

.tree-arrow {
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 30px;

    // gate26a：link 按钮的可键盘焦点信号（全局 a/button 环对自定义 class 仍生效，这里补足可见性口径）
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
      border-radius: var(--radius-input);
    }

  span {
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid var(--color-rule-2);
    transition: transform 0.16s ease;
  }

  &.expanded span {
    transform: rotate(90deg);
  }
}

// gate27：树箭头旋转在减动效偏好下停用
@media (prefers-reduced-motion: reduce) {
  .tree-arrow span {
    transition: none;
  }
}

.dept-name {
  color: var(--color-ink-2);
  font-weight: 500;
}

@media (max-width: 680px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .search-field {
    width: 100%;
  }
}
</style>
