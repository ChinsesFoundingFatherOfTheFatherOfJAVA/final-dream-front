<template>
  <!-- F1/F2/F3/F4 考试管理主页：左分类树 + 右考试列表（页面素材 01/02/03） -->
  <div class="arrange-page">
    <CatalogTree
      :tree="treeRoot"
      :selected-id="selectedCatalogId"
      search-placeholder="请输入分类名称搜索"
      create-label="新建考试分类"
      @select="onSelectCatalog"
      @create="openCreateCatalog('root')"
      @gear="onGear"
    />

    <section class="arrange-panel">
      <div class="toolbar-row">
        <button class="btn-primary" type="button" @click="openTypeMenu($event)">新建考试</button>
        <div v-if="selectedIds.size" class="batch-group">
          <button class="btn-outline" type="button" @click="batchEnd">批量结束</button>
          <button class="btn-outline" type="button" @click="batchDelete">批量删除</button>
        </div>
        <span v-else class="batch-label">批量操作</span>
        <button class="btn-outline export-btn" type="button" @click="doExport">导出数据</button>
      </div>

      <div class="filter-row">
        <select v-model.number="scopeFilter" class="filter-select" @change="reload(1)">
          <option :value="0">全部考试</option>
          <option :value="1">我创建的</option>
          <option :value="2">我负责的</option>
        </select>
        <div class="creator-picker">
          <button class="filter-select picker-trigger" type="button" @click="showCreatorDrawer = true">
            {{ creatorLabel }}
            <span v-if="creatorFilters.length" class="clear-x" @click.stop="clearCreator">×</span>
          </button>
        </div>
        <select v-model="examTypeFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">考试类型</option>
          <option :value="1">线上考试</option>
        </select>
        <select v-model.number="statusFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">考试状态</option>
          <option :value="0">未发布</option>
          <option :value="2">进行中</option>
          <option :value="3">已结束</option>
        </select>
        <select v-model.number="arrangeTypeFilter" class="filter-select" @change="reload(1)">
          <option :value="-1">安排方式</option>
          <option :value="0">单独安排</option>
          <option :value="1">批量安排</option>
        </select>
        <input v-model.trim="keyword" type="search" class="keyword-input"
               placeholder="请输入考试名称、编号、创建人搜索" @keyup.enter="reload(1)" />
        <button class="search-btn" type="button" @click="reload(1)">搜索</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                       @change="toggleAll(($event.target as HTMLInputElement).checked)" />
              </th>
              <th class="col-name">考试名称</th>
              <th class="col-sm">考试类型</th>
              <th class="col-sm">考试状态</th>
              <th class="col-time sortable" @click="toggleSort('entryStartAt')">
                入场时间<span class="sort-arrow">{{ sortIcon('entryStartAt') }}</span>
              </th>
              <th class="col-user">创建人</th>
              <th class="col-time sortable" @click="toggleSort('createdAt')">
                创建时间<span class="sort-arrow">{{ sortIcon('createdAt') }}</span>
              </th>
              <th class="col-user">负责人</th>
              <th class="col-sm sortable" @click="toggleSort('arrangedQty')">
                安排人数<span class="sort-arrow">{{ sortIcon('arrangedQty') }}</span>
              </th>
              <th class="col-sm sortable" @click="toggleSort('submittedQty')">
                已交卷<span class="sort-arrow">{{ sortIcon('submittedQty') }}</span>
              </th>
              <th class="col-sm sortable" @click="toggleSort('passedQty')">
                已通过<span class="sort-arrow">{{ sortIcon('passedQty') }}</span>
              </th>
              <th class="col-sm sortable" @click="toggleSort('passRate')">
                通过率<span class="sort-arrow">{{ sortIcon('passRate') }}</span>
              </th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.list" :key="row.id" :class="{ checked: selectedIds.has(row.id) }">
              <td class="check-col">
                <input type="checkbox" :checked="selectedIds.has(row.id)"
                       @change="toggleSelect(row.id, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td class="col-name">
                <span class="arrange-name" :title="row.name" @click="goDetail(row)">{{ row.name }}</span>
              </td>
              <td class="col-sm">{{ ARRANGE_EXAM_TYPE_TEXT[row.examType] || '线上考试' }}</td>
              <td class="col-sm">
                <span class="status-cell">
                  <i class="status-dot" :class="'s' + row.status"></i>
                  <span>{{ statusText(row.status) }}</span>
                </span>
              </td>
              <td class="col-time">{{ row.entryStartAt || '不限' }}</td>
              <td class="col-user">
                {{ row.createFullname }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span>
              </td>
              <td class="col-time">{{ row.createdAt }}</td>
              <td class="col-user">{{ (row.ownerNames || []).join('、') || '--' }}</td>
              <td class="col-sm">{{ row.arrangedQty }}</td>
              <td class="col-sm">{{ row.submittedQty }}</td>
              <td class="col-sm">{{ row.passedQty }}</td>
              <td class="col-sm">{{ formatRate(row.passRate) }}</td>
              <td class="col-op">
                <span v-if="row.status === 0" class="op-link" @click="doPublish(row)">发布</span>
                <span v-else class="op-link" @click="goDetail(row)">管理</span>
                <span class="op-link more" @click="openMoreMenu(row, $event)">更多<span class="more-arrow">▾</span></span>
              </td>
            </tr>
            <tr v-if="!loading && !page.list.length">
              <td colspan="13" class="empty-cell">暂无考试</td>
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
          <option :value="100">100 条/页</option>
        </select>
      </div>
    </section>

    <!-- 齿轮菜单（分类操作）：外层遮罩，点空白关闭 -->
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

    <!-- F15 创建考试类型选择（本期仅线上考试；线下考试按需求文档隐藏） -->
    <div v-if="typeMenu.visible" class="dropdown-mask" @click="typeMenu.visible = false">
      <div class="type-menu" :style="{ left: typeMenu.x + 'px', top: typeMenu.y + 'px' }">
        <div class="type-item" @click="pickOnlineExam">
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


    <!-- 行"更多"菜单（F4） -->
    <div v-if="moreMenu.visible" class="dropdown-mask" @click="moreMenu.visible = false">
      <div class="float-menu" :style="{ left: moreMenu.x + 'px', top: moreMenu.y + 'px' }">
        <div v-if="moreMenu.row?.status === 0" class="menu-item" @click="goDetail(moreMenu.row!)">管理</div>
        <div class="menu-item" @click="openEditArrange">编辑</div>
        <div class="menu-item" @click="openChangeNotice">变更通知</div>
        <div v-if="moreMenu.row?.status === 0" class="menu-item" @click="doPublish(moreMenu.row!)">发布</div>
        <div v-if="moreMenu.row?.status === 2" class="menu-item" @click="doEnd(moreMenu.row!)">结束考试</div>
        <div class="menu-item" @click="doCopy(moreMenu.row!)">复制</div>
        <div class="menu-item" @click="openLink(moreMenu.row!)">考试链接</div>
        <div class="menu-item danger" :class="{ disabled: !moreMenu.row?.permissions.canDelete }"
             @click="removeArrange()">删除</div>
      </div>
    </div>

    <!-- 考试链接（F19 第一版：链接文本 + 复制；二维码待引入 qrcode.vue） -->
    <div v-if="linkRow" class="drawer-overlay" @click.self="linkRow = null">
      <div class="link-drawer">
        <div class="drawer-header">
          <span>考试链接</span>
          <span class="close-btn" @click="linkRow = null">×</span>
        </div>
        <div class="link-body">
          <p class="link-name">{{ linkRow.name }}</p>
          <div class="link-row">
            <input :value="linkUrl" readonly />
            <button class="btn primary" type="button" @click="copyLink">复制</button>
          </div>
          <p class="link-note">学员通过该链接加入考试；二维码命待引入 qrcode.vue 后补。</p>
        </div>
      </div>
    </div>


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
const moreMenu = reactive<{ visible: boolean; x: number; y: number; row: ArrangeItem | null }>({
  visible: false, x: 0, y: 0, row: null
})
const typeMenu = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })


const statusText = (s: number) => (s === 0 ? '未发布' : s === 2 ? '进行中' : s === 3 ? '已结束' : '--')
const formatRate = (r: number) => `${(((r ?? 0) * 100)).toFixed(2)}%`

/** F3 排序：点表头在升/降序间切换。 */
const toggleSort = (col: string) => {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = col
    sortDir.value = 'desc'
  }
  reload(1)
}
const sortIcon = (col: string) =>
  (sortBy.value === col ? (sortDir.value === 'desc' ? '↓' : '↑') : '⇅')

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
  moreMenu.visible = false
}
/** F16/F17：线上考试走三步向导（创建试卷 → 编辑试题 → 发布考试）。 */
const pickOnlineExam = () => {
  typeMenu.visible = false
  router.push(`/exam/exam-mgmt/create?examType=onlineExam&catalogId=${selectedCatalogId.value}`)
}
const openEditArrange = () => {
  moreMenu.visible = false
  const row = moreMenu.row
  if (!row) return
  // F18.1：编辑统一走向导；已发布时步骤 1/2 只读，只有第 3 步可改
  router.push(`/exam/exam-mgmt/create?examType=onlineExam&arrangeId=${row.id}&step=3`)
}

const goDetail = (row: ArrangeItem) => {
  moreMenu.visible = false
  router.push(`/exam/exam-mgmt/detail?arrangeId=${row.id}`)
}

/** F20：变更通知（发送 + 历史）。 */
const openChangeNotice = () => {
  const row = moreMenu.row
  moreMenu.visible = false
  if (row) noticeRow.value = row
}

const doPublish = async (row: ArrangeItem) => {
  moreMenu.visible = false
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
  moreMenu.visible = false
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
  moreMenu.visible = false
  try {
    await copyArrange(row.id)
    toast.success('已复制为新的草稿考试')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const openLink = async (row: ArrangeItem) => {
  moreMenu.visible = false
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

const removeArrange = async () => {
  moreMenu.visible = false
  const row = moreMenu.row
  if (!row) return
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

const openMoreMenu = (row: ArrangeItem, event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  moreMenu.visible = true
  moreMenu.row = row
  moreMenu.x = rect.left - 150
  moreMenu.y = rect.bottom + 4
  gearMenu.visible = false
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
  .filter-select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; max-width: 130px; }
  .keyword-input { flex: 1; min-width: 160px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none; }
  .search-btn { border: none; border-radius: 4px; background: #1890ff; color: #fff; padding: 6px 16px; font-size: 12px; cursor: pointer; }
}
.table-wrap { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; &:hover { color: #1890ff; } }
.sort-arrow { margin-left: 4px; font-size: 10px; color: #a0a7b8; }
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
  .clear-x { color: #a0a7b8; font-size: 14px; line-height: 1; &:hover { color: #f5222d; } }
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
    &.danger { color: #f5222d; }
    &.disabled { color: #c0c4cc; cursor: not-allowed; &:hover { background: transparent; color: #c0c4cc; } }
  }
}
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3200; }
.link-drawer { width: 520px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
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
</style>
