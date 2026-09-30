<template>
  <div class="catalog-page">
    <section class="catalog-card">
      <header class="toolbar">
        <div class="toolbar-left">
          <button type="button" class="primary-btn" @click="openCreate">新增分类</button>
          <button type="button" class="ghost-btn" @click="openBatch">批量新增分类</button>
        </div>
        <div class="toolbar-right">
          <label class="search-box">
            <input v-model.trim="keyword" type="search" placeholder="搜索分类名称" />
          </label>
          <label class="count-mode">
            <span>课程数统计</span>
            <select v-model="includeChildren">
              <option :value="true">包含子分类</option>
              <option :value="false">仅当前分类</option>
            </select>
          </label>
        </div>
      </header>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>分类名称</th>
              <th>层级</th>
              <th>课程数</th>
              <th>更新日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.node.id"
              :class="{ selected: selectedId === row.node.id }"
              @click="selectRow(row.node.id)"
            >
              <td class="name-cell">
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
              </td>
              <td>{{ row.node.level }} 级</td>
              <td>{{ countValue(row.node) }}</td>
              <td>{{ row.node.updateTime || '--' }}</td>
              <td class="actions" @click.stop>
                <span class="action-list">
                  <button type="button" @click="openView(row.node.id)">查看</button>
                  <button type="button" @click="openEdit(row.node.id)">编辑</button>
                  <div
                    class="more-wrap"
                    @mouseenter="activeMoreId = row.node.id"
                    @mouseleave="activeMoreId = ''"
                  >
                    <button type="button">更多⌄</button>
                    <div v-if="activeMoreId === row.node.id" class="more-menu">
                      <button type="button" @click="removeRow(row.node)">删除</button>
                      <button type="button" @click="openCreateChild(row.node)">创建子分类</button>
                      <button type="button" @click="openBatchChild(row.node)">批量创建子分类</button>
                      <button type="button" @click="openMove(row.node, 'tree')">移动此分类（含课程）</button>
                      <button type="button" @click="openMove(row.node, 'courses')">移动此分类下的课程</button>
                    </div>
                  </div>
                </span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="empty-cell">暂无分类数据</td>
            </tr>
          </tbody>
        </table>
      </div>
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
const activeMoreId = ref('')

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
  activeMoreId.value = ''
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
  activeMoreId.value = ''
}

const openMove = (node: KngTreeNode, mode: 'tree' | 'courses') => {
  moveCatalog.value = node
  moveCatalogPath.value = pathFor(node.id)
  moveMode.value = mode
  moveVisible.value = true
  activeMoreId.value = ''
}

const removeRow = async (node: KngTreeNode) => {
  activeMoreId.value = ''
  if (!window.confirm(`确定删除分类「${node.name}」吗？`)) return
  try {
    await deleteKngCatalog(node.id)
    toast.info('已删除')
    await reload()
  } catch {
    // 拦截器已提示业务错误
  }
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

.search-box input,
.count-mode select {
  height: 36px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  outline: none;
  font-size: 13px;
}

.search-box input {
  width: 220px;
  padding: 0 10px;
}

.count-mode {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #667085;
  font-size: 12px;

  select {
    padding: 0 8px;
  }
}

.table-wrap {
  width: 100%;
  max-width: 100%;
  overflow: visible;
}

table {
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
}

th:nth-child(1),
td:nth-child(1) {
  width: 40%;
}

th:nth-child(2),
td:nth-child(2) {
  width: 12%;
}

th:nth-child(3),
td:nth-child(3) {
  width: 12%;
}

th:nth-child(4),
td:nth-child(4) {
  width: 18%;
}

th:nth-child(5),
td:nth-child(5) {
  width: 18%;
}

th,
td {
  height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  font-size: 13px;
}

th {
  height: 42px;
  background: #f8fafc;
  color: #667085;
  font-weight: 600;
}

tbody tr {
  cursor: pointer;

  &:hover,
  &.selected {
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

  > button,
  .more-wrap > button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    cursor: pointer;
  }
}

.more-wrap {
  position: relative;
  display: inline-block;
}

.more-menu {
  position: absolute;
  top: 24px;
  right: 0;
  z-index: 10;
  min-width: 180px;
  padding: 6px;
  border: 1px solid #e6eaf1;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);

  button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #4d5568;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: #f5f7fb;
      color: #e75487;
    }
  }
}

.empty-cell {
  height: 160px;
  color: #98a1b2;
  text-align: center;
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
