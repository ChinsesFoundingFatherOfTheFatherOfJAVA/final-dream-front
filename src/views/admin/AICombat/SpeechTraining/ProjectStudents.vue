<template>
  <div class="project-students">
    <section class="page-panel">
      <header class="toolbar">
        <div class="toolbar-left">
          <el-button v-if="isOwner" class="btn primary" @click="inviteVisible = true">
            邀请学员
          </el-button>
          <el-button
            v-if="isOwner"
           
            class="btn danger"
            :disabled="!selectedIds.length || removing"
            @click="handleRemove"
          >
            {{ removing ? '删除中...' : `批量删除${selectedIds.length ? `（${selectedIds.length}）` : ''}` }}
          </el-button>
          <el-button v-if="isOwner" class="btn" :disabled="exporting" @click="handleExport">
            {{ exporting ? '导出中...' : '导出数据' }}
          </el-button>
        </div>
      </header>

      <div class="filter-bar">
        <el-select v-model="filters.finishStatus" placeholder="全部完成状态" @change="search">
          <el-option label="全部完成状态" :value="null" />
          <el-option label="未开始" :value="0" />
          <el-option label="未完成" :value="1" />
          <el-option label="已完成" :value="2" />
        </el-select>
        <el-button class="filter-picker" @click="openFilterPicker('dept')">
          部门{{ selectedDeptIds.length ? `（${selectedDeptIds.length}）` : '' }}
        </el-button>
        <el-button class="filter-picker" @click="openFilterPicker('position')">
          岗位{{ selectedPostIds.length ? `（${selectedPostIds.length}）` : '' }}
        </el-button>
        <el-select v-model="filters.accountStatus" placeholder="全部账号状态" @change="search">
          <el-option label="全部账号状态" :value="null" />
          <el-option label="正常" :value="1" />
          <el-option label="已禁用" :value="0" />
        </el-select>
        <el-input
          v-model.trim="filters.keyword"
          placeholder="姓名 / 账号 / 工号"
          clearable
          @keyup.enter="search"
        />
        <el-button class="btn primary" @click="search">查询</el-button>
      </div>

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="rows"
          row-key="userId"
          class="data-table"
          empty-text="暂无学员数据"
        >
          <el-table-column v-if="isOwner" width="44" align="center">
            <template #header>
              <el-checkbox
                :model-value="pageAllSelected"
                :disabled="!rows.length"
                @change="toggleCurrentPage"
              />
            </template>
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedIds.includes(row.userId)"
                @change="toggleRow(row.userId)"
              />
            </template>
          </el-table-column>
          <el-table-column label="姓名" min-width="120">
            <template #default="{ row }">
              <span class="name-cell">{{ row.fullname || '--' }}</span>
              <el-tag v-if="row.userStatus === 0" size="small" type="warning">已禁用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="账号" min-width="130">
            <template #default="{ row }">{{ row.username || '--' }}</template>
          </el-table-column>
          <el-table-column label="工号" width="120">
            <template #default="{ row }">{{ row.userNo || '--' }}</template>
          </el-table-column>
          <el-table-column label="部门" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.deptFullName || '--' }}</template>
          </el-table-column>
          <el-table-column label="岗位" min-width="130">
            <template #default="{ row }">{{ row.positionName || '--' }}</template>
          </el-table-column>
          <el-table-column label="学习次数" width="100">
            <template #default="{ row }">{{ row.learnTimes ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="最高得分" width="100">
            <template #default="{ row }">{{ row.highestScore ?? '--' }}</template>
          </el-table-column>
          <el-table-column label="完成状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.finishStatus === 2 ? 'success' : row.finishStatus === 1 ? 'primary' : 'info'">
                {{ row.finishStatusText || '--' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row.userId)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <footer class="pagination">
        <span>共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          :disabled="loading"
          layout="prev, pager, next"
          background
          @current-change="loadRows"
        />
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

const pageAllSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.userId))
)
const isOwner = computed(() => {
  const currentIds = [auth.user?.userId, auth.user?.account].filter(Boolean)
  return Boolean(projectCreatedBy.value && currentIds.includes(projectCreatedBy.value))
})

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
  border: 1px solid var(--color-paper-2);
  border-radius: 8px;
  background: var(--color-paper);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-graphite) 4%, transparent);
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
  border: 1px solid var(--color-rule);
  border-radius: 6px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-size: 13px;
  cursor: pointer;
}

.btn {
  padding: 0 16px;

  &.primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
  }

  &.danger {
    border-color: color-mix(in oklab, var(--color-error) 22%, var(--color-paper));
    color: var(--color-error);
    background: var(--color-paper);
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

  :deep(.el-select),
  :deep(.el-input) {
    flex: 0 0 180px;
    width: 180px;
  }

  :deep(.el-input) {
    flex-basis: 220px;
    width: 220px;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 34px;
    border-radius: 6px;
    font-size: 13px;
  }

  .filter-picker {
    padding: 0 12px;
  }
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
}

.data-table {
  width: 100%;

  :deep(.el-table__header th) {
    background: var(--color-paper-2);
    color: var(--color-ink-2);
    font-size: 13px;
    font-weight: 500;
  }

  :deep(.el-table__row td) {
    height: 44px;
    color: var(--color-ink-2);
    font-size: 13px;
    border-bottom: 1px solid var(--color-rule);
  }
  :deep(.el-table .cell) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :deep(.el-table__row:hover > td) { background: var(--color-accent-wash) !important; }
}

.name-cell {
  color: var(--color-ink);
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  color: var(--color-ink-2);
  font-size: 12px;
}

@media (max-width: 760px) {
  .page-panel {
    padding: 14px;
  }

  .filter-bar :deep(.el-input) {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>
