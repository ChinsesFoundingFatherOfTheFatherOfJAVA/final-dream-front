<template>
  <!-- 负责人 / 批阅人 多选抽屉：按姓名账号搜索，勾选后回填 id 与姓名。
       与「添加学员」抽屉不同，这里只选人，不写考生名单。 -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>{{ title }}</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-input v-model.trim="keyword" placeholder="姓名/账号搜索" @keyup.enter="search()" />
          <el-button class="btn primary" @click="search()">查询</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="list" row-key="userId" empty-text="没有匹配的人员" @row-click="(row: any) => toggle(row.userId, row.fullname)">
            <el-table-column width="44" align="center">
              <template #default="{ row }">
                <el-checkbox :model-value="picked.has(row.userId)" @click.stop="toggle(row.userId, row.fullname)" />
              </template>
            </el-table-column>
            <el-table-column prop="fullname" label="姓名" min-width="110" />
            <el-table-column prop="account" label="账号" min-width="120" />
            <el-table-column label="部门" min-width="160"><template #default="{ row }">{{ row.deptName || '--' }}</template></el-table-column>
          </el-table>
        </div>

        <div class="picked-line">
          <span>已选 {{ picked.size }} / {{ max }} 人</span>
          <span v-for="(name, id) in pickedNames" :key="id" class="picked-tag">
            {{ name }}<i @click="toggle(String(id), name)">×</i>
          </span>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" @click="confirm">确定</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import { searchArrangeUsers, type ArrangeUserOption } from '@/api/arrange'

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
const list = ref<ArrangeUserOption[]>([])
const keyword = ref('')
const picked = reactive(new Set<string>(props.selectedIds ?? []))
const pickedNames = reactive<Record<string, string>>({})

const initNames = () => {
  const ids = props.selectedIds ?? []
  const names = props.selectedNames ?? []
  ids.forEach((id, i) => { pickedNames[id] = names[i] ?? id })
}
initNames()

const search = async (kw = keyword.value) => {
  try {
    // 后端 listUserIdsByKeyword 对空串返回空列表；首屏用 % 走 LIKE 列出全部，
    // 输入框仍保持为空，用户输入后按正常关键字查询。
    const res = await searchArrangeUsers(kw, '', 'all', 1, 50)
    list.value = res.list || []
  } catch { /* 拦截器已提示 */ }
}

const toggle = (id: string, name: string) => {
  if (picked.has(id)) {
    picked.delete(id)
    delete pickedNames[id]
    return
  }
  if (picked.size >= max) {
    toast.warn(`最多选择 ${max} 人`)
    return
  }
  picked.add(id)
  pickedNames[id] = name
}

const confirm = () => {
  const ids = [...picked]
  emit('confirm', ids, ids.map(id => pickedNames[id] ?? id))
}

onMounted(() => search('%'))
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, .45);
  z-index: 3300;
}

.drawer {
  display: flex;
  flex-direction: column;
  width: 620px;
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

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
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
  gap: 10px;
  input {
    flex: 1;
    padding: 7px 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #eef1f6;
  border-radius: 6px;

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { position: sticky; top: 0; background: #fafbfd; color: #8a92a5; font-weight: 500; }
  th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; }
  tbody tr { cursor: pointer; &:hover { background: #f7faff; } }
  .check-col { width: 36px; }
  .empty-cell { padding: 40px 0; text-align: center; color: #b0b7c3; }
}

.picked-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8a92a5;
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

  i { font-style: normal; color: #8a92a5; cursor: pointer; &:hover { color: #f5222d; } }
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
