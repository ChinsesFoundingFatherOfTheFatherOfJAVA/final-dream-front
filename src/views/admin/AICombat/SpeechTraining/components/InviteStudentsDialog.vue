<template>
  <el-dialog
    :model-value="visible"
    title="邀请学员"
    width="1040px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div class="dialog-content">
      <aside class="dept-panel">
        <DeptTree
          v-model="deptId"
          :data="departments"
          mode="single"
          searchable
          include-all
          show-count
          search-placeholder="搜索部门"
          @change="selectDept(String($event))"
        />
      </aside>

      <main class="candidate-panel">
        <div class="candidate-toolbar">
          <el-input
            v-model.trim="keyword"
            placeholder="搜索姓名、账号或工号"
            clearable
            @keyup.enter="searchCandidates"
          />
          <el-button type="primary" @click="searchCandidates">搜索</el-button>
        </div>

        <div class="table-wrap">
          <el-table
            v-loading="loading"
            :data="candidates"
            row-key="userId"
            class="candidate-table"
            empty-text="暂无可邀请学员"
          >
            <el-table-column width="44" align="center">
              <template #header>
                <el-checkbox :model-value="pageAllSelected" @change="toggleCurrentPage" />
              </template>
              <template #default="{ row }">
                <el-checkbox
                  :model-value="selectedIds.includes(row.userId)"
                  @change="toggleCandidate(row.userId)"
                />
              </template>
            </el-table-column>
            <el-table-column label="姓名" min-width="110">
              <template #default="{ row }">{{ row.fullname || '--' }}</template>
            </el-table-column>
            <el-table-column label="账号" min-width="130">
              <template #default="{ row }">{{ row.username || '--' }}</template>
            </el-table-column>
            <el-table-column label="工号" width="120">
              <template #default="{ row }">{{ row.userNo || '--' }}</template>
            </el-table-column>
            <el-table-column label="部门" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.deptFullName || '--' }}</template>
            </el-table-column>
            <el-table-column label="岗位" min-width="140">
              <template #default="{ row }">{{ row.positionName || '--' }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination">
          <span>已选 {{ selectedIds.length }} 人，共 {{ total }} 人</span>
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            :disabled="loading"
            layout="prev, pager, next"
            background
            @current-change="loadCandidates"
          />
        </div>
      </main>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!selectedIds.length" :loading="submitting" @click="confirm">
        确认邀请{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeptTree from '@/components/common/DeptTree.vue'
import { getDepartmentTree, getStudentCandidates, inviteProjectStudents } from '@/api/speechAdmin'
import type { CandidateRow, DepartmentNode } from '@/types/speechAdmin'
import { toast } from '@/utils/toast'

const props = defineProps<{
  visible: boolean
  projectId: string | number
}>()

const emit = defineEmits<{
  close: []
  invited: [count: number]
}>()

const departments = ref<DepartmentNode[]>([])
const candidates = ref<CandidateRow[]>([])
const deptId = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const selectedIds = ref<string[]>([])

const pageAllSelected = computed(
  () => candidates.value.length > 0 && candidates.value.every((row) => selectedIds.value.includes(row.userId))
)

const loadDepartments = async () => {
  try {
    const data = await getDepartmentTree()
    departments.value = data?.list ?? []
  } catch {
    departments.value = []
  }
}

const loadCandidates = async () => {
  loading.value = true
  try {
    const data = await getStudentCandidates(props.projectId, {
      deptId: deptId.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize
    })
    candidates.value = data.records
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const selectDept = (value: string) => {
  deptId.value = value
  page.value = 1
  void loadCandidates()
}

const searchCandidates = () => {
  page.value = 1
  void loadCandidates()
}

const toggleCandidate = (userId: string) => {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter((id) => id !== userId)
    : [...selectedIds.value, userId]
}

const toggleCurrentPage = () => {
  const ids = candidates.value.map((row) => row.userId)
  if (pageAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id))
  } else {
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...ids]))
  }
}

const close = () => emit('close')

const handleVisibleChange = (visible: boolean) => {
  if (!visible) close()
}

const confirm = async () => {
  if (!selectedIds.value.length || submitting.value) return
  submitting.value = true
  try {
    const result = await inviteProjectStudents(props.projectId, selectedIds.value)
    toast.info(`已邀请 ${result?.inserted ?? selectedIds.value.length} 名学员`)
    emit('invited', result?.inserted ?? selectedIds.value.length)
    close()
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    selectedIds.value = []
    deptId.value = ''
    keyword.value = ''
    page.value = 1
    void loadDepartments()
    void loadCandidates()
  }
)
</script>

<style scoped lang="scss">
.dialog-content {
  height: 560px;
  display: grid;
  grid-template-columns: 230px 1fr;
}

.dept-panel {
  min-height: 0;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 1px solid var(--color-rule);
  background: var(--color-paper-2);
}

.candidate-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.candidate-toolbar {
  display: flex;
  gap: 10px;
  padding: 14px 16px;

  :deep(.el-input) {
    flex: 1;
    min-width: 0;
  }

  :deep(.el-input__wrapper) {
    min-height: 36px;
    border-radius: 7px;
  }
}

.table-wrap {
  flex: 1;
  min-height: 0;
  margin: 0 16px;
  overflow: auto;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
}

.candidate-table {
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  color: var(--color-ink-2);
  font-size: 12px;
}

@media (max-width: 760px) {
  .dialog-content {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: 180px 1fr;
  }

  .dept-panel {
    border-right: none;
    border-bottom: 1px solid var(--color-rule);
  }
}
</style>
