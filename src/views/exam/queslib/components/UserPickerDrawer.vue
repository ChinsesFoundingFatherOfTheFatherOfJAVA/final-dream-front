<template>
  <!-- FP-05 快速选人抽屉（简化版，截图04：部门下拉+搜索+人员表格+右侧已选） -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>快速选人</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body" @click="showDeptPicker = false">
        <div class="filter-row">
          <div class="dept-select">
            <!-- 必须 .stop：否则冒泡到 .drawer-body 的关闭处理，刚打开就被关掉，表现为"点了没反应" -->
            <button type="button" class="dept-trigger" @click.stop="showDeptPicker = !showDeptPicker">
              <span :class="{ placeholder: !deptId }">{{ selectedDeptName }}</span>
              <span class="select-arrow">▾</span>
            </button>
            <!-- 部门是多层级数据，必须树状展示（平铺下拉在 8000+ 人员的组织里不可用） -->
            <div v-if="showDeptPicker" class="dept-dropdown" @click.stop>
              <DeptTree
                :model-value="deptId"
                :data="depts"
                mode="single"
                searchable
                show-count
                include-all
                search-placeholder="搜索部门名称"
                @change="onDeptPicked"
              />
            </div>
          </div>
          <select v-model="searchField" class="filter-select">
            <option value="name">姓名</option>
            <option value="account">账号</option>
            <option value="employeeNo">工号</option>
          </select>
          <input v-model.trim="keyword" type="search" :placeholder="`请输入${fieldLabel}搜索`"
                 @keyup.enter="reload(1)" />
          <button class="search-btn" @click="reload(1)">搜索</button>
        </div>

        <div class="main-area">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="check-col">
                    <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                           @change="toggleAll(($event.target as HTMLInputElement).checked)" />
                  </th>
                  <th>姓名</th><th>账号</th><th>工号</th><th>部门</th><th>岗位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in records" :key="u.userId" :class="{ checked: isSelected(u) }">
                  <td class="check-col">
                    <input type="checkbox" :checked="isSelected(u)"
                           @change="toggle(u, ($event.target as HTMLInputElement).checked)" />
                  </td>
                  <td>{{ u.name }}</td>
                  <td>{{ u.account }}</td>
                  <td>{{ u.employeeNo || '--' }}</td>
                  <td>{{ u.deptName || '--' }}</td>
                  <td>{{ u.positionName || '--' }}</td>
                </tr>
                <tr v-if="!loading && !records.length">
                  <td colspan="6" class="empty-cell">暂无人员</td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside class="selected-panel">
            <p class="panel-title">已选: {{ selected.size }}/1000</p>
            <div class="selected-list">
              <span v-for="u in selected.values()" :key="u.userId" class="selected-tag">
                {{ u.name }}
                <i @click="selected.delete(u.userId)">×</i>
              </span>
              <span v-if="!selected.size" class="empty-tip">请选择...</span>
            </div>
          </aside>
        </div>

        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <button :disabled="pageNo <= 1" @click="reload(pageNo - 1)">‹</button>
          <span class="page-no">{{ pageNo }}</span>
          <button :disabled="pageNo >= Math.ceil(total / pageSize)" @click="reload(pageNo + 1)">›</button>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="!selected.size" @click="confirmPick">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getDepartmentTree, getEnterpriseUsers, type EnterpriseDepartment, type EnterpriseUser } from '@/api/sm'
import DeptTree from '@/components/common/DeptTree.vue'

/**
 * 快速选人抽屉（FP-05 简化版）：部门下拉 + 姓名/账号/工号单条件搜索 + 分页表格 + 已选回显（≤1000）。
 * 数据源=StaffManagement 既有接口（部门树/员工分页）。
 */
const props = withDefaults(defineProps<{ zIndex?: number }>(), { zIndex: 3200 })
const emit = defineEmits<{
  close: []
  confirm: [users: { userId: string; userName: string; fullname: string; deptName: string }[]]
}>()

const depts = ref<EnterpriseDepartment[]>([])
const deptId = ref('')
const showDeptPicker = ref(false)
const searchField = ref<'name' | 'account' | 'employeeNo'>('name')
const keyword = ref('')
const pageNo = ref(1)
const pageSize = 20
const total = ref(0)
const records = ref<EnterpriseUser[]>([])
const loading = ref(false)
const selected = ref(new Map<string, EnterpriseUser>())

const fieldLabel = computed(() => ({ name: '姓名', account: '账号', employeeNo: '工号' } as any)[searchField.value])

/** 触发器上显示的部门名；未选时回落到"选择部门"。 */
const selectedDeptName = computed(() => {
  if (!deptId.value) return '选择部门'
  return depts.value.find(d => d.deptId === deptId.value)?.deptName ?? '选择部门'
})

/** 树上选完即收起并回到第一页重查。 */
const onDeptPicked = (value: string | string[]) => {
  deptId.value = String(value ?? '')
  showDeptPicker.value = false
  reload(1)
}

const allChecked = computed(() => records.value.length > 0 && records.value.every(isSelected))
const someChecked = computed(() => records.value.some(isSelected) && !allChecked.value)

function isSelected(u: EnterpriseUser) {
  return selected.value.has(u.userId)
}

const toggle = (u: EnterpriseUser, checked: boolean) => {
  if (checked) {
    if (selected.value.size >= 1000) return
    selected.value.set(u.userId, u)
  } else {
    selected.value.delete(u.userId)
  }
}

const toggleAll = (checked: boolean) => {
  for (const u of records.value) toggle(u, checked)
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  loading.value = true
  try {
    const res: any = await getEnterpriseUsers({
      page: pageNo.value,
      size: pageSize,
      deptId: deptId.value || undefined,
      status: 1,
      searchField: keyword.value ? searchField.value : undefined,
      keyword: keyword.value || undefined
    })
    // SM 分页响应统一是 PageVo{list,total,page,size}（见 AGENTS.md §3.6）；
    // 早期这里读的 records/datas 是别的模块的历史形状，取不到会导致选人列表恒为空。
    total.value = res.total || 0
    records.value = res.list || []
  } finally {
    loading.value = false
  }
}

const confirmPick = () => {
  emit('confirm', Array.from(selected.value.values()).map(u => ({
    userId: u.userId,
    userName: u.employeeNo || u.account,
    fullname: u.name,
    deptName: u.deptName || ''
  })))
}

onMounted(async () => {
  reload(1)
  try {
    const res: any = await getDepartmentTree()
    // 同上：部门树也是 PageVo/SmList 的 {list} 形状
    depts.value = (res.list || []) as EnterpriseDepartment[]
  } catch { /* handled */ }
})
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: v-bind('props.zIndex');
}

.drawer {
  width: 900px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 20px;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 10px;

  .filter-select {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
    max-width: 180px;
  }

  input {
    flex: 1;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
  }

  .search-btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    background: #1890ff;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
  }

  .dept-select {
    position: relative;
    flex: 0 0 auto;

    .dept-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 200px;
      height: 30px;
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
      width: 300px;
      max-height: 360px;
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid #e6eaf1;
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      padding: 8px;
    }
  }
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
  border: 1px solid #e6eaf1;
  border-radius: 6px;
}

table { width: 100%; border-collapse: collapse; font-size: 12px; }

th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; white-space: nowrap; }
th { background: #fafbfd; color: #667; font-weight: 500; }
tr:hover td { background: #fafbfe; }
tr.checked td { background: #f0f7ff; }

.check-col { width: 32px; }
.empty-cell { text-align: center; color: #999; padding: 28px 0; }

.selected-panel {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;

  .panel-title { margin: 0 0 8px; font-size: 12px; color: #667; }

  .selected-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: flex-start;
  }

  .selected-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f0f5ff;
    border: 1px solid #d6e4ff;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 12px;
    color: #2f54eb;

    i { font-style: normal; cursor: pointer; color: #8a92a5; &:hover { color: #f5222d; } }
  }

  .empty-tip { font-size: 12px; color: #b0b7c3; }
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #667;

  button {
    width: 24px; height: 24px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .page-no { min-width: 20px; text-align: center; color: #1890ff; }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 7px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>
