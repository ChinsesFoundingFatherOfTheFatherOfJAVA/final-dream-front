<template>
  <teleport to="body">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <section class="member-drawer">
        <header class="drawer-header">
          <h3>添加成员</h3>
          <button type="button" aria-label="关闭" @click="close">×</button>
        </header>

        <div class="drawer-body">
          <aside class="dept-column">
            <DeptTree
              v-model="deptId"
              :data="departments"
              mode="single"
              searchable
              include-all
              show-count
              @change="search"
            />
          </aside>

          <main class="candidate-column">
            <div class="candidate-filters">
              <label class="search-field">
                <select v-model="searchField" @change="search">
                  <option value="name">姓名</option>
                  <option value="account">账号</option>
                  <option value="employeeNo">工号</option>
                  <option value="mobile">手机号</option>
                </select>
                <input
                  v-model.trim="keyword"
                  type="search"
                  placeholder="输入关键字"
                  @keyup.enter="search"
                />
              </label>
              <div class="position-filter">
                <button type="button" @click="positionMenuVisible = !positionMenuVisible">
                  岗位{{ selectedPositions.length ? `（${selectedPositions.length}）` : '' }}
                </button>
                <div v-if="positionMenuVisible" class="position-menu">
                  <input
                    v-model.trim="positionKeyword"
                    type="search"
                    placeholder="搜索岗位"
                    @keyup.enter="loadPositions"
                  />
                  <label v-for="item in positionOptions" :key="item.positionName">
                    <input
                      type="checkbox"
                      :checked="draftPositions.includes(item.positionName)"
                      @change="togglePosition(item.positionName)"
                    />
                    <span>{{ item.positionName }}</span>
                    <em>{{ item.userCount }} 人</em>
                  </label>
                  <div class="menu-actions">
                    <button type="button" @click="clearPositions">清除</button>
                    <button type="button" class="primary" @click="applyPositions">确定</button>
                  </div>
                </div>
              </div>
              <button type="button" class="search-button" @click="search">查询</button>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th class="check-col">
                      <input
                        type="checkbox"
                        :checked="pageAllSelected"
                        :disabled="!candidates.length"
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
                    <td>
                      {{ row.name || '-' }}
                      <span v-if="existingMemberIds.has(row.userId)" class="existing-tag">已添加</span>
                    </td>
                    <td>{{ row.account || '-' }}</td>
                    <td>{{ row.employeeNo || '-' }}</td>
                    <td class="path-cell" :title="row.deptPath || ''">
                      {{ row.deptPath || '-' }}
                    </td>
                    <td>{{ row.positionName || '-' }}</td>
                  </tr>
                  <tr v-if="!loading && !candidates.length">
                    <td colspan="6" class="empty-cell">暂无候选人</td>
                  </tr>
                  <tr v-if="loading">
                    <td colspan="6" class="empty-cell">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <footer class="candidate-pagination">
              <span>已选 {{ selectedIds.length }} 人，共 {{ total }} 人</span>
              <div>
                <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
                <span>{{ page }} / {{ totalPages }}</span>
                <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
              </div>
            </footer>
          </main>
        </div>

        <footer class="drawer-footer">
          <button type="button" class="plain" @click="close">取消</button>
          <button type="button" class="primary" :disabled="!selectedIds.length || submitting" @click="confirm">
            {{ submitting ? '添加中...' : `确定（${selectedIds.length}）` }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeptTree from '@/components/common/DeptTree.vue'
import {
  addRoleMembers,
  getDepartmentTree,
  getEnterpriseUsers,
  getPositions,
  getRoleMembers,
  type EnterpriseDepartment,
  type EnterpriseUser,
  type PositionOption
} from '@/api/sm'
import { toast } from '@/utils/toast'

const props = defineProps<{
  visible: boolean
  roleId: string
}>()

const emit = defineEmits<{
  close: []
  added: []
}>()

const departments = ref<EnterpriseDepartment[]>([])
const candidates = ref<EnterpriseUser[]>([])
const existingMemberIds = ref(new Set<string>())
const deptId = ref('')
const searchField = ref('name')
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const selectedIds = ref<string[]>([])

const positionMenuVisible = ref(false)
const positionKeyword = ref('')
const positionOptions = ref<PositionOption[]>([])
const selectedPositions = ref<string[]>([])
const draftPositions = ref<string[]>([])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pageAllSelected = computed(
  () => candidates.value.length > 0 && candidates.value.every((item) => selectedIds.value.includes(item.userId))
)

async function loadBaseData() {
  const [departmentResult, positionResult] = await Promise.all([
    getDepartmentTree(),
    getPositions({ page: 1, size: 100 })
  ])
  departments.value = departmentResult.list ?? []
  positionOptions.value = positionResult.list ?? []
}

async function loadExistingMembers() {
  const ids = new Set<string>()
  let currentPage = 1
  let count = Number.POSITIVE_INFINITY
  while (ids.size < count && currentPage <= 100) {
    const result = await getRoleMembers(props.roleId, {
      page: currentPage,
      size: 100,
      searchField: 'name'
    })
    for (const member of result.list ?? []) ids.add(member.userId)
    count = result.total ?? ids.size
    if (!result.list?.length) break
    currentPage += 1
  }
  existingMemberIds.value = ids
}

async function loadCandidates() {
  loading.value = true
  try {
    const result = await getEnterpriseUsers({
      page: page.value,
      size: pageSize,
      deptId: deptId.value || undefined,
      searchField: searchField.value,
      keyword: keyword.value || undefined,
      positionNames: selectedPositions.value.length
        ? selectedPositions.value.join(',')
        : undefined
    })
    candidates.value = result.list ?? []
    total.value = result.total ?? 0
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  void loadCandidates()
}

function changePage(nextPage: number) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  void loadCandidates()
}

function toggleCandidate(userId: string) {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter((id) => id !== userId)
    : [...selectedIds.value, userId]
}

function toggleCurrentPage() {
  const ids = candidates.value.map((item) => item.userId)
  selectedIds.value = pageAllSelected.value
    ? selectedIds.value.filter((id) => !ids.includes(id))
    : Array.from(new Set([...selectedIds.value, ...ids]))
}

async function loadPositions() {
  const result = await getPositions({
    page: 1,
    size: 100,
    keyword: positionKeyword.value || undefined
  })
  positionOptions.value = result.list ?? []
}

function togglePosition(positionName: string) {
  draftPositions.value = draftPositions.value.includes(positionName)
    ? draftPositions.value.filter((item) => item !== positionName)
    : [...draftPositions.value, positionName]
}

function clearPositions() {
  draftPositions.value = []
}

function applyPositions() {
  selectedPositions.value = [...draftPositions.value]
  positionMenuVisible.value = false
  search()
}

async function confirm() {
  if (!selectedIds.value.length) {
    toast.warn('请先选择用户')
    return
  }
  submitting.value = true
  try {
    const result = await addRoleMembers(props.roleId, selectedIds.value)
    toast.info(`已添加 ${result.added} 人，跳过 ${result.skipped} 人`)
    emit('added')
    close()
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    deptId.value = ''
    searchField.value = 'name'
    keyword.value = ''
    page.value = 1
    selectedIds.value = []
    selectedPositions.value = []
    draftPositions.value = []
    positionKeyword.value = ''
    void Promise.all([loadBaseData(), loadExistingMembers()]).then(loadCandidates)
  }
)
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 3450;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(15, 23, 42, 0.42);
}

.member-drawer {
  width: min(1120px, 100%);
  height: min(760px, calc(100vh - 44px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
}

.drawer-header,
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
}

.drawer-header {
  border-bottom: 1px solid #edf0f5;

  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 17px;
  }

  button {
    border: none;
    background: transparent;
    color: #8a92a5;
    font-size: 25px;
    cursor: pointer;
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
}

.dept-column {
  min-height: 0;
  padding: 10px;
  overflow: auto;
  border-right: 1px solid #edf0f5;
  background: #fafbfd;
}

.candidate-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.candidate-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
}

.search-field {
  flex: 1;
  min-width: 0;
  display: flex;

  select {
    width: 80px;
    height: 34px;
    border: 1px solid #d9deea;
    border-right: none;
    border-radius: 6px 0 0 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  input {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 0 6px 6px 0;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: #2e7cf6;
    }
  }
}

.position-filter {
  position: relative;

  > button,
  .search-button {
    height: 34px;
    padding: 0 12px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    cursor: pointer;
  }
}

.search-button {
  height: 34px;
  padding: 0 13px;
  border: none;
  border-radius: 6px;
  background: #2e7cf6;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.position-menu {
  position: absolute;
  top: 40px;
  right: 0;
  z-index: 5;
  width: 300px;
  max-height: 360px;
  padding: 10px;
  overflow-y: auto;
  border: 1px solid #dfe4ed;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);

  > input {
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    font-size: 12px;
    box-sizing: border-box;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 4px;
    color: #4d5568;
    font-size: 13px;

    span {
      flex: 1;
    }

    em {
      color: #98a0ad;
      font-size: 11px;
      font-style: normal;
    }
  }
}

.menu-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;

  button {
    height: 30px;
    padding: 0 12px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 12px;
    cursor: pointer;

    &.primary {
      border: none;
      background: #2e7cf6;
      color: #fff;
    }
  }
}

.table-wrap {
  flex: 1;
  min-height: 0;
  margin: 0 14px;
  overflow: auto;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 10px 11px;
  border-bottom: 1px solid #f0f2f6;
  color: #4d5568;
  text-align: left;
  white-space: nowrap;
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

.check-col {
  width: 44px;
  text-align: center !important;
}

.path-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.existing-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 9px;
  color: #8a6a28;
  background: #fff7e6;
  font-size: 11px;
}

.empty-cell {
  height: 150px;
  text-align: center !important;
  color: #9aa3b2 !important;
}

.candidate-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  color: #7a8396;
  font-size: 12px;

  div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    height: 30px;
    padding: 0 10px;
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

.drawer-footer {
  justify-content: flex-end;
  gap: 9px;
  border-top: 1px solid #edf0f5;

  button {
    min-width: 86px;
    height: 36px;
    border-radius: 7px;
    font-size: 14px;
    cursor: pointer;

    &.plain {
      border: 1px solid #d9deea;
      background: #fff;
      color: #4d5568;
    }

    &.primary {
      border: none;
      background: #2e7cf6;
      color: #fff;
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
}

@media (max-width: 760px) {
  .drawer-overlay {
    padding: 0;
  }

  .member-drawer {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .drawer-body {
    grid-template-columns: 1fr;
    grid-template-rows: 220px minmax(0, 1fr);
  }

  .dept-column {
    border-right: none;
    border-bottom: 1px solid #edf0f5;
  }

  .candidate-filters {
    flex-wrap: wrap;
  }

  .search-field {
    flex-basis: 100%;
  }
}
</style>
