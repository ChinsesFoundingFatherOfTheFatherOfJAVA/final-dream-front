<template>
  <!-- 部门选择抽屉：题库共享的部门维度（后端 exam_lib_share.target_type=1）。
       复用员工名册同一棵 DeptTree（check 模式，勾父级自动带子级），保持全站部门选择形态一致。 -->
    <el-drawer
    :model-value="true"
    size="460px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>选择部门</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <DeptTree
          v-model="selectedIds"
          :data="depts"
          mode="check"
          searchable
          show-count
          search-placeholder="搜索部门名称"
        />
      </div>

      <div class="drawer-footer">
        <span class="picked-count">已选 {{ selectedIds.length }} 个部门</span>
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!selectedIds.length" @click="confirmPick">确定</el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getDepartmentTree, type EnterpriseDepartment } from '@/api/sm'
import DeptTree from '@/components/common/DeptTree.vue'

const props = withDefaults(defineProps<{ zIndex?: number }>(), { zIndex: 3300 })
const emit = defineEmits<{
  close: []
  confirm: [depts: EnterpriseDepartment[]]
}>()

const depts = ref<EnterpriseDepartment[]>([])
const selectedIds = ref<string[]>([])

const confirmPick = () => {
  // 勾选值里可能含父级带出的子级，这里按 id 还原成部门对象交给上层
  emit('confirm', depts.value.filter(d => selectedIds.value.includes(d.deptId)))
}

onMounted(async () => {
  try {
    const res: any = await getDepartmentTree()
    // SM 部门树响应形状是 SmList{list}，不是 records/datas
    depts.value = (res.list || []) as EnterpriseDepartment[]
  } catch { /* 错误提示由 request.ts 拦截器统一处理 */ }
})
</script>

<style scoped lang="scss">
.drawer {
  width: 460px;
  height: 100%;
  background: var(--color-paper);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-rule);
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
}

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-rule);

  .picked-count { margin-right: auto; font-size: 12px; color: var(--color-muted); }
}

.btn {
  padding: 7px 20px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  font-size: 13px;
  cursor: pointer;

  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>