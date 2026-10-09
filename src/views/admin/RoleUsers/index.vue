<template>
  <div class="role-users-page">
    <header class="page-header">
      <div>
        <button type="button" class="back-button" @click="goBack">返回</button>
        <h1>角色人员管理</h1>
        <p>{{ roleDetail?.name || '角色' }} · 共 {{ total }} 人</p>
      </div>
      <button type="button" class="primary-button" @click="addVisible = true">添加成员</button>
    </header>

    <section class="content-panel">
      <div class="filter-bar">
        <div class="dept-filter">
          <button type="button" @click="deptVisible = !deptVisible">
            选择部门{{ selectedDeptName ? `：${selectedDeptName}` : '' }}
          </button>
          <div v-if="deptVisible" class="dept-popover">
            <DeptTree
              v-model="deptId"
              :data="departments"
              mode="single"
              searchable
              include-all
              show-count
              @change="handleDeptSelected"
            />
          </div>
        </div>

        <label class="field">
          <span>账号状态</span>
          <select v-model="status" @change="search">
            <option :value="undefined">全部</option>
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
        </label>

        <label class="field search-field">
          <span>搜索</span>
          <select v-model="searchField" @change="search">
            <option value="name">姓名</option>
            <option value="account">账号</option>
          </select>
          <input v-model.trim="keyword" type="search" placeholder="输入关键字" @keyup.enter="search" />
        </label>

        <button type="button" class="search-button" @click="search">查询</button>
        <button
          type="button"
          class="danger-button"
          :disabled="!selectedIds.length || removing"
          @click="handleBatchRemove"
        >
          {{ removing ? '处理中...' : `批量取消授权${selectedIds.length ? `（${selectedIds.length}）` : ''}` }}
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input
                  type="checkbox"
                  :checked="pageAllSelected"
                  :disabled="!members.length"
                  @change="toggleCurrentPage"
                />
              </th>
              <th>姓名</th>
              <th>账号</th>
              <th>状态</th>
              <th>所在部门</th>
              <th>所在岗位</th>
              <th>添加人</th>
              <th>添加时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.userId">
              <td class="check-col">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(member.userId)"
                  @change="toggleMember(member.userId)"
                />
              </td>
              <td class="name-cell">{{ member.name || '-' }}</td>
              <td>{{ member.account || '-' }}</td>
              <td>
                <span class="status-tag" :class="{ disabled: member.status !== 1 }">
                  {{ member.status === 1 ? '启用' : '禁用' }}
                </span>
              </td>
              <td :title="member.deptName || ''">{{ member.deptName || '-' }}</td>
              <td :title="member.positionName || ''">{{ member.positionName || '-' }}</td>
              <td>{{ member.addedByName || member.addedBy || '-' }}</td>
              <td>{{ member.addedAt || '-' }}</td>
              <td>
                <button type="button" class="link-button" @click="removeOne(member)">取消授权</button>
              </td>
            </tr>
            <tr v-if="!members.length">
              <td colspan="9" class="empty-cell">{{ loading ? '正在加载...' : '暂无数据' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination">
        <span>共 {{ total }} 条</span>
        <div>
          <select v-model.number="size" @change="search">
            <option :value="20">20 条/页</option>
            <option :value="50">50 条/页</option>
            <option :value="100">100 条/页</option>
          </select>
          <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))
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

function changePage(nextPage: number) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
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
  padding: 0 10px;
  border: 1px solid #d7dce5;
  border-radius: 6px;
  background: #fff;
  color: #596274;
  font-size: 13px;
  cursor: pointer;
}

.primary-button,
.search-button,
.danger-button {
  height: 35px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.primary-button,
.search-button {
  border: none;
  background: #2e7cf6;
  color: #fff;
}

.danger-button {
  border: 1px solid #f0c9c9;
  background: #fffafa;
  color: #d94a4a;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
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

  select,
  input {
    height: 34px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    outline: none;
  }

  select {
    min-width: 118px;
    padding: 0 9px;
  }
}

.search-field {
  min-width: 310px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;

  > span {
    grid-column: 1 / -1;
  }

  select {
    min-width: 0;
    border-radius: 6px 0 0 6px;
  }

  input {
    min-width: 0;
    padding: 0 10px;
    border-left: none;
    border-radius: 0 6px 6px 0;
  }
}

.dept-filter {
  position: relative;

  > button {
    height: 34px;
    max-width: 210px;
    padding: 0 12px;
    overflow: hidden;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
}

.dept-popover {
  position: absolute;
  top: 40px;
  left: 0;
  z-index: 8;
  width: 300px;
  max-height: 420px;
  padding: 10px;
  border: 1px solid #dfe4ed;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1100px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid #edf0f5;
  overflow: hidden;
  color: #4d5568;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  background: #f8fafc;
  color: #596274;
  font-weight: 600;
}

tbody tr:hover {
  background: #f8fbff;
}

.check-col {
  width: 44px;
  text-align: center;
}

.name-cell {
  color: #253047;
  font-weight: 500;
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

.link-button {
  padding: 0;
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;
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
  color: #667085;
  font-size: 13px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

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

@media (max-width: 760px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .search-field {
    min-width: 100%;
  }
}
</style>
