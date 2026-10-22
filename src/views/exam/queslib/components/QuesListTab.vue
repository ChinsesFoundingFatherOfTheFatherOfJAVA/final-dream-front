<template>
  <!-- FP-07 试题列表（截图08）：筛选行 + 表格 + 分页；编辑页(FP-08)由父组件接路由。 -->
  <div class="ques-list">
    <div class="filter-row">
      <select v-model.number="filters.type" class="filter-select">
        <option :value="-1">全部题型</option>
        <option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)">{{ label }}</option>
      </select>
      <select v-model.number="filters.levelType" class="filter-select">
        <option :value="-1">全部难度</option>
        <option v-for="(label, value) in LEVEL_LABELS" :key="value" :value="Number(value)">{{ label }}</option>
      </select>
      <select v-model="filters.pointId" class="filter-select">
        <option value="">全部考核点</option>
        <option v-for="point in points" :key="point.id" :value="point.id">{{ point.name }}</option>
      </select>
      <select v-model.number="filters.disabled" class="filter-select">
        <option :value="-1">全部状态</option>
        <option :value="0">启用</option>
        <option :value="1">禁用</option>
      </select>
      <input v-model.trim="filters.keyword" type="search" placeholder="请输入试题名称、创建人姓名或账号搜索"
             @keyup.enter="reload(1)" />
      <button class="btn-primary" type="button" @click="reload(1)">查询</button>
      <button class="btn" type="button" @click="createQues">手动建题</button>
      <button class="btn" type="button" @click="emit('quick-create')">快速建题</button>
      <button class="btn" type="button" @click="emit('ai-create')">AI建题</button>

      <!-- 试题查重：五题型（无组合题），查完自动切到"仅看重复题" -->
      <div class="dup-wrap">
        <button class="btn" type="button" @click="showDupMenu = !showDupMenu">试题查重 ▾</button>
        <div v-if="showDupMenu" class="dup-menu">
          <div v-for="item in DUP_TYPES" :key="item.type" class="dup-item" @click="runDuplicate(item.type)">
            <span>{{ item.label }}</span>
            <span v-if="dupChecked(item.type)" class="done">已查</span>
          </div>
        </div>
      </div>
      <!-- 导入：下载模板 → 上传 → 逐行错误明细（FP-12） -->
      <div class="dup-wrap">
        <button class="btn" type="button" @click="showImportMenu = !showImportMenu">导入试题 ▾</button>
        <div v-if="showImportMenu" class="dup-menu">
          <div class="dup-item" @click="emit('import', 'excel'); showImportMenu = false">Excel 导入</div>
          <div class="dup-item" @click="emit('import', 'word'); showImportMenu = false">Word 导入</div>
        </div>
      </div>

      <!-- 导出：按当前筛选条件导出 Excel（5 Sheet 分题型）/ Word（按题型分节） -->
      <div class="dup-wrap">
        <button class="btn" type="button" @click="showExportMenu = !showExportMenu">导出试题 ▾</button>
        <div v-if="showExportMenu" class="dup-menu">
          <div class="dup-item" @click="exportFile('excel')">Excel 导出</div>
          <div class="dup-item" @click="exportFile('word')">Word 导出</div>
        </div>
      </div>
      <span v-if="isDuplicateOnly" class="dup-chip">
        仅看重复题
        <i @click="clearDuplicateFilter">×</i>
      </span>
    </div>

    <!-- FP-15 批量操作：勾选后出现 -->
    <div v-if="selectedIds.size" class="batch-bar">
      <span class="batch-count">已选 {{ selectedIds.size }} 项</span>
      <button class="btn" type="button" @click="batchDisable(1)">批量禁用</button>
      <button class="btn" type="button" @click="batchDisable(0)">批量启用</button>
      <button class="btn danger" type="button" @click="batchDelete">批量删除</button>
      <button class="btn" type="button" @click="showChangeLib = true">批量换库</button>
      <button class="btn" type="button" @click="showSetPoint = true">设置考核点</button>
      <button class="link" type="button" @click="clearSelection">清除所选</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="check-col">
              <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                     @change="toggleAll(($event.target as HTMLInputElement).checked)" />
            </th>
            <th class="col-name">试题名称</th>
            <th class="col-sm">题型</th>
            <th class="col-point">考核点</th>
            <th class="col-sm">难度</th>
            <th class="col-user">创建人</th>
            <th class="col-time sortable" @click="toggleSort('createTime')">
              创建日期<span v-if="orderby === 'createTime'" class="sort-mark">{{ asc ? '↑' : '↓' }}</span>
            </th>
            <th class="col-user">更新人</th>
            <th class="col-time sortable" @click="toggleSort('updateTime')">
              更新日期<span v-if="orderby === 'updateTime'" class="sort-mark">{{ asc ? '↑' : '↓' }}</span>
            </th>
            <th class="col-op">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in records" :key="row.id" :class="{ checked: selectedIds.has(row.id) }">
            <td class="check-col">
              <input type="checkbox" :checked="selectedIds.has(row.id)"
                     @change="toggleRow(row.id, ($event.target as HTMLInputElement).checked)" />
            </td>
            <td class="col-name">
              <span class="name-text" :class="{ secret: row.disabled === 1 }" :title="row.summary">{{ row.summary }}</span>
              <span v-if="row.duplicate === 1" class="tag-warn">重复</span>
              <span v-if="row.isMultiMediaType === 1" class="tag-media">媒体</span>
            </td>
            <td class="col-sm">{{ typeLabel(row.type) }}</td>
            <td class="col-point" :title="row.pointNames">{{ row.mainPointName || '--' }}</td>
            <td class="col-sm">{{ levelLabel(row.levelType) }}</td>
            <td class="col-user">
              {{ row.createFullname || '--' }}<span v-if="row.createUserName" class="account-no">({{ row.createUserName }})</span>
            </td>
            <td class="col-time">{{ row.createTime || '--' }}</td>
            <td class="col-user">{{ row.updateFullname || '--' }}</td>
            <td class="col-time">{{ row.updateTime || '--' }}</td>
            <td class="col-op">
              <button class="link" type="button" @click="emit('edit', row.id)">编辑</button>
              <button class="link" type="button" @click="openView(row.id)">查看</button>
              <button class="link danger" type="button" @click="onDelete(row)">删除</button>
            </td>
          </tr>
          <tr v-if="!loading && !records.length">
            <td colspan="10" class="empty-cell">暂无试题</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span>共 {{ total }} 条</span>
      <button :disabled="pageNo <= 1" type="button" @click="reload(pageNo - 1)">上一页</button>
      <span class="page-no">{{ pageNo }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
      <button :disabled="pageNo >= Math.ceil(total / pageSize)" type="button" @click="reload(pageNo + 1)">下一页</button>
      <select v-model.number="pageSize" class="page-size" @change="reload(1)">
        <option :value="10">10 条/页</option>
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
        <option :value="100">100 条/页</option>
      </select>
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
    <div v-if="viewDetail" class="view-overlay" @click.self="viewDetail = null">
      <div class="view-drawer">
        <div class="view-header">
          <span>试题详情</span>
          <span class="close-btn" @click="viewDetail = null">×</span>
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
          <button class="btn" type="button" :disabled="currentViewIndex <= 0" @click="moveView(-1)">上一题</button>
          <button class="btn" type="button"
                  :disabled="currentViewIndex < 0 || currentViewIndex >= records.length - 1"
                  @click="moveView(1)">下一题</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

  .filter-select {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
    max-width: 150px;
  }

  input {
    flex: 1;
    min-width: 180px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
  }
}

.batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #eaf2ff;
  border: 1px solid #c7ddff;
  border-radius: 6px;

  .batch-count { font-size: 12px; color: #1890ff; font-weight: 600; margin-right: 4px; }
  .btn.danger { color: #f5222d; border-color: #ffccc7; }
  .link {
    margin-left: auto;
    border: none;
    background: transparent;
    color: #1890ff;
    font-size: 12px;
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
}

.table-wrap { border: 1px solid #e6eaf1; border-radius: 6px; overflow: auto; }

table { width: 100%; border-collapse: collapse; font-size: 12px; }

th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; }
.sort-mark { margin-left: 4px; color: #1890ff; }
tr:hover td { background: #fafbfe; }

.check-col { width: 34px; }
tr.checked td { background: #f0f7ff; }

.col-name { min-width: 220px; max-width: 360px; }
.col-point { min-width: 120px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-user { min-width: 90px; white-space: nowrap; }
.account-no { color: #8a92a5; font-size: 12px; margin-left: 2px; }
.col-time { min-width: 140px; white-space: nowrap; color: #667; }
.col-sm { min-width: 62px; white-space: nowrap; }
.col-op { min-width: 130px; white-space: nowrap; }

.name-text {
  color: #1f2937;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  &.secret { color: #d46b08; }
}

.tag-warn, .tag-media {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 11px;
}
.tag-warn { background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; }
.tag-media { background: #f0f5ff; border: 1px solid #adc6ff; color: #2f54eb; }

.link {
  border: none;
  background: transparent;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 0 6px;

  &:hover { text-decoration: underline; }
  &.danger { color: #f5222d; }
}

.empty-cell { text-align: center; color: #999; padding: 40px 0; }

.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #667;

  button {
    padding: 4px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }

  .page-no { min-width: 60px; text-align: center; }
  .page-size {
    margin-left: auto;
    border: 1px solid #d9d9d9;
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
.btn { border: 1px solid #d9d9d9; background: #fff; color: #4a5368; }

.dup-wrap {
  position: relative;

  .dup-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    min-width: 132px;
    background: #fff;
    border: 1px solid #e6eaf1;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
    padding: 4px 0;
  }

  .dup-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    font-size: 12px;
    color: #4a5368;
    cursor: pointer;

    &:hover { background: #f3f7ff; color: #1890ff; }
    .done { margin-left: auto; font-size: 11px; color: #52c41a; }
  }
}

.dup-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #ffd591;
  border-radius: 12px;
  background: #fff7e6;
  color: #d46b08;
  font-size: 12px;

  i { font-style: normal; cursor: pointer; &:hover { color: #f5222d; } }
}
.btn-primary { border: 1px solid #1890ff; background: #1890ff; color: #fff; }

.view-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  justify-content: flex-end;
  z-index: 3200;
}

.view-drawer {
  width: 520px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.view-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

.view-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #eee;
}

.view-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px dashed #f2f4f8;
  align-items: flex-start;

  label { flex: 0 0 72px; color: #8a92a5; }
  span, div { flex: 1; color: #1f2937; word-break: break-word; }
  .pre { white-space: pre-wrap; }
}

.option-list { display: flex; flex-direction: column; gap: 6px; }
.option-item { display: flex; gap: 6px; align-items: flex-start; }
.answer-mark { color: #52c41a; font-style: normal; font-size: 11px; }
</style>
