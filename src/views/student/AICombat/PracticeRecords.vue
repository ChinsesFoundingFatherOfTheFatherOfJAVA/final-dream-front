<template>
  <div class="practice-records">
    <!-- 页头：返回 + 项目名标题 -->
    <div class="page-header">
      <span
        class="back-btn"
        role="button"
        tabindex="0"
        aria-label="返回"
        @click="goBack"
        @keydown.enter.prevent="goBack"
      >‹</span>
      <span class="page-title">{{ projectName || '练习记录' }}</span>
    </div>

    <div class="records-card">
      <div class="records-table">
        <!-- 表头 -->
        <div class="table-row table-head">
          <div class="col-time">练习时间</div>
          <div class="col-status">状态</div>
          <div class="col-score">得分</div>
          <div class="col-rounds">对话轮次</div>
          <div class="col-duration">练习时长</div>
          <div class="col-action">操作</div>
        </div>
        <!-- 数据行 -->
        <div v-for="item in records" :key="item.sessionId" class="table-row">
          <div class="col-time">{{ item.startTime }}</div>
          <div class="col-status">
            <span class="status-tag" :class="item.status === 1 ? 'done' : 'undone'">
              {{ item.status === 1 ? '已完成' : '未完成' }}
            </span>
          </div>
          <div class="col-score">{{ item.totalScore != null ? item.totalScore : '—' }}</div>
          <div class="col-rounds">{{ item.roundCount }}</div>
          <div class="col-duration">{{ formatDuration(item.durationSeconds) }}</div>
          <div class="col-action">
            <span
              v-if="item.status === 1"
              class="view-report-link"
              role="button"
              tabindex="0"
              @click="viewReport(item.sessionId)"
              @keydown.enter.prevent="viewReport(item.sessionId)"
            >查看报告</span>
            <span v-else class="no-action">—</span>
          </div>
        </div>
        <!-- 空态 -->
        <div v-if="!loading && !records.length" class="empty-state">暂无练习记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPracticeRecords, getStudentProjectDetail } from '@/api/student'
import type { PracticeRecord } from '@/types/student'

const route = useRoute()
const router = useRouter()
const projectId = route.params.projectId as string

const records = ref<PracticeRecord[]>([])
const projectName = ref('')
const loading = ref(true)

const goBack = () => router.push(`/sparring/web/script/detail/${projectId}`)
const viewReport = (sessionId: string) => {
  router.push(`/sparring/standpracticereport?sessionId=${sessionId}`)
}

/** 秒 → mm:ss */
const formatDuration = (seconds: number | null) => {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

onMounted(async () => {
  try {
    const [list, detail] = await Promise.all([
      getPracticeRecords(projectId),
      getStudentProjectDetail(projectId).catch(() => null)
    ])
    records.value = list ?? []
    if (detail) projectName.value = detail.name
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.practice-records {
  max-width: 1080px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .back-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-paper);
    border: 1px solid var(--color-paper-2);
    color: var(--color-ink);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;

    &:hover {
      color: var(--color-accent);
      border-color: var(--color-accent);
    }

    // 图标返回按钮：补键盘焦点环
    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink);
  }
}

.records-card {
  background: var(--color-paper);
  border-radius: 12px;
  padding: 8px 24px 20px;
  box-shadow: 0 1px 6px color-mix(in oklab, var(--color-graphite) 4%, transparent);
}

.records-table {
  width: 100%;
  font-size: 14px;
}

.table-row {
  display: flex;
  align-items: center;
  padding: 14px 8px;
  border-bottom: 1px solid var(--color-paper-2);
  color: var(--color-ink-2);

  &.table-head {
    color: var(--color-muted);
    font-size: 13px;
    border-bottom: 1px solid var(--color-paper-2);
  }
}

.table-row > div {
  padding: 0 4px;
}

.col-time { width: 24%; }
.col-status { width: 12%; }
.col-score { width: 12%; }
.col-rounds { width: 14%; }
.col-duration { width: 14%; }
.col-action { width: 12%; }

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;

  &.done {
    color: var(--color-success);
    background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper));
  }

  &.undone {
    color: var(--color-muted);
    background: var(--color-paper-2);
  }
}

.view-report-link {
  color: var(--color-accent);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

.no-action {
  color: var(--color-rule-2);
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
}
</style>
