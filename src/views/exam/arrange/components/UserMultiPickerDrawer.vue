<template>
  <!-- 负责人 / 批阅人 / 参与员工快速选人：部门树 + 关键词 + 分页 + 右侧已选 -->
  <el-drawer
    :model-value="true"
    size="1040px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>{{ title }}</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body" @click="showDeptPicker = false">
        <div class="filter-row">
          <div class="dept-select">
            <el-button class="dept-trigger" @click.stop="showDeptPicker = !showDeptPicker">
              <span :class="{ placeholder: !selectedDeptId }">{{ selectedDeptName }}</span>
              <span class="select-arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
            </el-button>
            <div v-if="showDeptPicker" class="dept-dropdown" @click.stop>
              <DeptTree
                :model-value="selectedDeptId"
                :data="deptTreeData"
                mode="single"
                searchable
                show-count
                include-all
                search-placeholder="部门名称"
                @change="onDeptPicked"
              />
            </div>
          </div>

          <el-select v-model="searchField" class="field-select">
            <el-option value="name" label="姓名" />
            <el-option value="account" label="账号" />
            <el-option value="employeeNo" label="工号" />
          </el-select>

          <el-input
            v-model.trim="keyword"
            class="keyword-input"
            :placeholder="`请输入${fieldLabel}搜索`"
            @keyup.enter="reload(1)"
          />
          <el-button class="search-btn" @click="reload(1)">查询</el-button>
        </div>

        <div class="main-area">
          <div class="table-wrap">
            <el-table
              v-loading="loading"
              :data="records"
              row-key="userId"
              empty-text="没有匹配的人员"
              @row-click="(row: ArrangeUserOption) => toggle(row, !isSelected(row))"
            >
              <el-table-column width="44" align="center">
                <template #header>
                  <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
                </template>
                <template #default="{ row }">
                  <el-checkbox
                    :model-value="isSelected(row)"
                    @click.stop
                    @change="toggle(row, Boolean($event))"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="fullname" label="姓名" min-width="120" />
              <el-table-column prop="account" label="账号" min-width="120" />
              <el-table-column label="工号" width="110">
                <template #default="{ row }">{{ row.employeeNo || '--' }}</template>
              </el-table-column>
              <el-table-column label="部门" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.deptName || '--' }}</template>
              </el-table-column>
              <el-table-column label="岗位" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.positionName || '--' }}</template>
              </el-table-column>
            </el-table>
          </div>

          <aside class="selected-panel">
            <p class="panel-title">已选 {{ picked.size }} / {{ max }} 人</p>
            <div class="selected-list">
              <span v-for="[id, name] in pickedEntries" :key="id" class="picked-tag">
                {{ name }}
                <i role="button" tabindex="0" :aria-label="`移除 ${name}`"
                   @click="toggleById(id, name)" @keydown.enter.prevent="toggleById(id, name)">×</i>
              </span>
              <span v-if="!picked.size" class="empty-tip">请选择...</span>
            </div>
          </aside>
        </div>

        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <el-pagination
            v-model:current-page="pageNo"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="sizes, prev, pager, next"
            background
            @size-change="reload(1)"
            @current-change="reload"
          />
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" @click="confirm">确定</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import DeptTree from '@/components/common/DeptTree.vue'
import {
  getArrangeDepartments,
  searchArrangeUsers,
  type ArrangeDepartmentOption,
  type ArrangeUserOption
} from '@/api/arrange'
import { toast } from '@/utils/toast'
import type { DepartmentTreeSource } from '@/utils/departmentTree'

interface TreeDepartment extends DepartmentTreeSource {
  userCount: number
}

const props = defineProps<{
  title: string
  max?: number
  selectedIds?: string[]
  selectedNames?: string[]
}>()
const emit = defineEmits<{
  close: []
  confirm: [ids: string[], names: string[]]
}>()

const max = props.max ?? 50
const departments = ref<ArrangeDepartmentOption[]>([])
const selectedDeptId = ref('')
const selectedDeptPath = ref('')
const showDeptPicker = ref(false)
const searchField = ref<'name' | 'account' | 'employeeNo'>('name')
const keyword = ref('')
const pageNo = ref(1)
const pageSize = ref(20)
const total = ref(0)
const records = ref<ArrangeUserOption[]>([])
const loading = ref(false)
const picked = reactive(new Set<string>(props.selectedIds ?? []))
const pickedNames = reactive<Record<string, string>>({})

const fieldLabel = computed(() =>
  ({ name: '姓名', account: '账号', employeeNo: '工号' })[searchField.value]
)

const pickedEntries = computed(() => [...picked].map(id => [id, pickedNames[id] ?? id] as const))
const allChecked = computed(() =>
  records.value.length > 0 && records.value.every(isSelected)
)
const someChecked = computed(() =>
  records.value.some(isSelected) && !allChecked.value
)

/** 平铺部门数据补 parentPath，供现有 DeptTree 复用。 */
const deptTreeData = computed<TreeDepartment[]>(() =>
  departments.value.map(dept => ({
    deptId: String(dept.id ?? dept.deptId ?? dept.deptCode ?? dept.deptPath),
    deptName: dept.deptName,
    deptPath: dept.deptPath,
    parentPath: dept.parentPath ?? parentPathOf(dept.deptPath),
    userCount: dept.userCount ?? 0
  }))
)

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value) return '选择部门'
  return deptTreeData.value.find(dept => dept.deptId === selectedDeptId.value)?.deptName ?? '选择部门'
})

const initNames = () => {
  const ids = props.selectedIds ?? []
  const names = props.selectedNames ?? []
  ids.forEach((id, index) => {
    pickedNames[id] = names[index] ?? id
  })
}
initNames()

function parentPathOf(path: string) {
  const index = path.lastIndexOf('_')
  return index > 0 ? path.slice(0, index) : null
}

function isSelected(user: ArrangeUserOption) {
  return picked.has(user.userId)
}

const toggle = (user: ArrangeUserOption, checked: boolean) => {
  if (checked) {
    if (picked.size >= max) {
      toast.warn(`最多选择 ${max} 人`)
      return
    }
    picked.add(user.userId)
    pickedNames[user.userId] = user.fullname
    return
  }
  picked.delete(user.userId)
  delete pickedNames[user.userId]
}

const toggleById = (id: string, name: string) => {
  if (picked.has(id)) {
    picked.delete(id)
    delete pickedNames[id]
  } else if (picked.size < max) {
    picked.add(id)
    pickedNames[id] = name
  }
}

const toggleAll = (checked: boolean) => {
  for (const user of records.value) toggle(user, checked)
}

const onDeptPicked = (value: string | string[]) => {
  selectedDeptId.value = String(value ?? '')
  selectedDeptPath.value =
    deptTreeData.value.find(dept => dept.deptId === selectedDeptId.value)?.deptPath ?? ''
  showDeptPicker.value = false
  reload(1)
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const queriedKeyword = keyword.value.trim()
    const res = await searchArrangeUsers(
      queriedKeyword || '%',
      selectedDeptPath.value,
      queriedKeyword ? searchField.value : 'all',
      pageNo.value,
      pageSize.value
    )
    records.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const confirm = () => {
  const ids = [...picked]
  emit('confirm', ids, ids.map(id => pickedNames[id] ?? id))
}

onMounted(async () => {
  reload(1)
  try {
    const res = await getArrangeDepartments()
    departments.value = res.list || []
  } catch { /* 拦截器已提示 */ }
})
</script>

<style scoped lang="scss">
.drawer {
  display: flex;
  flex-direction: column;
  width: 1040px;
  height: 100%;
  background: #fff;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn {
    font-size: 22px;
    color: #999;
    cursor: pointer;

    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; }
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  .field-select { width: 100px; flex: 0 0 100px; }
  .keyword-input { flex: 1 1 240px; min-width: 200px; max-width: 420px; }
}

.dept-select {
  position: relative;
  flex: 0 0 220px;

  .dept-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 220px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    font-size: 12px;
    color: #4a5368;
    cursor: pointer;

    &:hover { border-color: #1890ff; }
    .placeholder { color: #b0b7c3; }
    .select-arrow { color: #8a92a5; font-size: 11px; }
  }

  .dept-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    width: 320px;
    max-height: 380px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    background: #fff;
    border: 1px solid #e6eaf1;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.search-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 4px;
  background: #1890ff;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.main-area {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.table-wrap {
  flex: 1;
  min-width: 0;
  overflow: auto;
  border: 1px solid #eef1f6;
  border-radius: 6px;
}

.selected-panel {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #e6eaf1;
  border-radius: 6px;

  .panel-title { margin: 0 0 10px; font-size: 12px; color: #667; }
  .selected-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
  }
  .empty-tip { font-size: 12px; color: #b0b7c3; }
}

.picked-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid #d6e4ff;
  border-radius: 3px;
  background: #f0f5ff;
  color: #2f54eb;

  i {
    font-style: normal;
    color: #8a92a5;
    cursor: pointer;

    &:hover { color: #f5222d; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 2px; }
  }
}

.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #667;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 7px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
}
</style>
