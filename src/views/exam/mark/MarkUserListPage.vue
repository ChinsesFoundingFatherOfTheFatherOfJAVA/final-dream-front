<template>
  <!-- 批阅答卷列表（学员维度，契约 01 §M2 / 路由 /exam/mark/:arrangeId/users） -->
  <div class="mark-user-page">
    <header class="page-head">
      <el-button class="back-btn" aria-label="返回批阅列表" @click="goBack">‹</el-button>
      <h1 class="page-title">{{ base?.name || '考试批阅' }}</h1>
      <span v-if="arrangeTypeText" class="source-tag">{{ arrangeTypeText }}</span>
    </header>

    <div class="filter-row">
      <el-select
        v-model="markStatus"
        class="filter-select"
        placeholder="批阅状态"
        @change="reload(1)"
      >
        <el-option :value="''" label="全部状态" />
        <el-option :value="0" label="待批阅" />
        <el-option :value="1" label="已批阅" />
      </el-select>
      <el-input
        v-model.trim="keyword"
        class="keyword-input"
        placeholder="请输入学员姓名搜索"
        clearable
        @keyup.enter="reload(1)"
      />
    </div>

    <div class="table-wrap">
      <el-table
        v-loading="loading"
        :data="visibleRows"
        class="user-table"
        empty-text="暂无答卷"
        row-key="attemptId"
      >
        <el-table-column label="账号" width="130" prop="account" />
        <el-table-column label="姓名" width="120">
          <template #default="{ row }">
            <span class="name-cell">
              <span class="name-text">{{ row.fullname || '--' }}</span>
              <!-- 身份核验异常（2 不通过 / 3 无法核验）必须显眼：批阅人据此判断是否作废答卷 -->
              <el-tooltip v-if="needsIdentityCheck(row.identityStatus)" content="人脸核验未通过或无法核验，请核对身份证件" placement="top">
                <span class="identity-flag" role="img" aria-label="身份待核对">⚠ 身份待核对</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="部门" min-width="160">
          <template #default="{ row }">{{ row.deptName || '--' }}</template>
        </el-table-column>
        <el-table-column label="岗位" width="120">
          <template #default="{ row }">{{ row.positionName || '--' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="170" prop="submitAt" sortable>
          <template #default="{ row }">{{ row.submitAt || '--' }}</template>
        </el-table-column>
        <el-table-column label="考试用时" width="120">
          <template #default="{ row }">{{ formatUsedTime(row.usedSeconds) }}</template>
        </el-table-column>
        <el-table-column label="批阅人" width="120">
          <template #default="{ row }">{{ row.graderNames || '--' }}</template>
        </el-table-column>
        <el-table-column label="批阅时间" width="170">
          <template #default="{ row }">{{ row.gradedAt || '--' }}</template>
        </el-table-column>
        <el-table-column label="得分" width="90" align="right">
          <template #default="{ row }">{{ row.score == null ? '--' : formatScore(row.score) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="action-list">
              <el-button link type="primary" @click="viewPaper(row)">查看</el-button>
              <span class="action-sep" aria-hidden="true"></span>
              <el-button link type="primary" @click="markPaper(row)">
                {{ row.markStatus === 1 ? '重新批阅' : '批阅' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination">
      <span>共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="sizes, prev, pager, next"
        background
        @size-change="reload(1)"
        @current-change="reload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 批阅答卷列表（学员维度）。
 *
 * <p>**同一学员多次作答逐条返回，不合并**（契约 §M2 第一条验收）：
 * 合并会让批阅人看不到历史答卷，而补考/申诉恰恰要看历史。
 *
 * <p>身份核验异常（`identityStatus` 2/3）显示「⚠ 身份待核对」标记（DER-07）：
 * 核验只采集证据不阻断，异常就挂在这条队列上由批阅人核对，必要时走 `status=4 已作废`。
 * 这个标记是整条链路里唯一的人工兜底入口，不能省。
 *
 * <p>「考试用时」用 `formatUsedTime`（`43秒` / `4分` / `5分34秒`），与列表页同一口径。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMarkBase, listMarkUsers } from '@/api/studentExam'
import type { MarkUserItem } from '@/types/studentExam'
import { formatScore, formatUsedTime } from '../student/resultModel'

const route = useRoute()
const router = useRouter()

const arrangeId = String(route.params.arrangeId ?? '')

const base = ref<Record<string, unknown> | null>(null)
const rows = ref<MarkUserItem[]>([])
const total = ref(0)
const loading = ref(false)
const pageNo = ref(1)
const pageSize = ref(10)

/** 从批阅列表可能带 markStatus=0 过来（「快速批阅」），据此初始化筛选 */
const markStatus = ref<number | ''>(
  route.query.markStatus === '0' ? 0 : route.query.markStatus === '1' ? 1 : ''
)
const keyword = ref('')

const arrangeTypeText = computed(() => {
  const type = base.value?.arrangeType
  if (type === 1) return '单独安排'
  if (type === 2) return '项目安排'
  return ''
})

/**
 * 按姓名过滤放在前端：契约 §11B.2 的入参只有 `markStatus`，
 * 没有 keyword。这里不伪造一个后端不认的参数，而是对**当前页**做本地过滤，
 * 并在空结果时如实显示「暂无答卷」——不夸大成一个能搜全库的功能。
 */
const visibleRows = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((row) => (row.fullname || '').includes(kw))
})

/** 身份核验异常：2 不通过 / 3 无法核验（DER-07）。0 未核验与 1 通过不标记。 */
const needsIdentityCheck = (status: number) => status === 2 || status === 3

const load = async () => {
  loading.value = true
  try {
    const data = await listMarkUsers(arrangeId, {
      current: pageNo.value,
      limit: pageSize.value,
      markStatus: markStatus.value === '' ? undefined : markStatus.value
    })
    rows.value = data?.records ?? []
    total.value = data?.total ?? 0
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadBase = async () => {
  try {
    base.value = await getMarkBase(arrangeId)
  } catch {
    // 头部信息取不到时只影响标题，不影响列表
  }
}

const reload = (page?: number) => {
  if (page) pageNo.value = page
  void load()
}

/**
 * 「查看」与「批阅」都进批阅答卷页：
 * 两者差别只是要不要显示打分区，用 query 区分即可，不必为此做两个页面。
 */
const viewPaper = (row: MarkUserItem) => {
  router.push(`/exam/mark/paper/${row.attemptId}?mode=view`)
}

const markPaper = (row: MarkUserItem) => {
  router.push(`/exam/mark/paper/${row.attemptId}`)
}

const goBack = () => router.push('/exam/mark')

onMounted(() => {
  void loadBase()
  void load()
})
</script>

<style scoped lang="scss">
$brand: #436bff;

.mark-user-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 16px;
  background: #fff;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #262626;
  font-size: 16px;
  line-height: 1;

  &:hover {
    border-color: $brand;
    color: $brand;
  }
}

.page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

/* 来源标签：原平台是纯文本小标签，浅灰底 */
.source-tag {
  padding: 0 8px;
  border-radius: 2px;
  background: #f5f5f5;
  color: #595959;
  font-size: 12px;
  line-height: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-select {
  width: 160px;
}

.keyword-input {
  width: 280px;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.name-cell {
  /*
   * 姓名 + 身份标签要能同处一格而不互相挤压（2026-11-13 修）。
   *
   * 原先用 inline-flex 且没设换行：列宽只有 120px，"⚠ 身份待核对" 自带 nowrap
   * 吃掉几乎全部宽度，剩余空间不够放姓名，中文就会被逐字挤成竖排
   * （用户实测：姓名显示成一列单字）。
   *
   * 现在改为可换行的 flex：姓名优先完整显示，标签空间不足时挪到下一行。
   */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

/* 姓名本身绝不拆字：中文逐字换行在表格里既难读也显得像数据错乱 */
.name-text {
  white-space: nowrap;
}

/* 身份待核对：橙色，比红轻一档——它是"请核对"而不是"已判定作弊" */
.identity-flag {
  padding: 0 6px;
  border-radius: 2px;
  background: #fff7e6;
  color: #d46b08;
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
  cursor: help;
}

.action-list {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-sep {
  width: 1px;
  height: 14px;
  background: #e8e8e8;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  font-size: 13px;
  color: #8c8c8c;
}
</style>
