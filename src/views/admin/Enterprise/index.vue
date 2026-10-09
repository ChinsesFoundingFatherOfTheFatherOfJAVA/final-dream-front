<template>
  <div class="enterprise-page">
    <header class="page-header">
      <div>
        <h1>员工名册</h1>
        <p>股份子树在职员工，共 {{ total }} 人</p>
      </div>
      <span class="total-badge">{{ selectedDeptName || '全部部门' }}</span>
    </header>

    <div class="workspace">
      <aside class="department-panel">
        <div class="panel-heading">组织架构</div>
        <DeptTree
          v-model="selectedDeptId"
          :data="departments"
          mode="single"
          searchable
          show-count
          search-placeholder="搜索部门名称"
          @change="handleDeptChange"
        />
      </aside>

      <section class="user-panel">
        <div class="filter-panel">
          <label class="field field-search">
            <span>搜索</span>
            <select v-model="searchField" @change="resetAndSearch">
              <option value="name">姓名</option>
              <option value="account">账号</option>
              <option value="employeeNo">工号</option>
              <option value="email">邮箱</option>
              <option value="mobile">手机号</option>
              <option value="jobGrade">职级</option>
            </select>
            <input
              v-model.trim="keyword"
              type="search"
              placeholder="输入关键字"
              @keyup.enter="resetAndSearch"
            />
          </label>

          <label class="field compact">
            <span>状态</span>
            <select v-model="status" @change="resetAndSearch">
              <option :value="undefined">全部</option>
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>

          <label class="field compact">
            <span>超级管理员</span>
            <select v-model="isSuperAdmin" @change="resetAndSearch">
              <option :value="undefined">全部</option>
              <option :value="1">是</option>
              <option :value="0">否</option>
            </select>
          </label>

          <button type="button" class="filter-button" @click="openPositionPicker">
            岗位{{ selectedPositions.length ? `（${selectedPositions.length}）` : '' }}
          </button>
          <button type="button" class="search-button" :disabled="loading" @click="resetAndSearch">
            查询
          </button>
        </div>

        <div v-if="selectedPositions.length" class="selected-line">
          <span>已选岗位：{{ selectedPositions.join('、') }}</span>
          <button type="button" @click="clearPositions">清除</button>
        </div>

        <div class="table-scroll" :class="{ loading }">
          <table>
            <colgroup>
              <col v-for="index in 11" :key="`col-${index}`" class="normal-col" />
              <col class="action-col" />
            </colgroup>
            <thead>
              <tr>
                <th>姓名</th>
                <th>账号</th>
                <th>工号</th>
                <th>手机号</th>
                <th>邮箱</th>
                <th>部门</th>
                <th>岗位</th>
                <th>职级</th>
                <th>角色</th>
                <th>入职时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.userId"
                :class="{ disabled: user.status !== 1 }"
              >
                <td class="name-cell" :title="valueOrDash(user.name)">{{ valueOrDash(user.name) }}</td>
                <td :title="valueOrDash(user.account)">{{ valueOrDash(user.account) }}</td>
                <td :title="valueOrDash(user.employeeNo)">{{ valueOrDash(user.employeeNo) }}</td>
                <td :title="valueOrDash(user.mobile)">{{ valueOrDash(user.mobile) }}</td>
                <td :title="valueOrDash(user.email)">{{ valueOrDash(user.email) }}</td>
                <td :title="valueOrDash(user.deptPath)">{{ valueOrDash(user.deptPath) }}</td>
                <td :title="valueOrDash(user.positionName)">{{ valueOrDash(user.positionName) }}</td>
                <td :title="valueOrDash(user.jobGrade)">{{ valueOrDash(user.jobGrade) }}</td>
                <td :title="roleText(user)">{{ roleText(user) }}</td>
                <td :title="valueOrDash(user.entryDate)">{{ valueOrDash(user.entryDate) }}</td>
                <td>
                  <span class="status-tag" :class="{ disabled: user.status !== 1 }">
                    {{ user.status === 1 ? '启用' : '禁用' }}
                  </span>
                </td>
                <td class="action-cell">
                  <template v-if="user.builtin">
                    <span class="protected-text">受保护</span>
                  </template>
                  <template v-else>
                    <button type="button" :disabled="actionUserId === user.userId" @click="toggleStatus(user)">
                      {{ user.status === 1 ? '禁用' : '启用' }}
                    </button>
                    <button type="button" :disabled="actionUserId === user.userId" @click="handleResetPassword(user)">
                      重置密码
                    </button>
                    <button type="button" class="danger" :disabled="actionUserId === user.userId" @click="handleDelete(user)">
                      删除
                    </button>
                    <button
                      v-if="auth.isSuperAdmin"
                      type="button"
                      :disabled="actionUserId === user.userId"
                      @click="toggleSuperAdmin(user)"
                    >
                      {{ user.isSuperAdmin ? '取消超管' : '设置超管' }}
                    </button>
                  </template>
                </td>
              </tr>
              <tr v-if="!users.length">
                <td colspan="12" class="empty-cell">
                  {{ loading ? '正在加载...' : loadError || '暂无数据' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pagination">
          <span>共 {{ total }} 条</span>
          <div class="page-actions">
            <select v-model.number="size" @change="resetAndSearch">
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
              <option :value="100">100 条/页</option>
            </select>
            <button type="button" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">上一页</button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button type="button" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">下一页</button>
          </div>
        </footer>
      </section>
    </div>

    <teleport to="body">
      <div v-if="positionPickerVisible" class="drawer-overlay" @click.self="positionPickerVisible = false">
        <aside class="position-drawer">
          <header>
            <h3>选择岗位</h3>
            <button type="button" aria-label="关闭" @click="positionPickerVisible = false">×</button>
          </header>
          <div class="drawer-search">
            <input
              v-model.trim="positionKeyword"
              type="search"
              placeholder="搜索岗位名称"
              @keyup.enter="loadPositions(1)"
            />
            <button type="button" @click="loadPositions(1)">搜索</button>
          </div>
          <div class="position-list">
            <label v-for="item in positionOptions" :key="item.positionName" class="position-row">
              <input
                type="checkbox"
                :checked="draftPositions.includes(item.positionName)"
                @change="togglePosition(item.positionName)"
              />
              <span>{{ item.positionName }}</span>
              <em>{{ item.userCount }} 人</em>
            </label>
            <p v-if="!positionOptions.length">暂无岗位数据</p>
          </div>
          <footer>
            <span>已选 {{ draftPositions.length }} 项</span>
            <div>
              <button type="button" class="plain" @click="positionPickerVisible = false">取消</button>
              <button type="button" class="primary" @click="confirmPositions">确定</button>
            </div>
          </footer>
          <div class="drawer-pagination">
            <button type="button" :disabled="positionPage <= 1" @click="loadPositions(positionPage - 1)">上一页</button>
            <span>{{ positionPage }} / {{ positionTotalPages }}</span>
            <button
              type="button"
              :disabled="positionPage >= positionTotalPages"
              @click="loadPositions(positionPage + 1)"
            >
              下一页
            </button>
          </div>
        </aside>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import DeptTree from '@/components/common/DeptTree.vue'
import {
  deleteUser,
  getDepartmentTree,
  getEnterpriseUsers,
  getPositions,
  resetUserPassword,
  setSuperAdmin,
  updateUserStatus,
  type EnterpriseDepartment,
  type EnterpriseUser,
  type PositionOption
} from '@/api/sm'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

const auth = useAuthStore()
const departments = ref<EnterpriseDepartment[]>([])
const users = ref<EnterpriseUser[]>([])
const selectedDeptId = ref('')
const keyword = ref('')
const searchField = ref('name')
const status = ref<number | undefined>(undefined)
const isSuperAdmin = ref<number | undefined>(undefined)
const selectedPositions = ref<string[]>([])
const page = ref(1)
const size = ref(20)
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const actionUserId = ref('')

const positionPickerVisible = ref(false)
const positionKeyword = ref('')
const positionOptions = ref<PositionOption[]>([])
const positionPage = ref(1)
const positionSize = 20
const positionTotal = ref(0)
const draftPositions = ref<string[]>([])
let requestSequence = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))
const positionTotalPages = computed(() => Math.max(1, Math.ceil(positionTotal.value / positionSize)))
const selectedDeptName = computed(
  () => departments.value.find((item) => item.deptId === selectedDeptId.value)?.deptName ?? ''
)

const valueOrDash = (value: unknown) => {
  const text = value == null ? '' : String(value).trim()
  return text || '-'
}

const roleText = (user: EnterpriseUser) =>
  user.roleNames?.length ? user.roleNames.join(',') : '-'

async function loadDepartments() {
  try {
    const result = await getDepartmentTree()
    departments.value = result.list ?? []
    if (!selectedDeptId.value) {
      selectedDeptId.value = departments.value.find((item) => !item.parentPath)?.deptId ?? ''
    }
  } catch {
    departments.value = []
    selectedDeptId.value = ''
  }
}

async function loadUsers() {
  const sequence = ++requestSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await getEnterpriseUsers({
      page: page.value,
      size: size.value,
      deptId: selectedDeptId.value || undefined,
      status: status.value,
      isSuperAdmin: isSuperAdmin.value,
      searchField: searchField.value,
      keyword: keyword.value || undefined,
      positionNames: selectedPositions.value.length
        ? selectedPositions.value.join(',')
        : undefined
    })
    if (sequence !== requestSequence) return
    users.value = result.list ?? []
    total.value = result.total ?? 0
    page.value = result.page ?? page.value
  } catch (error) {
    if (sequence !== requestSequence) return
    users.value = []
    total.value = 0
    loadError.value = error instanceof Error ? error.message : '员工数据加载失败'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function resetAndSearch() {
  page.value = 1
  void loadUsers()
}

function handleDeptChange() {
  resetAndSearch()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  void loadUsers()
}

function openPositionPicker() {
  draftPositions.value = [...selectedPositions.value]
  positionKeyword.value = ''
  positionPickerVisible.value = true
  void loadPositions(1)
}

async function loadPositions(targetPage: number) {
  positionPage.value = Math.max(1, targetPage)
  const result = await getPositions({
    page: positionPage.value,
    size: positionSize,
    keyword: positionKeyword.value || undefined
  })
  positionOptions.value = result.list ?? []
  positionTotal.value = result.total ?? 0
}

function togglePosition(positionName: string) {
  draftPositions.value = draftPositions.value.includes(positionName)
    ? draftPositions.value.filter((item) => item !== positionName)
    : [...draftPositions.value, positionName]
}

function confirmPositions() {
  selectedPositions.value = [...draftPositions.value]
  positionPickerVisible.value = false
  resetAndSearch()
}

function clearPositions() {
  selectedPositions.value = []
  resetAndSearch()
}

async function runAction(user: EnterpriseUser, action: () => Promise<unknown>, successText: string) {
  actionUserId.value = user.userId
  try {
    await action()
    toast.info(successText)
    await loadUsers()
  } catch {
    // request.ts 已统一展示后端错误。
  } finally {
    actionUserId.value = ''
  }
}

function toggleStatus(user: EnterpriseUser) {
  const next = user.status === 1 ? 0 : 1
  void runAction(
    user,
    () => updateUserStatus(user.userId, next),
    next === 1 ? '账号已启用' : '账号已禁用'
  )
}

async function handleResetPassword(user: EnterpriseUser) {
  if (!(await confirmDialog({ message: `确认将账号 ${user.account} 的密码重置为默认密码？`, danger: true }))) return
  void runAction(user, () => resetUserPassword(user.userId), '密码已重置')
}

async function handleDelete(user: EnterpriseUser) {
  if (
    !(await confirmDialog({
      message: `确认删除账号 ${user.account}？其角色与项目学员指派会同步清除。若该员工仍在 Oracle 在职名单，将于下次同步自动恢复。`,
      danger: true
    }))
  ) {
    return
  }
  void runAction(user, () => deleteUser(user.userId), '用户已删除')
}

function toggleSuperAdmin(user: EnterpriseUser) {
  const next = !user.isSuperAdmin
  void runAction(
    user,
    () => setSuperAdmin(user.userId, next),
    next ? '已设置为超级管理员' : '已取消超级管理员'
  )
}

onMounted(async () => {
  await loadDepartments()
  await loadUsers()
})
</script>

<style scoped lang="scss">
.enterprise-page {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 5px;
    color: #1f2937;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #7b8494;
    font-size: 13px;
  }
}

.total-badge {
  padding: 7px 12px;
  border-radius: 6px;
  color: #245fbd;
  background: #eaf2ff;
  font-size: 13px;
  white-space: nowrap;
}

.workspace {
  min-width: 0;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.department-panel,
.user-panel {
  min-width: 0;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
}

.department-panel {
  position: sticky;
  top: 0;
  max-height: calc(100vh - 140px);
  padding: 12px 8px;
  overflow: hidden;
}

.panel-heading {
  padding: 4px 12px 10px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf0f5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  > span {
    color: #667085;
    font-size: 12px;
  }

  select,
  input {
    height: 34px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    color: #2b3445;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
      box-shadow: 0 0 0 2px rgba(46, 124, 246, 0.1);
    }
  }
}

.field-search {
  min-width: 360px;
  flex: 1;
  display: grid;
  grid-template-columns: 50px 88px minmax(160px, 1fr);
  align-items: center;

  input,
  select {
    padding: 0 10px;
  }

  input {
    border-left: none;
    border-radius: 0 6px 6px 0;
  }

  select {
    border-radius: 0;
  }
}

.field.compact {
  width: 126px;

  select {
    width: 100%;
    padding: 0 9px;
  }
}

.filter-button,
.search-button {
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.filter-button {
  border: 1px solid #d7dce5;
  background: #fff;
  color: #4d5568;
}

.search-button {
  border: none;
  background: #2e7cf6;
  color: #fff;
}

.selected-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid #edf0f5;
  color: #667085;
  font-size: 12px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    cursor: pointer;
  }
}

.table-scroll {
  overflow: auto;
  max-height: calc(100vh - 310px);

  &.loading {
    opacity: 0.72;
  }
}

table {
  width: 1970px;
  border-collapse: collapse;
  table-layout: fixed;
}

.normal-col {
  width: 160px;
}

.action-col {
  width: 210px;
}

th,
td {
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid #edf0f5;
  overflow: hidden;
  color: #394253;
  font-size: 14px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #596274;
  font-weight: 600;
}

tbody tr:hover {
  background: #f8fbff;
}

tbody tr.disabled {
  color: #98a0ad;
  background: #fbfbfc;
}

.name-cell {
  color: #1f2937;
  font-weight: 600;
}

.status-tag {
  display: inline-flex;
  min-width: 44px;
  height: 23px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #157347;
  background: #e9f8ef;
  font-size: 12px;

  &.disabled {
    color: #8a5360;
    background: #f7ecef;
  }
}

.action-cell {
  overflow: visible;
  white-space: nowrap;

  button {
    margin-right: 10px;
    padding: 0;
    border: none;
    background: transparent;
    color: #2e7cf6;
    font-size: 14px;
    cursor: pointer;

    &.danger {
      color: #d94a4a;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.protected-text {
  color: #98a0ad;
  font-size: 13px;
}

.empty-cell {
  height: 180px;
  text-align: center;
  color: #9aa3b2;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #edf0f5;
  color: #667085;
  font-size: 13px;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  select,
  button {
    height: 32px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
  }

  select {
    padding: 0 8px;
  }

  button {
    padding: 0 12px;
    cursor: pointer;

    &:disabled {
      color: #b8bfcc;
      cursor: not-allowed;
    }
  }
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 3300;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.36);
}

.position-drawer {
  width: min(470px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: -16px 0 40px rgba(15, 23, 42, 0.13);

  > header,
  > footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
  }

  > header {
    border-bottom: 1px solid #eef0f5;

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

  > footer {
    border-top: 1px solid #eef0f5;

    > span {
      color: #667085;
      font-size: 13px;
    }

    div {
      display: flex;
      gap: 8px;
    }

    button {
      min-width: 76px;
      height: 34px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;

      &.plain {
        border: 1px solid #d7dce5;
        background: #fff;
        color: #4d5568;
      }

      &.primary {
        border: none;
        background: #2e7cf6;
        color: #fff;
      }
    }
  }
}

.drawer-search {
  display: flex;
  gap: 8px;
  padding: 14px 18px 8px;

  input {
    flex: 1;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    outline: none;
  }

  button {
    width: 64px;
    border: none;
    border-radius: 6px;
    background: #2e7cf6;
    color: #fff;
    cursor: pointer;
  }
}

.position-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 18px;

  p {
    padding: 36px 0;
    text-align: center;
    color: #9aa3b2;
    font-size: 13px;
  }
}

.position-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 8px;
  border-radius: 6px;
  color: #394253;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f5f8ff;
  }

  span {
    flex: 1;
  }

  em {
    color: #98a0ad;
    font-size: 12px;
    font-style: normal;
  }
}

.drawer-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 18px 14px;
  color: #667085;
  font-size: 12px;

  button {
    height: 30px;
    padding: 0 10px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;

    &:disabled {
      color: #b8bfcc;
      cursor: not-allowed;
    }
  }
}

@media (max-width: 1100px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .department-panel {
    position: static;
    max-height: 300px;
  }
}

@media (max-width: 760px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-panel {
    align-items: stretch;
  }

  .field-search {
    min-width: 100%;
    grid-template-columns: 48px 82px minmax(120px, 1fr);
  }

  .field.compact {
    flex: 1;
  }
}
</style>
