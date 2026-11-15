<template>
  <div class="dm-learner">
    <!-- 工具栏：左动作（添加 / 批量 / 催促 / 导出），右筛选 -->
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
            placeholder="搜索学员姓名/账号/工号…"
            aria-label="搜索学员姓名/账号/工号"
            @keyup.enter="reload"
            @change="reload"
          />
        </div>

        <!-- 部门筛选：复用题库模块已有的抽屉式部门选择（DeptTree 勾父级带子级），不新造组件 -->
        <button
          type="button"
          class="dm-learner__filter-btn"
          :class="{ 'is-active': selectedDepts.length > 0 }"
          @click="deptPickerVisible = true"
        >
          部门{{ selectedDepts.length ? `（${selectedDepts.length}）` : '' }}
        </button>

        <el-select
          v-model="query.practiceStatus"
          placeholder="全部状态"
          clearable
          class="dm-learner__select is-status"
          @change="reload"
        >
          <el-option label="练习中" value="in_progress" />
          <el-option label="空闲" value="idle" />
        </el-select>

        <el-select v-model="query.source" placeholder="全部来源" clearable class="dm-learner__select" @change="reload">
          <el-option label="管理员指派" value="assigned" />
          <el-option label="公开加入" value="public" />
        </el-select>
      </div>
    </div>

    <!-- 台账 #2：多选必须配真实批量操作。批量条仅在选中时出现，
         这样默认态工具栏仍是原平台实测的单行 32 高，不被多出一个按钮撑高。 -->
    <div v-if="selectedIds.length" class="dm-learner__bulk">
      <span class="dm-learner__bulk-count">已选 {{ selectedIds.length }} 人</span>
      <button type="button" class="dm-learner__bulk-btn" :disabled="batchRemoving" @click="batchRemove">
        {{ batchRemoving ? '移出中…' : '批量移出' }}
      </button>
      <button type="button" class="dm-learner__bulk-clear" @click="selectedIds = []">取消选择</button>
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
            <th class="is-check">
              <el-checkbox
                :model-value="pageAllSelected"
                :indeterminate="pagePartiallySelected"
                :disabled="!pageCards.length"
                aria-label="全选当前页学员"
                @update:model-value="toggleAll"
              />
            </th>
            <th>学员姓名</th>
            <th>部门</th>
            <th>来源</th>
            <th>状态</th>
            <th>场景通过</th>
            <th>练习次数</th>
            <th>平均得分</th>
            <!-- 台账 R1-2：训考一体才有分模式均分列；单模式大号即该模式均分，不重复出列。
                 列集合与 studentModeDisplay.studentTableHeaders 同一口径（有单测锁定）。 -->
            <template v-if="isDualMode">
              <th>训练均分</th>
              <th>考核均分</th>
            </template>
            <th class="is-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pageCards" :key="row.userId">
            <td class="is-check">
              <el-checkbox
                :model-value="selectedIds.includes(row.userId)"
                :aria-label="`选择学员 ${row.name}`"
                @update:model-value="toggleRow(row.userId, $event)"
              />
            </td>
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
            <td>{{ practiceCountOf(row) }} 次</td>
            <td>{{ formatScore(averageOf(row)) }}</td>
            <template v-if="isDualMode">
              <td>{{ formatScore(row.trainingAverage) }}</td>
              <td>{{ formatScore(row.examAverage) }}</td>
            </template>
            <td class="is-right">
              <button type="button" class="dm-learner__link" @click="openDetail(row)">查看详情</button>
              <button type="button" class="dm-learner__link" @click="openQuota(row)">考核次数</button>
              <button type="button" class="dm-learner__link is-danger" @click="removeStudent(row)">移出</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !pageCards.length" class="dm-learner__empty">暂无学员</p>
    </div>

    <div class="dm-learner__pager">
      <el-pagination
        layout="total, sizes, prev, pager, next"
        :total="totalCount"
        :page-size="query.size"
        :page-sizes="[10, 20, 50]"
        :current-page="query.page"
        @current-change="onPage"
        @size-change="onSizeChange"
      />
    </div>

    <!-- 名册不可达时筛选无法生效，明确提示而不是静默返回全量 -->
    <p v-if="filterNote" class="dm-learner__filter-note">{{ filterNote }}</p>

    <p class="dm-learner__footnote">场景完成率 100% 的学员无法被催促</p>

    <!-- 添加学员抽屉：SM 名册选择（搜索 + 跨页已选保留） -->
    <el-drawer
      v-model="pickerVisible"
      title="添加学员"
      size="720px"
      append-to-body
      destroy-on-close
      class="exam-drawer"
      @opened="pickerReady = true"
      @closed="pickerReady = false"
    >
      <StudentPickerDrawer
        v-if="pickerReady"
        :theme-id="themeId"
        @added="onAdded"
        @close="pickerVisible = false"
      />
    </el-drawer>

    <!-- 学员详情抽屉（台账 #8）：560px 时表格与指标文字贴边，按内容实际放宽到 680 -->
    <el-drawer v-model="detailVisible" :title="detailTitle" size="680px" class="exam-drawer">
      <StudentDetailDrawer
        v-if="detailVisible && detailUser"
        :theme-id="themeId"
        :user-id="detailUser"
        :dual-mode="isDualMode"
      />
    </el-drawer>

    <!-- 部门筛选抽屉（复用题库模块的部门选择：check 模式 + 勾父级带子级） -->
    <DeptPickerDrawer
      v-if="deptPickerVisible"
      @close="deptPickerVisible = false"
      @confirm="onDeptConfirm"
    />

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
import { getEnterpriseUsers, type EnterpriseDepartment, type EnterpriseUser } from '@/api/sm'
import DeptPickerDrawer from '@/views/exam/queslib/components/DeptPickerDrawer.vue'
import StudentPickerDrawer from './StudentPickerDrawer.vue'
import StudentDetailDrawer from './StudentDetailDrawer.vue'
import { comingSoon } from './ui'
import {
  averageOf as modeAverage,
  formatScore as modeFormatScore,
  isDualMode as modeIsDual,
  practiceCountOf as modePracticeCount
} from './studentModeDisplay'

const props = defineProps<{
  themeId: string
  /** 主题模式（1日常训练 2通关考核 3训考一体）：决定均分/次数是否分模式呈现 */
  themeMode: number
}>()

/** 训考一体：均分与次数需同时给出训练/考核两套口径 */
const isDualMode = computed(() => modeIsDual(props.themeMode))

const loading = ref(false)
const batchRemoving = ref(false)
/** 后端返回的当前页记录 */
const cards = ref<StudentCard[]>([])
const serverTotal = ref(0)
const summary = ref<StudentSummary>({
  assignedCount: 0,
  publicCount: 0,
  trainingCount: 0,
  examCount: 0
})
const query = reactive({
  keyword: '',
  source: '',
  practiceStatus: '' as '' | 'in_progress' | 'idle',
  page: 1,
  size: 20
})

// ---------- 部门筛选（台账 #3） ----------
const deptPickerVisible = ref(false)
/**
 * 已选部门（含 deptPath）。AD01 没有 deptId 参数，但支持 userIds：
 * 部门过滤 = 把部门子树展开成成员 userId 集合，再交给服务端分页过滤。
 * 不做前端过滤——否则"翻到第 2 页才过滤"会把后面的学员漏掉。
 */
const selectedDepts = ref<EnterpriseDepartment[]>([])
/** 已选部门子树内的 userId；null = 未按部门筛选 */
const deptUserIds = ref<string[] | null>(null)
/** userId → SM 名册行（姓名/账号/工号/部门），供关键字匹配与部门子树展开 */
const rosterByUser = ref<Record<string, EnterpriseUser>>({})
/** 名册拉取失败标记：与"名册为空"区分，否则会误报"筛选未生效" */
const rosterUnavailable = ref(false)

async function loadRoster() {
  if (Object.keys(rosterByUser.value).length) return
  try {
    // 与 mergeUserNames 相同的分页上限：单主题名单不超过 500 足够
    const page = await getEnterpriseUsers({ page: 1, size: 500 })
    const map: Record<string, EnterpriseUser> = {}
    for (const user of page.list ?? []) map[user.userId] = user
    rosterByUser.value = map
    rosterUnavailable.value = false
  } catch {
    // 名册不可达：展示回落 userId，关键字/部门筛选降级并在 filterNote 里提示
    rosterByUser.value = {}
    rosterUnavailable.value = true
  }
}

/** 部门子树匹配：deptPath 形如 A_B_C，选中 A_B 时 A_B_C 也命中 */
function userIdsOfDepts(depts: EnterpriseDepartment[]): string[] {
  if (!depts.length) return []
  return Object.values(rosterByUser.value)
    .filter((user) =>
      depts.some(
        (dept) =>
          user.deptPath === dept.deptPath || (user.deptPath ?? '').startsWith(`${dept.deptPath}_`),
      ),
    )
    .map((user) => user.userId)
}

function onDeptConfirm(depts: EnterpriseDepartment[]) {
  deptPickerVisible.value = false
  selectedDepts.value = depts
  // 名册不可达时无法把部门展开成成员，此时不套用部门条件（否则会误判成"0 人"），
  // 由 filterNote 明确告知未生效；名册恢复后下一次 load 会自动生效。
  deptUserIds.value = depts.length ? userIdsOfDepts(depts) : null
  query.page = 1
  load()
}

/** 关键字解析出的 userId 集合；null = 未输入关键字 */
const keywordUserIds = ref<string[] | null>(null)

async function resolveKeyword() {
  const needle = query.keyword.trim().toLowerCase()
  if (!needle) {
    keywordUserIds.value = null
    return
  }
  await loadRoster()
  const roster = Object.values(rosterByUser.value)
  if (!roster.length) {
    // 名册不可达时退回后端 userId 模糊搜索（至少能按账号/ID 命中），不让搜索失效
    keywordUserIds.value = null
    return
  }
  keywordUserIds.value = roster
    .filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        (user.account ?? '').toLowerCase().includes(needle) ||
        (user.employeeNo ?? '').toLowerCase().includes(needle) ||
        user.userId.toLowerCase().includes(needle),
    )
    .map((user) => user.userId)
}

/** 关键字与部门都映射成 userId 集合时取交集，保证两个条件同时生效 */
const effectiveUserIds = computed<string[] | null>(() => {
  const kw = keywordUserIds.value
  const dept = deptUserIds.value
  if (kw === null && dept === null) return null
  if (kw === null) return dept
  if (dept === null) return kw
  const deptSet = new Set(dept)
  return kw.filter((id) => deptSet.has(id))
})

/** 名册不可达时姓名/部门筛选无法生效，必须明示而不是静默返回全量 */
const filterNote = computed(() => {
  if (!rosterUnavailable.value) return ''
  const needRoster = Boolean(query.keyword.trim()) || selectedDepts.value.length > 0
  return needRoster ? 'SM 名册不可达：姓名/部门筛选未生效（已按账号关键字兜底）' : ''
})

const pageCards = computed(() => cards.value)
const totalCount = computed(() => serverTotal.value)

const pickerVisible = ref(false)
// 等抽屉 opened 再挂选择器：动画中挂载会让 v-loading 蒙层量到 0 高，数据回来后转圈卸不掉
const pickerReady = ref(false)
const detailVisible = ref(false)
const detailUser = ref('')
const detailTitle = computed(() => `学员详情 · ${detailUser.value}`)
const quotaVisible = ref(false)
const quotaUser = ref<StudentCard | null>(null)
const quotaValue = ref(0)
const quotaReason = ref('')

// ---------- 多选（台账 #2） ----------
const selectedIds = ref<string[]>([])

/** 表头全选只作用于「当前页」；跨页已选保留在 selectedIds（批量操作按 userId 记） */
const pageAllSelected = computed(
  () => pageCards.value.length > 0 && pageCards.value.every((row) => selectedIds.value.includes(row.userId))
)
const pagePartiallySelected = computed(
  () => !pageAllSelected.value && pageCards.value.some((row) => selectedIds.value.includes(row.userId))
)

function toggleRow(userId: string, checked: unknown) {
  const on = Boolean(checked)
  selectedIds.value = on
    ? Array.from(new Set([...selectedIds.value, userId]))
    : selectedIds.value.filter((id) => id !== userId)
}

function toggleAll(checked: unknown) {
  if (Boolean(checked)) {
    const ids = pageCards.value.map((row) => row.userId)
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...ids]))
  } else {
    const pageIds = new Set(pageCards.value.map((row) => row.userId))
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
  }
}

/** 批量移出：逐人调 AD04，单人失败不中断其余人，最后统一报结果 */
async function batchRemove() {
  const targets: StudentCard[] = cards.value.filter((row) => selectedIds.value.includes(row.userId))
  const missing = selectedIds.value.filter((id) => !targets.some((row) => row.userId === id))
  // 跨页选中但不在本批数据的记录：按 id 继续操作，避免"选了却不能批量"
  targets.push(...missing.map((userId) => ({ userId, name: userId } as StudentCard)))
  await ElMessageBox.confirm(
    `确定将选中的 ${selectedIds.value.length} 名学员移出主题？历史练习与报告会保留。`,
    '批量移出主题',
    { type: 'warning' }
  )
  batchRemoving.value = true
  let ok = 0
  const failed: string[] = []
  try {
    for (const row of targets) {
      try {
        await removeThemeStudent(props.themeId, row.userId)
        ok += 1
      } catch (e) {
        failed.push(`${row.name || row.userId}: ${e instanceof Error ? e.message : '未知错误'}`)
      }
    }
  } finally {
    batchRemoving.value = false
  }
  selectedIds.value = []
  if (failed.length) {
    ElMessage.warning(`已移出 ${ok} 人，${failed.length} 人失败：${failed.slice(0, 3).join('；')}`)
  } else {
    ElMessage.success(`已移出 ${ok} 人`)
  }
  load()
}

async function load() {
  loading.value = true
  try {
    // 关键字/部门都要先解析成 userId 集合（AD01 的服务端过滤参数），再一次性请求：
    // 分页完全由后端负责，避免"本地过滤 + 服务端分页"把后面的学员漏掉。
    await resolveKeyword()
    if (selectedDepts.value.length) {
      await loadRoster()
      deptUserIds.value = userIdsOfDepts(selectedDepts.value)
    }
    const ids = effectiveUserIds.value
    if (ids !== null && ids.length === 0) {
      // 命中 0 人时必须直接清空，不能照传空数组：axios 会把它序列化成不含该参数，
      // 后端就当成"不过滤"返回全量——那正是"搜了却看到所有人"的假过滤。
      cards.value = []
      serverTotal.value = 0
      selectedIds.value = []
      return
    }
    const page = await listThemeStudents(props.themeId, {
      page: query.page,
      size: query.size,
      userIds: ids ?? undefined,
      keyword: keywordUserIds.value === null && query.keyword.trim() ? query.keyword.trim() : undefined,
      practiceStatus: query.practiceStatus || undefined,
      source: query.source || undefined
    })
    // 先用后端原始行渲染（name 回落 userId），再异步补姓名/部门：
    // mergeUserNames 需要 SM 名册，串行等待会让首屏多等一个往返，
    // 而姓名只是展示层补全，不该阻塞"表格行已出现"这个更重要的状态。
    cards.value = page.records ?? []
    serverTotal.value = page.total ?? 0
    if (cards.value[0]?.summary) {
      summary.value = cards.value[0].summary
    }
    void mergeUserNames(cards.value).then((merged) => {
      cards.value = merged
    })
    // 过滤后当前页可能越界（例如删掉最后一条），回退到最后一页
    if (query.page > 1 && !cards.value.length && serverTotal.value > 0) {
      query.page = Math.max(1, Math.ceil(serverTotal.value / query.size))
    }
    // 已移出/已不在列表的 id 从选择集里剔除，避免批量操作带着"看不见的人"
    const aliveIds = new Set(cards.value.map((row) => row.userId))
    selectedIds.value = selectedIds.value.filter((id) => aliveIds.has(id))
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

// ---------- 模式相关展示（台账 R1-2/R1-3/R1-4） ----------
// 口径实现集中在 studentModeDisplay.ts（纯函数 + 单测），组件只负责取字段，
// 避免「列表 / 统计卡 / 详情抽屉」三处各写一份阈值而分叉。
function practiceCountOf(row: StudentCard): number {
  return modePracticeCount({ themeMode: props.themeMode, ...row })
}

function averageOf(row: StudentCard): number | null {
  return modeAverage({ themeMode: props.themeMode, ...row })
}

const formatScore = modeFormatScore

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
    /* 单行 32 高（原平台工具栏实测 32）：筛选区四项与左侧动作在 1253 内容宽内能并存 */
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
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-ink);

      &:hover { border-color: var(--color-accent-deep); background: var(--color-accent-deep); }
  }

  /* 后置功能：明确灰态，不是随机配色 */
  &__urge {
    width: 166px;
    background: var(--color-paper-2);
    color: var(--color-muted);
  }

  &__export {
    width: 127px;
    border-color: var(--color-rule-2);
    background: var(--color-paper);
    color: var(--color-muted);
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
      border: 1px solid var(--color-rule-2);
      border-radius: 4px;
      background: var(--color-paper);
      box-sizing: border-box;
      font-family: inherit;
      font-size: 14px;
      line-height: 22px;
      color: var(--color-ink);
      outline: none;

      &::placeholder { color: var(--color-muted); }
      &:focus { border-color: var(--color-accent); }
    }
  }

  &__search-icon {
    position: absolute;
    top: 9px;
    left: 11px;
    display: flex;
    align-items: center;
    color: var(--color-muted);
    pointer-events: none;
  }

  &__select {
    width: 220px;

    &.is-status { width: 148px; }

    :deep(.el-select__wrapper) {
      min-height: 32px;
      height: 32px;
      border-radius: 4px;
      box-shadow: 0 0 0 1px var(--color-rule-2) inset;
      font-size: 14px;
    }

    :deep(.el-select__placeholder) {
      font-size: 14px;
      color: var(--color-ink-2);
    }
  }

  /* 部门筛选：外观与下拉同高同圆角，保持筛选行等高；选中后加数字与描边反馈 */
  &__filter-btn {
    height: 32px;
    padding: 4px 12px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    background: var(--color-paper);
    box-sizing: border-box;
    font-family: inherit;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-ink-2);
    cursor: pointer;
    white-space: nowrap;

      &:hover { border-color: var(--color-accent); color: var(--color-accent-deep); }
      &.is-active { border-color: var(--color-accent); color: var(--color-accent-deep); background: var(--color-accent-wash); }
  }

  /* 批量操作条：选中后才出现，避免默认态挤占工具栏的单行 32 高标准 */
  &__bulk {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 40px;
    margin-top: 12px;
    padding: 0 12px;
    border: 1px solid color-mix(in oklab, var(--color-accent) 30%, var(--color-paper));
    border-radius: 8px;
    background: var(--color-accent-wash);
    box-sizing: border-box;
    font-size: 13px;
    color: var(--color-accent-deep);
  }

  &__bulk-count {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  &__bulk-btn {
    height: 28px;
    padding: 0 12px;
    border: 1px solid color-mix(in oklab, var(--color-error) 30%, var(--color-paper));
    border-radius: 4px;
    background: var(--color-paper);
    font-family: inherit;
    font-size: 13px;
    line-height: 20px;
    color: var(--color-error);
    cursor: pointer;

      &:hover:not(:disabled) { border-color: var(--color-error); }
      &:disabled { border-color: var(--color-rule-2); color: var(--color-muted); cursor: not-allowed; }
  }

  &__bulk-clear {
    border: 0;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    color: var(--color-accent-deep);
    cursor: pointer;
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
    border: 1px solid var(--color-rule);
    border-radius: 8px;
    background: var(--color-paper);
    box-sizing: border-box;
  }

  &__source-count {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }

  &__table {
    margin-top: 16px;
    border: 1px solid var(--color-rule);
    border-radius: 12px;
    background: var(--color-paper);
    overflow: hidden;

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }

    th {
      height: 50px;
      padding: 14px 16px 13px;
      border-bottom: 1px solid var(--color-rule);
      background: var(--color-paper-2);
      font-size: 14px;
      font-weight: 700;
      line-height: 22px;
      color: var(--color-ink);
      text-align: left;
      white-space: nowrap;
    }

    td {
      height: 72px;
      padding: 14px 16px 13px;
      border-bottom: 1px solid var(--color-rule);
      font-size: 14px;
      line-height: 22px;
      color: var(--color-ink);
      text-align: left;
    }

    tbody tr:hover { background: var(--color-paper-2); }

    .is-right { text-align: right; }

    /* 勾选列收窄到 44px（EP 复选框 14 + 两侧 15），表格列宽同类等宽。
       EP 复选框默认 32 高，会把 50 高的表头顶到 60，故在勾选列内压回内容高 22。 */
    .is-check {
      width: 44px;
      padding-left: 16px;
      padding-right: 0;

      :deep(.el-checkbox) {
        /* 必须 block/flex：行内元素在 14px 行盒里会撑出额外行距，
           把 50 高的表头顶到 52。 */
        display: flex;
        height: 22px;
        margin-right: 0;
      }
    }
  }

  &__name { font-weight: 500; }

  &__account {
    margin-left: 8px;
    font-size: 12px;
    color: var(--color-muted);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 2px 8px;
    border: 1px solid color-mix(in oklab, var(--color-accent) 30%, var(--color-paper));
    border-radius: 4px;
    background: var(--color-accent-wash);
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    color: var(--color-accent-deep);
    white-space: nowrap;

      &.is-public { border-color: color-mix(in oklab, var(--color-success) 30%, var(--color-paper)); background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper)); color: var(--color-success); }
      &.is-running { border-color: color-mix(in oklab, var(--color-warning) 30%, var(--color-paper)); background: color-mix(in oklab, var(--color-warning) 10%, var(--color-paper)); color: var(--color-warning); }
      &.is-idle { border-color: var(--color-rule); background: var(--color-paper-2); color: var(--color-muted); }
  }

  &__link {
    border: 0;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: 14px;
    color: var(--color-accent-deep);
    cursor: pointer;

    & + & { margin-left: 12px; }
      &.is-danger { color: var(--color-error); }
  }

  &__empty {
    margin: 0;
    padding: 48px 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-muted);
  }

  &__pager {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 60px;
    padding: 16px;
    font-size: 14px;
    color: var(--color-ink-2);
  }

  &__filter-note {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    color: var(--color-warning);
    text-align: right;
  }

  &__footnote {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    color: var(--color-muted);
    text-align: right;
  }

  &__hint {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-muted);
  }
}

/* 来源标签：与原平台 source-tag 同规格 */
.dm-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 2px 8px;
  border: 1px solid color-mix(in oklab, var(--color-accent) 30%, var(--color-paper));
  border-radius: 4px;
  background: var(--color-accent-wash);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-accent-deep);
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .dm-learner__sources { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dm-learner__table { overflow-x: auto; }
}
</style>
