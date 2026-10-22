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
            <div class="search-composite">
              <el-select v-model="searchField" @change="resetAndSearch">
                <el-option label="姓名" value="name" />
                <el-option label="账号" value="account" />
                <el-option label="工号" value="employeeNo" />
                <el-option label="邮箱" value="email" />
                <el-option label="手机号" value="mobile" />
                <el-option label="职级" value="jobGrade" />
              </el-select>
              <el-input
                v-model.trim="keyword"
                placeholder="输入关键字"
                clearable
                @keyup.enter="resetAndSearch"
              />
            </div>
          </label>

          <label class="field compact">
            <span>状态</span>
            <el-select v-model="status" placeholder="全部" @change="resetAndSearch">
              <el-option label="全部" :value="undefined" />
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </label>

          <label class="field compact">
            <span>超级管理员</span>
            <el-select v-model="isSuperAdmin" placeholder="全部" @change="resetAndSearch">
              <el-option label="全部" :value="undefined" />
              <el-option label="是" :value="1" />
              <el-option label="否" :value="0" />
            </el-select>
          </label>

          <el-button class="filter-button" @click="openPositionPicker">
            岗位{{ selectedPositions.length ? `（${selectedPositions.length}）` : '' }}
          </el-button>
          <el-button type="primary" class="search-button" :loading="loading" @click="resetAndSearch">
            查询
          </el-button>
        </div>

        <div v-if="selectedPositions.length" class="selected-line">
          <span>已选岗位：{{ selectedPositions.join('、') }}</span>
          <el-button link type="primary" @click="clearPositions">清除</el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="users"
          row-key="userId"
          class="user-table"
          max-height="calc(100vh - 310px)"
          :empty-text="loadError || '暂无数据'"
          :row-class-name="userRowClass"
        >
          <el-table-column prop="name" label="姓名" width="130" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="name-cell">{{ valueOrDash(row.name) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="账号" width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.account) }}</template>
          </el-table-column>
          <el-table-column label="工号" width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.employeeNo) }}</template>
          </el-table-column>
          <el-table-column label="手机号" width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.mobile) }}</template>
          </el-table-column>
          <el-table-column label="邮箱" width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.email) }}</template>
          </el-table-column>
          <el-table-column label="部门" width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.deptPath) }}</template>
          </el-table-column>
          <el-table-column label="岗位" width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.positionName) }}</template>
          </el-table-column>
          <el-table-column label="职级" width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.jobGrade) }}</template>
          </el-table-column>
          <el-table-column label="角色" width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ roleText(row) }}</template>
          </el-table-column>
          <el-table-column label="入职时间" width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ valueOrDash(row.entryDate) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" effect="light">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="290" fixed="right">
            <template #default="{ row }">
              <div class="action-cell">
                  <template v-if="row.builtin">
                    <span class="protected-text">受保护</span>
                  </template>
                  <template v-else>
                    <el-button link type="primary" :disabled="actionUserId === row.userId" @click="toggleStatus(row)">
                      {{ row.status === 1 ? '禁用' : '启用' }}
                    </el-button>
                    <el-button link type="primary" :disabled="actionUserId === row.userId" @click="handleResetPassword(row)">
                      重置密码
                    </el-button>
                    <el-button link type="danger" :disabled="actionUserId === row.userId" @click="handleDelete(row)">
                      删除
                    </el-button>
                    <el-button
                      v-if="auth.isSuperAdmin"
                      link
                      type="primary"
                      :disabled="actionUserId === row.userId"
                      @click="toggleSuperAdmin(row)"
                    >
                      {{ row.isSuperAdmin ? '取消超管' : '设置超管' }}
                    </el-button>
                  </template>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <footer class="pagination">
          <span>共 {{ total }} 条</span>
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="size"
            :page-sizes="[20, 50, 100]"
            :total="total"
            :disabled="loading"
            layout="sizes, prev, pager, next"
            background
            @size-change="resetAndSearch"
            @current-change="loadUsers"
          />
        </footer>
      </section>
    </div>

    <el-drawer
      v-model="positionPickerVisible"
      title="选择岗位"
      size="470px"
      append-to-body
    >
      <div class="drawer-search">
        <el-input
          v-model.trim="positionKeyword"
          placeholder="搜索岗位名称"
          clearable
          @keyup.enter="loadPositions(1)"
        />
        <el-button type="primary" @click="loadPositions(1)">搜索</el-button>
      </div>
      <el-checkbox-group v-model="draftPositions" class="position-list">
        <el-checkbox
          v-for="item in positionOptions"
          :key="item.positionName"
          :value="item.positionName"
          class="position-row"
        >
          <span>{{ item.positionName }}</span>
          <em>{{ item.userCount }} 人</em>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-if="!positionOptions.length" description="暂无岗位数据" :image-size="64" />
      <div class="drawer-pagination">
        <el-button :disabled="positionPage <= 1" @click="loadPositions(positionPage - 1)">上一页</el-button>
        <span>{{ positionPage }} / {{ positionTotalPages }}</span>
        <el-button
          :disabled="positionPage >= positionTotalPages"
          @click="loadPositions(positionPage + 1)"
        >
          下一页
        </el-button>
      </div>
      <template #footer>
        <div class="position-footer">
          <span>已选 {{ draftPositions.length }} 项</span>
          <div>
            <el-button @click="positionPickerVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmPositions">确定</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
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

const userRowClass = ({ row }: { row: EnterpriseUser }) =>
  row.status === 1 ? '' : 'disabled-row'

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
  /* 必须让面板成为 flex 列容器：DeptTree 才能 flex:1 收缩并在内部滚动，
     否则树撑开后会被 overflow:hidden 直接裁掉、滚不动。 */
  display: flex;
  flex-direction: column;
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

  :deep(.el-select) {
    width: 100%;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 34px;
    border-radius: 6px;
    font-size: 13px;
  }
}

.field-search {
  min-width: 360px;
  flex: 1;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  align-items: center;
}

.search-composite {
  min-width: 0;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);

  :deep(.el-select__wrapper) {
    border-radius: 6px 0 0 6px;
    box-shadow: 0 0 0 1px #d7dce5 inset;
  }

  :deep(.el-input__wrapper) {
    border-radius: 0 6px 6px 0;
    box-shadow: 0 0 0 1px #d7dce5 inset;
  }
}

.field.compact {
  width: 126px;
}

.filter-button,
.search-button {
  height: 34px;
  border-radius: 6px;
  font-size: 13px;
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

}

.user-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 44px;
    background: #f8fafc;
    color: #596274;
    font-size: 14px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 44px;
    color: #394253;
    font-size: 14px;
  }

  :deep(.disabled-row) {
    color: #98a0ad;
    background: #fbfbfc;
  }
}

.name-cell {
  color: #1f2937;
  font-weight: 600;
}

.action-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  white-space: nowrap;
}

.protected-text {
  color: #98a0ad;
  font-size: 13px;
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

  :deep(.el-pagination) {
    margin-left: auto;
  }
}

.drawer-search {
  display: flex;
  gap: 8px;
  padding: 14px 18px 8px;

  :deep(.el-input) {
    flex: 1;
  }
}

.position-list {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding: 8px 18px;
}

.position-row {
  width: 100%;
  min-height: 42px;
  margin-right: 0;
  padding: 0 8px;
  border-radius: 6px;
  color: #394253;
  font-size: 14px;

  &:hover {
    background: #f5f8ff;
  }

  :deep(.el-checkbox__label) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #394253;
    font-size: 14px;

    em {
      color: #98a0ad;
      font-size: 12px;
      font-style: normal;
    }
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

}

.position-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  > span {
    color: #667085;
    font-size: 13px;
  }

  > div {
    display: flex;
    gap: 8px;
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
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .search-composite {
    grid-template-columns: 82px minmax(0, 1fr);
  }

  .field.compact {
    flex: 1;
  }
}
</style>
