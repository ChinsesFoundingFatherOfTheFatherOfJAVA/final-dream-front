<template>
  <!-- F1/F2/F3/F4 考试管理主页：左分类树 + 右考试列表（页面素材 01/02/03） -->
  <div class="arrange-page">
    <CatalogTree
      :tree="treeRoot"
      :selected-id="selectedCatalogId"
      search-placeholder="请输入分类名称搜索"
      create-label="新建考试分类"
      @select="onSelectCatalog"
      @create="openCreateCatalog(selectedCatalogId || 'root')"
      @gear="onGear"
    />

    <section class="arrange-panel">
      <div class="toolbar-row">
        <el-button class="btn-primary" @click="openTypeMenu($event)">新建考试</el-button>
        <div v-if="selectedIds.size" class="batch-group">
          <el-button class="btn-outline" @click="batchEnd">批量结束</el-button>
          <el-button class="btn-outline" @click="batchDelete">批量删除</el-button>
        </div>
        <span v-else class="batch-label">批量操作</span>
        <el-button class="btn-outline export-btn" @click="doExport">导出数据</el-button>
      </div>

      <div class="filter-row">
        <el-select v-model="scopeFilter" class="filter-select" @change="reload(1)">
          <el-option :value="0" label="全部考试" />
          <el-option :value="1" label="我创建的" />
          <el-option :value="2" label="我负责的" />
        </el-select>
        <div class="creator-picker">
          <el-button class="filter-select picker-trigger" @click="showCreatorDrawer = true">
            {{ creatorLabel }}
            <span v-if="creatorFilters.length" class="clear-x" role="button" tabindex="0"
                  aria-label="清空创建人筛选" @click.stop="clearCreator"
                  @keydown.enter.prevent="clearCreator">×</span>
          </el-button>
        </div>
        <el-select v-model="examTypeFilter" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="考试类型" />
          <el-option :value="1" label="线上考试" />
        </el-select>
        <el-select v-model="statusFilter" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="考试状态" />
          <el-option :value="0" label="未发布" />
          <el-option :value="2" label="进行中" />
          <el-option :value="3" label="已结束" />
        </el-select>
        <el-select v-model="arrangeTypeFilter" class="filter-select" @change="reload(1)">
          <el-option :value="-1" label="安排方式" />
          <el-option :value="0" label="单独安排" />
          <el-option :value="1" label="批量安排" />
        </el-select>
        <el-input v-model.trim="keyword" class="keyword-input"
               placeholder="请输入考试名称、编号、创建人搜索" @keyup.enter="reload(1)" />
        <el-button class="search-btn" @click="reload(1)">搜索</el-button>
      </div>

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="page.list"
          row-key="id"
          class="arrange-table"
          empty-text="暂无考试"
          :row-class-name="arrangeRowClass"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
          @sort-change="onSortChange"
        >
          <el-table-column width="44" align="center">
            <template #header>
              <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
            </template>
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedIds.has(row.id)"
                @change="toggleSelect(row.id, Boolean($event))"
              />
            </template>
          </el-table-column>
          <!-- 列宽口径：同类信息列等宽（类型/状态 100、人员 120、时间 150、数值 80），
               考试名称是唯一弹性列吸收剩余空间，避免各列宽窄不一、总宽超屏出现横向滚动 -->
          <el-table-column label="考试名称" min-width="200">
            <template #default="{ row }">
              <el-button link type="primary" class="arrange-name" @click="goDetail(row)">{{ row.name }}</el-button>
            </template>
          </el-table-column>
          <el-table-column label="考试类型" width="100">
            <template #default="{ row }">{{ ARRANGE_EXAM_TYPE_TEXT[row.examType] || '线上考试' }}</template>
          </el-table-column>
          <el-table-column label="考试状态" width="100">
            <template #default="{ row }">
              <span class="status-cell"><i class="status-dot" :class="'s' + row.status" aria-hidden="true"></i>{{ statusText(row.status) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="入场时间" width="150" prop="entryStartAt" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.entryStartAt || '不限' }}</template>
          </el-table-column>
          <el-table-column label="创建人" width="120">
            <template #default="{ row }">{{ row.createFullname }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span></template>
          </el-table-column>
          <el-table-column label="创建时间" width="150" prop="createdAt" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.createdAt }}</template>
          </el-table-column>
          <el-table-column label="负责人" width="120">
            <template #default="{ row }">{{ (row.ownerNames || []).join('、') || '--' }}</template>
          </el-table-column>
          <el-table-column label="安排人数" width="105" prop="arrangedQty" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.arrangedQty }}</template>
          </el-table-column>
          <el-table-column label="已交卷" width="105" prop="submittedQty" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.submittedQty }}</template>
          </el-table-column>
          <el-table-column label="已通过" width="105" prop="passedQty" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.passedQty }}</template>
          </el-table-column>
          <el-table-column label="通过率" width="105" prop="passRate" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ formatRate(row.passRate) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="action-list">
              <el-button link type="primary" @click="row.status === 0 ? doPublish(row) : goDetail(row)">
                {{ row.status === 0 ? '发布' : '管理' }}
              </el-button>
              <el-dropdown trigger="hover" popper-class="more-popper" @command="(command: string) => onArrangeMore(command, row)">
                <el-button link class="more-trigger">更多 <el-icon class="caret"><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.status === 0" command="manage">管理</el-dropdown-item>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="notice">变更通知</el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 0" command="publish">发布</el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 2" command="end">结束考试</el-dropdown-item>
                    <el-dropdown-item command="copy">复制</el-dropdown-item>
                    <el-dropdown-item command="link">考试链接</el-dropdown-item>
                    <el-dropdown-item command="delete" :disabled="!row.permissions.canDelete">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination">
        <span>共 {{ page.total }} 条</span>
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
      </div>
    </section>

    <!-- 齿轮菜单（分类操作）：外层遮罩，点空白关闭 -->
    <div v-if="gearMenu.visible" class="dropdown-mask" @click="gearMenu.visible = false">
      <div class="float-menu" :style="{ left: gearMenu.x + 'px', top: gearMenu.y + 'px' }">
        <div class="menu-item" role="button" tabindex="0" @click="openCreateCatalog(gearMenu.node!.id)" @keydown.enter.prevent="openCreateCatalog(gearMenu.node!.id)">新建子分类</div>
        <div class="menu-item" role="button" tabindex="0" @click="openEditCatalog()" @keydown.enter.prevent="openEditCatalog()">编辑</div>
        <div class="menu-item" role="button" tabindex="0" @click="openMoveCatalog()" @keydown.enter.prevent="openMoveCatalog()">移动</div>
        <div class="menu-item" role="button" tabindex="0" @click="toggleCatalogDisabled()" @keydown.enter.prevent="toggleCatalogDisabled()">
          {{ gearMenu.node!.disabled === 1 ? '启用' : '禁用' }}
        </div>
        <div class="menu-item danger" role="button" tabindex="0" @click="removeCatalog()" @keydown.enter.prevent="removeCatalog()">删除</div>
      </div>
    </div>

    <!-- F15 创建考试类型选择（本期仅线上考试；线下考试按需求文档隐藏） -->
    <div v-if="typeMenu.visible" class="dropdown-mask" @click="typeMenu.visible = false">
      <div class="type-menu" :style="{ left: typeMenu.x + 'px', top: typeMenu.y + 'px' }">
        <div class="type-item" role="button" tabindex="0" @click="pickOnlineExam" @keydown.enter.prevent="pickOnlineExam">
          <span class="type-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <rect x="3" y="4" width="18" height="14" rx="2" fill="#e8f1ff" />
              <rect x="5.5" y="7" width="13" height="1.8" rx="0.9" fill="#1890ff" />
              <rect x="5.5" y="10.5" width="9" height="1.8" rx="0.9" fill="#7fb8ff" />
              <rect x="8" y="19" width="8" height="1.6" rx="0.8" fill="#1890ff" />
              <rect x="10.5" y="17.6" width="3" height="2" fill="#1890ff" />
            </svg>
          </span>
          <div class="type-text">
            <p class="type-title">线上考试</p>
            <p class="type-desc">线上创建考试，使用手机或电脑设备进行的考试</p>
          </div>
        </div>
      </div>
    </div>


    <!-- 考试链接（F19 第一版：链接文本 + 复制；二维码待引入 qrcode.vue） -->
        <el-drawer
      v-if="linkRow"
      :model-value="true"
      size="520px"
      :with-header="false"
      append-to-body
      destroy-on-close
      class="exam-drawer"
      @close="linkRow = null"
    >
      <div class="link-drawer">
        <div class="drawer-header">
          <span>考试链接</span>
          <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="linkRow = null" @keydown.enter.prevent="linkRow = null">×</span>
        </div>
        <div class="link-body">
          <p class="link-name">{{ linkRow.name }}</p>
          <div class="link-row">
            <el-input :model-value="linkUrl" readonly />
            <el-button class="btn primary" @click="copyLink">复制</el-button>
          </div>
          <p class="link-note">学员通过该链接加入考试；二维码命待引入 qrcode.vue 后补。</p>
        </div>
      </div>
        </el-drawer>


    <CatalogFormDrawer
      v-if="showCatalogForm"
      api="arrange"
      :mode="catalogFormMode"
      :parent-id="catalogFormParentId"
      :catalog-id="editingCatalogId ?? undefined"
      @close="showCatalogForm = false"
      @saved="onCatalogSaved"
    />
    <MoveCatalogDrawer
      v-if="showMoveCatalog"
      api="arrange"
      :catalog-id="editingCatalogId!"
      @close="showMoveCatalog = false"
      @moved="onCatalogSaved"
    />
    <ChangeNoticeDrawer v-if="noticeRow" :arrange-id="noticeRow.id" @close="noticeRow = null" />
    <CreatorPickerDrawer v-if="showCreatorDrawer" :selected="creatorFilters"
                         @close="showCreatorDrawer = false" @confirm="onCreatorConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import CatalogTree, { type CatalogNode } from '../components/CatalogTree.vue'
import CatalogFormDrawer from '../queslib/components/CatalogFormDrawer.vue'
import MoveCatalogDrawer from '../queslib/components/MoveCatalogDrawer.vue'
import ChangeNoticeDrawer from './components/ChangeNoticeDrawer.vue'
import CreatorPickerDrawer from './components/CreatorPickerDrawer.vue'
import {
  ARRANGE_EXAM_TYPE_TEXT,
  batchArrange, copyArrange, deleteArrange, deleteArrangeCatalog, disableArrangeCatalog,
  endArrange, exportArrangeList, getArrangeCatalogTree, getArrangeLink, getArrangeList, publishArrange,
  type ArrangeCatalogNode, type ArrangeItem, type ArrangeUserOption
} from '@/api/arrange'

const router = useRouter()

const treeRoot = ref<ArrangeCatalogNode | null>(null)
const selectedCatalogId = ref('root')
const selectedRoutingPath = ref('')
const keyword = ref('')
const statusFilter = ref(-1)
const scopeFilter = ref(0)
const examTypeFilter = ref(-1)
const arrangeTypeFilter = ref(-1)
const creatorFilters = ref<ArrangeUserOption[]>([])
const showCreatorDrawer = ref(false)
const sortBy = ref('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')
const pageNo = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const page = reactive<{ list: ArrangeItem[]; total: number }>({ list: [], total: 0 })
const selectedIds = ref(new Set<string>())

const showCatalogForm = ref(false)
const catalogFormMode = ref<'create' | 'edit'>('create')
const catalogFormParentId = ref('root')
const editingCatalogId = ref<string | null>(null)
const showMoveCatalog = ref(false)

const linkRow = ref<ArrangeItem | null>(null)
const linkUrl = ref('')
const noticeRow = ref<ArrangeItem | null>(null)

const gearMenu = reactive<{ visible: boolean; x: number; y: number; node: CatalogNode | null }>({
  visible: false, x: 0, y: 0, node: null
})
const typeMenu = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })


const statusText = (s: number) => (s === 0 ? '未发布' : s === 2 ? '进行中' : s === 3 ? '已结束' : '--')
const formatRate = (r: number) => `${(((r ?? 0) * 100)).toFixed(2)}%`

/** F3 排序：EP 原生表头排序图标，sort-change 回调映射到接口排序参数。 */
const onSortChange = ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  if (!prop || !order) return
  sortBy.value = prop
  sortDir.value = order === 'ascending' ? 'asc' : 'desc'
  reload(1)
}

/** F3 创建人筛选：抽屉多选（原平台支持多选，最多 50）。 */
const creatorLabel = computed(() => {
  if (!creatorFilters.value.length) return '创建人'
  if (creatorFilters.value.length === 1) {
    const first = creatorFilters.value[0]
    return first ? (first.fullname || first.account || '创建人') : '创建人'
  }
  return `已选 ${creatorFilters.value.length} 人`
})
const onCreatorConfirm = (users: ArrangeUserOption[]) => {
  creatorFilters.value = users
  showCreatorDrawer.value = false
  reload(1)
}
const clearCreator = () => {
  creatorFilters.value = []
  reload(1)
}

const allChecked = computed(() =>
  page.list.length > 0 && page.list.every(r => selectedIds.value.has(r.id)))
const someChecked = computed(() =>
  page.list.some(r => selectedIds.value.has(r.id)) && !allChecked.value)
const arrangeRowClass = ({ row }: { row: ArrangeItem }) =>
  selectedIds.value.has(row.id) ? 'checked-row' : ''

const loadTree = async () => {
  try {
    treeRoot.value = await getArrangeCatalogTree() as any
  } catch { /* 拦截器已提示 */ }
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res = await getArrangeList(pageNo.value, pageSize.value, sortBy.value, sortDir.value, {
      queryType: scopeFilter.value,
      keyword: keyword.value,
      catalogId: selectedCatalogId.value,
      routingPath: selectedRoutingPath.value,
      createUserId: '',
      createUserIds: creatorFilters.value.map(u => u.userId),
      publishStatus: statusFilter.value,
      examType: examTypeFilter.value >= 0 ? examTypeFilter.value : null,
      arrangeType: arrangeTypeFilter.value
    })
    page.list = res.records || []
    page.total = res.total || 0
  } finally {
    loading.value = false
  }
}

const onSelectCatalog = (node: CatalogNode) => {
  selectedCatalogId.value = node.id
  selectedRoutingPath.value = node.routingPath
  reload(1)
}

/** 导出当前筛选条件下的考试列表（后端 POI 生成 xlsx）。 */
const doExport = async () => {
  try {
    await exportArrangeList({
      keyword: keyword.value,
      catalogId: selectedCatalogId.value,
      publishStatus: statusFilter.value,
      // 与列表筛选保持一致，避免"看到几条、导出几十条"
      queryType: scopeFilter.value,
      createUserId: '',
      createUserIds: creatorFilters.value.map(u => u.userId).join(','),
      examType: examTypeFilter.value >= 0 ? examTypeFilter.value : null,
      arrangeType: arrangeTypeFilter.value
    })
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

const toggleSelect = (id: string, checked: boolean) => {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}
const toggleAll = (checked: boolean) => {
  const next = new Set(selectedIds.value)
  for (const row of page.list) {
    if (checked) next.add(row.id)
    else next.delete(row.id)
  }
  selectedIds.value = next
}

/** F15：新建考试先选类型（本期仅线上）。 */
const openTypeMenu = (event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  typeMenu.visible = true
  typeMenu.x = rect.left
  typeMenu.y = rect.bottom + 6
  gearMenu.visible = false
}
/** F16/F17：线上考试走三步向导（创建试卷 → 编辑试题 → 发布考试）。 */
const pickOnlineExam = () => {
  typeMenu.visible = false
  router.push(`/exam/exam-mgmt/create?examType=onlineExam&catalogId=${selectedCatalogId.value}`)
}
const openEditArrange = (row: ArrangeItem) => {
  // F18.1：编辑统一走向导；已发布时步骤 1/2 只读，只有第 3 步可改
  router.push(`/exam/exam-mgmt/create?examType=onlineExam&arrangeId=${row.id}&step=3`)
}

const goDetail = (row: ArrangeItem) => {
  router.push(`/exam/exam-mgmt/detail?arrangeId=${row.id}`)
}

/** F20：变更通知（发送 + 历史）。 */
const openChangeNotice = (row: ArrangeItem) => {
  noticeRow.value = row
}

const doPublish = async (row: ArrangeItem) => {
  const ok = await confirmDialog({
    title: `确认发布考试「${row.name}」？`,
    message: '发布时会冻结试卷快照，之后修改试卷不影响本次考试',
    danger: false
  })
  if (!ok) return
  try {
    await publishArrange(row.id)
    toast.success('考试已发布')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const doEnd = async (row: ArrangeItem) => {
  const ok = await confirmDialog({
    title: `确认结束考试「${row.name}」？`,
    message: '结束后学员不能再进入考试',
    danger: true
  })
  if (!ok) return
  try {
    await endArrange(row.id)
    toast.success('考试已结束')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const doCopy = async (row: ArrangeItem) => {
  try {
    await copyArrange(row.id)
    toast.success('已复制为新的草稿考试')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const openLink = async (row: ArrangeItem) => {
  try {
    const res = await getArrangeLink(row.id)
    linkUrl.value = res.linkUrl
    linkRow.value = row
  } catch { /* 拦截器已提示 */ }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(linkUrl.value)
    toast.success('链接已复制')
  } catch {
    toast.warn('复制失败，请手动选择复制')
  }
}

const removeArrange = async (row: ArrangeItem) => {
  if (!row.permissions.canDelete) {
    toast.warn('非创建者不能删除该考试')
    return
  }
  const ok = await confirmDialog({
    title: `确认删除考试「${row.name}」？`,
    message: '删除后不可恢复',
    danger: true
  })
  if (!ok) return
  try {
    await deleteArrange(row.id)
    toast.success('考试已删除')
    reload(); loadTree()
  } catch { /* 拦截器已提示 */ }
}

const batchDelete = async () => {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  const ok = await confirmDialog({ title: `确认批量删除 ${ids.length} 场考试？`, message: '删除后不可恢复', danger: true })
  if (!ok) return
  try {
    await batchArrange('delete', ids)
    toast.success('已删除')
    selectedIds.value = new Set()
    reload(); loadTree()
  } catch { /* 拦截器已提示 */ }
}

const batchEnd = async () => {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  const ok = await confirmDialog({ title: `确认批量结束 ${ids.length} 场考试？`, message: '结束后学员不能再进入', danger: true })
  if (!ok) return
  try {
    await batchArrange('end', ids)
    toast.success('已结束')
    selectedIds.value = new Set()
    reload()
  } catch { /* 拦截器已提示 */ }
}

// ---- 分类齿轮 ----
const onGear = (payload: { node: CatalogNode; event: MouseEvent }) => {
  const rect = (payload.event.target as HTMLElement).getBoundingClientRect()
  gearMenu.visible = true
  gearMenu.node = payload.node
  gearMenu.x = rect.left - 60
  gearMenu.y = rect.bottom + 4
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
    await disableArrangeCatalog(node.id, node.disabled === 1 ? 0 : 1)
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
    message: '分类下若有子分类或考试，将无法删除',
    danger: true
  })
  if (!ok) return
  try {
    await deleteArrangeCatalog(node.id)
    if (selectedCatalogId.value === node.id) {
      selectedCatalogId.value = 'root'
      selectedRoutingPath.value = ''
    }
    toast.success('分类已删除')
    loadTree(); reload(1)
  } catch { /* 拦截器已提示 */ }
}
const onCatalogSaved = () => {
  showCatalogForm.value = false
  showMoveCatalog.value = false
  loadTree(); reload()
}

const onArrangeMore = (command: string, row: ArrangeItem) => {
  if (command === 'manage') goDetail(row)
  else if (command === 'edit') openEditArrange(row)
  else if (command === 'notice') openChangeNotice(row)
  else if (command === 'publish') doPublish(row)
  else if (command === 'end') doEnd(row)
  else if (command === 'copy') doCopy(row)
  else if (command === 'link') openLink(row)
  else if (command === 'delete') removeArrange(row)
}

onMounted(() => {
  loadTree()
  reload(1)
})
</script>

<style scoped lang="scss">
.arrange-page { display: flex; height: 100%; min-height: 0; background: #fff; }
.arrange-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 12px 16px 0; }

.toolbar-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  .batch-label { font-size: 13px; color: #a0a7b8; }
  .batch-group { display: flex; gap: 8px; }
  .export-btn { margin-left: auto; }
}
.btn-primary { border: none; border-radius: 4px; background: #1890ff; color: #fff; padding: 7px 16px; font-size: 13px; cursor: pointer; }
.btn-outline {
  border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  padding: 6px 14px; font-size: 13px; color: #4a5368; cursor: pointer;
  &:hover { border-color: #1890ff; color: #1890ff; }
}
.filter-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px;
  // EP wrapper 自带边框与焦点态，根元素不再画边框/加内边距（避免双层嵌套，此前按原生控件写的样式套在了组件根上）；
  // 下拉固定宽度，防止在 flex 行内挤压搜索框（搜索框 flex:1 basis 为 0，空间不足会塌缩到 0 宽）
  .filter-select { font-size: 12px; }
  .el-select.filter-select { width: 130px; }
  .keyword-input { flex: 1; min-width: 160px; font-size: 12px; }
  .search-btn { border: none; border-radius: 4px; background: #1890ff; color: #fff; padding: 6px 16px; font-size: 12px; cursor: pointer; }
}
.table-wrap { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }

tr:hover td { background: #fafbfe; }
tr.checked td { background: #f5f9ff; }
.check-col { width: 36px; text-align: center; padding: 9px 4px; }
.col-name { min-width: 220px; max-width: 360px; }
.col-user { min-width: 110px; white-space: nowrap; }
.col-time { min-width: 140px; white-space: nowrap; color: #667; }
.col-sm { min-width: 84px; white-space: nowrap; }
.col-op { min-width: 130px; white-space: nowrap; }
.arrange-name {
  color: #1f2937; display: inline-block; max-width: 100%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; cursor: pointer;
  &:hover { color: #1890ff; }
}
.secrecy-tag { margin-left: 6px; padding: 0 5px; border-radius: 3px; background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; font-size: 11px; }
.status-cell { display: inline-flex; align-items: center; gap: 5px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #bfbfbf; display: inline-block; }
.status-dot.s2 { background: #52c41a; }
.status-dot.s3 { background: #8c8c8c; }
.op-link { color: #1890ff; cursor: pointer; margin-right: 10px; &:hover { text-decoration: underline; } .more-arrow { font-size: 10px; margin-left: 2px; } }
.empty-cell { text-align: center; color: #999; padding: 48px 0; }
.table-loading { text-align: center; color: #999; font-size: 12px; padding: 20px 0; }
.pagination {
  display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 12px; color: #667;
  button { padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; cursor: not-allowed; } }
  select { margin-left: auto; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
}
.dropdown-mask { position: fixed; inset: 0; z-index: 2999; }
.type-menu {
  position: fixed; z-index: 3000; width: 380px; background: #fff;
  border: 1px solid #e6eaf1; border-radius: 8px; box-shadow: 0 10px 30px rgba(0, 0, 0, .14); padding: 6px;
  .type-item {
    display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 6px; cursor: pointer;
    &:hover { background: #f2f6ff; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  }
  .type-icon { flex: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
  .type-text { min-width: 0; }
  .type-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1f2937; }
  .type-desc { margin: 0; font-size: 12px; color: #8a92a5; line-height: 1.6; }
}
.creator-picker { position: relative; }
.picker-trigger {
  display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #4a5368;
  min-width: 130px; cursor: pointer;
  .clear-x { color: #a0a7b8; font-size: 14px; line-height: 1; cursor: pointer;
    &:hover { color: #f5222d; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: 1px; border-radius: 2px; }
  }
}
.creator-menu {
  position: fixed; z-index: 3000; width: 300px; background: #fff;
  border: 1px solid #e6eaf1; border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, .14); padding: 8px;
  .creator-search {
    width: 100%; box-sizing: border-box; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 6px 10px; font-size: 12px; outline: none; margin-bottom: 6px;
    &:focus { border-color: #1890ff; }
  }
  .creator-list { max-height: 260px; overflow-y: auto; }
  .creator-item {
    display: flex; justify-content: space-between; gap: 10px; padding: 7px 8px; border-radius: 4px;
    font-size: 13px; color: #4a5368; cursor: pointer;
    &:hover { background: #f2f6ff; color: #1890ff; }
  }
  .creator-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .creator-acc { color: #a0a7b8; font-size: 12px; flex: none; }
  .creator-empty { text-align: center; color: #a0a7b8; font-size: 12px; padding: 16px 0; }
}
.float-menu {
  position: fixed; z-index: 3000; min-width: 130px; background: #fff;
  border: 1px solid #e6eaf1; border-radius: 6px; box-shadow: 0 6px 20px rgba(0, 0, 0, .12); padding: 4px 0;
  .menu-item {
    padding: 8px 14px; font-size: 13px; color: #4a5368; cursor: pointer;
    &:hover { background: #f2f6ff; color: #1890ff; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
    &.danger { color: #f5222d; }
    &.disabled { color: #c0c4cc; cursor: not-allowed; &:hover { background: transparent; color: #c0c4cc; } }
  }
}
.link-drawer { width: 520px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer;
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; }
  }
}
.link-body { padding: 18px 20px; }
.link-name { margin: 0 0 12px; font-size: 14px; color: #1f2937; }
.link-row { display: flex; gap: 10px; input { flex: 1; border: 1px solid #d9d9d9; border-radius: 4px; padding: 8px 10px; font-size: 13px; } }
.link-note { margin: 10px 0 0; font-size: 12px; color: #a0a7b8; }
.btn {
  padding: 8px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
}
.account-no { color: #a0a7b8; }

.action-list {
  display: flex;
  align-items: center;
  gap: 8px;

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
