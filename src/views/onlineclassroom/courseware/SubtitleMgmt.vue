<template>
  <div class="manage-page">
    <header>
      <button type="button" class="back-btn" @click="router.push('/kng/courseware')">‹</button>
      <h1>字幕管理</h1>
    </header>
    <nav class="tabs">
      <button
        type="button"
        :class="{ active: tab === 'processing' }"
        @click="switchTab('processing')"
      >
        识别中
      </button>
      <button type="button" :class="{ active: tab === 'failed' }" @click="switchTab('failed')">
        识别失败
      </button>
    </nav>
    <div class="manage-toolbar">
      <label>
        <span>⌕</span>
        <input v-model.trim="keyword" placeholder="请输入名称/分类/操作人" @keyup.enter="load(1)" />
      </label>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>分类</th>
            <th>开始时间</th>
            <th>操作人</th>
            <th v-if="tab === 'failed'">失败原因</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in records" :key="row.id">
            <td>{{ row.coursewareTitle }}</td>
            <td>{{ row.catalogName || '--' }}</td>
            <!-- 字幕管理页"开始时间"= job 的 createdAt（03 §2 说明） -->
            <td>{{ row.createdAt || '--' }}</td>
            <td>{{ row.createdByName || '--' }}</td>
            <td v-if="tab === 'failed'" class="error-cell" :title="row.error || ''">
              {{ truncateError(row.error) }}
            </td>
            <td>
              <!-- 识别失败行【重试】：subtitle job 按断点 stage 续跑，成功后移回识别中 tab -->
              <button
                v-if="tab === 'failed'"
                type="button"
                class="retry-btn"
                :disabled="retryingId === row.id"
                @click="retry(row)"
              >
                重试
              </button>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td :colspan="tab === 'failed' ? 6 : 5" class="empty-cell">
              <div class="empty-folder">▱</div>
              <span>暂无数据</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="total"
      @change="load()"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PaginationBar from './components/PaginationBar.vue'
import { listMediaJobs, retryMediaJob, type MediaJobItem, type MediaJobTab } from '@/api/media'
import { toast } from '@/utils/toast'

const router = useRouter()
const tab = ref<MediaJobTab>('processing')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const records = ref<MediaJobItem[]>([])
const retryingId = ref('')

// 失败原因截断展示（约 30 字符），悬浮 title 看全量（error 最长 2000 字符）
function truncateError(error: string | null) {
  const text = error || '--'
  return text.length > 30 ? `${text.slice(0, 30)}…` : text
}

function switchTab(value: MediaJobTab) {
  tab.value = value
  void load(1)
}

/** 重试失败的字幕任务：后端按断点 stage 续跑并重置回 pending，成功后刷新移回识别中 tab */
async function retry(row: MediaJobItem) {
  retryingId.value = row.id
  try {
    await retryMediaJob(row.id)
    toast.info('已重新发起字幕识别')
    await load()
  } finally {
    retryingId.value = ''
  }
}

async function load(nextPage?: number) {
  if (nextPage) page.value = nextPage
  const result = await listMediaJobs(
    { page: page.value, pageSize: pageSize.value },
    { type: 2, tab: tab.value, keyword: keyword.value },
  )
  total.value = result.total
  records.value = result.records
}

onMounted(() => load())
</script>

<style scoped lang="scss">
.manage-page {
  min-height: calc(100vh - 104px);
  display: flex;
  flex-direction: column;
  background: #fff;
}

header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid #e8ecf2;

  h1 {
    margin: 0;
    color: #30384a;
    font-size: 18px;
  }
}

.back-btn {
  border: none;
  background: transparent;
  color: #4d5568;
  font-size: 30px;
  cursor: pointer;
}

.tabs {
  height: 62px;
  display: flex;
  align-items: center;
  gap: 42px;
  padding: 0 24px;
  border-bottom: 1px solid #e8ecf2;

  button {
    position: relative;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: #4d5568;
    font-size: 14px;
    cursor: pointer;

    &.active {
      color: #2e7cf6;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: #2e7cf6;
      }
    }
  }
}

.manage-toolbar {
  padding: 20px 24px 16px;

  label {
    width: 350px;
    height: 38px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 5px;
    color: #98a1b2;

    input {
      min-width: 0;
      flex: 1;
      border: none;
      outline: none;
      color: #394253;
      font-size: 13px;
    }
  }
}

.table-wrap {
  padding: 0 24px;
}

table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    height: 46px;
    padding: 0 12px;
    border-bottom: 1px solid #edf0f5;
    color: #4d5568;
    text-align: left;
    font-size: 13px;
  }

  th {
    background: #f8fafc;
    color: #30384a;
    font-weight: 600;
  }
}

.error-cell {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e05a4e;
}

.retry-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;
  cursor: pointer;

  &:disabled {
    color: #c2c8d2;
    cursor: not-allowed;
  }
}

.empty-cell {
  height: 330px;
  color: #98a1b2;
  text-align: center;
}

.empty-folder {
  margin-bottom: 12px;
  color: #d5dae2;
  font-size: 54px;
}
</style>
