<template>
  <div class="course-page">
    <!-- 三栏布局与课件列表完全同构：左树/筛选标签/分页等组件直接复用课件实现 -->
    <CatalogTreePanel
      v-show="!treeCollapsed"
      v-model="selectedCatalogId"
      v-model:include-child-catalog="includeChildCatalog"
      :tree="catalogTree"
      :total="page.total"
      @change="reload(1)"
      @collapse="treeCollapsed = true"
    />

    <section class="course-content">
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
          <div class="create-wrap">
            <button type="button" class="primary-btn" @click.stop="goCreate">创建课程</button>
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
      </header>

      <div class="filter-row">
        <button type="button" class="filter-more" @click="filterVisible = true">
          <span class="filter-icon">▽</span>
          更多筛选
          <span class="caret">⌄</span>
        </button>
        <select v-model="statusFilter" class="filter-select" @change="reload(1)">
          <option :value="null">课程状态</option>
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

      <FilterTags :filters="activeFilters" @remove="removeFilter" @clear="clearFilters" />

      <div class="table-wrap">
        <table>
          <colgroup>
            <col class="check-col" />
            <col class="name-col" />
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
            <!-- CS-01：无类型列；名称列=课程封面缩略（无封面用默认图）；hidden 行置灰 + "已隐藏"标签 -->
            <tr v-for="row in page.records" :key="row.id" :class="{ 'row-hidden': row.hidden }">
              <td>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(row.id)"
                  @change="toggleRow(row.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="title-cell">
                <span class="cover-thumb">
                  <img v-if="row.coverUrl" :src="resolveAssetUrl(row.coverUrl)" alt="" />
                  <i v-else>▣</i>
                </span>
                <button type="button" class="title-link" @click="openDetail(row.id)">{{ row.title }}</button>
                <span v-if="row.hidden" class="hidden-tag">已隐藏</span>
              </td>
              <td>{{ row.updateTime || '--' }}</td>
              <td>{{ row.studyCount }}</td>
              <td>
                <span class="status-text" :class="`status-${row.status}`">
                  <i></i>{{ row.statusDesc }}
                </span>
              </td>
              <td class="action-cell">
                <div class="action-list">
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
              <td colspan="6" class="empty-cell">
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

    <!-- 行内悬浮更多菜单（CS-09）：隐藏在下架之前 -->
    <div
      v-if="moreRow"
      class="floating-more-menu"
      :style="moreMenuStyle"
      @mouseenter="cancelCloseMore"
      @mouseleave="scheduleCloseMore"
    >
      <button type="button" @click="openHide(moreRow)">{{ moreRow.hidden ? '取消隐藏' : '隐藏' }}</button>
      <button v-if="moreRow.status === 2" type="button" @click="openTakeDown(moreRow)">下架</button>
      <button type="button" @click="openMove(moreRow)">移动</button>
      <button type="button" @click="remove(moreRow)">删除</button>
      <button type="button" @click="openCopy(moreRow)">复制</button>
      <button type="button" @click="download(moreRow)">下载</button>
      <button type="button" @click="showReferences(moreRow)">引用记录</button>
    </div>

    <CourseFilterDrawer
      :visible="filterVisible"
      :model-value="filterForm"
      @close="filterVisible = false"
      @confirm="applyFilters"
    />
    <CourseTakeDownDialog
      :visible="takeDownVisible"
      :course="takeDownRow"
      @close="takeDownVisible = false"
      @confirm="confirmTakeDown"
    />
    <CourseCopyDrawer
      :visible="copyVisible"
      :course="copyRow"
      @close="copyVisible = false"
      @confirm="confirmCopy"
    />
    <!-- 移动抽屉与课件通用（仅依赖 id 数组），直接复用课件实现 -->
    <MoveCoursewareDrawer
      :visible="moveVisible"
      :coursewares="moveRows"
      @close="moveVisible = false"
      @confirm="confirmMove"
    />
    <HideConfirmDialog
      :visible="hideVisible"
      target-type="课程"
      :name="hideRow?.title || ''"
      @close="hideVisible = false"
      @confirm="confirmHide"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRouter } from 'vue-router'
import CatalogTreePanel from '../courseware/components/CatalogTreePanel.vue'
import FilterTags from '../courseware/components/FilterTags.vue'
import MoveCoursewareDrawer from '../courseware/components/MoveCoursewareDrawer.vue'
import PaginationBar from '../courseware/components/PaginationBar.vue'
import CourseFilterDrawer, { type CourseFilters } from './components/CourseFilterDrawer.vue'
import CourseTakeDownDialog from './components/CourseTakeDownDialog.vue'
import CourseCopyDrawer from './components/CourseCopyDrawer.vue'
import HideConfirmDialog from '../components/HideConfirmDialog.vue'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'
import {
  batchDeleteCourses,
  batchPutOnCourses,
  batchTakeDownCourses,
  copyCourse,
  deleteCourse,
  downloadCourse,
  getCourseList,
  getCourseReferences,
  hideCourse,
  moveCourses,
  takeDownCourse,
  type CourseListItem,
  type CourseListQuery
} from '@/api/course'
import { resolveAssetUrl } from '@/api/request'
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
const statusFilter = ref<number | null>(null)
const keyword = ref('')
const loading = ref(false)
const page = reactive<{ total: number; records: CourseListItem[] }>({ total: 0, records: [] })
const selectedIds = ref(new Set<string>())
const batchOpen = ref(false)
const filterVisible = ref(false)

const emptyFilters = (): CourseFilters => ({
  onSale: null,
  uploadTimeStart: '',
  uploadTimeEnd: '',
  updateTimeStart: '',
  updateTimeEnd: ''
})
const filterForm = ref<CourseFilters>(emptyFilters())
const appliedFilters = ref<CourseFilters>(emptyFilters())

const moreRow = ref<CourseListItem | null>(null)
const morePosition = reactive({ left: 0, top: 0 })
const moreCloseTimer = ref<number | null>(null)
const takeDownVisible = ref(false)
const takeDownRow = ref<CourseListItem | null>(null)
const copyVisible = ref(false)
const copyRow = ref<CourseListItem | null>(null)
const moveVisible = ref(false)
const moveRows = ref<string[]>([])
const hideVisible = ref(false)
const hideRow = ref<CourseListItem | null>(null)

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

function queryBody(): CourseListQuery {
  return {
    keyword: keyword.value || undefined,
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
    const result = await getCourseList(
      { page: pageNo.value, pageSize: pageSize.value, orderBy: orderBy.value, orderType: orderType.value },
      queryBody()
    )
    page.total = result.total
    page.records = result.records
    // 翻页/筛选后清理已不在当前页的勾选，避免批量操作误伤
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

/** 创建课程（CS-08）：带左树选中分类，表单继承预选 */
function goCreate() {
  router.push({
    path: '/kng/course/create/step1',
    query: selectedCatalogId.value ? { catalogId: selectedCatalogId.value } : {}
  })
}

function openDetail(id: string) {
  if (!id) return
  router.push(`/kng/course/info/${id}`)
}

function edit(id: string) {
  router.push(`/kng/course/edit/${id}/step1`)
}

function showMore(event: MouseEvent, row: CourseListItem) {
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

function openTakeDown(row: CourseListItem) {
  moreRow.value = null
  takeDownRow.value = row
  takeDownVisible.value = true
}

async function confirmTakeDown() {
  if (!takeDownRow.value) return
  await takeDownCourse(takeDownRow.value.id)
  toast.info('已下架')
  takeDownVisible.value = false
  await reload()
}

function openHide(row: CourseListItem) {
  moreRow.value = null
  hideRow.value = row
  hideVisible.value = true
}

async function confirmHide() {
  if (!hideRow.value) return
  await hideCourse(hideRow.value.id, !hideRow.value.hidden)
  toast.info(hideRow.value.hidden ? '已取消隐藏' : '已隐藏')
  hideVisible.value = false
  await reload()
}

function openCopy(row: CourseListItem) {
  moreRow.value = null
  copyRow.value = row
  copyVisible.value = true
}

async function confirmCopy(targetCatalogId: string) {
  if (!copyRow.value) return
  const result = await copyCourse(copyRow.value.id, targetCatalogId)
  copyVisible.value = false
  toast.info('复制成功')
  await reload()
  router.push(`/kng/course/info/${result.id}`)
}

function openMove(row: CourseListItem) {
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
  await moveCourses(moveRows.value, targetCatalogId)
  moveVisible.value = false
  toast.info('移动成功')
  selectedIds.value = new Set()
  await reload()
}

async function remove(row: CourseListItem) {
  moreRow.value = null
  if (!(await confirmDialog({ message: `确定删除课程「${row.title}」吗？`, danger: true }))) return
  await deleteCourse(row.id)
  toast.info('已删除')
  await reload()
}

async function batchTakeDown() {
  batchOpen.value = false
  if (!(await confirmDialog({ message: `确定下架选中的 ${selectedIds.value.size} 个课程吗？`, danger: true }))) return
  await batchTakeDownCourses([...selectedIds.value])
  toast.info('已下架')
  selectedIds.value = new Set()
  await reload()
}

async function batchPutOn() {
  batchOpen.value = false
  if (!(await confirmDialog({ message: `确定上架选中的 ${selectedIds.value.size} 个课程吗？`, danger: true }))) return
  await batchPutOnCourses([...selectedIds.value])
  toast.info('已上架')
  selectedIds.value = new Set()
  await reload()
}

async function batchDelete() {
  batchOpen.value = false
  if (!(await confirmDialog({ message: `确定删除选中的 ${selectedIds.value.size} 个课程吗？`, danger: true }))) return
  await batchDeleteCourses([...selectedIds.value])
  toast.info('已删除')
  selectedIds.value = new Set()
  await reload()
}

/**
 * 下载课程（CS-09）：后端恒返回 code=1"课程无源文件"，
 * 拦截器统一弹提示，这里吞掉 reject 即可。
 */
async function download(row: CourseListItem) {
  moreRow.value = null
  await downloadCourse(row.id).catch(() => undefined)
}

async function showReferences(row: CourseListItem) {
  moreRow.value = null
  const records = await getCourseReferences(row.id)
  window.alert(records.length ? JSON.stringify(records, null, 2) : '暂无引用')
}

function applyFilters(value: CourseFilters) {
  appliedFilters.value = { ...value }
  filterForm.value = { ...value }
  filterVisible.value = false
  void reload(1)
}

function removeFilter(key: string) {
  appliedFilters.value = { ...appliedFilters.value, [key]: key.startsWith('onSale') ? null : '' }
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
  if (!target.closest('.batch-wrap')) batchOpen.value = false
}

function closeMenusByKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
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
.course-page {
  width: 100%;
  height: calc(100vh - 104px);
  min-height: 620px;
  display: flex;
  overflow: hidden;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
}

.course-content {
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

.left-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

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

    &:hover {
      background: #f2f7ff;
      color: #2e7cf6;
    }
  }
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
  min-width: 820px;
  border-collapse: collapse;
  table-layout: fixed;
}

.check-col {
  width: 44px;
}

.name-col {
  width: 38%;
}

.date-col {
  width: 150px;
}

.count-col {
  width: 110px;
}

.status-col {
  width: 118px;
}

.action-col {
  width: 140px;
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

/* 增补A 同款语义：隐藏行置灰 */
tr.row-hidden {
  background: #fafbfc;

  td {
    color: #b3bac7;
  }

  .title-link {
    color: #9aa2b1;
  }
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

.cover-thumb {
  width: 42px;
  height: 26px;
  flex: 0 0 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 4px;
  background: #eef2f7;
  color: #98a1b2;
  font-size: 12px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hidden-tag {
  flex-shrink: 0;
  padding: 1px 7px;
  border: 1px solid #f0b25e;
  border-radius: 4px;
  background: #fdf6ec;
  color: #d98a1f;
  font-size: 11px;
  white-space: nowrap;
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

/* 状态点：0 未发布灰点、1 发布中橙点、2 已发布绿点、3 已下架灰点 */
.status-1 i {
  background: #f0a13b;
}

.status-2 i {
  background: #35b56a;
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
  .course-page {
    height: auto;
    min-height: 620px;
  }

  .filter-row {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .course-page {
    min-height: calc(100vh - 76px);
  }

  .course-page :deep(.catalog-tree-panel) {
    display: none;
  }

  .course-content {
    padding: 14px 12px 0;
  }

  .top-actions {
    align-items: flex-start;
    flex-direction: column;
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
