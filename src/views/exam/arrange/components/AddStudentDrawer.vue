<template>
  <!-- F7 添加学员抽屉（简化单模式：部门/关键字 + 勾选列表） -->
    <el-drawer
    :model-value="true"
    size="760px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>添加学员</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-select v-model="deptPath" class="filter-select" @change="reload">
            <el-option value="" label="全部部门" />
            <el-option v-for="dept in departments" :key="dept.deptPath" :value="dept.deptPath" :label="'　'.repeat(Math.max(0, dept.deptLevel - 1)) + dept.deptName" />
          </el-select>
          <el-input v-model.trim="keyword" placeholder="姓名/账号搜索" @keyup.enter="reload" />
          <el-button class="btn primary" @click="reload">查询</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="list" row-key="userId" empty-text="没有可选学员">
            <el-table-column width="44" align="center">
              <template #header>
                <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
              </template>
              <template #default="{ row }">
                <el-checkbox
                  :model-value="picked.has(row.userId)"
                  :disabled="row.added"
                  @change="toggle(row.userId, Boolean($event))"
                />
              </template>
            </el-table-column>
            <el-table-column prop="fullname" label="姓名" min-width="110" />
            <el-table-column prop="account" label="账号" min-width="120" />
            <el-table-column label="部门" min-width="160"><template #default="{ row }">{{ row.deptName || '--' }}</template></el-table-column>
            <el-table-column label="岗位" min-width="120"><template #default="{ row }">{{ row.positionName || '--' }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }">{{ row.added ? '已在名单' : '' }}</template></el-table-column>
          </el-table>
        </div>

        <p class="picked-tip">已选 {{ picked.size }} 人（名单内 {{ selectedCount }} 人）</p>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!picked.size || saving" @click="confirm">
          {{ saving ? '添加中…' : `确定（${picked.size}）` }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  addArrangeStudents, getArrangeCandidates, getArrangeDepartments, type ArrangeCandidateItem
} from '@/api/arrange'

const props = defineProps<{ arrangeId: string }>()
const emit = defineEmits<{ close: []; added: [] }>()

const list = ref<ArrangeCandidateItem[]>([])
const departments = ref<{ deptCode: string; deptName: string; deptPath: string; deptLevel: number }[]>([])
const deptPath = ref('')
const keyword = ref('')
const selectedCount = ref(0)
const picked = reactive(new Set<string>())
const saving = ref(false)

const allChecked = computed(() =>
  list.value.filter(u => !u.added).length > 0 && list.value.filter(u => !u.added).every(u => picked.has(u.userId)))
const someChecked = computed(() =>
  list.value.some(u => !u.added && picked.has(u.userId)) && !allChecked.value)

const reload = async () => {
  try {
    const res = await getArrangeCandidates(props.arrangeId, deptPath.value, keyword.value, 1, 200)
    list.value = res.list || []
    selectedCount.value = res.selectedCount || 0
  } catch { /* 拦截器已提示 */ }
}

const toggle = (userId: string, checked: boolean) => {
  if (checked) picked.add(userId)
  else picked.delete(userId)
}
const toggleAll = (checked: boolean) => {
  for (const u of list.value) {
    if (u.added) continue
    if (checked) picked.add(u.userId)
    else picked.delete(u.userId)
  }
}

const confirm = async () => {
  saving.value = true
  try {
    const res = await addArrangeStudents(props.arrangeId, Array.from(picked))
    if (res.skippedCount) {
      toast.success(`新增 ${res.successCount} 人，已在名单 ${res.skippedCount} 人`)
    } else {
      toast.success(`已添加 ${res.successCount} 人`)
    }
    emit('added')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  reload()
  try {
    const res = await getArrangeDepartments()
    departments.value = res.list || []
  } catch { /* 拦截器已提示 */ }
})
</script>

<style scoped lang="scss">
/* 2026-11-14 Hallmark Cobalt 重构：裸色值清零，颜色统一走 token 层 */
.drawer { width: 760px; height: 100%; background: var(--color-paper); display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: var(--rule-hair) solid var(--color-rule); font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer;
    &:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; border-radius: 4px; }
  }
}
.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 20px; gap: 12px; }
.filter-row {
  display: flex; gap: 10px;
  .filter-select { width: 220px; font-size: 13px; }
  .el-input { flex: 1; min-width: 160px; font-size: 13px; }
}
.table-wrap { flex: 1; min-height: 0; overflow: auto; border: var(--rule-hair) solid var(--color-rule); border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 12px; text-align: left; border-bottom: var(--rule-hair) solid var(--color-paper-3); }
th { background: var(--color-paper-2); color: var(--color-ink); font-weight: 500; white-space: nowrap; }
tr.added td { color: var(--color-rule-2); }
.check-col { width: 40px; text-align: center; }
.col-sm { width: 100px; }
.empty-cell { text-align: center; color: var(--color-muted); padding: 40px 0; }
.picked-tip { margin: 0; font-size: 12px; color: var(--color-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: var(--rule-hair) solid var(--color-rule); }
.btn {
  padding: 7px 18px; border-radius: 4px; font-size: 13px; cursor: pointer;
  /* 手绘描边/主色底清零：plain 与 primary 态由 EP 主题层统一承担 */
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
