<template>
  <div class="department-page">
    <header class="page-header">
      <div>
        <h1>部门管理</h1>
        <p>组织数据由 Oracle 同步生成，本页只读</p>
      </div>
      <label class="search-field">
        <span class="sr-only">搜索部门</span>
        <input v-model.trim="keyword" type="search" placeholder="请输入部门名称" />
      </label>
    </header>

    <section class="table-panel">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="name-col">部门名称</th>
              <th class="code-col">部门编码</th>
              <th class="count-col">人数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.node.deptId">
              <td class="name-cell">
                <span class="indent" :style="{ width: `${row.depth * 20}px` }" />
                <button
                  v-if="row.hasChildren"
                  type="button"
                  class="tree-arrow"
                  :class="{ expanded: row.expanded }"
                  :aria-label="row.expanded ? '收起' : '展开'"
                  @click="toggle(row.node.deptId)"
                >
                  <span />
                </button>
                <span v-else class="arrow-placeholder" />
                <span class="dept-name">{{ row.node.deptName }}</span>
              </td>
              <td>{{ row.node.deptCode || '-' }}</td>
              <td>{{ row.node.userCount ?? 0 }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="3" class="empty-cell">{{ loading ? '正在加载...' : '暂无数据' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
    color: #1f2937;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #7b8494;
    font-size: 13px;
  }
}

.search-field input {
  width: 260px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d7dce5;
  border-radius: 6px;
  color: #2b3445;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #2e7cf6;
    box-shadow: 0 0 0 2px rgba(46, 124, 246, 0.1);
  }
}

.table-panel {
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
}

.name-col {
  width: auto;
}

.code-col {
  width: 220px;
}

.count-col {
  width: 140px;
}

th,
td {
  height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #edf0f5;
  color: #394253;
  font-size: 14px;
  text-align: left;
}

th {
  background: #f8fafc;
  color: #596274;
  font-weight: 600;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: #f8fbff;
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
}

.dept-name {
  color: #253047;
  font-weight: 500;
}

.empty-cell {
  height: 180px;
  text-align: center;
  color: #9aa3b2;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 680px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .search-field input {
    width: 100%;
  }
}
</style>
