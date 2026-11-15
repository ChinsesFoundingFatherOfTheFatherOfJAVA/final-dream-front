<template>
  <div class="student-picker">
    <!-- 搜索：SM 名册（部门/姓名/账号/工号都走服务端 query） -->
    <div class="search-row">
      <el-input
        v-model="query.keyword"
        placeholder="姓名 / 账号 / 工号"
        clearable
        aria-label="姓名、账号或工号"
        @keyup.enter="reload"
      >
        <template #prefix><el-icon aria-hidden="true"><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <div class="table-wrap">
      <el-table
        v-loading="loading"
        element-loading-background="color-mix(in oklab, var(--color-accent-ink) 72%, transparent)"
        :data="users"
        row-key="userId"
        stripe
        max-height="420"
        empty-text="暂无人员"
        @selection-change="onSelectionChange"
        ref="tableRef"
      >
      <el-table-column type="selection" width="44" :reserve-selection="true" />
      <el-table-column label="姓名" prop="name" min-width="90" />
      <el-table-column label="账号" prop="account" min-width="100" />
      <el-table-column label="部门" prop="deptName" min-width="130" show-overflow-tooltip />
      <el-table-column label="工号" prop="employeeNo" width="90" />
      </el-table>
    </div>
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
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getEnterpriseUsers, type EnterpriseUser } from '@/api/sm'
import { addThemeStudents } from '@/api/actStudentAdmin'

const props = defineProps<{ themeId: string }>()
const emit = defineEmits<{
  added: [result: { successCount: number; skippedCount: number }]
  close: []
}>()

const loading = ref(false)
const submitting = ref(false)
let loadSeq = 0
const users = ref<EnterpriseUser[]>([])
const total = ref(0)
const selectedUsers = ref<EnterpriseUser[]>([])
// 表格 ref 仅用于占位（跨页已选由 el-table 的 reserve-selection 自管）
const tableRef = ref<{ clearSelection: () => void } | null>(null)

const query = reactive({ keyword: '', page: 1, size: 20 })

async function load() {
  const seq = ++loadSeq
  loading.value = true
  try {
    const page = await getEnterpriseUsers({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      status: 1,
    })
    if (seq !== loadSeq) return
    users.value = page.list ?? []
    total.value = page.total ?? 0
  } catch {
    // 拦截器已经提示；这里只保证转圈停掉，不让失败请求把后一次结果盖掉
    if (seq !== loadSeq) return
  } finally {
    if (seq === loadSeq) loading.value = false
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

// 抽屉打开动画期间表格高为 0，v-loading 蒙层会按 0 高定位并在结束后卸不掉。
// 等一帧布局稳定再请求，蒙层才能跟着 loading 一起消失。
onMounted(async () => {
  await nextTick()
  load()
})
</script>

<style scoped lang="scss">
.student-picker {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  .search-row {
    display: flex;
    gap: 8px;
    .el-input {
      flex: 1;
      min-width: 160px;
    }
  }
  .table-wrap {
    position: relative;
    flex: 1;
    min-height: 240px;
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
