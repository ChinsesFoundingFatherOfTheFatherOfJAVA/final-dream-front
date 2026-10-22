<template>
  <div class="catalog-page">
    <section class="catalog-card">
      <header class="toolbar">
        <div class="toolbar-left">
          <el-button class="primary-btn" @click="openCreate">新增分类</el-button>
          <el-button class="ghost-btn" @click="openBatch">批量新增分类</el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model.trim="keyword"
            class="search-box"
            placeholder="搜索分类名称"
            clearable
          />
          <label class="count-mode">
            <span>课程数统计</span>
            <el-select v-model="includeChildren">
              <el-option label="包含子分类" :value="true" />
              <el-option label="仅当前分类" :value="false" />
            </el-select>
          </label>
        </div>
      </header>

      <el-table
        :data="rows"
        :row-key="catalogRowKey"
        class="catalog-table"
        :empty-text="'暂无分类数据'"
        :row-class-name="catalogRowClass"
        @row-click="selectCatalogRow"
      >
        <el-table-column label="分类名称" min-width="360">
          <template #default="{ row }">
            <div class="name-cell">
                <span
                  v-if="row.node.children?.length"
                  class="expand-icon"
                  @click.stop="toggleExpand(row.node.id)"
                >
                  {{ expanded.has(row.node.id) || keyword ? '⌄' : '›' }}
                </span>
                <span class="name-text" :style="{ paddingLeft: `${(row.node.level - 1) * 24}px` }">
                  {{ row.node.name }}
                </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="层级" width="110">
          <template #default="{ row }">{{ row.node.level }} 级</template>
        </el-table-column>
        <el-table-column label="课程数" width="110">
          <template #default="{ row }">{{ countValue(row.node) }}</template>
        </el-table-column>
        <el-table-column label="更新日期" width="160">
          <template #default="{ row }">{{ row.node.updateTime || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="190">
          <template #default="{ row }">
            <div class="actions" @click.stop>
                <span class="action-list">
                  <el-button link type="primary" @click="openView(row.node.id)">查看</el-button>
                  <el-button link type="primary" @click="openEdit(row.node.id)">编辑</el-button>
                  <el-dropdown trigger="click" @command="(command: string) => handleMoreCommand(command, row.node)">
                    <el-button link type="primary">更多⌄</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="delete">删除</el-dropdown-item>
                        <el-dropdown-item command="create-child">创建子分类</el-dropdown-item>
                        <el-dropdown-item command="batch-child">批量创建子分类</el-dropdown-item>
                        <el-dropdown-item command="move-tree">移动此分类（含课程）</el-dropdown-item>
                        <el-dropdown-item command="move-courses">移动此分类下的课程</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <CatalogViewDrawer
      :visible="viewVisible"
      :catalog-id="viewId"
      @close="viewVisible = false"
      @edit="fromViewToEdit"
    />
    <CatalogEditDrawer
      :visible="editVisible"
      :mode="editMode"
      :catalog-id="editId"
      :parent-id="editParentId"
      :parent-path="editParentPath"
      @close="editVisible = false"
      @saved="reload"
    />
    <CatalogBatchDrawer
      :visible="batchVisible"
      :parent-id="batchParentId"
      :parent-path="batchParentPath"
      @close="batchVisible = false"
      @saved="reload"
    />
    <CatalogMoveDrawer
      :visible="moveVisible"
      :mode="moveMode"
      :catalog="moveCatalog"
      :catalog-path="moveCatalogPath"
      @close="moveVisible = false"
      @saved="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import CatalogViewDrawer from './CatalogViewDrawer.vue'
import CatalogEditDrawer from './CatalogEditDrawer.vue'
import CatalogBatchDrawer from './CatalogBatchDrawer.vue'
import CatalogMoveDrawer from './CatalogMoveDrawer.vue'
import { deleteKngCatalog, getKngCatalogTree, type KngTreeNode } from '@/api/kng'
import { toast } from '@/utils/toast'

const tree = ref<KngTreeNode[]>([])
const expanded = ref(new Set<string>())
const selectedId = ref('')
const keyword = ref('')
const includeChildren = ref(true)
const viewVisible = ref(false)
const viewId = ref('')
const editVisible = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const editId = ref('')
const editParentId = ref<string | null>(null)
const editParentPath = ref('主课堂')
const batchVisible = ref(false)
const batchParentId = ref<string | null>(null)
const batchParentPath = ref('主课堂')
const moveVisible = ref(false)
const moveMode = ref<'tree' | 'courses'>('tree')
const moveCatalog = ref<KngTreeNode | null>(null)
const moveCatalogPath = ref('')

const allNodes = computed(() => {
  const list: KngTreeNode[] = []
  const walk = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      list.push(node)
      walk(node.children ?? [])
    }
  }
  walk(tree.value)
  return list
})

const byId = computed(() => new Map(allNodes.value.map(node => [node.id, node])))
const parentById = computed(() => {
  const map = new Map<string, string>()
  const walk = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      for (const child of node.children ?? []) map.set(child.id, node.id)
      walk(node.children ?? [])
    }
  }
  walk(tree.value)
  return map
})

const searchKeep = computed(() => {
  const needle = keyword.value.trim()
  if (!needle) return null
  const keep = new Set<string>()
  for (const node of allNodes.value) {
    if (!node.name.includes(needle)) continue
    keep.add(node.id)
    let parentId = parentById.value.get(node.id)
    while (parentId) {
      keep.add(parentId)
      parentId = parentById.value.get(parentId)
    }
  }
  return keep
})

const rows = computed(() => {
  const result: Array<{ node: KngTreeNode }> = []
  const walk = (nodes: KngTreeNode[], forceVisible = false) => {
    for (const node of nodes) {
      const visible = forceVisible || !searchKeep.value || searchKeep.value.has(node.id)
      if (!visible) continue
      result.push({ node })
      if (searchKeep.value || expanded.value.has(node.id)) {
        walk(node.children ?? [], !!searchKeep.value)
      }
    }
  }
  walk(tree.value)
  return result
})

const countValue = (node: KngTreeNode) =>
  includeChildren.value ? node.allCourseCount : node.courseCount

const catalogRowClass = ({ row }: { row: { node: KngTreeNode } }) =>
  selectedId.value === row.node.id ? 'selected-row' : ''

const pathFor = (id: string) => {
  const names: string[] = []
  let current = byId.value.get(id)
  while (current) {
    names.unshift(current.name)
    const parentId = parentById.value.get(current.id)
    current = parentId ? byId.value.get(parentId) : undefined
  }
  names.unshift('主课堂')
  return names.join('/')
}

const parentPathFor = (id: string) => {
  const parentId = parentById.value.get(id)
  return parentId ? pathFor(parentId) : '主课堂'
}

const selectedNode = computed(() => selectedId.value ? byId.value.get(selectedId.value) ?? null : null)
const catalogRowKey = (row: { node: KngTreeNode }) => row.node.id

const reload = async () => {
  tree.value = await getKngCatalogTree()
  if (selectedId.value && !byId.value.has(selectedId.value)) selectedId.value = ''
}

const toggleExpand = (id: string) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const selectRow = (id: string) => {
  selectedId.value = selectedId.value === id ? '' : id
}

const selectCatalogRow = (row: { node: KngTreeNode }) => {
  selectRow(row.node.id)
}

const openView = (id: string) => {
  viewId.value = id
  viewVisible.value = true
}

const openEdit = (id: string) => {
  const node = byId.value.get(id)
  if (!node) return
  editMode.value = 'edit'
  editId.value = id
  editParentPath.value = parentPathFor(id)
  editVisible.value = true
}

const fromViewToEdit = (detail: { id: string }) => {
  viewVisible.value = false
  openEdit(detail.id)
}

const openCreate = () => {
  editMode.value = 'create'
  editId.value = ''
  editParentId.value = selectedNode.value?.id ?? null
  editParentPath.value = selectedNode.value ? pathFor(selectedNode.value.id) : '主课堂'
  editVisible.value = true
}

const openCreateChild = (node: KngTreeNode) => {
  editMode.value = 'create'
  editId.value = ''
  editParentId.value = node.id
  editParentPath.value = pathFor(node.id)
  editVisible.value = true
}

const openBatch = () => {
  batchParentId.value = selectedNode.value?.id ?? null
  batchParentPath.value = selectedNode.value ? pathFor(selectedNode.value.id) : '主课堂'
  batchVisible.value = true
}

const openBatchChild = (node: KngTreeNode) => {
  batchParentId.value = node.id
  batchParentPath.value = pathFor(node.id)
  batchVisible.value = true
}

const openMove = (node: KngTreeNode, mode: 'tree' | 'courses') => {
  moveCatalog.value = node
  moveCatalogPath.value = pathFor(node.id)
  moveMode.value = mode
  moveVisible.value = true
}

const removeRow = async (node: KngTreeNode) => {
  if (!(await confirmDialog({ message: `确定删除分类「${node.name}」吗？`, danger: true }))) return
  try {
    await deleteKngCatalog(node.id)
    toast.info('已删除')
    await reload()
  } catch {
    // 拦截器已提示业务错误
  }
}

const handleMoreCommand = (command: string, node: KngTreeNode) => {
  if (command === 'delete') void removeRow(node)
  else if (command === 'create-child') openCreateChild(node)
  else if (command === 'batch-child') openBatchChild(node)
  else if (command === 'move-tree') openMove(node, 'tree')
  else if (command === 'move-courses') openMove(node, 'courses')
}

onMounted(reload)
</script>

<style scoped lang="scss">
.catalog-page {
  width: 100%;
  min-width: 0;
}

.catalog-card {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #e9edf4;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.primary-btn,
.ghost-btn {
  height: 36px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: #2e7cf6;
  color: #fff;

  &:hover {
    background: #1f6fe5;
  }
}

.ghost-btn {
  border: 1px solid #d9deea;
  background: #fff;
  color: #596274;
}

.search-box {
  width: 220px;
}

.count-mode {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #667085;
  font-size: 12px;

  :deep(.el-select) {
    width: 130px;
  }
}

.catalog-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 42px;
    background: #f8fafc;
    color: #667085;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row) {
    cursor: pointer;
  }

  :deep(.el-table__row:hover),
  :deep(.selected-row) {
    background: #e8f4ff;
  }
}

.name-cell {
  position: relative;
}

.expand-icon {
  display: inline-block;
  width: 18px;
  color: #7a8396;
  cursor: pointer;
}

.name-text {
  display: inline-block;
  overflow: hidden;
  max-width: calc(100% - 24px);
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.actions {
  position: relative;
  white-space: nowrap;
}

.action-list {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 900px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
