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
      <el-button
        v-if="treeCollapsed"
        class="tree-expand"
        aria-label="展开分类树"
        title="展开分类树"
        @click="treeCollapsed = false"
      >
        ≡
      </el-button>

      <header class="top-actions">
        <div class="left-actions">
          <el-dropdown trigger="click" @command="handlePublishCommand">
            <el-button class="primary-btn">
              发布课件 <span class="caret" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>本地上传</el-dropdown-item>
                <el-dropdown-item command="file">上传文件</el-dropdown-item>
                <el-dropdown-item command="scorm">SCORM课件</el-dropdown-item>
                <el-dropdown-item command="html">HTML课件</el-dropdown-item>
                <el-dropdown-item command="link">外部链接</el-dropdown-item>
                <el-dropdown-item disabled>从应用选择</el-dropdown-item>
                <el-dropdown-item disabled>从知识库选择</el-dropdown-item>
                <el-dropdown-item disabled>发表微课</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

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

        <div class="right-links">
          <el-button @click="router.push('/kng/courseware/transcode')">转码管理</el-button>
          <el-button @click="router.push('/kng/courseware/subtitles')">字幕管理</el-button>
        </div>
      </header>

      <div class="filter-row">
        <el-button class="filter-more" @click="filterVisible = true">
          <span class="filter-icon" aria-hidden="true"><el-icon><Filter /></el-icon></span>
          更多筛选
          <span class="caret" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </el-button>
        <el-select v-model="typeFilter" class="filter-select" placeholder="全部类型" @change="reload(1)">
          <el-option label="全部类型" :value="''" />
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="statusFilter" class="filter-select" placeholder="课件状态" @change="reload(1)">
          <el-option label="课件状态" :value="''" />
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

      <FilterTags
        :filters="activeFilters"
        @remove="removeFilter"
        @clear="clearFilters"
      />

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="page.records"
          row-key="id"
          class="courseware-table"
          :default-sort="{ prop: 'updateTime', order: 'descending' }"
          @sort-change="onSortChange"
          :empty-text="'暂无数据'"
          :row-class-name="coursewareRowClass"
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
          <el-table-column label="名称" min-width="320">
            <template #default="{ row }">
              <div class="title-cell">
                <span class="type-icon" :class="`type-${row.type}`" aria-hidden="true">{{ typeBadge(row.type) }}</span>
                <el-button link class="title-link" @click="openDetail(row.id)">{{ row.title }}</el-button>
                <span v-if="row.type === 8" class="external-icon" aria-hidden="true" title="外链课">↗</span>
                <span v-if="row.hidden" class="hidden-tag">已隐藏</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="92">
            <template #default="{ row }">{{ row.typeDesc }}</template>
          </el-table-column>
          <el-table-column label="更新日期" width="150" prop="updateTime" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.updateTime || '--' }}</template>
          </el-table-column>
          <el-table-column label="学习人数" width="110" prop="studyCount" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="{ row }">{{ row.studyCount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="108">
            <template #default="{ row }">
                <span class="status-text" :class="`status-${row.status}`">
                  <i aria-hidden="true"></i>{{ row.statusDesc }}
                </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
                <div class="action-list">
                  <el-button link type="primary" @click="openDetail(row.id)">查看详情</el-button>
                  <el-button link type="primary" @click="edit(row.id)">编辑</el-button>
                  <el-dropdown trigger="click" @command="(command: string) => handleMoreCommand(command, row)">
                    <el-button link class="more-trigger">更多 <el-icon class="caret"><ArrowDown /></el-icon></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="hide">{{ row.hidden ? '取消隐藏' : '隐藏' }}</el-dropdown-item>
                        <el-dropdown-item v-if="row.status === 2" command="take-down">下架</el-dropdown-item>
                        <el-dropdown-item command="move">移动</el-dropdown-item>
                        <el-dropdown-item command="copy">复制</el-dropdown-item>
                        <el-dropdown-item command="delete">删除</el-dropdown-item>
                        <el-dropdown-item command="download">下载</el-dropdown-item>
                        <el-dropdown-item command="references">引用记录</el-dropdown-item>
                        <el-dropdown-item command="download-records">下载记录</el-dropdown-item>
                        <el-dropdown-item v-if="row.type !== 1" command="subtitle">编辑字幕</el-dropdown-item>
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
    <!-- 增补A：隐藏确认弹窗（截图18 语义），与课程模块共用 -->
    <HideConfirmDialog
      :visible="hideVisible"
      target-type="课件"
      :name="hideRow?.title || ''"
      @close="hideVisible = false"
      @confirm="confirmHide"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Filter, Search } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRouter } from 'vue-router'
import CatalogTreePanel from './components/CatalogTreePanel.vue'
import FilterTags from './components/FilterTags.vue'
import FilterDrawer, { type CoursewareFilters } from './components/FilterDrawer.vue'
import TakeDownDialog from './components/TakeDownDialog.vue'
import CopyDrawer from './components/CopyDrawer.vue'
import SubtitleDrawer from './components/SubtitleDrawer.vue'
import MoveCoursewareDrawer from './components/MoveCoursewareDrawer.vue'
import PaginationBar from './components/PaginationBar.vue'
import HideConfirmDialog from '../components/HideConfirmDialog.vue'
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
  hideCourseware,
  moveCourseware,
  takeDownCourseware,
  type CoursewareListItem,
  type CoursewareListQuery
} from '@/api/courseware'
import { downloadBlob, saveBlob } from '@/api/request'
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
const typeFilter = ref<number | ''>('')
const statusFilter = ref<number | ''>('')
const keyword = ref('')
const loading = ref(false)
const page = reactive<{ total: number; records: CoursewareListItem[] }>({ total: 0, records: [] })
const selectedIds = ref(new Set<string>())
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

const takeDownVisible = ref(false)
const takeDownRow = ref<CoursewareListItem | null>(null)
const copyVisible = ref(false)
const copyRow = ref<CoursewareListItem | null>(null)
const subtitleVisible = ref(false)
const subtitleRow = ref<CoursewareListItem | null>(null)
const moveVisible = ref(false)
const moveRows = ref<string[]>([])
// 增补A：隐藏确认弹窗状态
const hideVisible = ref(false)
const hideRow = ref<CoursewareListItem | null>(null)

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
const coursewareRowClass = ({ row }: { row: CoursewareListItem }) => row.hidden ? 'row-hidden' : ''

function typeBadge(type: number) {
  return type === 2 ? '▶' : type === 3 ? '♫' : type === 4 ? '▣' : type === 6 ? 'SC' : type === 7 ? '<>' : type === 8 ? '↗' : 'P'
}

function queryBody(): CoursewareListQuery {
  return {
    keyword: keyword.value || undefined,
    type: typeFilter.value === '' ? null : typeFilter.value,
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

function goPublish(variant: 'file' | 'scorm' | 'html' | 'link') {
  // 增补B：四种发布途径共用的表单页通过 query 继承左树选中分类
  router.push({
    path: `/kng/courseware/publish/${variant}`,
    query: selectedCatalogId.value ? { catalogId: selectedCatalogId.value } : {}
  })
}

function handlePublishCommand(command: string) {
  if (['file', 'scorm', 'html', 'link'].includes(command)) {
    goPublish(command as 'file' | 'scorm' | 'html' | 'link')
  }
}

function handleBatchCommand(command: string) {
  if (command === 'put-on') void batchPutOn()
  else if (command === 'take-down') void batchTakeDown()
  else if (command === 'move') openBatchMove()
  else if (command === 'delete') void batchDelete()
}

function openDetail(id: string) {
  if (!id) return
  router.push(`/kng/courseware/info/${id}`)
}

function edit(id: string) {
  router.push(`/kng/courseware/edit/${id}`)
}

function openTakeDown(row: CoursewareListItem) {
  takeDownRow.value = row
  takeDownVisible.value = true
}

// 增补A：打开隐藏确认弹窗（hidden 与 status 独立双标记，可反复切换）
function openHide(row: CoursewareListItem) {
  hideRow.value = row
  hideVisible.value = true
}

async function confirmHide() {
  if (!hideRow.value) return
  await hideCourseware(hideRow.value.id, !hideRow.value.hidden)
  toast.info(hideRow.value.hidden ? '已取消隐藏' : '已隐藏')
  hideVisible.value = false
  await reload()
}

async function confirmTakeDown() {
  if (!takeDownRow.value) return
  await takeDownCourseware(takeDownRow.value.id)
  toast.info('已下架')
  takeDownVisible.value = false
  await reload()
}

function openCopy(row: CoursewareListItem) {
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
  subtitleRow.value = row
  subtitleVisible.value = true
}

function openMove(row: CoursewareListItem) {
  moveRows.value = [row.id]
  moveVisible.value = true
}

function openBatchMove() {
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
  if (!(await confirmDialog({ message: `确定删除课件「${row.title}」吗？`, danger: true }))) return
  await deleteCourseware(row.id)
  toast.info('已删除')
  await reload()
}

async function batchTakeDown() {
  if (!(await confirmDialog({ message: `确定下架选中的 ${selectedIds.value.size} 个课件吗？`, danger: true }))) return
  await batchTakeDownCourseware([...selectedIds.value])
  toast.info('已下架')
  selectedIds.value = new Set()
  await reload()
}

async function batchPutOn() {
  if (!(await confirmDialog({ message: `确定上架选中的 ${selectedIds.value.size} 个课件吗？`, danger: true }))) return
  await batchPutOnCourseware([...selectedIds.value])
  toast.info('已上架')
  selectedIds.value = new Set()
  await reload()
}

async function batchDelete() {
  if (!(await confirmDialog({ message: `确定删除选中的 ${selectedIds.value.size} 个课件吗？`, danger: true }))) return
  await batchDeleteCourseware([...selectedIds.value])
  toast.info('已删除')
  selectedIds.value = new Set()
  await reload()
}

async function download(row: CoursewareListItem) {
  try {
    const blob = await downloadBlob(`/kng/admin/courseware/${row.id}/download`, { timeout: 180_000 })
    saveBlob(blob, row.title)
  } catch {
    toast.error('下载失败')
  }
}

async function showReferences(row: CoursewareListItem) {
  const records = await getCoursewareReferences(row.id)
  window.alert(records.length ? JSON.stringify(records, null, 2) : '暂无引用')
}

async function showDownloadRecords(row: CoursewareListItem) {
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

onMounted(async () => {
  catalogTree.value = await getKngCatalogTree()
  await reload()
})

function handleMoreCommand(command: string, row: CoursewareListItem) {
  if (command === 'hide') openHide(row)
  else if (command === 'take-down') openTakeDown(row)
  else if (command === 'move') openMove(row)
  else if (command === 'copy') openCopy(row)
  else if (command === 'delete') void remove(row)
  else if (command === 'download') void download(row)
  else if (command === 'references') void showReferences(row)
  else if (command === 'download-records') void showDownloadRecords(row)
  else if (command === 'subtitle') openSubtitle(row)
}
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
  border-radius: 6px;
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

.courseware-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 43px;
    background: #f8fafc;
    color: #667085;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 48px;
    color: #4d5568;
    font-size: 13px;
  }
}


/* 增补A：隐藏课件行置灰（独立于下架，可取消隐藏恢复） */
.courseware-table :deep(.row-hidden) {
  background: #fafbfc;

  td {
    color: #b3bac7;
  }

}

.courseware-table :deep(.row-hidden .title-link) {
  color: #9aa2b1;
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

.more-trigger .caret { margin-left: 2px; font-size: 12px; }
</style>
