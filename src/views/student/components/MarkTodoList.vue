<template>
  <!--
    学员端「教学任务 → 考试批阅」待办列表（契约 01 §M4，接口 04 §11B.5）。

    <p>与管理端 `MarkUserListPage` 的区别：这是**批阅人视角的精简版**——
    管理端按「某场考试下的所有答卷」组织，这里按「我要批的卷」平铺，
    不带考试筛选（待办本身就是跨考试的）。
  -->
  <div class="mark-todo">
    <header class="todo-head">
      <h3 class="todo-title">考试批阅</h3>
      <span class="todo-count">
        待批阅 <strong>{{ pendingCount }}</strong>
      </span>
    </header>

    <el-skeleton v-if="loading" :rows="4" animated />

    <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

    <el-empty v-else-if="!rows.length" description="暂无待批阅的答卷" :image-size="88" />

    <ul v-else class="todo-list">
      <li v-for="row in rows" :key="row.attemptId" class="todo-item">
        <div class="item-main">
          <div class="item-line">
            <span class="item-name">{{ row.fullname || '--' }}</span>
            <span class="item-dept">{{ row.deptName || '--' }}</span>
            <span v-if="isPending(row)" class="item-tag">待批阅</span>
            <span v-else class="item-tag is-done">已批阅</span>
          </div>
          <div class="item-sub">
            <span class="item-arrange">{{ row.arrangeName }}</span>
            <span class="item-time">提交 {{ formatTime(row.submitAt) }}</span>
            <span v-if="!isPending(row)" class="item-score">得分 {{ formatScore(row.score) }}</span>
          </div>
        </div>
        <el-button type="primary" plain class="item-btn" @click="openMark(row)">
          {{ buttonText(row) }}
        </el-button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * 批阅待办列表（学员端「教学任务」tab 内）。
 *
 * <p>**为什么复用 `markModel.markActionText` 而不自己写按钮文案**：
 * 管理端批阅列表与这里显示的是同一份数据、同一个动作，
 * 两处各写一份文案必然漂移（比如一处说「批阅」、一处说「继续批阅」），
 * 批阅人看到不同措辞会怀疑是不是两个功能。
 *
 * <p>**为什么待办也允许点进已批阅的卷**：DER-14 之后批阅页就是同一套 `grading` 模式，
 * 已批阅的卷进去是「重新批阅」（申诉/纠错场景）。后端 `MarkServiceImpl.submit`
 * 支持重复提交并重算总分，前端不需要为「已批阅」单独做一个只读入口。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listStudentMarkTodo } from '@/api/studentExam'
import type { StudentMarkTodoItem } from '@/types/studentExam'
import { markActionText, sortBySubmitTime } from '@/views/exam/mark/markModel'
import { toast } from '@/utils/toast'

const router = useRouter()

const rows = ref<StudentMarkTodoItem[]>([])
const loading = ref(true)
const error = ref('')

/** 待批阅 = markStatus 为 0 或缺省（后端未下发时按待批阅算，宁可多显示不可漏） */
const isPending = (row: StudentMarkTodoItem) => (row.markStatus ?? 0) === 0

const pendingCount = computed(() => rows.value.filter(isPending).length)

const buttonText = (row: StudentMarkTodoItem) => markActionText({ markStatus: row.markStatus ?? 0 })

const formatTime = (value: string | null) => (value ? value.slice(0, 16) : '--')

const formatScore = (value: number | null) =>
  value === null || value === undefined ? '--' : String(value)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await listStudentMarkTodo()
    // 按提交时间倒序：最近交的卷通常最该先批
    rows.value = sortBySubmitTime(data.records ?? [])
  } catch (e) {
    error.value = e instanceof Error ? e.message : '待办加载失败'
  } finally {
    loading.value = false
  }
}

/** 进入批阅页。已批阅的也走同一路由（后端支持重新批阅），只是按钮文案不同。 */
const openMark = (row: StudentMarkTodoItem) => {
  if (!row.attemptId) {
    toast.warn('答卷标识缺失，无法打开')
    return
  }
  router.push(`/exam/mark/paper/${row.attemptId}`)
}

onMounted(load)
</script>

<style scoped lang="scss">
.mark-todo {
  padding: 0;
}

.todo-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.todo-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-ink);
}

.todo-count {
  font-size: 13px;
  color: var(--color-muted);

  strong {
    color: var(--color-error);
    font-weight: 500;
  }
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 卡片式列表行：与管理端表格相比更轻，因为学员端这里是「待办」不是「数据表」 */
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-paper-2);
  border-radius: 4px;
}

.item-main {
  min-width: 0;
}

.item-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  white-space: nowrap;
}

.item-dept {
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 待批阅用橙、已批阅用灰：橙色提示「还需要我动手」，不与错误红混淆 */
.item-tag {
  flex: none;
  padding: 0 6px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-warning);
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  border-radius: 2px;

  &.is-done {
    color: var(--color-muted);
    background: var(--color-paper-2);
  }
}

.item-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.item-arrange {
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-btn {
  flex: none;
}
</style>
