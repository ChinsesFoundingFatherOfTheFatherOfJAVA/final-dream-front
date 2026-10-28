<template>
  <!-- FP-03/04 题库管理主页：左分类树 + 右题库列表（截图02） -->
  <div class="ques-lib-page">
    <!-- 左：分类树 -->
    <aside class="catalog-panel">
      <div class="panel-toolbar">
        <el-input v-model.trim="catalogKeyword" placeholder="请输入分类名称搜索" />
        <el-button class="btn-outline" @click="openCreateFromToolbar">新建题库分类</el-button>
      </div>
      <div class="tree-scroll">
        <div
          v-for="node in visibleTreeNodes"
          :key="node.id"
          class="tree-node"
          :class="{
            active: node.id === selectedCatalogId,
            disabled: node.disabled === 1,
            [`level-${node.level}`]: true
          }"
          :style="{ paddingLeft: 12 + node.level * 18 + 'px' }"
          @click="selectCatalog(node)"
          role="button"
          tabindex="0"
          @keydown.enter.prevent="selectCatalog(node)"
        >
          <span
            v-if="node.children && node.children.length"
            class="expand-arrow"
            :class="{ expanded: expandedKeys.has(node.id) }"
            role="button" tabindex="0"
            :aria-label="expandedKeys.has(node.id) ? '收起子分类' : '展开子分类'"
            @click.stop="toggleExpand(node.id)"
            @keydown.enter.prevent="toggleExpand(node.id)"
          >›</span>
          <span v-else class="expand-placeholder"></span>
          <span class="node-name" :title="node.name">{{ node.name }}</span>
          <!-- 齿轮菜单（悬浮子分类显示，截图05） -->
          <span v-if="node.id !== 'root'" class="gear-btn" title="分类操作" aria-label="分类操作"
                role="button" tabindex="0"
                @click.stop="openGearMenu(node, $event)"
                @keydown.enter.prevent="openGearMenu(node, $event as unknown as MouseEvent)">⚙</span>
        </div>
      </div>
    </aside>

    <!-- 右：题库列表 -->
    <section class="lib-panel">
      <div class="toolbar-row">
        <el-button class="btn-primary" @click="showCreateLib = true">新建题库</el-button>
        <div class="batch-group" v-if="selectedLibIds.size">
          <el-button class="btn-outline" @click="batchDelete">删除</el-button>
          <el-button class="btn-outline" @click="showBatchTransfer = true">转移</el-button>
          <el-button class="btn-outline" @click="showBatchCatalog = true">修改分类</el-button>
        </div>
        <span v-else class="batch-label">批量操作</span>
      </div>

      <div class="filter-row">
        <el-select v-model="queryType" class="filter-select" @change="reload(1)">
          <el-option :value="0" label="全部题库" />
          <el-option :value="1" label="我创建的" />
          <el-option :value="2" label="共享给我的" />
        </el-select>
        <el-select v-model="disabledFilter" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="启用状态" />
          <el-option :value="0" label="启用" />
          <el-option :value="1" label="禁用" />
        </el-select>
        <el-input v-model.trim="keyword" class="keyword-input"
               placeholder="请输入题库名称搜索" @keyup.enter="reload(1)" />
        <el-button class="search-btn" @click="reload(1)">搜索</el-button>
        <el-button class="btn-outline export-btn" @click="toast.warn('导出数据待 FP-13 实施')">导出数据</el-button>
      </div>

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="page.records"
          row-key="id"
          class="lib-table"
          empty-text="暂无题库"
          :default-sort="{ prop: 'updateTime', order: 'descending' }"
          @sort-change="onSortChange"
        >
          <el-table-column width="44" align="center">
            <template #header>
              <el-checkbox :model-value="allPageChecked" :indeterminate="somePageChecked" @change="toggleAllPage" />
            </template>
            <template #default="{ row }">
              <el-checkbox :model-value="selectedLibIds.has(row.id)" @change="toggleLib(row.id, Boolean($event))" />
            </template>
          </el-table-column>
          <el-table-column label="题库名称" min-width="220">
            <template #default="{ row }">
              <el-button link type="primary" class="lib-name" @click="openDetail(row)">{{ row.name }}</el-button>
              <span v-if="row.secrecy === 1" class="secrecy-tag">保密</span>
            </template>
          </el-table-column>
          <el-table-column label="试题数" width="110" prop="totalQuesQty" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.totalQuesQty }}</template>
          </el-table-column>
          <el-table-column prop="pointQty" label="考核点" width="100" />
          <el-table-column label="创建人" width="160">
            <template #default="{ row }">{{ row.createFullname }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span></template>
          </el-table-column>
          <el-table-column label="更新日期" width="170" prop="updateTime" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.updateTime }}</template>
          </el-table-column>
          <el-table-column label="启用" width="100">
            <template #default="{ row }">
                <span class="enable-cell" :title="row.disabled === 0 ? '禁用' : '启用'"
                      role="button" tabindex="0"
                      @click="toggleDisabled(row)" @keydown.enter.prevent="toggleDisabled(row)">
                  <i class="enable-dot" :class="{ off: row.disabled === 1 }" aria-hidden="true"></i>
                  <span>{{ row.disabled === 0 ? '启用' : '禁用' }}</span>
                </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <div class="action-list">
              <el-button link type="primary" @click="openDetail(row)">管理</el-button>
              <el-dropdown trigger="hover" popper-class="more-popper" @command="(command: string) => onLibMore(command, row)">
                <el-button link class="more-trigger">更多 <el-icon class="caret"><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" :disabled="!row.permissions.canDelete">删除</el-dropdown-item>
                    <el-dropdown-item command="accuracy">正确率</el-dropdown-item>
                    <el-dropdown-item command="share">共享</el-dropdown-item>
                    <el-dropdown-item command="transfer">转移</el-dropdown-item>
                    <el-dropdown-item command="catalog">修改分类</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pageNo"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="page.total"
          layout="sizes, prev, pager, next"
          background
          @size-change="reload(1)"
          @current-change="reload"
        />
        <span class="total-count">共 {{ page.total }} 条</span>
      </div>
    </section>

    <!-- 齿轮下拉菜单（截图05：新建/编辑/删除/禁用/移动） -->
    <div v-if="gearMenu.visible" class="dropdown-mask" @click="gearMenu.visible = false">
      <div class="dropdown-menu" :style="{ top: gearMenu.y + 'px', left: gearMenu.x + 'px' }">
        <div class="dropdown-item" role="button" tabindex="0" @click="openCreateUnder(gearMenu.node!)" @keydown.enter.prevent="openCreateUnder(gearMenu.node!)">新建</div>
        <div class="dropdown-item" role="button" tabindex="0" @click="openEditCatalog(gearMenu.node!)" @keydown.enter.prevent="openEditCatalog(gearMenu.node!)">编辑</div>
        <div class="dropdown-item" role="button" tabindex="0" @click="onDeleteCatalog(gearMenu.node!)" @keydown.enter.prevent="onDeleteCatalog(gearMenu.node!)">删除</div>
        <div class="dropdown-item" role="button" tabindex="0" @click="onToggleCatalogDisabled(gearMenu.node!)" @keydown.enter.prevent="onToggleCatalogDisabled(gearMenu.node!)">
          {{ gearMenu.node!.disabled === 0 ? '禁用' : '启用' }}
        </div>
        <div class="dropdown-item" role="button" tabindex="0" @click="openMoveCatalog(gearMenu.node!)" @keydown.enter.prevent="openMoveCatalog(gearMenu.node!)">移动</div>
      </div>
    </div>

    <!-- 抽屉族 -->
    <CatalogFormDrawer
      v-if="showCreateCatalog"
      :mode="'create'"
      :parent-id="createParentId"
      @close="showCreateCatalog = false"
      @saved="onCatalogSaved"
    />
    <CatalogFormDrawer
      v-if="showEditCatalog"
      :mode="'edit'"
      :catalog-id="editCatalogId"
      @close="showEditCatalog = false"
      @saved="onCatalogSaved"
    />
    <MoveCatalogDrawer
      v-if="showMoveCatalog"
      :catalog-id="moveCatalogId"
      @close="showMoveCatalog = false"
      @moved="onCatalogSaved"
    />
    <LibFormDrawer
      v-if="showCreateLib || showEditLib"
      :mode="showEditLib ? 'edit' : 'create'"
      :lib="editingLib"
      :default-catalog-id="selectedCatalogId"
      @close="showCreateLib = false; showEditLib = false"
      @saved="onLibSaved"
    />
    <ShareDrawer
      v-if="showShare"
      :lib="sharingLib"
      @close="showShare = false"
      @saved="showShare = false; reload()"
    />
    <TransferDrawer
      v-if="showTransfer"
      :lib="transferringLib"
      :batch="false"
      @close="showTransfer = false"
      @saved="showTransfer = false; reload()"
    />
    <TransferDrawer
      v-if="showBatchTransfer"
      :lib="null"
      :batch="true"
      :count="selectedLibIds.size"
      :lib-ids="Array.from(selectedLibIds)"
      @close="showBatchTransfer = false"
      @saved="onBatchSaved"
    />
    <ChangeCatalogDrawer
      v-if="showBatchCatalog || showChangeCatalog"
      :lib="changingLib"
      :batch="showBatchCatalog"
      :count="selectedLibIds.size"
      :lib-ids="Array.from(selectedLibIds)"
      @close="showBatchCatalog = false; showChangeCatalog = false"
      @saved="onBatchSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import {
  getCatalogTree, getLibList, disableLib, deleteLib, disableCatalog, deleteCatalog, batchLib,
  type CatalogTreeNode, type LibItem
} from '@/api/exam'
import CatalogFormDrawer from './components/CatalogFormDrawer.vue'
import MoveCatalogDrawer from './components/MoveCatalogDrawer.vue'
import LibFormDrawer from './components/LibFormDrawer.vue'
import ShareDrawer from './components/ShareDrawer.vue'
import TransferDrawer from './components/TransferDrawer.vue'
import ChangeCatalogDrawer from './components/ChangeCatalogDrawer.vue'

const router = useRouter()

// ---- 分类树（FP-03） ----
const treeRoot = ref<CatalogTreeNode | null>(null)
const catalogKeyword = ref('')
const selectedCatalogId = ref('root')
const selectedRoutingPath = ref('')
const expandedKeys = ref(new Set<string>())

interface FlatNode extends CatalogTreeNode { level: number }

const visibleTreeNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const keyword = catalogKeyword.value
  const out: FlatNode[] = []
  const walk = (node: CatalogTreeNode, level: number) => {
    const hit = !keyword || node.name.includes(keyword)
    const childHit = keyword
      ? (node.children || []).some(c => subtreeHas(c, keyword))
      : false
    if (hit || childHit) {
      out.push({ ...node, level })
    }
    if (!keyword && expandedKeys.value.has(node.id)) {
      for (const child of node.children || []) {
        walk(child, level + 1)
      }
    } else if (keyword) {
      // 搜索态：命中的子树保持展开
      for (const child of node.children || []) {
        if (subtreeHas(child, keyword)) {
          walk(child, level + 1)
        }
      }
    }
  }
  out.push({ ...treeRoot.value, level: 0 })
  if (expandedKeys.value.has('root') || keyword) {
    for (const child of treeRoot.value.children || []) {
      walk(child, 1)
    }
  }
  return out
})

const subtreeHas = (node: CatalogTreeNode, keyword: string): boolean => {
  if (node.name.includes(keyword)) return true
  return (node.children || []).some(c => subtreeHas(c, keyword))
}

const toggleExpand = (id: string) => {
  if (expandedKeys.value.has(id)) {
    expandedKeys.value.delete(id)
  } else {
    expandedKeys.value.add(id)
  }
}

const selectCatalog = (node: CatalogTreeNode) => {
  selectedCatalogId.value = node.id
  selectedRoutingPath.value = node.routingPath || ''
  reload(1)
}

const loadTree = async () => {
  try {
    const root: any = await getCatalogTree()
    treeRoot.value = root
    expandedKeys.value.add('root')
  } catch { /* handled */ }
}

// ---- 齿轮菜单 ----
const gearMenu = reactive<{ visible: boolean; x: number; y: number; node: CatalogTreeNode | null }>({
  visible: false, x: 0, y: 0, node: null
})

const openGearMenu = (node: CatalogTreeNode, event: MouseEvent) => {
  gearMenu.visible = true
  gearMenu.node = node
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  gearMenu.x = rect.right + 4
  gearMenu.y = rect.top - 8
}

// 分类抽屉状态
const showCreateCatalog = ref(false)
const showEditCatalog = ref(false)
const showMoveCatalog = ref(false)
const createParentId = ref('root')
const editCatalogId = ref('')
const moveCatalogId = ref('')

const openCreateFromToolbar = () => {
  createParentId.value = selectedCatalogId.value || 'root'
  showCreateCatalog.value = true
}

const openCreateUnder = (node: CatalogTreeNode) => {
  gearMenu.visible = false
  createParentId.value = node.id
  showCreateCatalog.value = true
}

const openEditCatalog = (node: CatalogTreeNode) => {
  gearMenu.visible = false
  editCatalogId.value = node.id
  showEditCatalog.value = true
}

const openMoveCatalog = (node: CatalogTreeNode) => {
  gearMenu.visible = false
  moveCatalogId.value = node.id
  showMoveCatalog.value = true
}

const onDeleteCatalog = async (node: CatalogTreeNode) => {
  gearMenu.visible = false
  if (!(await confirmDialog({
    title: '确认删除该分类？',
    message: `分类「${node.name}」删除后不可恢复`,
    danger: true
  }))) return
  try {
    await deleteCatalog(node.id)
    toast.success('分类已删除')
    if (selectedCatalogId.value === node.id) {
      selectedCatalogId.value = 'root'
      selectedRoutingPath.value = ''
    }
    loadTree()
    reload()
  } catch { /* handled */ }
}

const onToggleCatalogDisabled = async (node: CatalogTreeNode) => {
  gearMenu.visible = false
  const next = node.disabled === 0 ? 1 : 0
  try {
    await disableCatalog(node.id, next)
    toast.success(next === 1 ? '已禁用' : '已启用')
    loadTree()
  } catch { /* handled */ }
}

const onCatalogSaved = () => {
  showCreateCatalog.value = false
  showEditCatalog.value = false
  showMoveCatalog.value = false
  loadTree()
}

/**
 * 题库新建/编辑成功后的收尾：先把抽屉关掉再刷新列表。
 * 之前这里直接挂 reload()，只刷新不关抽屉，导致"点了确定、提示创建成功、抽屉却一直开着"。
 */
const onLibSaved = () => {
  showCreateLib.value = false
  showEditLib.value = false
  editingLib.value = null
  reload()
}

/**
 * 批量操作（转移 / 修改分类）成功后的收尾。
 * 真正的接口调用发生在两个抽屉内部（它们拿到 libIds 后调 batchLib），
 * 这里只负责关抽屉、清空勾选、刷新列表。
 */
const onBatchSaved = () => {
  showBatchTransfer.value = false
  showBatchCatalog.value = false
  showChangeCatalog.value = false
  selectedLibIds.value.clear()
  reload()
}

// ---- 题库列表（FP-04） ----
const loading = ref(false)
const pageNo = ref(1)
const pageSize = ref(10)
const page = reactive<{ total: number; records: LibItem[] }>({ total: 0, records: [] })
const queryType = ref(0)
const disabledFilter = ref(-1)
const keyword = ref('')
const orderby = ref('updateTime')
const direction = ref('desc')
const selectedLibIds = ref(new Set<string>())

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res: any = await getLibList(pageNo.value, pageSize.value, orderby.value, direction.value, {
      queryType: queryType.value,
      keyword: keyword.value,
      catalogId: selectedCatalogId.value,
      routingPath: selectedRoutingPath.value,
      creatorUserId: '',
      disabled: disabledFilter.value
    })
    page.total = res.total || 0
    page.records = res.records || []
  } finally {
    loading.value = false
  }
}

const onSortChange = ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  if (!prop || !order) return
  orderby.value = prop
  direction.value = order === 'ascending' ? 'asc' : 'desc'
  reload(1)
}

const allPageChecked = computed(
  () => page.records.length > 0 && page.records.every(r => selectedLibIds.value.has(r.id))
)
const somePageChecked = computed(
  () => page.records.some(r => selectedLibIds.value.has(r.id)) && !allPageChecked.value
)

const toggleAllPage = (checked: boolean) => {
  for (const row of page.records) {
    if (checked) selectedLibIds.value.add(row.id)
    else selectedLibIds.value.delete(row.id)
  }
}

const toggleLib = (id: string, checked: boolean) => {
  if (checked) selectedLibIds.value.add(id)
  else selectedLibIds.value.delete(id)
}

const toggleDisabled = async (row: LibItem) => {
  if (row.defaultLib === 1 && row.disabled === 0) {
    toast.warn('默认题库不可禁用')
    return
  }
  try {
    await disableLib(row.id, row.disabled === 0 ? 1 : 0)
    reload()
  } catch { /* handled */ }
}

const openDetail = (row: LibItem) => {
  router.push(`/exam/queslib/detail?libId=${row.id}`)
}

// ---- 更多菜单（契约：悬浮展开；交给 el-dropdown，避免手写定位瞬间弹出） ----
const onLibMore = (command: string, row: LibItem) => {
  if (command === 'edit') openEditLib(row)
  else if (command === 'delete') onDeleteLib(row)
  else if (command === 'accuracy') toast.warn('正确率统计待 FP-16 实施')
  else if (command === 'share') openShare(row)
  else if (command === 'transfer') openTransfer(row)
  else if (command === 'catalog') openChangeCatalog(row)
}

// ---- 抽屉族 ----
const showCreateLib = ref(false)
const showEditLib = ref(false)
const showShare = ref(false)
const showTransfer = ref(false)
const showChangeCatalog = ref(false)
const showBatchTransfer = ref(false)
const showBatchCatalog = ref(false)
const editingLib = ref<LibItem | null>(null)
const sharingLib = ref<LibItem | null>(null)
const transferringLib = ref<LibItem | null>(null)
const changingLib = ref<LibItem | null>(null)

const openEditLib = (row: LibItem) => {
  editingLib.value = row
  showEditLib.value = true
}

const onDeleteLib = async (row: LibItem) => {
  if (!(await confirmDialog({
    title: '确认删除该题库？',
    message: `题库「${row.name}」及其下全部试题将一并删除，不可恢复`,
    danger: true
  }))) return
  try {
    await deleteLib(row.id)
    toast.success('题库已删除')
    reload()
  } catch { /* handled */ }
}

const openShare = (row: LibItem) => {
  sharingLib.value = row
  showShare.value = true
}

const openTransfer = (row: LibItem) => {
  transferringLib.value = row
  showTransfer.value = true
}

const openChangeCatalog = (row: LibItem) => {
  changingLib.value = row
  showChangeCatalog.value = true
}

const batchDelete = async () => {
  const ids = Array.from(selectedLibIds.value)
  if (!(await confirmDialog({
    title: '确认批量删除？',
    message: `已选 ${ids.length} 个题库及其下全部试题将一并删除，不可恢复`,
    danger: true
  }))) return
  try {
    await batchLib('delete', ids)
    toast.success('已删除')
    selectedLibIds.value.clear()
    reload()
  } catch { /* handled */ }
}

onMounted(() => {
  loadTree()
  reload(1)
})
</script>

<style scoped lang="scss">
.ques-lib-page {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

// ---- 左：分类树（截图02 左栏）----
.catalog-panel {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e6eaf1;
  display: flex;
  flex-direction: column;

  .panel-toolbar {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    input {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      outline: none;

      &:focus { border-color: #1890ff; }
    }
  }
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 12px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px 7px 12px;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;
  position: relative;

  .expand-arrow {
    width: 16px;
    text-align: center;
    color: #a0a7b8;
    transition: transform 0.15s;
    flex-shrink: 0;
    cursor: pointer;

    &.expanded { transform: rotate(90deg); }

    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 2px; }
  }

  .expand-placeholder { width: 16px; flex-shrink: 0; }

  .node-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gear-btn {
    display: none;
    color: #8a92a5;
    font-size: 12px;
    padding: 0 2px;
    cursor: pointer;

    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 2px; }
  }

  &:hover .gear-btn { display: inline; }
  // 键盘 Tab 聚焦时同步显示齿轮按钮（原本仅 hover 显示）
  &:focus-within .gear-btn { display: inline; }

  &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }

  &.active {
    background: #e8f1ff;
    color: #1890ff;
    font-weight: 500;
  }

  &.disabled {
    .node-name { color: #b0b7c3; text-decoration: line-through; }
  }
}

// ---- 右：题库列表 ----
.lib-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 18px;
  gap: 12px;
  overflow-y: auto;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .batch-label { font-size: 13px; color: #8a92a5; }
}

.btn-primary {
  padding: 7px 18px;
  border: none;
  border-radius: 4px;
  background: #1890ff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover { opacity: 0.9; }
}

.btn-outline {
  padding: 7px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4a5368;
  font-size: 13px;
  cursor: pointer;

  &:hover { border-color: #1890ff; color: #1890ff; }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  // 窄屏（如侧边预览面板）下整行宽度不足，允许折行，避免控件互相挤压
  flex-wrap: wrap;

  // el-select/el-input 的 EP wrapper 自带边框与焦点态，根元素上不再画边框/加内边距，
  // 否则形成"边框套边框"的双层嵌套（此前按原生控件写的样式套在了组件根上）
  .filter-select {
    // el-select 根为块级 div，在 flex 行内无宽度约束时会挤压相邻搜索框，固定宽度
    width: 130px;
    font-size: 12px;
    color: #4a5368;
  }

  .keyword-input {
    flex: 1;
    // flex-basis 为 0 时空间不足会把输入框塌缩到 0 宽（完全不可见），必须给下限
    min-width: 160px;
    max-width: 260px;
    font-size: 12px;
  }

  .search-btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    background: #1890ff;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
  }
}

.table-wrap {
  background: #fff;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  overflow: auto;
  position: relative;
}

table { width: 100%; border-collapse: collapse; font-size: 13px; }

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f2f4f8;
  white-space: nowrap;
}

th {
  background: #fafbfd;
  color: #667;
  font-weight: 500;
  font-size: 12px;


}

tr:hover td { background: #fafbfe; }
tr.checked td { background: #f0f7ff; }

.check-col { width: 36px; }
.empty-cell { text-align: center; color: #999; padding: 32px 0; }

.lib-name {
  color: #1890ff;
  cursor: pointer;
  max-width: 260px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;

  &:hover { text-decoration: underline; }
}

.secrecy-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 3px;
  background: #fff3e8;
  border: 1px solid #ffd6b0;
  color: #e8730c;
  font-size: 11px;
}

.account-no { color: #8a92a5; font-size: 12px; margin-left: 2px; }

.enable-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 12px;
  color: #52c41a;

  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; border-radius: 2px; }

  .enable-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #52c41a;

    &.off { background: #b0b7c3; }
  }

  &.disabled .enable-cell { color: #b0b7c3; }
}

td:nth-child(7) .enable-cell { color: #4a5368; }

.op-col {
  .op-link {
    color: #1890ff;
    cursor: pointer;
    margin-right: 12px;
    font-size: 13px;

    &.more .more-arrow { font-size: 10px; margin-left: 2px; }
    &:hover { text-decoration: underline; }
  }
}

.table-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a92a5;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #667;

  button {
    padding: 4px 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 3px 6px; }
  .total-count { margin-left: auto; }
}

// ---- 下拉菜单（齿轮/更多共用）----
.dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.dropdown-menu {
  position: fixed;
  min-width: 120px;
  background: #fff;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  z-index: 101;

  .dropdown-item {
    padding: 8px 16px;
    font-size: 13px;
    color: #4a5368;
    cursor: pointer;

    &:hover { background: #f2f6ff; color: #1890ff; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
    &.disabled { color: #c2c8d4; cursor: not-allowed; &:hover { background: none; color: #c2c8d4; } }
  }
}

.action-list {
  display: flex;
  align-items: center;
  gap: 8px;

  // el-dropdown 会给触发项注入 line-height:1，不锁行高就会和「管理」错开
  :deep(.el-button) { line-height: 20px; }
  :deep(.el-dropdown) { display: flex; align-items: center; }
}
.more-trigger .caret { margin-left: 2px; font-size: 12px; }
</style>

<style lang="scss">
.more-popper {
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(31, 45, 76, 0.14);
  padding: 6px;

  .el-dropdown-menu { padding: 0; }
  .el-dropdown-menu__item {
    border-radius: 5px;
    padding: 7px 12px;
    line-height: 1.4;

    &:not(.is-disabled):hover { background: #f0f7ff; color: #1890ff; }
  }
}
</style>
