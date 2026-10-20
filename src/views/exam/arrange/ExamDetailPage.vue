<template>
  <!-- F6/F7/F8/F9/F10/F12 考试详情：页头 + 三 tab（考生情况 / 试题分析 / 统计分析） -->
  <div class="detail-page">
    <header class="detail-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1 class="exam-name">
        {{ arrange?.name || '考试详情' }}
        <span class="status-tag" :class="'s' + (arrange?.status ?? 0)">{{ statusText }}</span>
      </h1>
      <div class="header-actions">
        <button class="btn" type="button" @click="openLink">考试链接</button>
        <button class="btn" type="button" @click="showNotice = true">变更通知</button>
        <button v-if="arrange && arrange.status === 0" class="btn primary" type="button" @click="doPublish">发布</button>
        <button v-if="arrange && arrange.status === 2" class="btn" type="button" @click="doEnd">结束考试</button>
      </div>
    </header>

    <div class="tabs">
      <button class="tab" type="button" :class="{ active: tab === 'student' }" @click="tab = 'student'">考生情况</button>
      <button class="tab" type="button" :class="{ active: tab === 'question' }" @click="tab = 'question'">试题分析</button>
      <button class="tab" type="button" :class="{ active: tab === 'analysis' }" @click="tab = 'analysis'">统计分析</button>
    </div>

    <!-- ===== 考生情况 ===== -->
    <section v-if="tab === 'student'" class="list-card">
      <div class="toolbar-row">
        <button class="btn primary" type="button" @click="showAdd = true">添加学员</button>
        <button class="btn" type="button" :disabled="!selectedIds.size" @click="doRemove">批量移除</button>
        <button class="btn" type="button" :disabled="selectedIds.size !== 1" @click="doRetakeSelected">安排补考</button>
        <button class="btn" type="button" @click="doSync">同步试卷</button>
        <button class="btn" type="button" @click="doAnalyze">分析数据</button>
        <button class="btn" type="button" :disabled="!selectedIds.size" @click="doUrge">催促</button>
        <button class="btn" type="button" @click="showSignature = true">签名记录</button>
        <button class="btn" type="button" @click="showColumns = true">列设置</button>
        <button class="btn export-btn" type="button" @click="openExportMenu($event)">导出数据</button>
      </div>

      <div class="filter-row">
        <select v-model.number="query.examStatus" class="filter-select" @change="reload(1)">
          <option :value="-1">考试状态</option>
          <option :value="0">未开始</option>
          <option :value="1">考试中</option>
          <option :value="2">批阅中</option>
          <option :value="3">已完成</option>
          <option :value="4">重新考试</option>
        </select>
        <select v-model.number="query.passStatus" class="filter-select" @change="reload(1)">
          <option :value="-1">通过状态</option>
          <option :value="1">通过</option>
          <option :value="0">不通过</option>
          <option :value="2">未知</option>
        </select>
        <input v-model.trim="query.keyword" type="search" placeholder="姓名/账号搜索" @keyup.enter="reload(1)" />
        <button class="btn primary" type="button" @click="reload(1)">查询</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                       @change="toggleAll(($event.target as HTMLInputElement).checked)" />
              </th>
              <th v-for="c in tableColumns" :key="c" :class="colClass(c)">{{ columnLabel(c) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in students" :key="row.id" :class="{ checked: selectedIds.has(row.id) }">
              <td class="check-col">
                <input type="checkbox" :checked="selectedIds.has(row.id)"
                       @change="toggleSelect(row.id, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td v-for="c in tableColumns" :key="c" :class="colClass(c)">
                <template v-if="c === 'account'">{{ row.account || '--' }}</template>
                <template v-else-if="c === 'fullname'">{{ row.fullname || '--' }}</template>
                <template v-else-if="c === 'deptName'">{{ row.deptName || '--' }}</template>
                <template v-else-if="c === 'positionName'">{{ row.positionName || '--' }}</template>
                <template v-else-if="c === 'examStatus'">{{ STUDENT_STATUS_TEXT[row.examStatus] ?? '--' }}</template>
                <template v-else-if="c === 'passStatus'">
                  <span :class="['pass-tag', 'p' + row.passStatus]">{{ STUDENT_PASS_TEXT[row.passStatus] ?? '--' }}</span>
                </template>
                <template v-else-if="c === 'score'">{{ row.score ?? 0 }}</template>
                <template v-else-if="c === 'highestScore'">{{ row.highestScore ?? 0 }}</template>
                <template v-else-if="c === 'attemptQty'">{{ row.attemptQty ?? 0 }}</template>
                <template v-else-if="c === 'submitAt'">{{ row.submitAt || '--' }}</template>
                <template v-else-if="c === 'operation'">
                  <span v-if="row.currentAttemptId" class="op-link" @click="openResult(row)">答卷</span>
                  <span v-if="row.canRetake" class="op-link" @click="doRetake(row)">安排补考</span>
                  <span v-else-if="row.retakeUsed === 1" class="op-muted">已补考</span>
                </template>
              </td>
            </tr>
            <tr v-if="!students.length">
              <td :colspan="tableColumns.length + 1" class="empty-cell">暂无考生，点「添加学员」安排</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <button :disabled="pageNo <= 1" type="button" @click="reload(pageNo - 1)">上一页</button>
        <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <button :disabled="pageNo >= Math.ceil(total / pageSize)" type="button" @click="reload(pageNo + 1)">下一页</button>
      </div>
    </section>

    <!-- ===== 试题分析（F13 / API-32~34） ===== -->
    <QuestionAnalysisTab v-else-if="tab === 'question'" :arrange-id="arrangeId" />

    <!-- ===== 统计分析（F14 / API-36~38） ===== -->
    <AnalysisTab v-else :arrange-id="arrangeId" />

    <AddStudentDrawer v-if="showAdd" :arrange-id="arrangeId" @close="showAdd = false" @added="onAdded" />
    <SignatureDrawer v-if="showSignature" :arrange-id="arrangeId" @close="showSignature = false" />
    <ColumnSettingDrawer v-if="showColumns" @close="showColumns = false" @saved="onColumnsSaved" />
    <ChangeNoticeDrawer v-if="showNotice" :arrange-id="arrangeId" @close="showNotice = false" />

    <!-- F3/API-27 导出菜单：仅最高成绩 / 所有成绩 / 学员答卷 -->
    <div v-if="exportMenu.visible" class="dropdown-mask" @click="exportMenu.visible = false">
      <div class="float-menu" :style="{ left: exportMenu.x + 'px', top: exportMenu.y + 'px' }">
        <div class="menu-item" @click="doExport('highest')">仅导出最高成绩</div>
        <div class="menu-item" @click="doExport('all')">导出所有成绩</div>
        <div class="menu-item" @click="doExport('answer')">导出学员答卷</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import AddStudentDrawer from './components/AddStudentDrawer.vue'
import SignatureDrawer from './components/SignatureDrawer.vue'
import QuestionAnalysisTab from './components/QuestionAnalysisTab.vue'
import AnalysisTab from './components/AnalysisTab.vue'
import ColumnSettingDrawer from './components/ColumnSettingDrawer.vue'
import ChangeNoticeDrawer from './components/ChangeNoticeDrawer.vue'
import {
  analyzeArrange, batchArrange, endArrange, getArrangeDetail, getArrangeLink, getArrangeStudents,
  exportArrangeStudents, getStudentColumns, publishArrange, removeArrangeStudents,
  retakeArrangeStudent, syncArrangePaper, urgeArrangeStudents,
  STUDENT_COLUMN_LABELS, STUDENT_PASS_TEXT, STUDENT_STATUS_TEXT,
  type ArrangeColumnSetting,
  type ArrangeDetail, type ArrangeStudentItem, type ArrangeStudentQuery
} from '@/api/arrange'

const route = useRoute()
const router = useRouter()
const arrangeId = String(route.query.arrangeId ?? '')

const arrange = ref<ArrangeDetail | null>(null)
const tab = ref<'student' | 'question' | 'analysis'>(
  (String(route.query.tab ?? 'student') as 'student' | 'question' | 'analysis'))
const students = ref<ArrangeStudentItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 10
const selectedIds = ref(new Set<string>())
const showAdd = ref(false)
const showSignature = ref(false)
const showColumns = ref(false)
const showNotice = ref(false)
const exportMenu = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
/** 列表列（按用户列设置过滤 + 排序；账号/姓名/操作是保留列） */
const columnSetting = ref<ArrangeColumnSetting[]>([])
const tableColumns = computed(() => {
  const cols = columnSetting.value.length
    ? columnSetting.value.filter(c => c.visible).map(c => c.key)
    : Object.keys(STUDENT_COLUMN_LABELS)
  return cols.filter(k => STUDENT_COLUMN_LABELS[k])
})

const columnLabel = (key: string) => STUDENT_COLUMN_LABELS[key] ?? key
const colClass = (key: string) =>
  key === 'submitAt' ? 'col-time' : key === 'operation' ? 'col-op' : key === 'account' || key === 'fullname' || key === 'deptName' || key === 'positionName' ? '' : 'col-sm'

const query = reactive<ArrangeStudentQuery>({
  keyword: '', examStatus: -1, passStatus: -1, accountStatus: -1
})

const statusText = computed(() => {
  const s = arrange.value?.status ?? 0
  return s === 0 ? '未发布' : s === 2 ? '进行中' : s === 3 ? '已结束' : '--'
})
const allChecked = computed(() =>
  students.value.length > 0 && students.value.every(s => selectedIds.value.has(s.id)))
const someChecked = computed(() =>
  students.value.some(s => selectedIds.value.has(s.id)) && !allChecked.value)

const loadArrange = async () => {
  if (!arrangeId) {
    toast.error('缺少考试 id')
    return
  }
  try {
    arrange.value = await getArrangeDetail(arrangeId)
  } catch { /* 拦截器已提示 */ }
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  try {
    const res = await getArrangeStudents(arrangeId, pageNo.value, pageSize, query)
    students.value = res.records || []
    total.value = res.total || 0
  } catch { /* 拦截器已提示 */ }
}

const toggleSelect = (id: string, checked: boolean) => {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}
const toggleAll = (checked: boolean) => {
  const next = new Set(selectedIds.value)
  for (const s of students.value) {
    if (checked) next.add(s.id)
    else next.delete(s.id)
  }
  selectedIds.value = next
}

const onAdded = () => {
  showAdd.value = false
  selectedIds.value = new Set()
  reload()
  loadArrange()
}

const doRemove = async () => {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  const ok = await confirmDialog({
    title: `确认移除 ${ids.length} 位考生？`,
    message: '已有作答记录的考生会被拦截，需要再确认一次强制移除',
    danger: true
  })
  if (!ok) return
  try {
    await removeArrangeStudents(arrangeId, ids, false)
    toast.success('已移除')
    selectedIds.value = new Set()
    reload(); loadArrange()
  } catch {
    // 40004：有人已有作答记录 —— 二次确认后强制移除
    const force = await confirmDialog({
      title: '部分考生已有作答记录',
      message: '强制移除会同时保留历史答卷，仅把该考生移出名单。确定继续？',
      danger: true
    })
    if (!force) return
    try {
      await removeArrangeStudents(arrangeId, ids, true)
      toast.success('已强制移除')
      selectedIds.value = new Set()
      reload(); loadArrange()
    } catch { /* 拦截器已提示 */ }
  }
}

const doRetake = async (row: ArrangeStudentItem) => {
  const ok = await confirmDialog({
    title: `确认为「${row.fullname}」安排补考？`,
    message: '每位考生只允许补考一次',
    danger: false
  })
  if (!ok) return
  try {
    const res = await retakeArrangeStudent(arrangeId, row.id)
    toast.success(`已安排补考（第 ${res.attemptNo} 次）`)
    reload()
  } catch { /* 拦截器已提示 */ }
}

const doRetakeSelected = async () => {
  const row = students.value.find(s => selectedIds.value.has(s.id))
  if (row) await doRetake(row)
}

const doSync = async () => {
  const ok = await confirmDialog({
    title: '同步试卷到本场考试？',
    message: '「未作答」只影响尚未交卷的考生；历史答卷不受影响',
    danger: false
  })
  if (!ok) return
  try {
    const res = await syncArrangePaper(arrangeId, 'unanswered')
    toast.success(`已同步，影响 ${res.affectedCount} 条作答记录`)
  } catch { /* 拦截器已提示 */ }
}

const doAnalyze = async () => {
  const ok = await confirmDialog({
    title: '重新分析本场考试数据？',
    message: '会重算成绩与统计指标，指标计算完成后才对外开放',
    danger: false
  })
  if (!ok) return
  try {
    const res = await analyzeArrange(arrangeId)
    toast.success(`分析完成（${res.analysisTime}）`)
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const doUrge = async () => {
  const ids = Array.from(selectedIds.value)
  const ok = await confirmDialog({
    title: `确认催促 ${ids.length} 位考生？`,
    message: '催促通过平台通知通道下发',
    danger: false
  })
  if (!ok) return
  try {
    const res = await urgeArrangeStudents(arrangeId, 'exam', ids)
    toast.success(`已催促 ${res.sentCount} 人`)
  } catch { /* 拦截器已提示 */ }
}

const openLink = async () => {
  try {
    const res = await getArrangeLink(arrangeId)
    await navigator.clipboard.writeText(res.linkUrl).catch(() => undefined)
    toast.success('考试链接已复制到剪贴板')
  } catch { /* 拦截器已提示 */ }
}

const doPublish = async () => {
  const ok = await confirmDialog({
    title: '确认发布该考试？',
    message: '发布后试卷结构锁定，会冻结一份试卷快照',
    danger: false
  })
  if (!ok) return
  try {
    await publishArrange(arrangeId)
    toast.success('考试已发布')
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const doEnd = async () => {
  const ok = await confirmDialog({ title: '确认结束该考试？', message: '结束后学员不能再进入', danger: true })
  if (!ok) return
  try {
    await endArrange(arrangeId)
    toast.success('考试已结束')
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const goBack = () => router.push('/exam/exam-mgmt')

const onColumnsSaved = async () => {
  showColumns.value = false
  try {
    const res = await getStudentColumns()
    columnSetting.value = (res.columns || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch { /* 拦截器已提示 */ }
}

const openExportMenu = (event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  exportMenu.visible = true
  exportMenu.x = rect.right - 150
  exportMenu.y = rect.bottom + 4
}

/** API-27 导出考生数据：仅最高成绩 / 所有成绩 / 学员答卷。 */
const doExport = async (type: 'highest' | 'all' | 'answer') => {
  exportMenu.visible = false
  try {
    await exportArrangeStudents(arrangeId, type)
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

/** 跳答卷详情页。 */
const openResult = (row: ArrangeStudentItem) => {
  if (!row.currentAttemptId) return
  router.push(`/exam/result?ueId=${row.currentAttemptId}`)
}

onMounted(async () => {
  loadArrange()
  reload(1)
  onColumnsSaved()
})
</script>

<style scoped lang="scss">
.detail-page { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 12px 16px 0; }
.detail-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
  .back-btn { width: 28px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 18px; color: #4a5368; cursor: pointer; }
  .exam-name { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px; }
  .status-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 400; background: #f5f5f5; color: #8c8c8c; }
  .status-tag.s2 { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
  .status-tag.s3 { background: #fafafa; border: 1px solid #e5e8ef; color: #8c8c8c; }
  .status-tag.s0 { background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; }
  .header-actions { margin-left: auto; display: flex; gap: 10px; }
}
.tabs {
  display: flex; gap: 4px; border-bottom: 1px solid #e8eaef; margin-bottom: 12px;
  .tab {
    padding: 9px 18px; border: none; background: none; font-size: 14px; color: #4a5368; cursor: pointer;
    border-bottom: 2px solid transparent;
    &.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 500; }
  }
}
.list-card { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 0 0 12px; }
.toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; .export-btn { margin-left: auto; } }
.filter-row { display: flex; gap: 8px; align-items: center; input { flex: 1; min-width: 160px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none; } }
.filter-select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; }
.table-wrap { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr:hover td { background: #fafbfe; }
tr.checked td { background: #f5f9ff; }
.check-col { width: 36px; text-align: center; }
.col-sm { min-width: 80px; white-space: nowrap; }
.col-time { min-width: 150px; white-space: nowrap; color: #667; }
.col-op { min-width: 110px; white-space: nowrap; }
.pass-tag { padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.pass-tag.p1 { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
.pass-tag.p0 { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
.pass-tag.p2 { background: #fafafa; color: #8c8c8c; border: 1px solid #e5e8ef; }
.op-link { color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }
.op-muted { color: #b0b7c3; }
.dropdown-mask { position: fixed; inset: 0; z-index: 2999; }
.float-menu {
  position: fixed; z-index: 3000; min-width: 150px; background: #fff;
  border: 1px solid #e6eaf1; border-radius: 6px; box-shadow: 0 6px 20px rgba(0, 0, 0, .12); padding: 4px 0;
  .menu-item {
    padding: 8px 14px; font-size: 13px; color: #4a5368; cursor: pointer; white-space: nowrap;
    &:hover { background: #f2f6ff; color: #1890ff; }
  }
}
.empty-cell { text-align: center; color: #999; padding: 48px 0; }
.pagination {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667;
  button { padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; } }
}
.placeholder { align-items: center; justify-content: center; color: #8a92a5; .ph-title { font-size: 15px; color: #4a5368; margin: 0 0 6px; } .ph-desc { font-size: 13px; margin: 0; } }
.btn {
  padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .55; cursor: not-allowed; }
}
</style>
