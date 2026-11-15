<template>
  <!-- FP-07 试题列表（截图08）：筛选行 + 表格 + 分页；编辑页(FP-08)由父组件接路由。 -->
  <div class="ques-list">
    <div class="filter-row">
      <el-select v-model="filters.type" class="filter-select">
        <el-option :value="-1" label="全部题型" />
        <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
      </el-select>
      <el-select v-model="filters.levelType" class="filter-select">
        <el-option :value="-1" label="全部难度" />
        <el-option v-for="(label, value) in LEVEL_LABELS" :key="value" :value="Number(value)" :label="label" />
      </el-select>
      <el-select v-model="filters.pointId" class="filter-select">
        <el-option value="" label="全部考核点" />
        <el-option v-for="point in points" :key="point.id" :value="point.id" :label="point.name" />
      </el-select>
      <el-select v-model="filters.disabled" class="filter-select">
        <el-option :value="-1" label="全部状态" />
        <el-option :value="0" label="启用" />
        <el-option :value="1" label="禁用" />
      </el-select>
      <el-input v-model.trim="filters.keyword" placeholder="请输入试题名称、创建人姓名或账号搜索"
             @keyup.enter="reload(1)" />
      <el-button class="btn-primary" @click="reload(1)">查询</el-button>
      <el-button class="btn" @click="createQues">手动建题</el-button>
      <el-button class="btn" @click="emit('quick-create')">快速建题</el-button>
      <el-button class="btn" @click="emit('ai-create')">AI建题</el-button>

      <!-- 试题查重：五题型（无组合题），查完自动切到"仅看重复题" -->
      <div class="dup-wrap">
        <el-button class="btn" @click="showDupMenu = !showDupMenu">试题查重 <el-icon class="btn-caret"><ArrowDown /></el-icon></el-button>
        <div v-if="showDupMenu" class="dup-menu">
          <div v-for="item in DUP_TYPES" :key="item.type" class="dup-item" role="button" tabindex="0"
               @click="runDuplicate(item.type)" @keydown.enter.prevent="runDuplicate(item.type)">
            <span>{{ item.label }}</span>
            <span v-if="dupChecked(item.type)" class="done">已查</span>
          </div>
        </div>
      </div>
      <!-- 导入：下载模板 → 上传 → 逐行错误明细（FP-12） -->
      <div class="dup-wrap">
        <el-button class="btn" @click="showImportMenu = !showImportMenu">导入试题 <el-icon class="btn-caret"><ArrowDown /></el-icon></el-button>
        <div v-if="showImportMenu" class="dup-menu">
          <div class="dup-item" role="button" tabindex="0"
               @click="emit('import', 'excel'); showImportMenu = false"
               @keydown.enter.prevent="emit('import', 'excel'); showImportMenu = false">Excel 导入</div>
          <div class="dup-item" role="button" tabindex="0"
               @click="emit('import', 'word'); showImportMenu = false"
               @keydown.enter.prevent="emit('import', 'word'); showImportMenu = false">Word 导入</div>
        </div>
      </div>

      <!-- 导出：按当前筛选条件导出 Excel（5 Sheet 分题型）/ Word（按题型分节） -->
      <div class="dup-wrap">
        <el-button class="btn" @click="showExportMenu = !showExportMenu">导出试题 <el-icon class="btn-caret"><ArrowDown /></el-icon></el-button>
        <div v-if="showExportMenu" class="dup-menu">
          <div class="dup-item" role="button" tabindex="0" @click="exportFile('excel')" @keydown.enter.prevent="exportFile('excel')">Excel 导出</div>
          <div class="dup-item" role="button" tabindex="0" @click="exportFile('word')" @keydown.enter.prevent="exportFile('word')">Word 导出</div>
        </div>
      </div>
      <span v-if="isDuplicateOnly" class="dup-chip">
        仅看重复题
        <i role="button" tabindex="0" aria-label="清除重复题筛选" @click="clearDuplicateFilter" @keydown.enter.prevent="clearDuplicateFilter">×</i>
      </span>
    </div>

    <!-- FP-15 批量操作：勾选后出现 -->
    <div v-if="selectedIds.size" class="batch-bar">
      <span class="batch-count">已选 {{ selectedIds.size }} 项</span>
      <el-button class="btn" @click="batchDisable(1)">批量禁用</el-button>
      <el-button class="btn" @click="batchDisable(0)">批量启用</el-button>
      <el-button class="btn danger" @click="batchDelete">批量删除</el-button>
      <el-button class="btn" @click="showChangeLib = true">批量换库</el-button>
      <el-button class="btn" @click="showSetPoint = true">设置考核点</el-button>
      <el-button class="link" @click="clearSelection">清除所选</el-button>
    </div>

    <div class="table-wrap">
      <el-table
        v-loading="loading"
        :data="records"
        row-key="id"
        class="ques-table"
        empty-text="暂无试题"
      >
        <el-table-column width="44" align="center">
          <template #header>
            <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
          </template>
          <template #default="{ row }">
            <el-checkbox :model-value="selectedIds.has(row.id)" @change="toggleRow(row.id, Boolean($event))" />
          </template>
        </el-table-column>
        <el-table-column label="试题名称" min-width="280">
          <template #default="{ row }">
            <div>
              <span class="name-text" :class="{ secret: row.disabled === 1 }" :title="row.summary">{{ row.summary }}</span>
              <span v-if="row.duplicate === 1" class="tag-warn">重复</span>
              <span v-if="row.isMultiMediaType === 1" class="tag-media">媒体</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="题型" width="100"><template #default="{ row }">{{ typeLabel(row.type) }}</template></el-table-column>
        <el-table-column label="考核点" width="140" show-overflow-tooltip><template #default="{ row }">{{ row.mainPointName || '--' }}</template></el-table-column>
        <el-table-column label="难度" width="90"><template #default="{ row }">{{ levelLabel(row.levelType) }}</template></el-table-column>
        <el-table-column label="创建人" width="150">
          <template #default="{ row }">
              {{ row.createFullname || '--' }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span>
          </template>
        </el-table-column>
        <el-table-column label="创建日期" width="170">
          <template #header><el-button link @click="toggleSort('createTime')">创建日期 {{ orderby === 'createTime' ? (asc ? '↑' : '↓') : '' }}</el-button></template>
          <template #default="{ row }">{{ row.createTime || '--' }}</template>
        </el-table-column>
        <el-table-column label="更新人" width="130"><template #default="{ row }">{{ row.updateFullname || '--' }}</template></el-table-column>
        <el-table-column label="更新日期" width="170">
          <template #header><el-button link @click="toggleSort('updateTime')">更新日期 {{ orderby === 'updateTime' ? (asc ? '↑' : '↓') : '' }}</el-button></template>
          <template #default="{ row }">{{ row.updateTime || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="emit('edit', row.id)">编辑</el-button>
            <el-button link @click="openView(row.id)">查看</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination">
      <span>共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="sizes, prev, pager, next"
        background
        @size-change="reload(1)"
        @current-change="reload"
      />
    </div>

    <!-- FP-15 批量换库 / 设置考核点 -->
    <ChangeLibDrawer
      v-if="showChangeLib"
      :ques-ids="Array.from(selectedIds)"
      :count="selectedIds.size"
      @close="showChangeLib = false"
      @saved="onBatchSaved"
    />
    <SetPointDrawer
      v-if="showSetPoint"
      :lib-id="libId"
      :ques-ids="Array.from(selectedIds)"
      :count="selectedIds.size"
      @close="showSetPoint = false"
      @saved="onBatchSaved"
    />

    <!-- 查看抽屉 -->
    <el-drawer
      v-if="viewDetail"
      :model-value="true"
      size="520px"
      :with-header="false"
      append-to-body
      destroy-on-close
      class="exam-drawer"
      @close="viewDetail = null"
    >
      <div class="view-drawer">
        <div class="view-header">
          <span>试题详情</span>
          <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="viewDetail = null" @keydown.enter.prevent="viewDetail = null">×</span>
        </div>
        <div class="view-body">
          <div class="view-row"><label>题型</label><span>{{ typeLabel(viewDetail.type) }}</span></div>
          <div class="view-row"><label>难度</label><span>{{ levelLabel(viewDetail.levelType) }}</span></div>
          <div class="view-row"><label>题干</label><span v-html="viewDetail.content || viewDetail.summary"></span></div>
          <div v-if="viewDetail.questionItems?.length" class="view-row">
            <label>选项</label>
            <div class="option-list">
              <div v-for="(item, idx) in viewDetail.questionItems" :key="item.id" class="option-item">
                <b>{{ String.fromCharCode(65 + idx) }}.</b>
                <span v-html="item.itemContent"></span>
                <i v-if="item.answer === 1" class="answer-mark">正确</i>
              </div>
            </div>
          </div>
          <div v-if="viewDetail.type === 2" class="view-row">
            <label>答案</label>
            <span>{{ viewDetail.judgeAnswer === 0 ? '正确' : '错误' }}</span>
          </div>
          <div v-if="viewDetail.answerContent" class="view-row">
            <label>{{ viewDetail.type === 3 ? '填空答案' : '参考答案' }}</label>
            <span class="pre">{{ viewDetail.answerContent }}</span>
          </div>
          <div v-if="viewDetail.answerKeywords?.length" class="view-row">
            <label>关键词</label>
            <span>{{ viewDetail.answerKeywords.map(k => `${k.keyword}(${k.scoreRatio}%)`).join('、') }}</span>
          </div>
          <div v-if="viewDetail.explainText" class="view-row">
            <label>试题解析</label><span v-html="viewDetail.explainText"></span>
          </div>
          <div v-if="viewDetail.points?.length" class="view-row">
            <label>考核点</label>
            <span>{{ viewDetail.points.map(p => p.name).join('；') }}</span>
          </div>
          <div class="view-row"><label>更新人</label><span>{{ currentViewRow?.updateFullname || '--' }}</span></div>
          <div class="view-row"><label>更新日期</label><span>{{ currentViewRow?.updateTime || '--' }}</span></div>
        </div>
        <div class="view-footer">
          <el-button class="btn" :disabled="currentViewIndex <= 0" @click="moveView(-1)">上一题</el-button>
          <el-button class="btn"
                  :disabled="currentViewIndex < 0 || currentViewIndex >= records.length - 1"
                  @click="moveView(1)">下一题</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import {
  batchQues, checkQuesDuplicate, deleteQues, exportQuesFile, getDuplicateCondition, getPointList, getQuesDetail, getQuesList,
  type DuplicateCondition, type PointItem, type QuesDetail, type QuesItem
} from '@/api/exam'
import ChangeLibDrawer from './ChangeLibDrawer.vue'
import SetPointDrawer from './SetPointDrawer.vue'

/**
 * 题库详情页·试题详情 tab（FP-07）。
 * 只负责列表/查看/删除；编辑跳转由父组件处理（编辑页属 FP-08）。
 */
const props = defineProps<{
  libId: string
  /** 试卷管理页跳过来时带的题目 id：只展示这一题（题库 07 §9 增量） */
  quesId?: string
}>()
const emit = defineEmits<{ edit: [id: string]; create: []; 'ai-create': []; 'quick-create': []; 'import': [format: 'excel' | 'word']; changed: [] }>()

const TYPE_LABELS: Record<number, string> = { 0: '单选', 1: '多选', 2: '判断', 3: '填空', 4: '问答', 5: '组合' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }

const filters = reactive({ type: -1, levelType: -1, pointId: '', disabled: -1, keyword: '' })
const records = ref<QuesItem[]>([])
const points = ref<PointItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const orderby = ref<'updateTime' | 'createTime'>('updateTime')
const asc = ref(false)
const loading = ref(false)
const viewDetail = ref<QuesDetail | null>(null)
const currentViewRow = computed(() => records.value.find(row => row.id === viewDetail.value?.id))
const currentViewIndex = computed(() => currentViewRow.value ? records.value.indexOf(currentViewRow.value) : -1)
/** 查重：五题型（组合题不参与），condition 记录哪些题型已经查过。 */
const DUP_TYPES = [
  { type: 0, label: '单选题', key: 'singleStatus' as const },
  { type: 1, label: '多选题', key: 'multiStatus' as const },
  { type: 2, label: '判断题', key: 'judgeStatus' as const },
  { type: 3, label: '填空题', key: 'fillStatus' as const },
  { type: 4, label: '问答题', key: 'answerStatus' as const }
]
const showDupMenu = ref(false)
const showExportMenu = ref(false)
const showImportMenu = ref(false)

/** FP-15 批量：只针对当前页勾选（不做跨页累加，避免"选择全部"的语义歧义）。 */
const selectedIds = ref(new Set<string>())
const showChangeLib = ref(false)
const showSetPoint = ref(false)

const allChecked = computed(() => records.value.length > 0 && records.value.every(row => selectedIds.value.has(row.id)))
const someChecked = computed(() => records.value.some(row => selectedIds.value.has(row.id)) && !allChecked.value)

const toggleRow = (id: string, checked: boolean) => {
  if (checked) selectedIds.value.add(id)
  else selectedIds.value.delete(id)
}

const toggleAll = (checked: boolean) => {
  for (const row of records.value) {
    if (checked) selectedIds.value.add(row.id)
    else selectedIds.value.delete(row.id)
  }
}

const clearSelection = () => selectedIds.value.clear()

const onBatchSaved = () => {
  clearSelection()
  reload()
}

const batchDisable = async (disabled: number) => {
  try {
    await batchQues('disable', Array.from(selectedIds.value), { disabled })
    toast.success(disabled === 1 ? '已批量禁用' : '已批量启用')
    onBatchSaved()
  } catch { /* 拦截器已提示 */ }
}

const batchDelete = async () => {
  const ok = await confirmDialog({
    title: `确认删除选中的 ${selectedIds.value.size} 道试题？`,
    message: '试题删除后，需在随机试卷下手动同步试题，固定试卷不受影响',
    danger: true
  })
  if (!ok) return
  try {
    await batchQues('delete', Array.from(selectedIds.value))
    toast.success('已批量删除')
    onBatchSaved()
  } catch { /* 拦截器已提示 */ }
}
const isDuplicateOnly = ref(false)
const dupCondition = ref<DuplicateCondition | null>(null)

const typeLabel = (type: number) => TYPE_LABELS[type] ?? '--'
const levelLabel = (level: number) => LEVEL_LABELS[level] ?? '--'

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res = await getQuesList(pageNo.value, pageSize.value, orderby.value,
      asc.value ? 'ASC' : 'DESC', {
        libId: props.libId,
        keyword: filters.keyword,
        type: filters.type,
        levelType: filters.levelType,
        disabled: filters.disabled,
        pointId: filters.pointId,
        isDuplicate: isDuplicateOnly.value ? 1 : 0,
        quesId: props.quesId || ''
      })
    total.value = res.total || 0
    records.value = res.records || []
    // 重新拉列表后旧勾选可能已不存在，直接清空更安全
    selectedIds.value.clear()
  } finally {
    loading.value = false
  }
}

const dupChecked = (type: number) => {
  const item = DUP_TYPES.find(t => t.type === type)
  return !!item && dupCondition.value?.[item.key] === 1
}

const loadDuplicateCondition = async () => {
  try {
    dupCondition.value = await getDuplicateCondition(props.libId)
  } catch { /* 拦截器已提示 */ }
}

/** 执行查重 → 按该题型过滤 → 只看重复题。 */
const runDuplicate = async (type: number) => {
  showDupMenu.value = false
  try {
    const res = await checkQuesDuplicate(props.libId, type)
    filters.type = type
    isDuplicateOnly.value = true
    await loadDuplicateCondition()
    await reload(1)
    toast.success(res.duplicateCount > 0 ? `发现 ${res.duplicateCount} 道重复试题` : '未发现重复试题')
  } catch { /* 拦截器已提示 */ }
}

const clearDuplicateFilter = () => {
  isDuplicateOnly.value = false
  filters.type = -1
  reload(1)
}

/** 导出：把当前筛选条件原样带给后端，前端只负责触发下载。 */
const exportFile = async (format: 'excel' | 'word') => {
  showExportMenu.value = false
  try {
    const blob = await exportQuesFile(format, {
      libId: props.libId,
      keyword: filters.keyword,
      type: filters.type,
      levelType: filters.levelType,
      disabled: filters.disabled,
      pointId: filters.pointId,
      isDuplicate: isDuplicateOnly.value ? 1 : 0
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = format === 'word' ? '试题列表.docx' : '试题列表.xlsx'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

const toggleSort = (field: 'createTime' | 'updateTime') => {
  if (orderby.value === field) {
    asc.value = !asc.value
  } else {
    orderby.value = field
    asc.value = false
  }
  reload(1)
}

const openView = async (id: string) => {
  try {
    viewDetail.value = await getQuesDetail(id)
  } catch { /* 拦截器已提示 */ }
}

const moveView = (delta: number) => {
  const next = currentViewIndex.value + delta
  const row = records.value[next]
  if (next >= 0 && next < records.value.length && row) {
    void openView(row.id)
  }
}

const onDelete = async (row: QuesItem) => {
  const ok = await confirmDialog({
    title: '确认删除该试题？',
    message: '试题删除后，需在随机试卷下手动同步试题，固定试卷不受影响',
    danger: true
  })
  if (!ok) return
  try {
    await deleteQues(row.id)
    toast.success('试题已删除')
    emit('changed')
    reload()
  } catch { /* 拦截器已提示 */ }
}

const createQues = () => emit('create')

watch(() => props.libId, () => { reload(1) })

onMounted(async () => {
  reload(1)
  loadDuplicateCondition()
  try {
    points.value = await getPointList(props.libId)
  } catch { /* 拦截器已提示 */ }
})

defineExpose({ reload })
</script>

<style scoped lang="scss">
.ques-list { display: flex; flex-direction: column; gap: 12px; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  // el-select 的 EP wrapper 自带边框，根元素上不再画边框/加内边距，避免双层嵌套
  .filter-select {
    font-size: 12px;
    max-width: 150px;
  }
}

.batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-accent-wash);
  border: 1px solid var(--color-rule-2);
  border-radius: 6px;

  .batch-count { font-size: 12px; color: var(--color-accent); font-weight: 600; margin-right: 4px; }
  .btn.danger { color: var(--color-error); border-color: color-mix(in oklab, var(--color-error) 35%, var(--color-paper)); }
  .link {
    margin-left: auto;
    border: none;
    background: transparent;
    color: var(--color-accent);
    font-size: 12px;
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
}

.table-wrap { border: 1px solid var(--color-rule); border-radius: 6px; overflow: auto; }

table { width: 100%; border-collapse: collapse; font-size: 12px; }

th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--color-paper-2); vertical-align: middle; }
th { background: var(--color-paper-2); color: var(--color-muted); font-weight: 500; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; }
.sort-mark { margin-left: 4px; color: var(--color-accent); }
tr:hover td { background: var(--color-accent-wash); }

.check-col { width: 34px; }
tr.checked td { background: var(--color-accent-wash); }

.col-name { min-width: 220px; max-width: 360px; }
.col-point { min-width: 120px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-user { min-width: 90px; white-space: nowrap; }
.account-no { color: var(--color-muted); font-size: 12px; margin-left: 2px; }
.col-time { min-width: 140px; white-space: nowrap; color: var(--color-muted); }
.col-sm { min-width: 62px; white-space: nowrap; }
.col-op { min-width: 130px; white-space: nowrap; }

.name-text {
  color: var(--color-ink);
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  &.secret { color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink)); }
}

.tag-warn, .tag-media {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 11px;
}
.tag-warn { background: color-mix(in oklab, var(--color-warning) 16%, var(--color-paper)); border: 1px solid color-mix(in oklab, var(--color-warning) 45%, var(--color-paper)); color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink)); }
.tag-media { background: var(--color-accent-wash); border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-paper)); color: var(--color-accent-deep); }

.link {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0 6px;

  &:hover { text-decoration: underline; }
  &.danger { color: var(--color-error); }
}

.empty-cell { text-align: center; color: var(--color-muted); padding: 40px 0; }

.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--color-muted);

  button {
    padding: 4px 12px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    background: var(--color-paper);
    cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }

  .page-no { min-width: 60px; text-align: center; }
  .page-size {
    margin-left: auto;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 12px;
  }
}

.btn, .btn-primary {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn { border: 1px solid var(--color-rule-2); background: var(--color-paper); color: var(--color-ink-2); }

.dup-wrap {
  position: relative;

  .dup-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    min-width: 132px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    border-radius: 6px;
    box-shadow: 0 8px 24px var(--shadow-card);
    padding: 4px 0;
  }

  .dup-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    font-size: 12px;
    color: var(--color-ink-2);
    cursor: pointer;

    &:hover { background: var(--color-accent-wash); color: var(--color-accent); }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
    .done { margin-left: auto; font-size: 11px; color: var(--color-success); }
  }
}

.dup-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid color-mix(in oklab, var(--color-warning) 45%, var(--color-paper));
  border-radius: 12px;
  background: color-mix(in oklab, var(--color-warning) 16%, var(--color-paper));
  color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink));
  font-size: 12px;

  i { font-style: normal; cursor: pointer; &:hover { color: var(--color-error); }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 2px; } }
}
.btn-primary { border: 1px solid var(--color-accent); background: var(--color-accent); color: var(--color-accent-ink); }

.view-drawer {
  width: 520px;
  height: 100%;
  background: var(--color-paper);
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-rule);
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } }
}

.view-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

.view-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-rule);
}

.view-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--color-paper-2);
  align-items: flex-start;

  label { flex: 0 0 72px; color: var(--color-muted); }
  span, div { flex: 1; color: var(--color-ink); word-break: break-word; }
  .pre { white-space: pre-wrap; }
}

.option-list { display: flex; flex-direction: column; gap: 6px; }
.option-item { display: flex; gap: 6px; align-items: flex-start; }
.answer-mark { color: var(--color-success); font-style: normal; font-size: 11px; }

.btn-caret { vertical-align: -2px; margin-left: 2px; font-size: 12px; }
</style>
