<template>
  <!-- 考试批阅列表（考试维度，契约 01 §M1 / 路由 /exam/mark） -->
  <div class="mark-list-page">
    <div class="filter-row">
      <el-select v-model="arrangeType" class="filter-select" placeholder="全部考试">
        <el-option :value="''" label="全部考试" />
        <el-option :value="1" label="单独安排" />
        <el-option :value="2" label="项目安排" />
      </el-select>

      <el-date-picker
        v-model="dateRange"
        class="filter-date"
        type="daterange"
        range-separator="~"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
      />

      <el-input
        v-model.trim="keyword"
        class="keyword-input"
        placeholder="请输入考试名称搜索"
        clearable
        @keyup.enter="reload(1)"
      />
    </div>

    <div class="table-wrap">
      <el-table
        v-loading="loading"
        :data="rows"
        class="mark-table"
        empty-text="暂无待批阅考试"
        row-key="arrangeId"
      >
        <el-table-column label="考试名称" min-width="240">
          <template #default="{ row }">
            <el-button link type="primary" @click="goUsers(row)">{{ row.name }}</el-button>
          </template>
        </el-table-column>

        <el-table-column label="来源" width="140">
          <template #default="{ row }">{{ arrangeTypeText(row.arrangeType) }}</template>
        </el-table-column>

        <el-table-column label="发布日期" width="140">
          <template #default="{ row }">{{ row.publishAt || '--' }}</template>
        </el-table-column>

        <el-table-column label="安排人数" width="120" prop="participantQty" align="right" />

        <el-table-column label="交卷人数" width="120" prop="submittedQty" align="right" />

        <!-- 「待批阅」列**不加任何高亮**（§9.4 实测 0 与 1 文字色一致、类名同为 is-right） -->
        <el-table-column label="待批阅" width="120" prop="pendingQty" align="right" />

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-list">
              <el-button link type="primary" @click="goUsers(row)">查看详情</el-button>
              <span class="action-sep" aria-hidden="true"></span>
              <el-button link type="primary" @click="quickMark(row)">快速批阅</el-button>
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
 * 批阅列表（管理端「考试批阅」）。
 *
 * <p>与原平台列表的差异：**左侧没有分类树**（§7 实测），直接是筛选 + 表格。
 *
 * <p>「待批阅」列不做高亮：早期文档猜测「有值就标红」，2026-11-10 实测推翻——
 * 0 和 1 的文字颜色一致、类名同为 `is-right`。加高亮会让整列像告警区，
 * 而这里只是普通计数。
 *
 * <p>「来源」显示文案而不是标签：原平台就是纯文本「单独安排」。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listMarkExams } from '@/api/studentExam'
import { toast } from '@/utils/toast'
import type { MarkListItem } from '@/types/studentExam'

const router = useRouter()

const rows = ref<MarkListItem[]>([])
const total = ref(0)
const loading = ref(false)
const pageNo = ref(1)
const pageSize = ref(10)

const keyword = ref('')
const arrangeType = ref<number | ''>('')
const dateRange = ref<[string, string] | null>(null)

/** 来源文案：1=单独安排 / 2=项目安排（与原平台截图一致） */
const arrangeTypeText = (type: number) => {
  if (type === 1) return '单独安排'
  if (type === 2) return '项目安排'
  return '--'
}

const load = async () => {
  loading.value = true
  try {
    const data = await listMarkExams({
      keyword: keyword.value || undefined,
      arrangeType: arrangeType.value === '' ? undefined : arrangeType.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      current: pageNo.value,
      limit: pageSize.value
    })
    rows.value = data?.records ?? []
    total.value = data?.total ?? 0
  } catch {
    // 拦截器已统一提示，这里保留空表 + 总数 0，避免整页空白
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const reload = (page?: number) => {
  if (page) pageNo.value = page
  void load()
}

/** 查看详情 → 该考试的答卷列表（学员维度） */
const goUsers = (row: MarkListItem) => {
  router.push(`/exam/mark/${row.arrangeId}/users`)
}

/**
 * 快速批阅 → 直接进入该考试**第一份待批阅**答卷的批阅页。
 *
 * <p>原平台实测（2026-11-13）：点「快速批阅」直达批阅页 `#/reviewdetail?arrangeId=xxx`，
 * **不经过答卷列表**。原先我方跳到答卷列表让用户再点一次，是两步操作，
 * 批阅人连续批多份时要反复来回（台账 8db9）。
 *
 * <p>`firstPendingAttemptId` 由后端 `/mark/list` 下发（按 submitAt 升序取第一个待批阅）。
 * 为 null 说明该考试暂无待批阅——此时**提示而不跳转**，避免落到空列表页。
 * 不用 `pendingQty` 判断：那是数量，拿它拼不出 URL。
 */
const quickMark = (row: MarkListItem) => {
  const attemptId = row.firstPendingAttemptId
  if (!attemptId) {
    toast.warn('该考试暂无待批阅答卷')
    return
  }
  router.push(`/exam/mark/paper/${attemptId}`)
}

onMounted(load)
</script>

<style scoped lang="scss">
.mark-list-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 16px;
  background: var(--color-paper);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-select {
  width: 160px;
}

.filter-date {
  width: 280px;
}

.keyword-input {
  width: 280px;
}

/* 敢做档表格套件：paper-2 表头 + hairline 行分隔 + hover wash + 单元格 nowrap 挂 .cell（AGENTS.md 8.2） */
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;

  :deep(.el-table) {
    --el-table-header-bg-color: var(--color-paper-2);
    --el-table-header-text-color: var(--color-ink);
    --el-table-border-color: var(--color-rule);
    --el-table-row-hover-bg-color: var(--color-accent-wash);

    th.el-table__cell { font-weight: 500; }
    td.el-table__cell { padding: 10px 0; border-bottom: var(--rule-hair) solid var(--color-paper-3); }
    .cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  }
}

/* 行内计数走 mono 等宽（机器值口径） */
:deep(.el-table) .el-table__cell.is-right .cell {
  font-family: var(--font-outlier);
  font-variant-numeric: tabular-nums;
}

/* 操作列两个文字按钮之间竖分隔线（原平台实测） */
.action-list {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-sep {
  width: 1px;
  height: 14px;
  background: var(--color-rule);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  font-size: 13px;
  color: var(--color-muted);
}
</style>
