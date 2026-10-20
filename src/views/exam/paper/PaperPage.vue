<template>
  <!-- FP-04/05 试卷管理主页：左分类树 + 右试卷列表（截图01） -->
  <div class="paper-page">
    <CatalogTree
      :tree="treeRoot"
      :selected-id="selectedCatalogId"
      search-placeholder="请输入分类名称搜索"
      create-label="新建试卷分类"
      @select="onSelectCatalog"
      @create="openCreateCatalog('root')"
      @gear="onGear"
    />

    <section class="paper-panel">
      <div class="toolbar-row">
        <button class="btn-primary" type="button" @click="openCreatePaper">新建试卷</button>
        <button class="btn-outline" type="button" @click="showQuickCreate = true">快速出卷</button>
        <button class="btn-outline" type="button" @click="showScoreConfig = true">设置默认分值</button>
        <div v-if="selectedPaperIds.size" class="batch-group">
          <button class="btn-outline" type="button" @click="batchDelete">删除</button>
          <button class="btn-outline" type="button" @click="showBatchTransfer = true">转移</button>
          <button class="btn-outline" type="button" @click="showBatchCatalog = true">修改分类</button>
        </div>
        <span v-else class="batch-label">批量操作</span>
      </div>

      <!-- 筛选两行（截图01） -->
      <div class="filter-row">
        <select v-model.number="queryType" class="filter-select" @change="reload(1)">
          <option :value="0">全部试卷</option>
          <option :value="1">我创建的</option>
          <option :value="2">共享给我的</option>
        </select>
        <select v-model.number="buildTypeFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">出卷方式</option>
          <option :value="0">固定出卷</option>
          <option :value="1">随机出卷</option>
        </select>
        <select v-model.number="statusFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">试卷状态</option>
          <option :value="0">未发布</option>
          <option :value="4">已发布</option>
        </select>
        <select v-model.number="disabledFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">启用状态</option>
          <option :value="0">启用</option>
          <option :value="1">禁用</option>
        </select>
        <input v-model.trim="keyword" type="search" class="keyword-input"
               placeholder="请输入试卷名称搜索" @keyup.enter="reload(1)" />
        <button class="search-btn" type="button" @click="reload(1)">搜索</button>
        <button class="btn-outline" type="button" @click="exportData">导出数据</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input type="checkbox" :checked="allPageChecked" :indeterminate.prop="somePageChecked"
                       @change="toggleAllPage(($event.target as HTMLInputElement).checked)" />
              </th>
              <th class="col-name">试卷名称</th>
              <th class="col-sm">出卷方式</th>
              <th class="col-sm sortable" @click="sortBy('usedQty')">引用次数 {{ orderIcon('usedQty') }}</th>
              <th class="col-user">创建人</th>
              <th class="col-time sortable" @click="sortBy('updateTime')">更新日期 {{ orderIcon('updateTime') }}</th>
              <th class="col-sm">试卷状态</th>
              <th class="col-sm">启用</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.records" :key="row.id" :class="{ checked: selectedPaperIds.has(row.id) }">
              <td class="check-col">
                <input type="checkbox" :checked="selectedPaperIds.has(row.id)"
                       @change="toggleSelect(row.id, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td class="col-name">
                <span class="paper-name" :title="row.name">{{ row.name }}</span>
                <span v-if="row.secrecy === 1" class="secrecy-tag">保密</span>
              </td>
              <td class="col-sm">{{ row.buildType === 1 ? '随机出卷' : '固定出卷' }}</td>
              <td class="col-sm">
                <span v-if="row.usedQty > 0" class="used-link" @click="openUseDrawer(row)">{{ row.usedQty }}</span>
                <span v-else>{{ row.usedQty }}</span>
              </td>
              <td class="col-user">
                {{ row.createFullname }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span>
              </td>
              <td class="col-time">{{ row.updateTime }}</td>
              <td class="col-sm">
                <!-- 仅两态：0=已保存灰点 / 4=已发布绿点 -->
                <span class="status-cell">
                  <i class="status-dot" :class="{ published: row.status === 4 }"></i>
                  <span>{{ row.status === 4 ? '已发布' : '已保存' }}</span>
                </span>
              </td>
              <td class="col-sm">
                <span class="enable-cell" :title="row.disabled === 0 ? '禁用' : '启用'"
                      @click="toggleDisabled(row)">
                  <i class="enable-dot" :class="{ off: row.disabled === 1 }"></i>
                  <span>{{ row.disabled === 0 ? '启用' : '禁用' }}</span>
                </span>
              </td>
              <td class="col-op">
                <span v-if="row.status !== 4" class="op-link" @click="releaseRow(row)">发布</span>
                <span v-else class="op-link" @click="goManageRow(row)">管理</span>
                <span class="op-link more" @click="openMoreMenu(row, $event)">更多<span class="more-arrow">▾</span></span>
              </td>
            </tr>
            <tr v-if="!loading && !page.records.length">
              <td colspan="9" class="empty-cell">暂无试卷</td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="table-loading">加载中...</div>
      </div>

      <div class="pagination">
        <span>共 {{ page.total }} 条</span>
        <button :disabled="pageNo <= 1" type="button" @click="reload(pageNo - 1)">上一页</button>
        <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(page.total / pageSize)) }}</span>
        <button :disabled="pageNo >= Math.ceil(page.total / pageSize)" type="button" @click="reload(pageNo + 1)">下一页</button>
        <select v-model.number="pageSize" @change="reload(1)">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
      </div>
    </section>

    <!-- 齿轮菜单（分类操作）：外层透明遮罩，点空白处即关闭（同题库页 dropdown-mask 做法） -->
    <div v-if="gearMenu.visible" class="dropdown-mask" @click="gearMenu.visible = false">
      <div class="float-menu" :style="{ left: gearMenu.x + 'px', top: gearMenu.y + 'px' }">
        <div class="menu-item" @click="openCreateCatalog(gearMenu.node!.id)">新建子分类</div>
        <div class="menu-item" @click="openEditCatalog()">编辑</div>
        <div class="menu-item" @click="openMoveCatalog()">移动</div>
        <div class="menu-item" @click="toggleCatalogDisabled()">
          {{ gearMenu.node!.disabled === 1 ? '启用' : '禁用' }}
        </div>
        <div class="menu-item danger" @click="removeCatalog()">删除</div>
      </div>
    </div>

    <!-- 行"更多"菜单（同样带遮罩，点空白处关闭） -->
    <div v-if="moreMenu.visible" class="dropdown-mask" @click="moreMenu.visible = false">
      <div class="float-menu" :style="{ left: moreMenu.x + 'px', top: moreMenu.y + 'px' }">
        <div v-if="moreMenu.row?.status !== 4" class="menu-item" @click="goManage">管理</div>
        <div class="menu-item" @click="openEditPaper()">编辑</div>
        <div v-if="moreMenu.row?.status === 4" class="menu-item" @click="openShare()">共享</div>
        <div class="menu-item" @click="openTransfer()">转移</div>
        <div class="menu-item" @click="openChangeCatalog()">修改分类</div>
        <div class="menu-item danger" :class="{ disabled: !moreMenu.row?.permissions.canDelete }"
             @click="removePaper()">删除</div>
      </div>
    </div>

    <PaperUseDrawer
      v-if="showUseDrawer"
      :paper-id="usingPaperId!"
      @close="showUseDrawer = false"
    />
    <ShareDrawer
      v-if="showShare && sharingPaper"
      api="paper"
      :lib="sharingPaper"
      @close="showShare = false"
      @saved="onPaperActionSaved"
    />
    <TransferDrawer
      v-if="showTransfer && transferringPaper"
      api="paper"
      :lib="transferringPaper"
      @close="showTransfer = false"
      @saved="onPaperActionSaved"
    />
    <ChangeCatalogDrawer
      v-if="showChangeCatalog && changingPaper"
      api="paper"
      :lib="changingPaper"
      :batch="false"
      @close="showChangeCatalog = false"
      @saved="onPaperActionSaved"
    />

    <!-- 批量：转移 / 修改分类（复用题库抽屉，api="paper" 切试卷批量接口） -->
    <TransferDrawer
      v-if="showBatchTransfer"
      api="paper"
      :lib="null"
      batch
      :count="selectedPaperIds.size"
      :lib-ids="selectedIds"
      @close="showBatchTransfer = false"
      @saved="onBatchSaved"
    />
    <ChangeCatalogDrawer
      v-if="showBatchCatalog"
      api="paper"
      :lib="null"
      batch
      :count="selectedPaperIds.size"
      :lib-ids="selectedIds"
      @close="showBatchCatalog = false"
      @saved="onBatchSaved"
    />

    <QuickCreateDrawer
      v-if="showQuickCreate"
      :default-catalog-id="selectedCatalogId"
      @close="showQuickCreate = false"
      @imported="onQuickImported"
    />
    <ScoreConfigDrawer
      v-if="showScoreConfig"
      @close="showScoreConfig = false"
      @saved="showScoreConfig = false"
    />

    <PaperFormDrawer
      v-if="showPaperForm"
      mode="create"
      :default-catalog-id="selectedCatalogId"
      @close="closePaperForm"
      @saved="onPaperSaved"
    />

    <CatalogFormDrawer
      v-if="showCatalogForm"
      api="paper"
      :mode="catalogFormMode"
      :parent-id="catalogFormParentId"
      :catalog-id="editingCatalogId ?? undefined"
      @close="showCatalogForm = false"
      @saved="onCatalogSaved"
    />
    <MoveCatalogDrawer
      v-if="showMoveCatalog"
      api="paper"
      :catalog-id="editingCatalogId!"
      @close="showMoveCatalog = false"
      @moved="onCatalogSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import CatalogTree, { type CatalogNode } from '../components/CatalogTree.vue'
import CatalogFormDrawer from '../queslib/components/CatalogFormDrawer.vue'
import MoveCatalogDrawer from '../queslib/components/MoveCatalogDrawer.vue'
import PaperFormDrawer from './components/PaperFormDrawer.vue'
import PaperUseDrawer from './components/PaperUseDrawer.vue'
import QuickCreateDrawer from './components/QuickCreateDrawer.vue'
import ScoreConfigDrawer from './components/ScoreConfigDrawer.vue'
import ShareDrawer from '../queslib/components/ShareDrawer.vue'
import TransferDrawer from '../queslib/components/TransferDrawer.vue'
import ChangeCatalogDrawer from '../queslib/components/ChangeCatalogDrawer.vue'
import {
  batchPaper, deletePaper, deletePaperCatalog, disablePaper, disablePaperCatalog, exportPaperList,
  getPaperCatalogTree, getPaperList,
  releasePaper,
  type PaperCatalogTreeNode, type PaperItem
} from '@/api/paper'

/**
 * 试卷管理主页（FP-04/05）。
 * 分类树复用题库的分类组件（api="paper"），列表字段与操作按 05 附录C 截图01。
 */
interface FlatCatalog extends PaperCatalogTreeNode { level: number }

const treeRoot = ref<PaperCatalogTreeNode | null>(null)
const selectedCatalogId = ref('root')
const selectedRoutingPath = ref('')
const keyword = ref('')
const queryType = ref(0)
const buildTypeFilter = ref(-1)
const statusFilter = ref(-1)
const disabledFilter = ref(-1)
const orderby = ref<'updateTime' | 'usedQty'>('updateTime')
const asc = ref(false)
const pageNo = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const page = reactive<{ records: PaperItem[]; total: number }>({ records: [], total: 0 })

const showPaperForm = ref(false)
const showCatalogForm = ref(false)
const catalogFormMode = ref<'create' | 'edit'>('create')
const catalogFormParentId = ref('root')
const editingCatalogId = ref<string | null>(null)
const showMoveCatalog = ref(false)

/** 引用次数 / 共享 / 转移 / 修改分类（复用题库那几个抽屉，靠 api="paper" 切接口）。 */
const showUseDrawer = ref(false)
const usingPaperId = ref<string | null>(null)
const showShare = ref(false)
const sharingPaper = ref<PaperItem | null>(null)
const showTransfer = ref(false)
const transferringPaper = ref<PaperItem | null>(null)
const showChangeCatalog = ref(false)
const changingPaper = ref<PaperItem | null>(null)

/** 批量操作与快速出卷 / 设置默认分值。 */
const selectedPaperIds = ref(new Set<string>())
const showBatchTransfer = ref(false)
const showBatchCatalog = ref(false)
const showQuickCreate = ref(false)
const showScoreConfig = ref(false)

const selectedIds = computed(() => Array.from(selectedPaperIds.value))
const allPageChecked = computed(() =>
  page.records.length > 0 && page.records.every(r => selectedPaperIds.value.has(r.id)))
const somePageChecked = computed(() =>
  page.records.some(r => selectedPaperIds.value.has(r.id)) && !allPageChecked.value)

const gearMenu = reactive<{ visible: boolean; x: number; y: number; node: CatalogNode | null }>({
  visible: false, x: 0, y: 0, node: null
})
const moreMenu = reactive<{ visible: boolean; x: number; y: number; row: PaperItem | null }>({
  visible: false, x: 0, y: 0, row: null
})

const router = useRouter()

const orderIcon = (field: string) => (orderby.value === field ? (asc.value ? '↑' : '↓') : '⇅')

/** 管理 → 试卷管理页（FP-07）。 */
const goManageRow = (row: PaperItem) => {
  moreMenu.visible = false
  router.push(`/exam/paper/detail?paperId=${row.id}`)
}

const goManage = () => {
  if (moreMenu.row) goManageRow(moreMenu.row)
}

const sortBy = (field: 'updateTime' | 'usedQty') => {
  if (orderby.value === field) asc.value = !asc.value
  else { orderby.value = field; asc.value = false }
  reload(1)
}

const loadTree = async () => {
  try {
    treeRoot.value = await getPaperCatalogTree() as any
  } catch { /* 拦截器已提示 */ }
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res = await getPaperList(pageNo.value, pageSize.value, orderby.value,
      asc.value ? 'asc' : 'desc', {
        queryType: queryType.value,
        keyword: keyword.value,
        catalogId: selectedCatalogId.value,
        routingPath: selectedRoutingPath.value,
        creatorUserId: '',
        buildType: buildTypeFilter.value,
        disabled: disabledFilter.value,
        status: statusFilter.value
      })
    page.total = res.total || 0
    page.records = res.records || []
  } finally {
    loading.value = false
  }
}

const onSelectCatalog = (node: CatalogNode) => {
  selectedCatalogId.value = node.id
  selectedRoutingPath.value = node.routingPath
  reload(1)
}

/** 导出当前筛选条件下的试卷列表（后端生成 xlsx）。 */
const exportData = async () => {
  try {
    const blob = await exportPaperList({
      queryType: queryType.value,
      keyword: keyword.value,
      catalogId: selectedCatalogId.value,
      routingPath: selectedRoutingPath.value,
      creatorUserId: '',
      buildType: buildTypeFilter.value,
      disabled: disabledFilter.value,
      status: statusFilter.value
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '试卷列表.xlsx'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

const openCreatePaper = () => {
  showPaperForm.value = true
}

const closePaperForm = () => {
  showPaperForm.value = false
}

const onPaperSaved = () => {
  closePaperForm()
  reload()
  loadTree()
}

// ---- 分类齿轮 ----
const onGear = (payload: { node: CatalogNode; event: MouseEvent }) => {
  const rect = (payload.event.target as HTMLElement).getBoundingClientRect()
  gearMenu.visible = true
  gearMenu.node = payload.node
  gearMenu.x = rect.left - 60
  gearMenu.y = rect.bottom + 4
  moreMenu.visible = false
}

const openCreateCatalog = (parentId: string) => {
  gearMenu.visible = false
  catalogFormMode.value = 'create'
  catalogFormParentId.value = parentId
  editingCatalogId.value = null
  showCatalogForm.value = true
}

const openEditCatalog = () => {
  gearMenu.visible = false
  catalogFormMode.value = 'edit'
  editingCatalogId.value = gearMenu.node?.id ?? null
  showCatalogForm.value = true
}

const openMoveCatalog = () => {
  gearMenu.visible = false
  editingCatalogId.value = gearMenu.node?.id ?? null
  showMoveCatalog.value = true
}

const toggleCatalogDisabled = async () => {
  gearMenu.visible = false
  const node = gearMenu.node
  if (!node) return
  try {
    await disablePaperCatalog(node.id, node.disabled === 1 ? 0 : 1)
    toast.success(node.disabled === 1 ? '分类已启用' : '分类已禁用')
    loadTree()
  } catch { /* 拦截器已提示 */ }
}

const removeCatalog = async () => {
  gearMenu.visible = false
  const node = gearMenu.node
  if (!node) return
  const ok = await confirmDialog({
    title: `确认删除分类「${node.name}」？`,
    message: '分类下若有子分类或挂载试卷，将无法删除',
    danger: true
  })
  if (!ok) return
  try {
    await deletePaperCatalog(node.id)
    if (selectedCatalogId.value === node.id) {
      selectedCatalogId.value = 'root'
      selectedRoutingPath.value = ''
    }
    toast.success('分类已删除')
    loadTree()
    reload(1)
  } catch { /* 拦截器已提示 */ }
}

const onCatalogSaved = () => {
  showCatalogForm.value = false
  showMoveCatalog.value = false
  loadTree()
  reload()
}

// ---- 行操作 ----
const openMoreMenu = (row: PaperItem, event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  moreMenu.visible = true
  moreMenu.row = row
  moreMenu.x = rect.left - 140
  moreMenu.y = rect.bottom + 4
  gearMenu.visible = false
}

const openUseDrawer = (row: PaperItem) => {
  moreMenu.visible = false
  usingPaperId.value = row.id
  showUseDrawer.value = true
}

const openShare = () => {
  moreMenu.visible = false
  sharingPaper.value = moreMenu.row
  showShare.value = true
}

const openTransfer = () => {
  moreMenu.visible = false
  transferringPaper.value = moreMenu.row
  showTransfer.value = true
}

const openChangeCatalog = () => {
  moreMenu.visible = false
  changingPaper.value = moreMenu.row
  showChangeCatalog.value = true
}

const onPaperActionSaved = () => {
  showShare.value = false
  showTransfer.value = false
  showChangeCatalog.value = false
  reload()
  loadTree()
}

// ---- 批量选择 / 批量操作 ----
const toggleSelect = (id: string, checked: boolean) => {
  const next = new Set(selectedPaperIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedPaperIds.value = next
}

const toggleAllPage = (checked: boolean) => {
  const next = new Set(selectedPaperIds.value)
  for (const row of page.records) {
    if (checked) next.add(row.id)
    else next.delete(row.id)
  }
  selectedPaperIds.value = next
}

const batchDelete = async () => {
  const ids = selectedIds.value
  if (!ids.length) return
  const ok = await confirmDialog({
    title: `确认批量删除 ${ids.length} 张试卷？`,
    message: '试卷及其题目关联、抽题策略、共享范围将一并删除，不可恢复',
    danger: true
  })
  if (!ok) return
  try {
    await batchPaper('delete', ids)
    toast.success('已删除')
    selectedPaperIds.value = new Set()
    reload()
    loadTree()
  } catch { /* 拦截器已提示 */ }
}

const onBatchSaved = () => {
  showBatchTransfer.value = false
  showBatchCatalog.value = false
  selectedPaperIds.value = new Set()
  reload()
  loadTree()
}

/** 快速出卷导入完成：刷新列表与分类树，并跳到新试卷的管理页。 */
const onQuickImported = () => {
  reload()
  loadTree()
}

/** FP-14 发布：确认 → 发布（后端返回校验链失败时拦截器提示）。 */
const releaseRow = async (row: PaperItem) => {
  const ok = await confirmDialog({
    title: '确认发布该试卷？',
    message: '发布后分值与题目将锁定，仅可修改题干/选项/答案/解析',
    danger: false
  })
  if (!ok) return
  try {
    await releasePaper(row.id)
    toast.success('试卷已发布')
    reload()
  } catch { /* 拦截器已提示 */ }
}

/**
 * FP-06：更多 →「编辑」按出卷方式分流到对应编辑页
 * （固定卷 → PaperQuickEditPage，随机卷 → PaperAutoEditPage），
 * 不是打开基本信息抽屉——基本信息抽屉归管理页的「编辑基本信息」用。
 */
const openEditPaper = () => {
  moreMenu.visible = false
  const row = moreMenu.row
  if (!row) return
  const path = row.buildType === 1 ? '/exam/paper/auto' : '/exam/paper/quick'
  router.push(`${path}?paperId=${row.id}`)
}

const toggleDisabled = async (row: PaperItem) => {
  try {
    await disablePaper(row.id, row.disabled === 0 ? 1 : 0)
    toast.success(row.disabled === 0 ? '已禁用' : '已启用')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const removePaper = async () => {
  moreMenu.visible = false
  const row = moreMenu.row
  if (!row) return
  if (!row.permissions.canDelete) {
    toast.warn('非创建者不能删除该试卷')
    return
  }
  const ok = await confirmDialog({
    title: `确认删除试卷「${row.name}」？`,
    message: '试卷及其题目关联、抽题策略、共享范围将一并删除，不可恢复',
    danger: true
  })
  if (!ok) return
  try {
    await deletePaper(row.id)
    toast.success('试卷已删除')
    reload()
    loadTree()
  } catch { /* 拦截器已提示 */ }
}

onMounted(() => {
  loadTree()
  reload(1)
})
</script>

<style scoped lang="scss">
.paper-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: #fff;
}

.paper-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 0;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  .batch-label { font-size: 13px; color: #a0a7b8; }
  .batch-group { display: flex; gap: 8px; }
}

.btn-primary {
  border: none; border-radius: 4px; background: #1890ff; color: #fff;
  padding: 7px 16px; font-size: 13px; cursor: pointer;
}

.btn-outline {
  border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  padding: 6px 14px; font-size: 13px; color: #4a5368; cursor: pointer;
  &:hover { border-color: #1890ff; color: #1890ff; }
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  .filter-select {
    border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 6px 8px; font-size: 12px; outline: none; max-width: 130px;
  }

  .keyword-input {
    flex: 1; min-width: 160px;
    border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 6px 10px; font-size: 12px; outline: none;
  }

  .search-btn {
    border: none; border-radius: 4px; background: #1890ff; color: #fff;
    padding: 6px 16px; font-size: 12px; cursor: pointer;
  }
}

.table-wrap { flex: 1; min-height: 0; overflow: auto; }

table { width: 100%; border-collapse: collapse; font-size: 12px; }

th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; }
tr:hover td { background: #fafbfe; }

.col-name { min-width: 220px; max-width: 360px; }
.col-user { min-width: 110px; white-space: nowrap; }
.col-time { min-width: 150px; white-space: nowrap; color: #667; }
.col-sm { min-width: 86px; white-space: nowrap; }
.col-op { min-width: 130px; white-space: nowrap; }
.check-col { width: 36px; text-align: center; padding: 9px 4px; }
tr.checked td { background: #f5f9ff; }

.paper-name {
  color: #1f2937; display: inline-block; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  vertical-align: middle;
}

.secrecy-tag {
  margin-left: 6px; padding: 0 5px; border-radius: 3px;
  background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; font-size: 11px;
}

.used-link { color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }

.status-cell, .enable-cell {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
}

.status-dot, .enable-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #52c41a; display: inline-block;
}
.status-dot { background: #bfbfbf; &.published { background: #52c41a; } }
.enable-dot.off { background: #bfbfbf; }

.op-link {
  color: #1890ff; cursor: pointer; margin-right: 10px;
  &:hover { text-decoration: underline; }
  .more-arrow { font-size: 10px; margin-left: 2px; }
}

.empty-cell { text-align: center; color: #999; padding: 48px 0; }
.table-loading { text-align: center; color: #999; font-size: 12px; padding: 20px 0; }

.pagination {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; font-size: 12px; color: #667;

  button {
    padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px;
    background: #fff; cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }

  select {
    margin-left: auto; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 4px 6px; font-size: 12px;
  }
}

.float-menu {
  position: fixed; z-index: 3000; min-width: 120px;
  background: #fff; border: 1px solid #e6eaf1; border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .12); padding: 4px 0;

  .menu-item {
    padding: 8px 14px; font-size: 13px; color: #4a5368; cursor: pointer;

    &:hover { background: #f2f6ff; color: #1890ff; }
    &.danger { color: #f5222d; }
    &.disabled { color: #c0c4cc; cursor: not-allowed; &:hover { background: transparent; color: #c0c4cc; } }
  }
}

/** 菜单遮罩：铺满视口、位于菜单之下，点空白处关闭菜单。 */
.dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 2999;
}
</style>
