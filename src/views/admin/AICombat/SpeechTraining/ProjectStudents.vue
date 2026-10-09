<template>
  <div class="project-students">
    <section class="page-panel">
      <header class="toolbar">
        <div class="toolbar-left">
          <button v-if="isOwner" type="button" class="btn primary" @click="inviteVisible = true">
            邀请学员
          </button>
          <button
            v-if="isOwner"
            type="button"
            class="btn danger"
            :disabled="!selectedIds.length || removing"
            @click="handleRemove"
          >
            {{ removing ? '删除中...' : `批量删除${selectedIds.length ? `（${selectedIds.length}）` : ''}` }}
          </button>
          <button v-if="isOwner" type="button" class="btn" :disabled="exporting" @click="handleExport">
            {{ exporting ? '导出中...' : '导出数据' }}
          </button>
        </div>
      </header>

      <div class="filter-bar">
        <select v-model="filters.finishStatus" @change="search">
          <option :value="null">全部完成状态</option>
          <option :value="0">未开始</option>
          <option :value="1">未完成</option>
          <option :value="2">已完成</option>
        </select>
        <button type="button" class="filter-picker" @click="openFilterPicker('dept')">
          部门{{ selectedDeptIds.length ? `（${selectedDeptIds.length}）` : '' }}
        </button>
        <button type="button" class="filter-picker" @click="openFilterPicker('position')">
          岗位{{ selectedPostIds.length ? `（${selectedPostIds.length}）` : '' }}
        </button>
        <select v-model="filters.accountStatus" @change="search">
          <option :value="null">全部账号状态</option>
          <option :value="1">正常</option>
          <option :value="0">已禁用</option>
        </select>
        <input
          v-model.trim="filters.keyword"
          type="search"
          placeholder="姓名 / 账号 / 工号"
          @keyup.enter="search"
        />
        <button type="button" class="btn primary" @click="search">查询</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="check-col">
                <input
                  v-if="isOwner"
                  type="checkbox"
                  :checked="pageAllSelected"
                  :disabled="!rows.length"
                  @change="toggleCurrentPage"
                />
              </th>
              <th>姓名</th>
              <th>账号</th>
              <th>工号</th>
              <th>部门</th>
              <th>岗位</th>
              <th>学习次数</th>
              <th>最高得分</th>
              <th>完成状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.userId">
              <td class="check-col">
                <input
                  v-if="isOwner"
                  type="checkbox"
                  :checked="selectedIds.includes(row.userId)"
                  @change="toggleRow(row.userId)"
                />
              </td>
              <td class="name-cell">
                {{ row.fullname || '--' }}
                <span v-if="row.userStatus === 0" class="disabled-tag">已禁用</span>
              </td>
              <td>{{ row.username || '--' }}</td>
              <td>{{ row.userNo || '--' }}</td>
              <td class="path-cell" :title="row.deptFullName">{{ row.deptFullName || '--' }}</td>
              <td>{{ row.positionName || '--' }}</td>
              <td>{{ row.learnTimes ?? 0 }}</td>
              <td>{{ row.highestScore ?? '--' }}</td>
              <td>
                <span class="finish-tag" :class="finishClass(row.finishStatus)">
                  {{ row.finishStatusText || '--' }}
                </span>
              </td>
              <td>
                <button type="button" class="link-btn" @click="viewDetail(row.userId)">查看详情</button>
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="10" class="empty-cell">暂无学员数据</td>
            </tr>
            <tr v-if="loading">
              <td colspan="10" class="empty-cell">加载中...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination">
        <span>共 {{ total }} 条</span>
        <div class="page-actions">
          <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </footer>
    </section>

    <FilterPickerDialog
      :visible="picker.visible"
      :title="picker.title"
      :mode="picker.mode"
      :model-value="picker.values"
      :departments="departments"
      :positions="positions"
      @close="picker.visible = false"
      @update:model-value="applyPicker"
    />

    <InviteStudentsDialog
      :visible="inviteVisible"
      :project-id="projectId"
      @close="inviteVisible = false"
      @invited="handleInvited"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRoute, useRouter } from 'vue-router'
import {
  getDepartmentTree,
  getPositionOptions,
  getProjectStudents,
  removeProjectStudents
} from '@/api/speechAdmin'
import { getProjectDetail } from '@/api/project'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'
import FilterPickerDialog from './components/FilterPickerDialog.vue'
import InviteStudentsDialog from './components/InviteStudentsDialog.vue'
import type {
  DepartmentNode,
  PositionOption,
  ProjectStudentRow,
  StudentQuery
} from '@/types/speechAdmin'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectId = route.params.id as string

const rows = ref<ProjectStudentRow[]>([])
const departments = ref<DepartmentNode[]>([])
const positions = ref<PositionOption[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const removing = ref(false)
const exporting = ref(false)
const inviteVisible = ref(false)
const selectedIds = ref<string[]>([])
const selectedDeptIds = ref<string[]>([])
const selectedPostIds = ref<string[]>([])
const projectCreatedBy = ref('')
const projectCreatedByName = ref('')
const filters = reactive({
  keyword: '',
  finishStatus: null as number | null,
  accountStatus: null as number | null
})
const picker = reactive({
  visible: false,
  mode: 'dept' as 'dept' | 'position',
  title: '',
  values: [] as string[]
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pageAllSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.userId))
)
const isOwner = computed(() => {
  const currentIds = [auth.user?.userId, auth.user?.account].filter(Boolean)
  return Boolean(projectCreatedBy.value && currentIds.includes(projectCreatedBy.value))
})

const finishClass = (status: number) => {
  if (status === 2) return 'done'
  if (status === 1) return 'doing'
  return 'pending'
}

const buildQuery = (targetPage = page.value, targetSize = pageSize): StudentQuery => ({
  keyword: filters.keyword || undefined,
  finishStatus: filters.finishStatus,
  deptIds: selectedDeptIds.value,
  postIds: selectedPostIds.value,
  accountStatus: filters.accountStatus,
  page: targetPage,
  pageSize: targetSize
})

const loadProject = async () => {
  const data: any = await getProjectDetail(Number(projectId))
  projectCreatedBy.value = data?.createdBy || ''
  projectCreatedByName.value = data?.createdByName || ''
}

const loadOptions = async () => {
  const [deptData, positionData] = await Promise.all([getDepartmentTree(), getPositionOptions()])
  departments.value = deptData?.list ?? []
  positions.value = positionData?.list ?? []
}

const loadRows = async () => {
  loading.value = true
  try {
    const data = await getProjectStudents(projectId, buildQuery())
    rows.value = data.records
    total.value = data.total
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.userId === id))
  } finally {
    loading.value = false
  }
}

const search = () => {
  page.value = 1
  selectedIds.value = []
  void loadRows()
}

const changePage = (nextPage: number) => {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  selectedIds.value = []
  void loadRows()
}

const toggleRow = (userId: string) => {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter((id) => id !== userId)
    : [...selectedIds.value, userId]
}

const toggleCurrentPage = () => {
  const pageIds = rows.value.map((row) => row.userId)
  if (pageAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...pageIds]))
  }
}

const openFilterPicker = (mode: 'dept' | 'position') => {
  picker.mode = mode
  picker.title = mode === 'dept' ? '选择部门' : '选择岗位'
  picker.values = [...(mode === 'dept' ? selectedDeptIds.value : selectedPostIds.value)]
  picker.visible = true
}

const applyPicker = (values: string[]) => {
  if (picker.mode === 'dept') {
    selectedDeptIds.value = values
  } else {
    selectedPostIds.value = values
  }
  picker.visible = false
  search()
}

const viewDetail = (userId: string) => {
  router.push({
    path: `/sparring/newmanage/console/${projectId}/studentdetail`,
    query: { userId }
  })
}

const handleInvited = () => {
  inviteVisible.value = false
  search()
}

const handleRemove = async () => {
  if (!selectedIds.value.length || removing.value) return
  if (!(await confirmDialog({ message: `确定移除已选的 ${selectedIds.value.length} 名学员吗？移除后历史训练记录仍会保留。`, danger: true }))) return
  removing.value = true
  try {
    const data = await removeProjectStudents(projectId, selectedIds.value)
    toast.info(`已移除 ${data?.removed ?? selectedIds.value.length} 名学员`)
    selectedIds.value = []
    await loadRows()
  } finally {
    removing.value = false
  }
}

const csvCell = (value: unknown) => {
  const text = value == null ? '--' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const loadAllRowsForExport = async () => {
  const exportPageSize = 500
  const result: ProjectStudentRow[] = []
  let exportPage = 1
  let exportTotal = Number.POSITIVE_INFINITY

  while (result.length < exportTotal && exportPage <= 1000) {
    const data = await getProjectStudents(projectId, buildQuery(exportPage, exportPageSize))
    result.push(...data.records)
    exportTotal = data.total
    if (!data.records.length) break
    exportPage += 1
  }
  return result
}

const handleExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const exportRows = await loadAllRowsForExport()
    const headers = [
      '姓名',
      '账号',
      '工号',
      '部门',
      '岗位',
      '学习次数',
      '最高得分',
      '完成状态',
      '账号状态'
    ]
    const lines = [
      headers.map(csvCell).join(','),
      ...exportRows.map((row) =>
        [
          row.fullname,
          row.username,
          row.userNo,
          row.deptFullName,
          row.positionName,
          row.learnTimes,
          row.highestScore,
          row.finishStatusText,
          row.userStatus === 0 ? '已禁用' : '正常'
        ]
          .map(csvCell)
          .join(',')
      )
    ]
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `学员数据_${projectId}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadProject(), loadOptions(), loadRows()])
  if (projectCreatedByName.value) {
    document.title = `${projectCreatedByName.value} - 学员管理`
  }
})
</script>

<style scoped lang="scss">
.project-students {
  min-width: 0;
}

.page-panel {
  padding: 20px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(24, 39, 75, 0.04);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn,
.filter-picker {
  height: 34px;
  box-sizing: border-box;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;
}

.btn {
  padding: 0 16px;

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;
  }

  &.danger {
    border-color: #f1c7c7;
    color: #d94a4a;
    background: #fffafa;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;

  select,
  input {
    height: 34px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }

  input {
    width: 210px;
  }

  .filter-picker {
    padding: 0 12px;
  }
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #eef1f6;
  border-radius: 8px;
}

.data-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #f1f3f7;
    color: #4d5568;
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: #fafbfd;
    color: #6b7280;
    font-weight: 600;
  }

  tbody tr:hover {
    background: #f8fbff;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
}

.check-col {
  width: 44px;
  text-align: center !important;
}

.name-cell {
  color: #253047;
  font-weight: 500;
}

.disabled-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  margin-left: 6px;
  padding: 0 7px;
  border-radius: 10px;
  background: #fff7e6;
  color: #d46b08;
  font-size: 11px;
  font-weight: 400;
}

.path-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finish-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  font-size: 12px;

  &.done {
    background: #eafaf0;
    color: #2f9e52;
  }

  &.doing {
    background: #eef4ff;
    color: #2e7cf6;
  }

  &.pending {
    background: #f4f5f7;
    color: #8a92a5;
  }
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.empty-cell {
  height: 140px;
  text-align: center !important;
  color: #9aa3b2 !important;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  color: #7a8396;
  font-size: 12px;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;

  button {
    height: 30px;
    padding: 0 12px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &:disabled {
      color: #b8bfcc;
      cursor: not-allowed;
    }
  }
}

@media (max-width: 760px) {
  .page-panel {
    padding: 14px;
  }

  .filter-bar input {
    width: 100%;
  }
}
</style>
