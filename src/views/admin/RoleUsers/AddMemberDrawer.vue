<template>
  <el-drawer
    :model-value="visible"
    class="member-drawer"
    title="添加成员"
    size="88%"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
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
          <div class="search-field">
            <el-select v-model="searchField" @change="search">
              <el-option label="姓名" value="name" />
              <el-option label="账号" value="account" />
              <el-option label="工号" value="employeeNo" />
              <el-option label="手机号" value="mobile" />
            </el-select>
            <el-input
              v-model.trim="keyword"
              placeholder="输入关键字"
              clearable
              @keyup.enter="search"
            />
          </div>
          <el-popover
            v-model:visible="positionMenuVisible"
            placement="bottom-end"
            :width="300"
            trigger="click"
          >
            <template #reference>
              <el-button>
                岗位{{ selectedPositions.length ? `（${selectedPositions.length}）` : '' }}
              </el-button>
            </template>
            <div class="position-menu">
              <el-input
                v-model.trim="positionKeyword"
                placeholder="搜索岗位"
                clearable
                @keyup.enter="loadPositions"
              />
              <el-checkbox-group v-model="draftPositions" class="position-options">
                <el-checkbox
                  v-for="item in positionOptions"
                  :key="item.positionName"
                  :value="item.positionName"
                >
                  <span>{{ item.positionName }}</span>
                  <em>{{ item.userCount }} 人</em>
                </el-checkbox>
              </el-checkbox-group>
              <div class="menu-actions">
                <el-button size="small" @click="clearPositions">清除</el-button>
                <el-button size="small" type="primary" @click="applyPositions">确定</el-button>
              </div>
            </div>
          </el-popover>
          <el-button type="primary" @click="search">查询</el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="candidates"
          row-key="userId"
          class="candidate-table"
          :empty-text="'暂无候选人'"
          @selection-change="handleCandidateSelection"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column label="姓名" min-width="130">
            <template #default="{ row }">
              {{ row.name || '-' }}
              <el-tag v-if="existingMemberIds.has(row.userId)" size="small" type="warning">已添加</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="账号" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.account || '-' }}</template>
          </el-table-column>
          <el-table-column label="工号" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.employeeNo || '-' }}</template>
          </el-table-column>
          <el-table-column label="部门" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.deptPath || '-' }}</template>
          </el-table-column>
          <el-table-column label="岗位" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ row.positionName || '-' }}</template>
          </el-table-column>
        </el-table>

        <footer class="candidate-pagination">
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
        </footer>
      </main>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!selectedIds.length" :loading="submitting" @click="confirm">
        确定（{{ selectedIds.length }}）
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

function handleCandidateSelection(rows: EnterpriseUser[]) {
  selectedIds.value = rows.map((item) => item.userId)
}

async function loadPositions() {
  const result = await getPositions({
    page: 1,
    size: 100,
    keyword: positionKeyword.value || undefined
  })
  positionOptions.value = result.list ?? []
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

function handleVisibleChange(visible: boolean) {
  if (!visible) close()
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
.member-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
    overflow: hidden;
  }
}

.drawer-body {
  height: 100%;
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
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);

  :deep(.el-select) {
    min-width: 0;
  }

  :deep(.el-select__wrapper) {
    border-radius: 6px 0 0 6px;
    box-shadow: 0 0 0 1px #d9deea inset;
  }

  :deep(.el-input__wrapper) {
    min-width: 0;
    border-radius: 0 6px 6px 0;
    box-shadow: 0 0 0 1px #d9deea inset;
  }
}

.position-menu {
  > :deep(.el-input) {
    margin-bottom: 8px;
  }
}

.position-options {
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow-y: auto;

  :deep(.el-checkbox) {
    min-height: 34px;
    padding: 0 4px;
    color: #4d5568;
    font-size: 13px;
  }

  :deep(.el-checkbox__label) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
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

}

.candidate-table {
  flex: 1;
  min-height: 0;
  margin: 0 14px;
  width: 100%;

  :deep(.el-table__header th) {
    height: 42px;
    background: #fafbfd;
    color: #6b7280;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 42px;
    color: #4d5568;
    font-size: 13px;
  }

  :deep(.el-tag) {
    margin-left: 6px;
  }
}

.candidate-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  color: #7a8396;
  font-size: 12px;

}

@media (max-width: 760px) {
  .member-drawer {
    :deep(.el-drawer__body) {
      overflow: auto;
    }
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
