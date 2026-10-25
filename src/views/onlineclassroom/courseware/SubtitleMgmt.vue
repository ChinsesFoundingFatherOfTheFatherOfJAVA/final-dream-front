<template>
  <div class="manage-page">
    <header>
      <el-button class="back-btn" aria-label="返回课件管理" @click="router.push('/kng/courseware')">‹</el-button>
      <h1>字幕管理</h1>
    </header>
    <nav class="tabs">
      <el-button
        :class="{ active: tab === 'processing' }"
        @click="switchTab('processing')"
      >
        识别中
      </el-button>
      <el-button :class="{ active: tab === 'failed' }" @click="switchTab('failed')">
        识别失败
      </el-button>
    </nav>
    <div class="manage-toolbar">
      <el-input
        v-model.trim="keyword"
        class="manage-search"
        placeholder="请输入名称/分类/操作人"
        clearable
        @keyup.enter="load(1)"
      >
        <template #prefix><span aria-hidden="true"><el-icon><Search /></el-icon></span></template>
      </el-input>
    </div>
    <div class="table-wrap">
      <el-table :data="records" row-key="id" class="media-table" empty-text="暂无数据">
        <el-table-column prop="coursewareTitle" label="名称" min-width="240" show-overflow-tooltip />
        <el-table-column label="分类" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.catalogName || '--' }}</template>
        </el-table-column>
        <el-table-column label="开始时间" width="170">
          <template #default="{ row }">{{ row.createdAt || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作人" width="140">
          <template #default="{ row }">{{ row.createdByName || '--' }}</template>
        </el-table-column>
        <el-table-column v-if="tab === 'failed'" label="失败原因" min-width="240">
          <template #default="{ row }">
            <span class="error-cell" :title="row.error || ''">{{ truncateError(row.error) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="tab === 'failed'"
              link
              type="primary"
              :disabled="retryingId === row.id"
              @click="retry(row)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
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
import { Search } from '@element-plus/icons-vue'
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
}

.manage-search {
  width: 350px;

  :deep(.el-input__wrapper) {
    min-height: 38px;
    border-radius: 5px;
  }
}

.table-wrap {
  padding: 0 24px;
}

.media-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 46px;
    background: #f8fafc;
    color: #30384a;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 46px;
    color: #4d5568;
    font-size: 13px;
  }
}

.error-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e05a4e;
}

</style>
