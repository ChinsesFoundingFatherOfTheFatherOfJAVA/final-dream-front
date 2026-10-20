<template>
  <!-- F3 创建人筛选：右侧抽屉（对齐原平台「选择创建人」） -->
  <div class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer">
      <div class="drawer-header">
        <span>选择创建人</span>
        <span class="close-btn" @click="$emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <section class="main">
          <div class="filters">
            <select v-model="deptPath" class="f-select dept" @change="reload(1)">
              <option value="">选择部门</option>
              <option v-for="d in departments" :key="d.deptPath" :value="d.deptPath">
                {{ '　'.repeat(Math.max(0, (d.deptLevel ?? 1) - 1)) }}{{ d.deptName }}
              </option>
            </select>
            <label class="part-time" title="当前组织数据不区分部门兼职人员">
              <input type="checkbox" checked disabled /> 包含部门兼职人员
            </label>
            <select v-model="field" class="f-select field" @change="reload(1)">
              <option value="name">姓名</option>
              <option value="account">账号</option>
              <option value="employeeNo">工号</option>
            </select>
            <input v-model.trim="keyword" class="f-input" :placeholder="placeholder"
                   @keyup.enter="reload(1)" />
            <button class="btn" type="button" @click="reload(1)">搜索</button>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="check-col">
                    <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                           @change="toggleAll(($event.target as HTMLInputElement).checked)" />
                  </th>
                  <th>姓名</th>
                  <th>账号</th>
                  <th>工号</th>
                  <th>部门</th>
                  <th>岗位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in list" :key="u.userId" :class="{ picked: isPicked(u) }">
                  <td class="check-col">
                    <input type="checkbox" :checked="isPicked(u)" @change="toggle(u)" />
                  </td>
                  <td>{{ u.fullname || '--' }}</td>
                  <td>{{ u.account || '--' }}</td>
                  <td>{{ u.employeeNo || '--' }}</td>
                  <td class="ellipsis" :title="u.deptName">{{ u.deptName || '--' }}</td>
                  <td class="ellipsis" :title="u.positionName || ''">{{ u.positionName || '--' }}</td>
                </tr>
                <tr v-if="!loading && !list.length">
                  <td colspan="6" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
            <div v-if="loading" class="table-loading">加载中...</div>
          </div>

          <div class="pagination">
            <span>共 {{ total }} 条</span>
            <button :disabled="page <= 1" type="button" @click="reload(page - 1)">‹</button>
            <button v-for="p in pageNumbers" :key="p" type="button"
                    :class="{ active: p === page }" @click="reload(p)">{{ p }}</button>
            <button :disabled="page >= maxPage" type="button" @click="reload(page + 1)">›</button>
          </div>
        </section>

        <aside class="selected">
          <p class="selected-title">已选：<b>{{ picked.length }}</b> / 50</p>
          <div class="selected-list">
            <span v-if="!picked.length" class="selected-empty">请选择...</span>
            <span v-for="u in picked" :key="u.userId" class="selected-tag">
              {{ u.fullname || u.account }}
              <i @click="remove(u)">×</i>
            </span>
          </div>
          <button v-if="picked.length" class="clear-btn" type="button" @click="picked = []">清空</button>
        </aside>
      </div>

      <div class="drawer-footer">
        <button class="btn" type="button" @click="$emit('close')">取消</button>
        <button class="btn primary" type="button" @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getArrangeDepartments, searchArrangeUsers, type ArrangeUserOption } from '@/api/arrange'

const props = defineProps<{ selected?: ArrangeUserOption[] }>()
const emit = defineEmits<{ close: []; confirm: [users: ArrangeUserOption[]] }>()

interface DeptOption { deptCode: string; deptName: string; deptPath: string; deptLevel: number }

const MAX_PICK = 50
const departments = ref<DeptOption[]>([])
const deptPath = ref('')
const field = ref<'name' | 'account' | 'employeeNo'>('name')
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const list = ref<ArrangeUserOption[]>([])
const total = ref(0)
const loading = ref(false)
/** 跨页保留选择：翻页后仍能记住之前勾的人。 */
const picked = ref<ArrangeUserOption[]>([...(props.selected ?? [])])

const placeholder = computed(() => {
  if (field.value === 'account') return '请输入账号搜索'
  if (field.value === 'employeeNo') return '请输入工号搜索'
  return '请输入姓名搜索'
})
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pageNumbers = computed(() => {
  const max = maxPage.value
  const start = Math.max(1, Math.min(page.value - 2, max - 4))
  const end = Math.min(max, start + 4)
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
})
const allChecked = computed(() =>
  list.value.length > 0 && list.value.every(u => isPicked(u)))
const someChecked = computed(() =>
  list.value.some(u => isPicked(u)) && !allChecked.value)

const isPicked = (u: ArrangeUserOption) => picked.value.some(p => p.userId === u.userId)

const toggle = (u: ArrangeUserOption) => {
  if (isPicked(u)) {
    picked.value = picked.value.filter(p => p.userId !== u.userId)
    return
  }
  if (picked.value.length >= MAX_PICK) return
  picked.value = [...picked.value, u]
}
const toggleAll = (checked: boolean) => {
  if (!checked) {
    const ids = new Set(list.value.map(u => u.userId))
    picked.value = picked.value.filter(p => !ids.has(p.userId))
    return
  }
  const next = [...picked.value]
  for (const u of list.value) {
    if (next.length >= MAX_PICK) break
    if (!next.some(p => p.userId === u.userId)) next.push(u)
  }
  picked.value = next
}
const remove = (u: ArrangeUserOption) => {
  picked.value = picked.value.filter(p => p.userId !== u.userId)
}

const loadDepartments = async () => {
  try {
    const res = await getArrangeDepartments()
    departments.value = res.list || []
  } catch {
    departments.value = []
  }
}

const reload = async (next?: number) => {
  if (next) page.value = next
  loading.value = true
  try {
    const res = await searchArrangeUsers(keyword.value, deptPath.value, field.value, page.value, pageSize)
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const confirm = () => emit('confirm', picked.value)

onMounted(() => {
  loadDepartments()
  reload(1)
})
</script>

<style scoped lang="scss">
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3300; }
.drawer { width: 980px; max-width: 96vw; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center; flex: none;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}
.drawer-body { flex: 1; min-height: 0; display: flex; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 16px 20px; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.f-select, .f-input {
  border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; background: #fff;
  &:focus { border-color: #1890ff; }
}
.f-select.dept { width: 160px; }
.f-select.field { width: 96px; }
.f-input { flex: 1; min-width: 160px; }
.part-time { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #8a92a5; white-space: nowrap; }
.table-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid #eef1f6; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; white-space: nowrap; }
th { background: #fafbfd; color: #667; font-weight: 500; }
tr.picked td { background: #f5f9ff; }
.check-col { width: 40px; text-align: center; }
.ellipsis { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.empty-cell { text-align: center; color: #999; padding: 36px 0; }
.table-loading { text-align: center; color: #999; font-size: 12px; padding: 12px 0; }
.pagination {
  display: flex; align-items: center; gap: 6px; padding-top: 10px; font-size: 12px; color: #667;
  span { margin-right: 4px; }
  button {
    min-width: 28px; padding: 3px 6px; border: 1px solid #d9d9d9; border-radius: 4px;
    background: #fff; cursor: pointer; font-size: 12px;
    &.active { border-color: #1890ff; color: #1890ff; }
    &:disabled { opacity: .45; cursor: not-allowed; }
  }
}
.selected { width: 240px; flex: none; border-left: 1px solid #eee; padding: 16px; display: flex; flex-direction: column; background: #fafbfd; }
.selected-title { margin: 0 0 10px; font-size: 13px; color: #4a5368; b { color: #1890ff; } }
.selected-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.selected-empty { font-size: 12px; color: #b0b7c3; }
.selected-tag {
  display: inline-flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 4px 8px; border-radius: 4px; background: #fff; border: 1px solid #e5e8ef; font-size: 12px; color: #4a5368;
  i { font-style: normal; color: #a0a7b8; cursor: pointer; &:hover { color: #f5222d; } }
}
.clear-btn { margin-top: 10px; border: none; background: none; color: #1890ff; font-size: 12px; cursor: pointer; text-align: left; }
.drawer-footer { flex: none; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #eee; }
.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
}
</style>
