<template>
  <!--
    统一在线课堂资源选择器（AI 设计助手 / AI 出题共用，2026-10-28）
    对齐原平台抽屉：左侧筛选 + 表格分页，右侧已选区，底部取消/确定。
    设计助手与出题只差在 purpose、上限与列配置，不复制第二套组件。
  -->
  <el-drawer
    :model-value="true"
    :size="960"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="kng-source-drawer"
    @close="cancel"
  >
    <div class="drawer">
      <header class="drawer-head">
        <h3>{{ variant === 'question' ? '课程库中的' : '在线课堂' }}</h3>
        <button type="button" class="close-btn" aria-label="关闭" @click="cancel">
          <el-icon><Close /></el-icon>
        </button>
      </header>

      <div class="drawer-main">
        <!-- 左：筛选 + 表格 + 分页 -->
        <section class="table-pane">
          <div class="filter-row">
            <el-tree-select
              v-model="catalogId"
              class="catalog-select"
              :data="catalogs"
              node-key="id"
              :props="{ label: 'name', children: 'children' }"
              check-strictly
              clearable
              :render-after-expand="false"
              placeholder="课程分类"
              @change="reload"
            />
            <el-input
              v-model="keyword"
              class="keyword-input"
              clearable
              placeholder="搜索课件名称"
              @keydown.enter.prevent="reload"
              @clear="reload"
            />
            <el-button class="filter-btn" @click="reload">搜索</el-button>
          </div>

          <el-table
            ref="tableRef"
            v-loading="loading"
            :data="rows"
            class="source-table"
            height="calc(100vh - 250px)"
            row-key="id"
            :row-class-name="rowClass"
            @selection-change="onSelectionChange"
          >
            <el-table-column type="selection" width="46" :selectable="canSelect" />
            <el-table-column label="名称" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="name-cell">
                  {{ row.title }}
                  <el-tag v-if="row.hidden" size="small" type="info" class="hidden-tag"
                    >已隐藏</el-tag
                  >
                </span>
              </template>
            </el-table-column>
            <template v-if="variant === 'question'">
              <el-table-column label="学分" width="90" prop="credits" />
              <el-table-column label="时长" width="110" prop="durationText" />
              <el-table-column label="分享人" width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.createdByName || '--' }}</template>
              </el-table-column>
            </template>
            <template v-else>
              <el-table-column label="课时" width="110" prop="durationText" />
              <el-table-column label="创建人" width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.createdByName || '--' }}</template>
              </el-table-column>
              <el-table-column label="更新时间" width="170">
                <template #default="{ row }">{{ row.updateTime || '--' }}</template>
              </el-table-column>
              <!-- 原平台有「有效期」列，本系统无过期字段：固定显示 --（已确认决策） -->
              <el-table-column label="有效期" width="120">
                <template #default>--</template>
              </el-table-column>
            </template>
          </el-table>

          <div class="pagination-row">
            <span class="total-text">共 {{ total }} 条</span>
            <el-pagination
              v-model:current-page="page"
              :page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              background
              @current-change="load"
            />
          </div>
        </section>

        <!-- 右：已选区 -->
        <aside class="selected-pane">
          <div class="selected-head">
            <span>已选 {{ selected.length }} / {{ maxSelect }}</span>
            <el-button link class="clear-btn" :disabled="!selected.length" @click="clearAll"
              >清空</el-button
            >
          </div>
          <div class="selected-list">
            <div v-for="item in selected" :key="item.id" class="selected-item">
              <span class="selected-title" :title="item.title">{{ item.title }}</span>
              <button
                type="button"
                class="remove-btn"
                aria-label="移除"
                @click="removeOne(item.id)"
              >
                <el-icon><Close /></el-icon>
              </button>
            </div>
            <p v-if="!selected.length" class="selected-empty">尚未选择课件</p>
          </div>
        </aside>
      </div>

      <footer class="drawer-foot">
        <span v-if="errorText" class="error-text">{{ errorText }}</span>
        <span v-else class="foot-tip">首期仅开放文档类课件；视频、音频、微课暂不支持</span>
        <el-button @click="cancel">取消</el-button>
        <el-button
          type="primary"
          :disabled="!selected.length"
          :loading="confirming"
          @click="confirm"
        >
          确定
        </el-button>
      </footer>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import {
  listKngAiSources,
  type KngAiSourceItem,
  type KngAiSourceListResp,
  type KngSourcePurpose,
} from '@/api/kngAiSource'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'

const props = withDefaults(
  defineProps<{
    purpose: KngSourcePurpose
    /** 选择上限：设计助手 5 / 出题 1 */
    maxSelect: number
    /** 列与文案变体 */
    variant: 'designAssistant' | 'question'
    /** 已选过的课件 id（重复选择在服务端 upsert，这里只做界面去重） */
    excludeIds?: string[]
  }>(),
  { excludeIds: () => [] },
)

const emit = defineEmits<{
  cancel: []
  confirm: [items: KngAiSourceItem[]]
}>()

const PAGE_SIZE = 20

const rows = ref<KngAiSourceItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = PAGE_SIZE
const loading = ref(false)
const confirming = ref(false)
const errorText = ref('')
const keyword = ref('')
const catalogId = ref<string>('')
const catalogs = ref<KngTreeNode[]>([])
const selected = ref<KngAiSourceItem[]>([])
const tableRef = ref<TableInstance | null>(null)
/** 正在把已选区回写表格勾选态：期间的 selection-change 不是用户操作 */
let syncing = false

const excluded = computed(() => new Set(props.excludeIds ?? []))
const reachedLimit = computed(() => selected.value.length >= props.maxSelect)
const selectedIds = computed(() => new Set(selected.value.map((item) => item.id)))

/**
 * 达到上限后禁用未选行（已选行仍可取消勾选）。
 * Element Plus 的 selectable 在勾选瞬间被判一次，因此这里只依赖"是否已选 + 是否到上限"。
 */
function canSelect(row: KngAiSourceItem): boolean {
  if (excluded.value.has(row.id)) return false
  if (selectedIds.value.has(row.id)) return true
  return !reachedLimit.value
}

function rowClass({ row }: { row: KngAiSourceItem }): string {
  return excluded.value.has(row.id) ? 'row-excluded' : ''
}

/** 跨页选择：勾选变化整体覆盖当前已选集合，已选项由 selected ref 保底（翻页不清空） */
function onSelectionChange(picked: KngAiSourceItem[]) {
  // 由 syncTableSelection 触发的回调不是用户操作，直接忽略
  if (syncing) return
  const fresh = picked.filter((item) => !excluded.value.has(item.id))
  // 表格勾选只反映当页；跨页保留下来的项不在 picked 里，需要按 id 合并
  const merged = [...selected.value]
  const pageIds = new Set(rows.value.map((row) => row.id))
  // 先移除"当页被取消勾选"的项（当页原已选、现在不在 picked 里）
  for (const id of pageIds) {
    const stillPicked = fresh.some((item) => item.id === id)
    const wasSelected = merged.some((item) => item.id === id)
    if (wasSelected && !stillPicked) {
      const at = merged.findIndex((item) => item.id === id)
      if (at >= 0) merged.splice(at, 1)
    }
  }
  for (const item of fresh) {
    if (!merged.some((existing) => existing.id === item.id)) merged.push(item)
  }
  selected.value = merged.slice(0, props.maxSelect)
  // 超出上限的勾选回滚（Element Plus 侧同步）—— syncTableSelection 内含防重入标记
  void nextTick(() => syncTableSelection())
}

/**
 * 把已选区回写到表格勾选态（跨页返回时恢复勾选）。
 *
 * 必须有 syncing 防重入：clearSelection()/toggleRowSelection() 会同步触发
 * selection-change，若不拦，onSelectionChange 会把刚勾上的选择又按"取消勾选"清掉，
 * 表现为"点了复选框，已选计数一直 0"（实测踩到）。
 */
function syncTableSelection() {
  const table = tableRef.value
  if (!table) return
  syncing = true
  try {
    table.clearSelection()
    for (const row of rows.value) {
      if (selected.value.some((item) => item.id === row.id)) {
        table.toggleRowSelection(row, true)
      }
    }
  } finally {
    syncing = false
  }
}

function removeOne(id: string) {
  selected.value = selected.value.filter((item) => item.id !== id)
  void nextTick(() => syncTableSelection())
}

function clearAll() {
  selected.value = []
  void nextTick(() => syncTableSelection())
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const resp: KngAiSourceListResp = await listKngAiSources(
      { page: page.value, pageSize, orderBy: 'updateTime', orderType: 'desc' },
      {
        purpose: props.purpose,
        keyword: keyword.value.trim(),
        type: 1,
        catalogId: catalogId.value || '',
        includeChildCatalog: 1,
        includeHidden: true,
      },
    )
    rows.value = resp.records ?? []
    total.value = resp.total ?? 0
    await nextTick()
    syncTableSelection()
  } catch (e) {
    // 失败不清空已选区：用户翻页/筛选失败时不该丢掉已经选好的课件
    errorText.value = e instanceof Error && e.message ? e.message : '课件列表加载失败，请重试'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void load()
}

function cancel() {
  emit('cancel')
}

function confirm() {
  if (!selected.value.length || confirming.value) return
  emit('confirm', [...selected.value])
}

async function loadCatalogs() {
  try {
    catalogs.value = await getKngCatalogTree()
  } catch {
    // 分类树失败不阻塞选择：仍可按关键词搜
    catalogs.value = []
  }
}

// 翻页时保留已选（不重置 selected），只重拉列表
watch(page, () => void load())

onMounted(() => {
  void loadCatalogs()
  void load()
})
</script>

<style scoped lang="scss">
.drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 960px;
  max-width: 96vw;
  background: #fff;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e9edf4;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1f2329;
  }

  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #8a8f98;
    cursor: pointer;
    font-size: 16px;

    &:hover {
      background: #f2f3f5;
      color: #1f2329;
    }
    &:focus-visible {
      outline: 2px solid #1890ff;
      outline-offset: -2px;
    }
  }
}

.drawer-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  padding: 16px 20px;
}

.table-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .catalog-select {
    width: 220px;
  }
  .keyword-input {
    width: 260px;
  }
  .filter-btn {
    flex-shrink: 0;
  }
}

.source-table {
  flex: 1;
  min-height: 0;

  :deep(.row-excluded) {
    color: #c0c4cc;
    background: #fafafa;
  }

  .name-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .hidden-tag {
    flex-shrink: 0;
  }
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .total-text {
    font-size: 12px;
    color: #8a8f98;
  }
}

.selected-pane {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9edf4;
  border-radius: 6px;
  overflow: hidden;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #eef1f6;
  background: #fafbfd;
  font-size: 13px;
  color: #4e5969;

  .clear-btn {
    font-size: 12px;
  }
}

.selected-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;

  &:hover {
    background: #f5f8ff;
  }

  .selected-title {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: #1f2329;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #a5a9b0;
    cursor: pointer;
    font-size: 12px;

    &:hover {
      background: #fff1f0;
      color: #e5484d;
    }
    &:focus-visible {
      outline: 2px solid #1890ff;
      outline-offset: 1px;
    }
  }
}

.selected-empty {
  margin: 20px 0;
  text-align: center;
  font-size: 12px;
  color: #a5a9b0;
}

.drawer-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid #e9edf4;

  .foot-tip,
  .error-text {
    margin-right: auto;
    font-size: 12px;
  }

  .foot-tip {
    color: #a5a9b0;
  }
  .error-text {
    color: #e5484d;
  }
}
</style>
