<template>
  <div class="role-users-page">
    <header class="page-header">
      <div>
        <el-button class="back-button" @click="goBack">返回</el-button>
        <h1>角色人员管理</h1>
        <p>{{ roleDetail?.name || '角色' }} · 共 {{ total }} 人</p>
      </div>
      <el-button type="primary" class="primary-button" @click="addVisible = true">添加成员</el-button>
    </header>

    <section class="content-panel">
      <div class="filter-bar">
        <div class="dept-filter">
          <el-popover
            v-model:visible="deptVisible"
            placement="bottom-start"
            :width="300"
            trigger="click"
          >
            <template #reference>
              <el-button>
                选择部门{{ selectedDeptName ? `：${selectedDeptName}` : '' }}
              </el-button>
            </template>
            <DeptTree
              v-model="deptId"
              :data="departments"
              mode="single"
              searchable
              include-all
              show-count
              @change="handleDeptSelected"
            />
          </el-popover>
        </div>

        <label class="field">
          <span>账号状态</span>
          <el-select v-model="status" placeholder="全部" @change="search">
            <el-option label="全部" :value="undefined" />
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </label>

        <label class="field search-field">
          <span>搜索</span>
          <div class="search-composite">
            <el-select v-model="searchField" @change="search">
              <el-option label="姓名" value="name" />
              <el-option label="账号" value="account" />
            </el-select>
            <el-input
              v-model.trim="keyword"
              placeholder="输入关键字"
              clearable
              @keyup.enter="search"
            />
          </div>
        </label>

        <el-button type="primary" class="search-button" @click="search">查询</el-button>
        <el-button
          type="danger"
          plain
          class="danger-button"
          :disabled="!selectedIds.length || removing"
          @click="handleBatchRemove"
        >
          {{ removing ? '处理中...' : `批量取消授权${selectedIds.length ? `（${selectedIds.length}）` : ''}` }}
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="members"
        row-key="userId"
        class="members-table"
        :empty-text="'暂无数据'"
      >
        <el-table-column width="44" align="center">
          <template #header>
            <el-checkbox
              :model-value="pageAllSelected"
              :disabled="!members.length"
              @change="toggleCurrentPage"
            />
          </template>
          <template #default="{ row }">
            <el-checkbox
              :model-value="selectedIds.includes(row.userId)"
              @change="toggleMember(row.userId)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" min-width="120">
          <template #default="{ row }"><span class="name-cell">{{ row.name || '-' }}</span></template>
        </el-table-column>
        <el-table-column label="账号" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.account || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" effect="light">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所在部门" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.deptName || '-' }}</template>
        </el-table-column>
        <el-table-column label="所在岗位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.positionName || '-' }}</template>
        </el-table-column>
        <el-table-column label="添加人" min-width="130">
          <template #default="{ row }">{{ row.addedByName || row.addedBy || '-' }}</template>
        </el-table-column>
        <el-table-column label="添加时间" min-width="160">
          <template #default="{ row }">{{ row.addedAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="removeOne(row)">取消授权</el-button>
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
          @size-change="search"
          @current-change="loadMembers"
        />
      </footer>
    </section>

    <AddMemberDrawer
      :visible="addVisible"
      :role-id="roleId"
      @close="addVisible = false"
      @added="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRoute, useRouter } from 'vue-router'
import DeptTree from '@/components/common/DeptTree.vue'
import {
  getDepartmentTree,
  getRoleDetail,
  getRoleMembers,
  removeRoleMember,
  removeRoleMembers,
  type EnterpriseDepartment,
  type RoleDetail,
  type RoleMember
} from '@/api/sm'
import { toast } from '@/utils/toast'
import AddMemberDrawer from './AddMemberDrawer.vue'

const route = useRoute()
const router = useRouter()
const roleId = route.params.id as string

const roleDetail = ref<RoleDetail | null>(null)
const departments = ref<EnterpriseDepartment[]>([])
const members = ref<RoleMember[]>([])
const deptId = ref('')
const deptVisible = ref(false)
const status = ref<number | undefined>(undefined)
const searchField = ref<'name' | 'account'>('name')
const keyword = ref('')
const page = ref(1)
const size = ref(20)
const total = ref(0)
const loading = ref(false)
const removing = ref(false)
const selectedIds = ref<string[]>([])
const addVisible = ref(false)

const selectedDeptName = computed(
  () => departments.value.find((item) => item.deptId === deptId.value)?.deptName ?? ''
)
const pageAllSelected = computed(
  () => members.value.length > 0 && members.value.every((item) => selectedIds.value.includes(item.userId))
)

async function loadRole() {
  roleDetail.value = await getRoleDetail(roleId)
}

async function loadDepartments() {
  const result = await getDepartmentTree()
  departments.value = result.list ?? []
}

async function loadMembers() {
  loading.value = true
  try {
    const result = await getRoleMembers(roleId, {
      page: page.value,
      size: size.value,
      deptId: deptId.value || undefined,
      status: status.value,
      searchField: searchField.value,
      keyword: keyword.value || undefined
    })
    members.value = result.list ?? []
    total.value = result.total ?? 0
    selectedIds.value = selectedIds.value.filter((id) =>
      members.value.some((item) => item.userId === id)
    )
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  selectedIds.value = []
  void loadMembers()
}

function handleDeptSelected() {
  deptVisible.value = false
  search()
}

function toggleMember(userId: string) {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter((id) => id !== userId)
    : [...selectedIds.value, userId]
}

function toggleCurrentPage() {
  const ids = members.value.map((item) => item.userId)
  selectedIds.value = pageAllSelected.value
    ? selectedIds.value.filter((id) => !ids.includes(id))
    : Array.from(new Set([...selectedIds.value, ...ids]))
}

async function removeOne(member: RoleMember) {
  if (!(await confirmDialog({ message: `确认取消 ${member.name || member.account} 的角色授权？`, danger: true }))) return
  try {
    await removeRoleMember(roleId, member.userId)
    toast.info('已取消授权')
    await reload()
  } catch {
    // request.ts 已展示错误。
  }
}

async function handleBatchRemove() {
  if (!selectedIds.value.length || removing.value) return
  if (!(await confirmDialog({ message: `确认取消已选 ${selectedIds.value.length} 人的角色授权？`, danger: true }))) return
  removing.value = true
  try {
    const result = await removeRoleMembers(roleId, selectedIds.value)
    toast.info(`已移除 ${result.removed} 人`)
    selectedIds.value = []
    await reload()
  } finally {
    removing.value = false
  }
}

async function reload() {
  await Promise.all([loadRole(), loadMembers()])
}

function goBack() {
  void router.push('/enterprise/roles')
}

onMounted(async () => {
  await Promise.all([loadRole(), loadDepartments()])
  await loadMembers()
})
</script>

<style scoped lang="scss">
.role-users-page {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h1 {
    display: inline-block;
    margin: 0 10px 5px 0;
    color: #1f2937;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #7b8494;
    font-size: 13px;
  }
}

.back-button {
  height: 30px;
  margin-right: 10px;
  border-radius: 6px;
  color: #596274;
  font-size: 13px;
}

.primary-button,
.search-button,
.danger-button {
  height: 35px;
  border-radius: 6px;
  font-size: 13px;
}

.content-panel {
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
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
    min-width: 118px;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 34px;
    border-radius: 6px;
    font-size: 13px;
  }
}

.search-field {
  width: 320px;
  flex: 0 0 320px;
}

.search-composite {
  display: flex;
  width: 100%;

  :deep(.el-select) {
    width: 88px;
    flex: 0 0 88px;
    min-width: 88px;
  }

  :deep(.el-input) {
    flex: 1 1 auto;
    min-width: 120px;
  }

  :deep(.el-select__wrapper) {
    border-radius: 6px 0 0 6px;
    box-shadow: 0 0 0 1px #d7dce5 inset;
  }

  :deep(.el-input__wrapper) {
    min-width: 0;
    border-radius: 0 6px 6px 0;
    box-shadow: 0 0 0 1px #d7dce5 inset;
  }
}

.dept-filter {
  :deep(.el-button) {
    height: 34px;
    max-width: 210px;
    padding: 0 12px;
    border-radius: 6px;
    color: #4d5568;
    font-size: 13px;
  }
}

.members-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 44px;
    background: #f8fafc;
    color: #596274;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 44px;
    color: #4d5568;
    font-size: 13px;
  }
}

.name-cell {
  color: #253047;
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  color: #667085;
  font-size: 13px;

  :deep(.el-pagination) {
    margin-left: auto;
  }
}

@media (max-width: 760px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .search-field {
    width: 100%;
    flex-basis: 100%;
  }
}
</style>
