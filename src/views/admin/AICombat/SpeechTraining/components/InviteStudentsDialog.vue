<template>
  <teleport to="body">
    <div v-if="visible" class="invite-overlay" @click.self="close">
      <section class="invite-dialog">
        <header class="dialog-header">
          <h3>邀请学员</h3>
          <button type="button" class="icon-btn" aria-label="关闭" @click="close">×</button>
        </header>

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
              <input
                v-model.trim="keyword"
                type="search"
                placeholder="搜索姓名、账号或工号"
                @keyup.enter="searchCandidates"
              />
              <button type="button" class="search-btn" @click="searchCandidates">搜索</button>
            </div>

            <div class="table-wrap">
              <table class="candidate-table">
                <thead>
                  <tr>
                    <th class="check-col">
                      <input
                        type="checkbox"
                        :checked="pageAllSelected"
                        @change="toggleCurrentPage"
                      />
                    </th>
                    <th>姓名</th>
                    <th>账号</th>
                    <th>工号</th>
                    <th>部门</th>
                    <th>岗位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in candidates" :key="row.userId">
                    <td class="check-col">
                      <input
                        type="checkbox"
                        :checked="selectedIds.includes(row.userId)"
                        @change="toggleCandidate(row.userId)"
                      />
                    </td>
                    <td>{{ row.fullname || '--' }}</td>
                    <td>{{ row.username || '--' }}</td>
                    <td>{{ row.userNo || '--' }}</td>
                    <td class="path-cell" :title="row.deptFullName">{{ row.deptFullName || '--' }}</td>
                    <td>{{ row.positionName || '--' }}</td>
                  </tr>
                  <tr v-if="!loading && !candidates.length">
                    <td colspan="6" class="empty-cell">暂无可邀请学员</td>
                  </tr>
                  <tr v-if="loading">
                    <td colspan="6" class="empty-cell">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pagination">
              <span>已选 {{ selectedIds.length }} 人，共 {{ total }} 人</span>
              <div class="page-actions">
                <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
                <span>{{ page }} / {{ totalPages }}</span>
                <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
              </div>
            </div>
          </main>
        </div>

        <footer class="dialog-footer">
          <button type="button" class="plain-btn" @click="close">取消</button>
          <button type="button" class="primary-btn" :disabled="!selectedIds.length || submitting" @click="confirm">
            {{ submitting ? '邀请中...' : `确认邀请${selectedIds.length ? `（${selectedIds.length}）` : ''}` }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
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

const changePage = (nextPage: number) => {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
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
.invite-overlay {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.42);
}

.invite-dialog {
  width: min(1040px, 100%);
  height: min(720px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(15, 23, 42, 0.22);
}

.dialog-header,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.dialog-header {
  border-bottom: 1px solid #eef0f5;

  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 16px;
  }
}

.icon-btn {
  border: none;
  background: transparent;
  color: #8a92a5;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dialog-content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 230px 1fr;
}

.dept-panel {
  min-height: 0;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 1px solid #eef0f5;
  background: #fafbfd;
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

  input {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 12px;
    border: 1px solid #d9deea;
    border-radius: 7px;
    color: #374151;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }
}

.search-btn {
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  background: #2e7cf6;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  margin: 0 16px;
  overflow: auto;
  border: 1px solid #eef0f5;
  border-radius: 8px;
}

.candidate-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #f0f2f6;
    color: #4d5568;
    text-align: left;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #fafbfd;
    color: #6b7280;
    font-weight: 600;
  }

  tbody tr:hover {
    background: #f8fbff;
  }
}

.check-col {
  width: 44px;
  text-align: center;
}

.path-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-cell {
  padding: 46px 0 !important;
  text-align: center !important;
  color: #9aa3b2 !important;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
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

.dialog-footer {
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eef0f5;
}

.plain-btn,
.primary-btn {
  min-width: 88px;
  height: 36px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.plain-btn {
  border: 1px solid #d9deea;
  background: #fff;
  color: #4d5568;
}

.primary-btn {
  border: none;
  background: #2e7cf6;
  color: #fff;
}

@media (max-width: 760px) {
  .invite-overlay {
    padding: 0;
  }

  .invite-dialog {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .dialog-content {
    grid-template-columns: 1fr;
    grid-template-rows: 180px 1fr;
  }

  .dept-panel {
    border-right: none;
    border-bottom: 1px solid #eef0f5;
  }
}
</style>
