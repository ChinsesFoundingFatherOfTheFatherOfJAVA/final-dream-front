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
      <el-button
        v-if="treeCollapsed"
        class="tree-expand"
        aria-label="展开分类树"
        title="展开分类树"
        @click="treeCollapsed = false"
      >
        <el-icon><Menu /></el-icon>
      </el-button>

      <header class="top-actions">
        <div class="left-actions">
          <div class="create-wrap">
            <el-button class="primary-btn" @click.stop="goCreate">创建课程</el-button>
          </div>

          <el-dropdown trigger="click" @command="handleBatchCommand">
            <el-button
              class="ghost-btn"
              :disabled="selectedIds.size === 0"
            >
              批量操作 <span class="caret" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="put-on">上架</el-dropdown-item>
                <el-dropdown-item command="take-down">下架</el-dropdown-item>
                <el-dropdown-item command="move">移动</el-dropdown-item>
                <el-dropdown-item command="delete">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <div class="filter-row">
        <el-button class="filter-more" @click="filterVisible = true">
          <span class="filter-icon" aria-hidden="true"><el-icon><Filter /></el-icon></span>
          更多筛选
          <span class="caret" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </el-button>
        <el-select v-model="statusFilter" class="filter-select" placeholder="课程状态" @change="reload(1)">
          <el-option label="课程状态" :value="''" />
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input
            v-model.trim="keyword"
            class="keyword-box"
            placeholder="搜索名称/分类/上传者等"
            clearable
            @keyup.enter="reload(1)"
        >
          <template #prefix><span aria-hidden="true"><el-icon><Search /></el-icon></span></template>
        </el-input>
      </div>

      <FilterTags :filters="activeFilters" @remove="removeFilter" @clear="clearFilters" />

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="page.records"
          row-key="id"
          class="course-table"
          :default-sort="{ prop: 'updateTime', order: 'descending' }"
          @sort-change="onSortChange"
          :empty-text="'暂无数据'"
          :row-class-name="courseRowClass"
        >
          <el-table-column width="44" align="center">
            <template #header>
              <el-checkbox
                :model-value="allChecked"
                :indeterminate="someChecked"
                @change="toggleAll"
              />
            </template>
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedIds.has(row.id)"
                @change="toggleRow(row.id, Boolean($event))"
              />
            </template>
          </el-table-column>
          <el-table-column label="名称" width="260">
            <template #default="{ row }">
              <div class="title-cell">
                <span v-if="row.coverUrl" class="cover-thumb">
                  <img :src="resolveAssetUrl(row.coverUrl)" :alt="`${row.title}封面`" loading="lazy" />
                </span>
                <el-button class="title-link" @click="openDetail(row.id)">{{ row.title }}</el-button>
                <span v-if="row.hidden" class="hidden-tag">已隐藏</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="更新日期" min-width="160" prop="updateTime" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.updateTime || '--' }}</template>
          </el-table-column>
          <el-table-column label="学习人数" width="120" prop="studyCount" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.studyCount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="118">
            <template #default="{ row }">
                <span class="status-text" :class="`status-${row.status}`">
                  <i aria-hidden="true"></i>{{ row.statusDesc }}
                </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
                <div class="action-list">
                  <el-button link type="primary" @click="edit(row.id)">编辑</el-button>
                  <el-dropdown trigger="click" @command="(command: string) => handleMoreCommand(command, row)">
                    <el-button link class="more-trigger">更多 <el-icon class="caret"><ArrowDown /></el-icon></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="hide">{{ row.hidden ? '取消隐藏' : '隐藏' }}</el-dropdown-item>
                        <el-dropdown-item v-if="row.status === 2" command="take-down">下架</el-dropdown-item>
                        <el-dropdown-item command="move">移动</el-dropdown-item>
                        <el-dropdown-item command="delete">删除</el-dropdown-item>
                        <el-dropdown-item command="copy">复制</el-dropdown-item>
                        <el-dropdown-item command="download">下载</el-dropdown-item>
                        <el-dropdown-item command="references">引用记录</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <PaginationBar
        v-model:page="pageNo"
        v-model:page-size="pageSize"
        :total="page.total"
        @change="reload()"
      />
    </section>

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
import { ArrowDown, Filter, Menu, Search } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
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
const statusFilter = ref<number | ''>('')
const keyword = ref('')
const loading = ref(false)
const page = reactive<{ total: number; records: CourseListItem[] }>({ total: 0, records: [] })
const selectedIds = ref(new Set<string>())
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
const courseRowClass = ({ row }: { row: CourseListItem }) => row.hidden ? 'row-hidden' : ''

function queryBody(): CourseListQuery {
  return {
    keyword: keyword.value || undefined,
    status: statusFilter.value === '' ? null : statusFilter.value,
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

function onSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
  if (!prop || !order) return
  orderBy.value = prop as 'updateTime' | 'studyCount'
  orderType.value = order === 'ascending' ? 'asc' : 'desc'
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

function openTakeDown(row: CourseListItem) {
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
  moveRows.value = [row.id]
  moveVisible.value = true
}

function openBatchMove() {
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
  if (!(await confirmDialog({ message: `确定删除课程「${row.title}」吗？`, danger: true }))) return
  await deleteCourse(row.id)
  toast.info('已删除')
  await reload()
}

async function batchTakeDown() {
  if (!(await confirmDialog({ message: `确定下架选中的 ${selectedIds.value.size} 个课程吗？`, danger: true }))) return
  await batchTakeDownCourses([...selectedIds.value])
  toast.info('已下架')
  selectedIds.value = new Set()
  await reload()
}

async function batchPutOn() {
  if (!(await confirmDialog({ message: `确定上架选中的 ${selectedIds.value.size} 个课程吗？`, danger: true }))) return
  await batchPutOnCourses([...selectedIds.value])
  toast.info('已上架')
  selectedIds.value = new Set()
  await reload()
}

async function batchDelete() {
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
  await downloadCourse(row.id).catch(() => undefined)
}

async function showReferences(row: CourseListItem) {
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

onMounted(async () => {
  catalogTree.value = await getKngCatalogTree()
  await reload()
})

function handleBatchCommand(command: string) {
  if (command === 'put-on') void batchPutOn()
  else if (command === 'take-down') void batchTakeDown()
  else if (command === 'move') openBatchMove()
  else if (command === 'delete') void batchDelete()
}

function handleMoreCommand(command: string, row: CourseListItem) {
  if (command === 'hide') openHide(row)
  else if (command === 'take-down') openTakeDown(row)
  else if (command === 'move') openMove(row)
  else if (command === 'delete') void remove(row)
  else if (command === 'copy') openCopy(row)
  else if (command === 'download') void download(row)
  else if (command === 'references') void showReferences(row)
}
</script>

<style scoped lang="scss">
.course-page {
  width: 100%;
  height: calc(100vh - 104px);
  min-height: 620px;
  display: flex;
  overflow: hidden;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
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
  border: 1px solid var(--color-rule-2);
  border-radius: var(--radius-input);
  background: var(--color-paper);
  color: var(--color-ink-2);
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

.primary-btn,
.ghost-btn {
  height: 36px;
  padding: 0 18px;
  border-radius: var(--radius-input);
  font-size: 13px;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-ink);
}

.ghost-btn {
  border: 1px solid var(--color-rule-2);
  background: var(--color-paper);
  color: var(--color-ink-2);

  &:disabled {
    color: var(--color-rule-2);
    cursor: not-allowed;
  }
}

.caret {
  margin-left: 5px;
  font-size: 11px;
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
  border-radius: var(--radius-input);
  color: var(--color-ink-2);
  font-size: 13px;
}

.filter-more {
  padding: 0 14px;
  cursor: pointer;
}

.filter-icon {
  margin-right: 7px;
  color: var(--color-muted);
}

.filter-select {
  width: 158px;

  :deep(.el-select__wrapper) {
    min-height: 36px;
  }
}

.keyword-box {
  width: 260px;

  :deep(.el-input__wrapper) {
    min-height: 36px;
  }
}

.table-wrap {
  position: relative;
  min-height: 0;
  flex: 1;
  margin-top: 14px;
  overflow: hidden;
}

.course-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 43px;
    background: var(--color-paper-2);
    color: var(--color-muted);
    font-size: 13px;
    font-weight: 500;
  }

  :deep(.el-table__row td) {
    height: 44px;
    color: var(--color-ink-2);
    font-size: 13px;
  }
}


/* 增补A 同款语义：隐藏行置灰 */
.course-table :deep(.row-hidden) {
  background: var(--color-paper-2);

  td {
    color: var(--color-rule-2);
  }

}

.course-table :deep(.row-hidden .title-link) {
  color: var(--color-muted);
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
  padding-right: 0;
  padding-left: 0;
  border: none;
  background: transparent;
  color: var(--color-ink);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: var(--color-accent);
  }
}

.cover-thumb {
  width: 42px;
  height: 26px;
  flex: 0 0 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-input);
  background: var(--color-paper-3);
  color: var(--color-muted);
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
  border: 1px solid color-mix(in oklab, var(--color-warning) 55%, var(--color-paper));
  border-radius: var(--radius-input);
  background: color-mix(in oklab, var(--color-warning) 14%, var(--color-paper));
  color: color-mix(in oklab, var(--color-warning) 55%, var(--color-ink));
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
    background: var(--color-muted);
  }
}

/* 状态点：0 未发布灰点、1 发布中橙点、2 已发布绿点、3 已下架灰点 */
.status-1 i {
  background: var(--color-warning);
}

.status-2 i {
  background: var(--color-success);
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
    color: var(--color-accent);
    font-size: 13px;
    cursor: pointer;
  }
}

.more-trigger {
  color: var(--color-muted) !important;
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

.more-trigger .caret { margin-left: 2px; font-size: 12px; }
</style>
