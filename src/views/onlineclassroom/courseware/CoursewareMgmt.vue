<template>
  <div class="courseware-page">
    <CatalogTreePanel
      v-show="!treeCollapsed"
      v-model="selectedCatalogId"
      v-model:include-child-catalog="includeChildCatalog"
      :tree="catalogTree"
      :total="page.total"
      @change="reload(1)"
      @collapse="treeCollapsed = true"
    />

    <section class="courseware-content">
      <button
        v-if="treeCollapsed"
        type="button"
        class="tree-expand"
        title="展开分类树"
        @click="treeCollapsed = false"
      >
        ≡
      </button>

      <header class="top-actions">
        <div class="left-actions">
          <div class="publish-wrap">
            <button type="button" class="primary-btn" @click.stop="publishOpen = !publishOpen">
              发布课件 <span class="caret">⌄</span>
            </button>
            <div v-if="publishOpen" class="publish-menu" @click.stop>
              <div class="menu-group">
                <span class="group-label">本地上传</span>
                <button type="button" @click="goPublish('file')">上传文件</button>
                <button type="button" @click="goPublish('scorm')">SCORM课件</button>
                <button type="button" @click="goPublish('html')">HTML课件</button>
              </div>
              <div class="menu-group">
                <button type="button" @click="goPublish('link')">外部链接</button>
              </div>
              <div class="menu-group">
                <span class="group-label">从应用选择</span>
                <button type="button" disabled title="功能建设中">从知识库选择</button>
                <button type="button" disabled title="功能建设中">发表微课</button>
              </div>
            </div>
          </div>

          <div class="batch-wrap">
            <button
              type="button"
              class="ghost-btn"
              :disabled="selectedIds.size === 0"
              @click.stop="batchOpen = !batchOpen"
            >
              批量操作 <span class="caret">⌄</span>
            </button>
            <div v-if="batchOpen && selectedIds.size" class="batch-menu" @click.stop>
              <button type="button" @click="batchPutOn">上架</button>
              <button type="button" @click="batchTakeDown">下架</button>
              <button type="button" @click="openBatchMove">移动</button>
              <button type="button" @click="batchDelete">删除</button>
            </div>
          </div>
        </div>

        <div class="right-links">
          <button type="button" @click="router.push('/kng/courseware/transcode')">转码管理</button>
          <button type="button" @click="router.push('/kng/courseware/subtitles')">字幕管理</button>
        </div>
      </header>

      <div class="filter-row">
        <button type="button" class="filter-more" @click="filterVisible = true">
          <span class="filter-icon">▽</span>
          更多筛选
          <span class="caret">⌄</span>
        </button>
        <select v-model="typeFilter" class="filter-select" @change="reload(1)">
          <option :value="null">全部类型</option>
          <option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="statusFilter" class="filter-select" @change="reload(1)">
          <option :value="null">课件状态</option>
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <label class="keyword-box">
          <span>⌕</span>
          <input
            v-model.trim="keyword"
            type="search"
            placeholder="搜索名称/分类/上传者等"
            @keyup.enter="reload(1)"
          />
        </label>
      </div>

      <FilterTags
        :filters="activeFilters"
        @remove="removeFilter"
        @clear="clearFilters"
      />

      <div class="table-wrap">
        <table>
          <colgroup>
            <col class="check-col" />
            <col class="name-col" />
            <col class="type-col" />
            <col class="date-col" />
            <col class="count-col" />
            <col class="status-col" />
            <col class="action-col" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  :checked="allChecked"
                  :indeterminate.prop="someChecked"
                  @change="toggleAll(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th>名称</th>
              <th>类型</th>
              <th class="sortable" @click="sortBy('updateTime')">
                更新日期
                <span class="sort-icon">{{ orderBy === 'updateTime' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
              </th>
              <th class="sortable" @click="sortBy('studyCount')">
                学习人数
                <span class="sort-icon">{{ orderBy === 'studyCount' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
              </th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.records" :key="row.id">
              <td>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(row.id)"
                  @change="toggleRow(row.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="title-cell">
                <span class="type-icon" :class="`type-${row.type}`">{{ typeBadge(row.type) }}</span>
                <button type="button" class="title-link" @click="openDetail(row.id)">{{ row.title }}</button>
                <span v-if="row.type === 8" class="external-icon" title="外链课">↗</span>
              </td>
              <td>{{ row.typeDesc }}</td>
              <td>{{ row.updateTime || '--' }}</td>
              <td>{{ row.studyCount }}</td>
              <td>
                <span class="status-text" :class="`status-${row.status}`">
                  <i></i>{{ row.statusDesc }}
                </span>
              </td>
              <td class="action-cell">
                <div class="action-list">
                  <button type="button" @click="openDetail(row.id)">查看详情</button>
                  <button type="button" @click="edit(row.id)">编辑</button>
                  <button
                    type="button"
                    class="more-trigger"
                    @mouseenter="showMore($event, row)"
                    @mouseleave="scheduleCloseMore"
                    @click.stop="showMore($event, row)"
                  >
                    更多⌄
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && !page.records.length">
              <td colspan="7" class="empty-cell">
                <div class="empty-folder">▱</div>
                <span>暂无数据</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="table-loading">加载中...</div>
      </div>

      <PaginationBar
        v-model:page="pageNo"
        v-model:page-size="pageSize"
        :total="page.total"
        @change="reload()"
      />
    </section>

    <div
      v-if="moreRow"
      class="floating-more-menu"
      :style="moreMenuStyle"
      @mouseenter="cancelCloseMore"
      @mouseleave="scheduleCloseMore"
    >
      <button v-if="moreRow.status === 2" type="button" @click="openTakeDown(moreRow)">下架</button>
      <button type="button" @click="openMove(moreRow)">移动</button>
      <button type="button" @click="openCopy(moreRow)">复制</button>
      <button type="button" @click="remove(moreRow)">删除</button>
      <button type="button" @click="download(moreRow)">下载</button>
      <button type="button" @click="showReferences(moreRow)">引用记录</button>
      <button type="button" @click="showDownloadRecords(moreRow)">下载记录</button>
      <button v-if="moreRow.type !== 1" type="button" @click="openSubtitle(moreRow)">编辑字幕</button>
    </div>

    <FilterDrawer
      :visible="filterVisible"
      :model-value="filterForm"
      @close="filterVisible = false"
      @confirm="applyFilters"
    />
    <TakeDownDialog
      :visible="takeDownVisible"
      :courseware="takeDownRow"
      @close="takeDownVisible = false"
      @confirm="confirmTakeDown"
      @detail="takeDownVisible = false; openDetail(takeDownRow?.id || '')"
    />
    <CopyDrawer
      :visible="copyVisible"
      :courseware="copyRow"
      @close="copyVisible = false"
      @confirm="confirmCopy"
    />
    <SubtitleDrawer
      :visible="subtitleVisible"
      :courseware="subtitleRow"
      @close="subtitleVisible = false"
    />
    <MoveCoursewareDrawer
      :visible="moveVisible"
      :coursewares="moveRows"
      @close="moveVisible = false"
      @confirm="confirmMove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import CatalogTreePanel from './components/CatalogTreePanel.vue'
import FilterTags from './components/FilterTags.vue'
import FilterDrawer, { type CoursewareFilters } from './components/FilterDrawer.vue'
import TakeDownDialog from './components/TakeDownDialog.vue'
import CopyDrawer from './components/CopyDrawer.vue'
import SubtitleDrawer from './components/SubtitleDrawer.vue'
import MoveCoursewareDrawer from './components/MoveCoursewareDrawer.vue'
import PaginationBar from './components/PaginationBar.vue'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'
import {
  batchDeleteCourseware,
  batchPutOnCourseware,
  batchTakeDownCourseware,
  copyCourseware,
  deleteCourseware,
  getCoursewareDownloadRecords,
  getCoursewareList,
  getCoursewareReferences,
  moveCourseware,
  takeDownCourseware,
  type CoursewareListItem,
  type CoursewareListQuery
} from '@/api/courseware'
import { getStoredToken } from '@/utils/auth'
import { toast } from '@/utils/toast'

const router = useRouter()
const catalogTree = ref<KngTreeNode[]>([])
const treeCollapsed = ref(false)
const selectedCatalogId = ref('')
const includeChildCatalog = ref(1)
const pageNo = ref(1)
const pageSize = ref(10)
const orderBy = ref('updateTime')
const orderType = ref('desc')
const typeFilter = ref<number | null>(null)
const statusFilter = ref<number | null>(null)
const keyword = ref('')
const loading = ref(false)
const page = reactive<{ total: number; records: CoursewareListItem[] }>({ total: 0, records: [] })
const selectedIds = ref(new Set<string>())
const publishOpen = ref(false)
const batchOpen = ref(false)
const filterVisible = ref(false)

const emptyFilters = (): CoursewareFilters => ({
  onSale: null,
  quoted: null,
  uploadTimeStart: '',
  uploadTimeEnd: '',
  updateTimeStart: '',
  updateTimeEnd: ''
})
const filterForm = ref<CoursewareFilters>(emptyFilters())
const appliedFilters = ref<CoursewareFilters>(emptyFilters())

const moreRow = ref<CoursewareListItem | null>(null)
const morePosition = reactive({ left: 0, top: 0 })
const moreCloseTimer = ref<number | null>(null)
const takeDownVisible = ref(false)
const takeDownRow = ref<CoursewareListItem | null>(null)
const copyVisible = ref(false)
const copyRow = ref<CoursewareListItem | null>(null)
const subtitleVisible = ref(false)
const subtitleRow = ref<CoursewareListItem | null>(null)
const moveVisible = ref(false)
const moveRows = ref<string[]>([])

const typeOptions = [
  { value: 1, label: '文档' },
  { value: 2, label: '视频' },
  { value: 3, label: '音频' },
  { value: 4, label: '压缩文件' },
  { value: 5, label: '微课' },
  { value: 6, label: 'SCORM' },
  { value: 7, label: 'HTML' },
  { value: 8, label: '外链课' }
]
const statusOptions = [
  { value: 0, label: '未发布' },
  { value: 1, label: '发布中' },
  { value: 2, label: '已发布' },
  { value: 3, label: '已下架' }
]

const activeFilters = computed(() =>
  Object.fromEntries(Object.entries(appliedFilters.value).filter(([, value]) => value !== null && value !== ''))
)
const allChecked = computed(() =>
  page.records.length > 0 && page.records.every(row => selectedIds.value.has(row.id))
)
const someChecked = computed(() =>
  page.records.some(row => selectedIds.value.has(row.id)) && !allChecked.value
)
const moreMenuStyle = computed(() => ({
  left: `${morePosition.left}px`,
  top: `${morePosition.top}px`
}))

function typeBadge(type: number) {
  return type === 2 ? '▶' : type === 3 ? '♫' : type === 4 ? '▣' : type === 6 ? 'SC' : type === 7 ? '<>' : type === 8 ? '↗' : 'P'
}

function queryBody(): CoursewareListQuery {
  return {
    keyword: keyword.value || undefined,
    type: typeFilter.value,
    status: statusFilter.value,
    catalogId: selectedCatalogId.value || null,
    includeChildCatalog: includeChildCatalog.value,
    ...appliedFilters.value
  }
}

async function reload(nextPage?: number) {
  if (nextPage) pageNo.value = nextPage
  loading.value = true
  try {
    const result = await getCoursewareList(
      { page: pageNo.value, pageSize: pageSize.value, orderBy: orderBy.value, orderType: orderType.value },
      queryBody()
    )
    page.total = result.total
    page.records = result.records
    const visible = new Set(result.records.map(row => row.id))
    selectedIds.value = new Set([...selectedIds.value].filter(id => visible.has(id)))
  } finally {
    loading.value = false
  }
}

function sortBy(field: 'updateTime' | 'studyCount') {
  if (orderBy.value === field) orderType.value = orderType.value === 'asc' ? 'desc' : 'asc'
  else {
    orderBy.value = field
    orderType.value = 'desc'
  }
  void reload(1)
}

function toggleRow(id: string, checked: boolean) {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function toggleAll(checked: boolean) {
  if (checked) selectedIds.value = new Set(page.records.map(row => row.id))
  else selectedIds.value = new Set()
}

function goPublish(variant: 'file' | 'scorm' | 'html' | 'link') {
  publishOpen.value = false
  router.push(`/kng/courseware/publish/${variant}`)
}

function openDetail(id: string) {
  if (!id) return
  router.push(`/kng/courseware/info/${id}`)
}

function edit(id: string) {
  router.push(`/kng/courseware/edit/${id}`)
}

function showMore(event: MouseEvent, row: CoursewareListItem) {
  cancelCloseMore()
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  morePosition.left = Math.max(12, Math.min(window.innerWidth - 180, rect.right - 150))
  morePosition.top = Math.min(window.innerHeight - 330, rect.bottom + 4)
  moreRow.value = row
}

function scheduleCloseMore() {
  cancelCloseMore()
  moreCloseTimer.value = window.setTimeout(() => {
    moreRow.value = null
  }, 180)
}

function cancelCloseMore() {
  if (moreCloseTimer.value) {
    window.clearTimeout(moreCloseTimer.value)
    moreCloseTimer.value = null
  }
}

function openTakeDown(row: CoursewareListItem) {
  moreRow.value = null
  takeDownRow.value = row
  takeDownVisible.value = true
}

async function confirmTakeDown() {
  if (!takeDownRow.value) return
  await takeDownCourseware(takeDownRow.value.id)
  toast.info('已下架')
  takeDownVisible.value = false
  await reload()
}

function openCopy(row: CoursewareListItem) {
  moreRow.value = null
  copyRow.value = row
  copyVisible.value = true
}

async function confirmCopy(targetCatalogId: string) {
  if (!copyRow.value) return
  const result = await copyCourseware(copyRow.value.id, targetCatalogId)
  copyVisible.value = false
  toast.info('复制成功')
  await reload()
  router.push(`/kng/courseware/info/${result.id}`)
}

function openSubtitle(row: CoursewareListItem) {
  moreRow.value = null
  subtitleRow.value = row
  subtitleVisible.value = true
}

function openMove(row: CoursewareListItem) {
  moreRow.value = null
  moveRows.value = [row.id]
  moveVisible.value = true
}

function openBatchMove() {
  batchOpen.value = false
  moveRows.value = [...selectedIds.value]
  moveVisible.value = true
}

async function confirmMove(targetCatalogId: string) {
  await moveCourseware(moveRows.value, targetCatalogId)
  moveVisible.value = false
  toast.info('移动成功')
  selectedIds.value = new Set()
  await reload()
}

async function remove(row: CoursewareListItem) {
  moreRow.value = null
  if (!window.confirm(`确定删除课件「${row.title}」吗？`)) return
  await deleteCourseware(row.id)
  toast.info('已删除')
  await reload()
}

async function batchTakeDown() {
  batchOpen.value = false
  if (!window.confirm(`确定下架选中的 ${selectedIds.value.size} 个课件吗？`)) return
  await batchTakeDownCourseware([...selectedIds.value])
  toast.info('已下架')
  selectedIds.value = new Set()
  await reload()
}

async function batchPutOn() {
  batchOpen.value = false
  if (!window.confirm(`确定上架选中的 ${selectedIds.value.size} 个课件吗？`)) return
  await batchPutOnCourseware([...selectedIds.value])
  toast.info('已上架')
  selectedIds.value = new Set()
  await reload()
}

async function batchDelete() {
  batchOpen.value = false
  if (!window.confirm(`确定删除选中的 ${selectedIds.value.size} 个课件吗？`)) return
  await batchDeleteCourseware([...selectedIds.value])
  toast.info('已删除')
  selectedIds.value = new Set()
  await reload()
}

async function download(row: CoursewareListItem) {
  moreRow.value = null
  const response = await fetch(`/api/kng/admin/courseware/${row.id}/download`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` }
  })
  if (!response.ok) {
    toast.error('下载失败')
    return
  }
  const blob = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = row.title
  link.click()
  URL.revokeObjectURL(link.href)
}

async function showReferences(row: CoursewareListItem) {
  moreRow.value = null
  const records = await getCoursewareReferences(row.id)
  window.alert(records.length ? JSON.stringify(records, null, 2) : '暂无引用')
}

async function showDownloadRecords(row: CoursewareListItem) {
  moreRow.value = null
  const result = await getCoursewareDownloadRecords(row.id)
  window.alert(result.total ? JSON.stringify(result.records, null, 2) : '暂无数据')
}

function applyFilters(value: CoursewareFilters) {
  appliedFilters.value = { ...value }
  filterForm.value = { ...value }
  filterVisible.value = false
  void reload(1)
}

function removeFilter(key: string) {
  appliedFilters.value = { ...appliedFilters.value, [key]: key.startsWith('onSale') || key.startsWith('quoted') ? null : '' }
  filterForm.value = { ...appliedFilters.value }
  void reload(1)
}

function clearFilters() {
  appliedFilters.value = emptyFilters()
  filterForm.value = emptyFilters()
  void reload(1)
}

function closeMenus(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.publish-wrap')) publishOpen.value = false
  if (!target.closest('.batch-wrap')) batchOpen.value = false
}

function closeMenusByKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  publishOpen.value = false
  batchOpen.value = false
  moreRow.value = null
}

onMounted(async () => {
  document.addEventListener('click', closeMenus)
  document.addEventListener('keydown', closeMenusByKey)
  catalogTree.value = await getKngCatalogTree()
  await reload()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  document.removeEventListener('keydown', closeMenusByKey)
  cancelCloseMore()
})
</script>

<style scoped lang="scss">
.courseware-page {
  width: 100%;
  height: calc(100vh - 104px);
  min-height: 620px;
  display: flex;
  overflow: hidden;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
}

.courseware-content {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px 20px 0;
}

.tree-expand {
  position: absolute;
  left: 8px;
  top: 14px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #6f788a;
  font-size: 18px;
  cursor: pointer;
}

.top-actions {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.left-actions,
.right-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

.publish-wrap,
.batch-wrap {
  position: relative;
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
}

.ghost-btn {
  border: 1px solid #d9deea;
  background: #fff;
  color: #4d5568;

  &:disabled {
    color: #b3bac7;
    cursor: not-allowed;
  }
}

.caret {
  margin-left: 5px;
  font-size: 11px;
}

.publish-menu,
.batch-menu {
  position: absolute;
  top: 42px;
  left: 0;
  z-index: 25;
  min-width: 180px;
  padding: 7px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(30, 45, 70, 0.16);

  button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #4d5568;
    text-align: left;
    font-size: 13px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #f2f7ff;
      color: #2e7cf6;
    }

    &:disabled {
      color: #b5bcc9;
      cursor: not-allowed;
    }
  }
}

.menu-group {
  padding: 4px 0;
  border-bottom: 1px solid #eef1f6;

  &:last-child {
    border-bottom: none;
  }
}

.group-label {
  display: block;
  padding: 5px 10px;
  color: #98a1b2;
  font-size: 12px;
}

.right-links button {
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.filter-more,
.filter-select,
.keyword-box {
  height: 36px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
}

.filter-more {
  padding: 0 14px;
  cursor: pointer;
}

.filter-icon {
  margin-right: 7px;
  color: #667085;
}

.filter-select {
  width: 158px;
  padding: 0 10px;
}

.keyword-box {
  width: 260px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: #98a1b2;

  input {
    min-width: 0;
    flex: 1;
    border: none;
    outline: none;
    color: #394253;
    font-size: 13px;
  }
}

.table-wrap {
  position: relative;
  min-height: 0;
  flex: 1;
  margin-top: 14px;
  overflow: visible;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  table-layout: fixed;
}

.check-col {
  width: 44px;
}

.name-col {
  width: 32%;
}

.type-col {
  width: 92px;
}

.date-col {
  width: 130px;
}

.count-col {
  width: 104px;
}

.status-col {
  width: 108px;
}

.action-col {
  width: 206px;
}

th,
td {
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #edf0f5;
  color: #4d5568;
  text-align: left;
  font-size: 13px;
}

th {
  height: 43px;
  background: #f8fafc;
  color: #667085;
  font-weight: 600;
}

.sortable {
  cursor: pointer;
}

.sort-icon {
  margin-left: 4px;
  color: #a2a9b7;
  font-size: 11px;
}

tbody tr:hover {
  background: #fafcff;
}

input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: #2e7cf6;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.title-link {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border: none;
  background: transparent;
  color: #253047;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: #2e7cf6;
  }
}

.type-icon {
  width: 25px;
  height: 25px;
  flex: 0 0 25px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.type-1 {
  background: #f45b69;
}

.type-2 {
  background: #6b7cff;
}

.type-3 {
  background: #27b788;
}

.type-4,
.type-6,
.type-7 {
  background: #8b95a7;
}

.type-8 {
  background: #2e7cf6;
}

.external-icon {
  color: #7b8496;
  font-size: 14px;
}

.status-text {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #98a1b2;
  }
}

.status-1 i {
  background: #f0a13b;
}

.status-2 i {
  background: #35b56a;
}

.status-3 i {
  background: #98a1b2;
}

.action-cell {
  white-space: nowrap;
}

.action-list {
  display: flex;
  align-items: center;
  gap: 9px;

  button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    font-size: 13px;
    cursor: pointer;
  }
}

.more-trigger {
  color: #667085 !important;
}

.empty-cell {
  height: 260px;
  color: #98a1b2;
  text-align: center;
}

.empty-folder {
  margin-bottom: 8px;
  color: #c7cdd7;
  font-size: 44px;
}

.table-loading {
  position: absolute;
  inset: 43px 0 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.75);
  color: #7b8496;
  font-size: 13px;
}

.floating-more-menu {
  position: fixed;
  z-index: 5000;
  min-width: 150px;
  padding: 6px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(30, 45, 70, 0.18);

  button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #4d5568;
    text-align: left;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: #f2f7ff;
      color: #2e7cf6;
    }
  }
}

@media (max-width: 1100px) {
  .courseware-page {
    height: auto;
    min-height: 620px;
  }

  .filter-row {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .courseware-page {
    min-height: calc(100vh - 76px);
  }

  .courseware-page :deep(.catalog-tree-panel) {
    display: none;
  }

  .courseware-content {
    padding: 14px 12px 0;
  }

  .top-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .right-links {
    align-self: flex-end;
  }

  .filter-select,
  .keyword-box {
    width: 100%;
  }

  .table-wrap {
    overflow-x: auto;
  }
}
</style>
