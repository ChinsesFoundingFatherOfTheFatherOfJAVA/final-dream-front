<template>
  <div class="dm-learner">
    <!-- 工具栏：左动作（添加 / 催促 / 导出），右筛选 -->
    <div class="dm-learner__toolbar">
      <div class="dm-learner__actions">
        <button type="button" class="dm-learner__add" @click="pickerVisible = true">添加学员</button>
        <!-- 契约 01 §F22：催促与 PDF 导出后置，先按禁用态呈现，点击只提示 -->
        <button type="button" class="dm-learner__urge" @click="comingSoon('功能建设中')">一键催促</button>
        <button type="button" class="dm-learner__export" @click="comingSoon('功能建设中')">导出报告(PDF)</button>
      </div>
      <div class="dm-learner__filters">
        <div class="dm-learner__search">
          <span class="dm-learner__search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            v-model="query.keyword"
            type="text"
            placeholder="搜索学员账号..."
            @keyup.enter="reload"
            @change="reload"
          />
        </div>
        <el-select v-model="query.source" placeholder="全部来源" clearable class="dm-learner__select" @change="reload">
          <el-option label="管理员指派" value="assigned" />
          <el-option label="公开加入" value="public" />
        </el-select>
      </div>
    </div>

    <!-- 来源汇总卡：与原平台一致，一张卡代表一种来源 -->
    <div class="dm-learner__sources">
      <div class="dm-learner__source">
        <span class="dm-tag">管理员指派</span>
        <span class="dm-learner__source-count">{{ summary.assignedCount }} 人</span>
      </div>
      <div class="dm-learner__source">
        <span class="dm-tag">公开加入</span>
        <span class="dm-learner__source-count">{{ summary.publicCount }} 人</span>
      </div>
    </div>

    <!-- 学员表：自绘 table 以精确对齐原平台的 th/td 尺寸 -->
    <div class="dm-learner__table" v-loading="loading">
      <table>
        <thead>
          <tr>
            <th>学员</th>
            <th>部门</th>
            <th>来源</th>
            <th>状态</th>
            <th>场景通过</th>
            <th>练习次数</th>
            <th>平均得分</th>
            <th class="is-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cards" :key="row.userId">
            <td>
              <span class="dm-learner__name">{{ row.name }}</span>
              <span v-if="row.name !== row.userId" class="dm-learner__account">{{ row.userId }}</span>
            </td>
            <td>{{ row.departmentName || '—' }}</td>
            <td>
              <span class="dm-learner__badge" :class="row.source === 'public' ? 'is-public' : 'is-assigned'">
                {{ row.source === 'public' ? '公开加入' : '指派' }}
              </span>
            </td>
            <td>
              <span class="dm-learner__badge" :class="row.status === 'in_progress' ? 'is-running' : 'is-idle'">
                {{ row.status === 'in_progress' ? '练习中' : '空闲' }}
              </span>
            </td>
            <td>{{ row.passedScenarioCount }} / {{ row.scenarioCount }}</td>
            <td>{{ row.trainingCount + row.examCount }}</td>
            <td>{{ row.averageScore ?? '—' }}</td>
            <td class="is-right">
              <button type="button" class="dm-learner__link" @click="openDetail(row)">详情</button>
              <button type="button" class="dm-learner__link" @click="openQuota(row)">考核次数</button>
              <button type="button" class="dm-learner__link is-danger" @click="removeStudent(row)">移出</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !cards.length" class="dm-learner__empty">暂无学员</p>
    </div>

    <div class="dm-learner__pager">
      <el-pagination
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="query.size"
        :page-sizes="[10, 20, 50]"
        :current-page="query.page"
        @current-change="onPage"
        @size-change="onSizeChange"
      />
    </div>

    <p class="dm-learner__footnote">场景完成率 100% 的学员无法被催促</p>

    <!-- 添加学员抽屉：SM 名册选择（搜索 + 跨页已选保留） -->
    <el-drawer v-model="pickerVisible" title="添加学员" size="520px" class="exam-drawer">
      <StudentPickerDrawer :theme-id="themeId" @added="onAdded" @close="pickerVisible = false" />
    </el-drawer>

    <!-- 学员详情抽屉 -->
    <el-drawer v-model="detailVisible" :title="detailTitle" size="560px" class="exam-drawer">
      <StudentDetailDrawer v-if="detailVisible && detailUser" :theme-id="themeId" :user-id="detailUser" />
    </el-drawer>

    <!-- 调整考核次数（AD03：绝对值设置 + 审计） -->
    <el-dialog v-model="quotaVisible" title="调整考核次数" width="420px">
      <el-form label-width="90px">
        <el-form-item label="学员">{{ quotaUser?.name }}</el-form-item>
        <el-form-item label="考核次数">
          <el-input-number v-model="quotaValue" :min="0" :max="99" />
          <div class="dm-learner__hint">
            为该学员设置的追加考核次数总量（叠加在主题上限上），仅影响之后的考核
          </div>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="quotaReason" placeholder="如：补考" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaVisible = false">取消</el-button>
        <el-button type="primary" @click="saveQuota">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 主题学员管理（契约 04 §7 AD01~AD06）：真实组件替换静态壳。
// 姓名映射：ACT 不直读 sys_*（铁律 1），name 回落 userId，由 SM 名册在展示层补齐。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  adjustExamQuota,
  listThemeStudents,
  mergeUserNames,
  removeThemeStudent,
  type StudentCard,
  type StudentSummary
} from '@/api/actStudentAdmin'
import StudentPickerDrawer from './StudentPickerDrawer.vue'
import StudentDetailDrawer from './StudentDetailDrawer.vue'
import { comingSoon } from './ui'

const props = defineProps<{ themeId: string }>()

const loading = ref(false)
const cards = ref<StudentCard[]>([])
const total = ref(0)
const summary = ref<StudentSummary>({
  assignedCount: 0,
  publicCount: 0,
  trainingCount: 0,
  examCount: 0
})
const query = reactive({ keyword: '', source: '', page: 1, size: 20 })

const pickerVisible = ref(false)
const detailVisible = ref(false)
const detailUser = ref('')
const detailTitle = computed(() => `学员详情 · ${detailUser.value}`)
const quotaVisible = ref(false)
const quotaUser = ref<StudentCard | null>(null)
const quotaValue = ref(0)
const quotaReason = ref('')

async function load() {
  loading.value = true
  try {
    const page = await listThemeStudents(props.themeId, {
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      source: query.source || undefined
    })
    cards.value = await mergeUserNames(page.records ?? [])
    total.value = page.total ?? 0
    if (cards.value[0]?.summary) {
      summary.value = cards.value[0].summary
    }
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
const onSizeChange = (size: number) => {
  query.size = size
  query.page = 1
  load()
}

function onAdded(result: { successCount: number; skippedCount: number }) {
  pickerVisible.value = false
  ElMessage.success(`已添加 ${result.successCount} 人，跳过 ${result.skippedCount} 人`)
  reload()
}

function openDetail(row: StudentCard) {
  detailUser.value = row.userId
  detailVisible.value = true
}

function openQuota(row: StudentCard) {
  quotaUser.value = row
  quotaValue.value = row.extraExamAttemptCount
  quotaReason.value = ''
  quotaVisible.value = true
}

async function saveQuota() {
  if (!quotaUser.value) return
  await adjustExamQuota(props.themeId, quotaUser.value.userId, quotaValue.value, quotaReason.value)
  quotaVisible.value = false
  ElMessage.success('考核次数已更新')
  load()
}

async function removeStudent(row: StudentCard) {
  await ElMessageBox.confirm(
    `确定将学员「${row.name}」移出主题？历史练习与报告会保留。`,
    '移出主题',
    { type: 'warning' }
  )
  await removeThemeStudent(props.themeId, row.userId)
  ElMessage.success('已移出')
  load()
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 尺寸全部取自 visual/measured/admin-theme-detail.json（原平台 viewport 1509x887） */
.dm-learner {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    height: 32px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 32px;
  }

  &__add,
  &__urge,
  &__export {
    height: 32px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    cursor: pointer;
    white-space: nowrap;
  }

  &__add {
    width: 112px;
    border-color: #436bff;
    background: #436bff;
    color: #fff;

    &:hover { border-color: #3358e0; background: #3358e0; }
  }

  /* 后置功能：明确灰态，不是随机配色 */
  &__urge {
    width: 166px;
    background: #f5f5f5;
    color: #8c8c8c;
  }

  &__export {
    width: 127px;
    border-color: #d9d9d9;
    background: #fff;
    color: #bfbfbf;
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 32px;
  }

  /* 原生 input + 绝对定位图标：el-input 的内层 padding 是 0，量不到 32px 左内边距 */
  &__search {
    position: relative;
    width: 256px;
    height: 32px;

    input {
      width: 100%;
      height: 32px;
      padding: 4px 12px 4px 32px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      background: #fff;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 14px;
      line-height: 22px;
      color: #262626;
      outline: none;

      &::placeholder { color: #bfbfbf; }
      &:focus { border-color: #436bff; }
    }
  }

  &__search-icon {
    position: absolute;
    top: 9px;
    left: 11px;
    display: flex;
    align-items: center;
    color: #bfbfbf;
    pointer-events: none;
  }

  &__select {
    width: 220px;

    :deep(.el-select__wrapper) {
      min-height: 32px;
      height: 32px;
      border-radius: 4px;
      box-shadow: 0 0 0 1px #d9d9d9 inset;
      font-size: 14px;
    }

    :deep(.el-select__placeholder) {
      font-size: 14px;
      color: #595959;
    }
  }

  &__sources {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  &__source {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    padding: 12px;
    border: 1px solid #e9e9e9;
    border-radius: 8px;
    background: #fff;
    box-sizing: border-box;
  }

  &__source-count {
    font-size: 14px;
    font-weight: 500;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }

  &__table {
    margin-top: 16px;
    border: 1px solid #e9e9e9;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }

    th {
      height: 50px;
      padding: 14px 16px 13px;
      border-bottom: 1px solid #e9e9e9;
      background: #f9fafb;
      font-size: 14px;
      font-weight: 700;
      line-height: 22px;
      color: #262626;
      text-align: left;
      white-space: nowrap;
    }

    td {
      height: 72px;
      padding: 14px 16px 13px;
      border-bottom: 1px solid #e9e9e9;
      font-size: 14px;
      line-height: 22px;
      color: #262626;
      text-align: left;
    }

    tbody tr:hover { background: #fafafa; }

    .is-right { text-align: right; }
  }

  &__name { font-weight: 500; }

  &__account {
    margin-left: 8px;
    font-size: 12px;
    color: #8c8c8c;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 2px 8px;
    border: 1px solid #bdd2ff;
    border-radius: 4px;
    background: #f0f6ff;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    color: #2e4dd9;
    white-space: nowrap;

    &.is-public { border-color: #a7f3d0; background: #ecfdf5; color: #047857; }
    &.is-running { border-color: #fde68a; background: #fffbeb; color: #b45309; }
    &.is-idle { border-color: #e5e6eb; background: #f7f8fa; color: #8c8c8c; }
  }

  &__link {
    border: 0;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: 14px;
    color: #436bff;
    cursor: pointer;

    & + & { margin-left: 12px; }
    &.is-danger { color: #f5222d; }
  }

  &__empty {
    margin: 0;
    padding: 48px 0;
    text-align: center;
    font-size: 14px;
    color: #8c8c8c;
  }

  &__pager {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 60px;
    padding: 16px;
    font-size: 14px;
    color: #595959;
  }

  &__footnote {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    color: #8c8c8c;
    text-align: right;
  }

  &__hint {
    font-size: 12px;
    line-height: 1.5;
    color: #8c8c8c;
  }
}

/* 来源标签：与原平台 source-tag 同规格 */
.dm-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 2px 8px;
  border: 1px solid #bdd2ff;
  border-radius: 4px;
  background: #f0f6ff;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #2e4dd9;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .dm-learner__sources { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dm-learner__table { overflow-x: auto; }
}
</style>
