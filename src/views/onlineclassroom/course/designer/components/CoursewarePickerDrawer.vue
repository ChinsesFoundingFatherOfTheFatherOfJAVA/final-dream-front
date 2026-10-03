<template>
  <!-- 截图13：选课件抽屉（标题"课程库中的"；筛选=分类下拉树+类型+关键词；列表=已发布课件） -->
  <KngDrawer
    :visible="visible"
    :title="single ? '选择课件' : '课程库中的'"
    :width="880"
    :z-index="zIndex"
    @close="emit('close')"
  >
    <div class="picker-body">
      <div class="filter-row">
        <select v-model="catalogId" class="filter-select catalog-select" @change="reload(1)">
          <option value="">全部分类</option>
          <option v-for="node in catalogOptions" :key="node.id" :value="node.id">
            {{ '　'.repeat(node.depth) }}{{ node.name }}
          </option>
        </select>
        <select v-model="typeFilter" class="filter-select" @change="reload(1)">
          <option :value="null">全部类型</option>
          <option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <label class="keyword-box">
          <span>⌕</span>
          <input v-model.trim="keyword" type="search" placeholder="搜索课件名称" @keyup.enter="reload(1)" />
        </label>
        <button type="button" class="search-btn" @click="reload(1)">搜索</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input
                  v-if="!single"
                  type="checkbox"
                  :checked="allPageChecked"
                  :indeterminate.prop="somePageChecked"
                  @change="toggleAllPage(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th>名称</th>
              <th>状态</th>
              <th>学分</th>
              <th>时长</th>
              <th>过期时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.records" :key="row.id" :class="{ checked: isSelected(row.id) }">
              <td class="check-col">
                <input
                  type="checkbox"
                  :checked="isSelected(row.id)"
                  @change="toggleRow(row, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="title-cell">
                <span class="type-icon" :style="{ background: typeColor(row.type) }">{{ typeGlyph(row.type) }}</span>
                <span class="title-text" :title="row.title">{{ row.title }}</span>
              </td>
              <td>
                <span class="status-text" :class="`status-${row.status}`"><i></i>{{ row.statusDesc }}</span>
              </td>
              <td>{{ snapshotOf(row.id)?.credits ?? '--' }}</td>
              <td>{{ snapshotOf(row.id)?.durationText || '--' }}</td>
              <td>--</td>
            </tr>
            <tr v-if="!loading && !page.records.length">
              <td colspan="6" class="empty-cell">暂无符合条件的已发布课件</td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="table-loading">加载中...</div>
      </div>

      <PaginationBar v-model:page="pageNo" v-model:page-size="pageSize" :total="page.total" @change="reload()" />
    </div>

    <template #footer>
      <div class="picker-footer">
        <div v-if="!single" class="left">
          <span class="selected-count">已选择 {{ selected.size }}/{{ PICKER_MAX_SELECTED }}</span>
          <button type="button" class="text-btn" @click="selectAllFiltered">全选筛选结果</button>
          <button type="button" class="text-btn" @click="clearAll">清除所有</button>
        </div>
        <div class="right">
          <button type="button" class="btn" @click="emit('close')">取消</button>
          <button type="button" class="btn primary" :disabled="!selected.size" @click="confirmPick">确定</button>
        </div>
      </div>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import KngDrawer from '../../../components/KngDrawer.vue'
import PaginationBar from '../../../courseware/components/PaginationBar.vue'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'
import { getCoursewareDetail, getCoursewareList, type CoursewareListItem } from '@/api/courseware'
import { toast } from '@/utils/toast'
import {
  PICKER_MAX_SELECTED,
  TASK_TYPE_ITEMS,
  coursewareTypeColor,
  flattenCatalogTree,
  formatDurationText,
  type CatalogFlatNode
} from '../model'

/**
 * 选课件抽屉（CS-07a/截图13、14）。
 * 数据源=课件模块 getCoursewareList（接口文档 §2.8）：固定 status=2（已发布），
 * 筛选=分类下拉树（CatalogTreePanel 的简化：展平 select）+ 类型（入口预选）+ 关键词。
 *
 * 学分/时长展示与任务快照：课件列表接口不返回这两列（复用既有接口、不改同事的 api），
 * 因此按页拉取课件详情补齐（快照缓存），确认时未命中缓存的勾选项再补一次详情。
 * 过期时间：本系统课件无过期概念，恒显示 "--"（原平台遗留列）。
 */

/** 选课件确认结果：任务快照所需的最小集合 */
export interface PickedCourseware {
  id: string
  title: string
  type: number
  status: number
  credits: number | null
  durationText: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  /** 入口点击的任务类型（预选到类型筛选）；null=全部类型 */
  presetType?: number | null
  /** 抽屉层叠起点 z-index */
  zIndex?: number
  /** 单选模式（编辑任务抽屉"..."换选用） */
  single?: boolean
}>(), {
  presetType: null,
  zIndex: 3100,
  single: false
})

const emit = defineEmits<{
  close: []
  confirm: [rows: PickedCourseware[]]
}>()

const catalogId = ref('')
const typeFilter = ref<number | null>(null)
const keyword = ref('')
const pageNo = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const page = reactive<{ total: number; records: CoursewareListItem[] }>({ total: 0, records: [] })

// 已勾选：id → 行数据（跨页保留）
const selected = ref(new Map<string, CoursewareListItem>())
// 课件学分/时长快照缓存（列表接口不含，按页用详情接口补齐）
const snapshotCache = new Map<string, { credits: number | null; durationText: string }>()
// 触发展示刷新的版本号（Map 非响应式）
const snapshotVersion = ref(0)

const catalogOptions = ref<CatalogFlatNode[]>([])

const typeOptions = TASK_TYPE_ITEMS
  .filter(item => item.type >= 1 && item.type <= 8)
  .map(item => ({ value: item.type, label: item.label }))

const allPageChecked = computed(
  () => page.records.length > 0 && page.records.every(row => selected.value.has(row.id))
)
const somePageChecked = computed(
  () => page.records.some(row => selected.value.has(row.id)) && !allPageChecked.value
)

function snapshotOf(id: string) {
  // 读取快照缓存；snapshotVersion 仅用于建立响应式依赖
  void snapshotVersion.value
  return snapshotCache.get(id)
}

function typeGlyph(type: number) {
  const found = TASK_TYPE_ITEMS.find(item => item.type === type)
  return found ? found.glyph : 'P'
}

function typeColor(type: number) {
  return coursewareTypeColor(type)
}

function isSelected(id: string) {
  return selected.value.has(id)
}

/** 拉取当前页并按需补齐学分/时长快照（失败静默，仅影响列展示为 "--"） */
async function reload(nextPage?: number) {
  if (nextPage) pageNo.value = nextPage
  loading.value = true
  try {
    const result = await getCoursewareList(
      { page: pageNo.value, pageSize: pageSize.value, orderBy: 'updateTime', orderType: 'desc' },
      {
        status: 2,
        catalogId: catalogId.value || null,
        includeChildCatalog: 1,
        type: typeFilter.value,
        keyword: keyword.value || undefined
      }
    )
    page.total = result.total
    page.records = result.records
    await enrichSnapshots(result.records.map(row => row.id))
  } finally {
    loading.value = false
  }
}

/** 批量拉取详情补齐快照缓存（列表接口无学分/时长字段） */
async function enrichSnapshots(ids: string[]) {
  const missing = ids.filter(id => !snapshotCache.has(id))
  await Promise.all(
    missing.map(async id => {
      try {
        const detail = await getCoursewareDetail(id)
        snapshotCache.set(id, {
          credits: detail.studyScoreCalc,
          durationText: formatDurationText(detail.standardMinutes, detail.standardSeconds)
        })
      } catch {
        // 单个详情失败不阻断抽屉（快照缺失时展示 "--"）
      }
    })
  )
  snapshotVersion.value++
}

function toggleRow(row: CoursewareListItem, checked: boolean) {
  const next = new Map(selected.value)
  if (checked) {
    if (next.size >= PICKER_MAX_SELECTED) {
      toast.warn(`最多选择 ${PICKER_MAX_SELECTED} 个课件`)
      return
    }
    // 单选模式（换选课件）：仅保留最新一项
    if (props.single) next.clear()
    next.set(row.id, row)
  } else {
    next.delete(row.id)
  }
  selected.value = next
}

function toggleAllPage(checked: boolean) {
  const next = new Map(selected.value)
  for (const row of page.records) {
    if (checked) {
      if (next.size >= PICKER_MAX_SELECTED) {
        toast.warn(`最多选择 ${PICKER_MAX_SELECTED} 个课件`)
        break
      }
      next.set(row.id, row)
    } else {
      next.delete(row.id)
    }
  }
  selected.value = next
}

/** 全选筛选结果：取当前筛选条件下前 99 条（上限 99，超出部分需分批） */
async function selectAllFiltered() {
  loading.value = true
  try {
    const result = await getCoursewareList(
      { page: 1, pageSize: PICKER_MAX_SELECTED, orderBy: 'updateTime', orderType: 'desc' },
      {
        status: 2,
        catalogId: catalogId.value || null,
        includeChildCatalog: 1,
        type: typeFilter.value,
        keyword: keyword.value || undefined
      }
    )
    const next = new Map<string, CoursewareListItem>()
    for (const row of result.records) next.set(row.id, row)
    selected.value = next
    void enrichSnapshots(result.records.map(row => row.id))
  } finally {
    loading.value = false
  }
}

function clearAll() {
  selected.value = new Map()
}

/** 确定：未命中快照缓存的勾选项补一次详情，再整体上抛 */
async function confirmPick() {
  const rows = [...selected.value.values()]
  if (!rows.length) return
  await enrichSnapshots(rows.map(row => row.id))
  const picked: PickedCourseware[] = rows.map(row => {
    const snapshot = snapshotCache.get(row.id)
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      credits: snapshot?.credits ?? null,
      durationText: snapshot?.durationText ?? ''
    }
  })
  emit('confirm', picked)
}

// 每次打开：重置筛选（类型=入口预选）、清空勾选；分类树懒加载一次
watch(
  () => props.visible,
  async visible => {
    if (!visible) return
    typeFilter.value = props.presetType
    keyword.value = ''
    catalogId.value = ''
    pageNo.value = 1
    selected.value = new Map()
    if (!catalogOptions.value.length) {
      try {
        const tree: KngTreeNode[] = await getKngCatalogTree()
        catalogOptions.value = flattenCatalogTree(tree)
      } catch {
        catalogOptions.value = []
      }
    }
    await reload()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.picker-body {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.filter-select {
  height: 34px;
  max-width: 190px;
  padding: 0 8px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
}

.catalog-select {
  min-width: 170px;
}

.keyword-box {
  flex: 1;
  min-width: 160px;
  max-width: 260px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #d9deea;
  border-radius: 6px;
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

.search-btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: #2e7cf6;
    color: #2e7cf6;
  }
}

.table-wrap {
  position: relative;
  min-height: 220px;
  flex: 1;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.check-col {
  width: 44px;
}

th,
td {
  height: 44px;
  padding: 0 10px;
  border-bottom: 1px solid #edf0f5;
  color: #4d5568;
  text-align: left;
  font-size: 13px;
}

th {
  background: #f8fafc;
  color: #667085;
  font-weight: 600;
}

tbody tr:hover {
  background: #fafcff;
}

tbody tr.checked {
  background: #f2f7ff;
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

.type-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.title-text {
  min-width: 0;
  overflow: hidden;
  color: #253047;
  text-overflow: ellipsis;
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

.status-2 i {
  background: #35b56a;
}

.status-1 i {
  background: #f0a13b;
}

.empty-cell {
  height: 180px;
  color: #98a1b2;
  text-align: center;
}

.table-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.75);
  color: #7b8496;
  font-size: 13px;
}

.picker-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: #2e7cf6;
  font-size: 13px;
}

.text-btn {
  border: none;
  background: transparent;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: #2e7cf6;
  }
}

.right {
  display: flex;
  gap: 10px;
}

.btn {
  height: 34px;
  padding: 0 18px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  cursor: pointer;

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;

    &:disabled {
      border-color: #d9deea;
      background: #f5f6f8;
      color: #b3bac7;
      cursor: not-allowed;
    }
  }
}
</style>
