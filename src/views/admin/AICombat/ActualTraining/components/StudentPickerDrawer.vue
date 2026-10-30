<template>
  <div class="student-picker">
    <!-- 搜索：SM 名册（部门/姓名/账号/工号都走服务端 query） -->
    <div class="search-row">
      <el-input
        v-model="query.keyword"
        placeholder="姓名 / 账号 / 工号"
        clearable
        @keyup.enter="reload"
      >
        <template #prefix><span aria-hidden="true">🔍</span></template>
      </el-input>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="users"
      stripe
      max-height="420"
      @selection-change="onSelectionChange"
      ref="tableRef"
    >
      <el-table-column type="selection" width="44" :reserve-selection="true" />
      <el-table-column label="姓名" prop="name" min-width="90" />
      <el-table-column label="账号" prop="account" min-width="100" />
      <el-table-column label="部门" prop="deptName" min-width="130" show-overflow-tooltip />
      <el-table-column label="工号" prop="employeeNo" width="90" />
    </el-table>
    <el-pagination
      class="pager"
      layout="prev, pager, next, total"
      :total="total"
      :page-size="query.size"
      :current-page="query.page"
      @current-change="onPage"
    />

    <div class="footer">
      <span class="selected-hint">已选 {{ selectedUsers.length }} 人</span>
      <div class="footer-actions">
        <el-button @click="emit('close')">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!selectedUsers.length"
          @click="submit"
        >
          添加
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 学员选择抽屉（契约 02 §5.10）：从 SM 名册选人 → 批量添加为主题学员。
// :reserve-selection 跨页保留已选；不复制考试模块带考试专用字段的组件。
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getEnterpriseUsers, type EnterpriseUser } from '@/api/sm'
import { addThemeStudents } from '@/api/actStudentAdmin'

const props = defineProps<{ themeId: string }>()
const emit = defineEmits<{
  added: [result: { successCount: number; skippedCount: number }]
  close: []
}>()

const loading = ref(false)
const submitting = ref(false)
const users = ref<EnterpriseUser[]>([])
const total = ref(0)
const selectedUsers = ref<EnterpriseUser[]>([])
// 表格 ref 仅用于占位（跨页已选由 el-table 的 reserve-selection 自管）
const tableRef = ref<{ clearSelection: () => void } | null>(null)

const query = reactive({ keyword: '', page: 1, size: 20 })

async function load() {
  loading.value = true
  try {
    const page = await getEnterpriseUsers({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      status: 1,
    })
    users.value = page.list ?? []
    total.value = page.total ?? 0
  } finally {
    loading.value = false
  }
}

const reload = () => {
  query.page = 1
  load()
}
const onPage = (page: number) => {
  query.page = page
  load()
}

function onSelectionChange(rows: EnterpriseUser[]) {
  selectedUsers.value = rows
}

async function submit() {
  submitting.value = true
  try {
    const result = await addThemeStudents(
      props.themeId,
      selectedUsers.value.map((user) => user.userId),
      'assigned',
    )
    emit('added', result)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.student-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .search-row {
    display: flex;
    gap: 8px;
  }
  .pager {
    justify-content: flex-end;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    .selected-hint {
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }
}
</style>
