<template>
  <div class="manage-page">
    <header>
      <el-button class="back-btn" @click="router.push('/kng/courseware')">‹</el-button>
      <h1>转码管理</h1>
    </header>
    <nav class="tabs">
      <el-button
        :class="{ active: tab === 'processing' }"
        @click="switchTab('processing')"
      >
        转码中
      </el-button>
      <el-button :class="{ active: tab === 'failed' }" @click="switchTab('failed')">
        转码失败
      </el-button>
    </nav>
    <div class="manage-toolbar">
      <el-input
        v-model.trim="keyword"
        class="manage-search"
        placeholder="请输入名称/分类/分享者姓名搜索"
        clearable
        @keyup.enter="load(1)"
      >
        <template #prefix>⌕</template>
      </el-input>
      <div v-if="tab === 'processing'" class="toolbar-note">
        有 <strong>{{ processingTotal }}</strong> 个课程处于转码中 <i>i</i>
      </div>
      <el-button v-else class="reason-link" @click="showReasons">
        查看常见出错原因
      </el-button>
    </div>
    <div class="table-wrap">
      <el-table :data="displayRecords" row-key="id" class="media-table" empty-text="暂无数据">
        <el-table-column prop="coursewareTitle" label="名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="分类" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.catalogName || '--' }}</template>
        </el-table-column>
        <el-table-column label="上传日期" width="170">
          <template #header>
            <el-button link @click="sortBy('createdAt')">
              上传日期
              <span>{{ orderBy === 'createdAt' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
            </el-button>
          </template>
          <template #default="{ row }">{{ row.createdAt || '--' }}</template>
        </el-table-column>
        <el-table-column label="已转换时间" width="150">
          <template #header>
            <el-button link @click="sortBy('elapsed')">
              已转换时间
              <span>{{ orderBy === 'elapsed' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
            </el-button>
          </template>
          <template #default="{ row }">{{ formatSeconds(liveElapsed(row)) }}</template>
        </el-table-column>
        <el-table-column label="分享者" width="130">
          <template #default="{ row }">{{ row.createdByName || '--' }}</template>
        </el-table-column>
        <el-table-column :label="tab === 'failed' ? '失败原因' : '备注'" min-width="220">
          <template #default="{ row }">
            <span v-if="tab === 'failed'" class="error-cell" :title="row.error || ''">
              {{ truncateError(row.error) }}
            </span>
            <span v-else>--</span>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PaginationBar from './components/PaginationBar.vue'
import { retryMediaJob, listMediaJobs, type MediaJobItem, type MediaJobTab } from '@/api/media'
import { toast } from '@/utils/toast'

const router = useRouter()
const tab = ref<MediaJobTab>('processing')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
// "有 N 个课程处于转码中"固定取 processing tab 的 total；
// 当前在失败 tab 时用一条 silent 的 pageSize=1 查询补齐该数字
const processingTotal = ref(0)
const records = ref<MediaJobItem[]>([])
const retryingId = ref('')

/**
 * "已转换时间"实现决策（02 §5 两个方案二选一）：选 **前端自算 + 30s 跳动**。
 * now 每 30s 更新一次触发重渲染，running 行耗时 = now - startedAt（本地毫秒差，精确到秒）；
 * 不起服务端轮询的原因：耗时的精度需求只有分钟级，自算零请求开销；
 * 行是否移出 tab（转码成功/失败）仍由用户下次进入页面或刷新时感知。
 */
const nowTick = ref(Date.now())
let tickTimer: number | null = null

const orderBy = ref<'createdAt' | 'elapsed'>('createdAt')
const orderType = ref<'asc' | 'desc'>('desc')

// 服务端 "yyyy-MM-dd HH:mm:ss" 按本地时区解析（与后端同为服务器本地时间口径）
function parseServerTime(value: string | null): number | null {
  if (!value) return null
  const timestamp = new Date(value.replace(' ', 'T')).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

/** 行耗时：running/pending 行按 startedAt 实时自算（pending 无 startedAt 时记 0）；
 *  已终结行直接用后端快照 elapsedSeconds */
function liveElapsed(row: MediaJobItem): number {
  if (row.status === 0 || row.status === 1) {
    const started = parseServerTime(row.startedAt)
    if (started === null) return 0
    return Math.max(0, Math.floor((nowTick.value - started) / 1000))
  }
  return row.elapsedSeconds ?? 0
}

/** 失败原因列：当前页本地排序用（保持骨架原有的点击表头排序交互） */
const sortValue = (row: MediaJobItem) =>
  orderBy.value === 'elapsed' ? liveElapsed(row) : (parseServerTime(row.createdAt) ?? 0)

const displayRecords = computed(() => {
  const factor = orderType.value === 'asc' ? 1 : -1
  return [...records.value].sort((left, right) => (sortValue(left) - sortValue(right)) * factor)
})

function formatSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0
    ? `${hours}时${minutes}分${rest}秒`
    : minutes > 0
      ? `${minutes}分${rest}秒`
      : `${rest}秒`
}

// 失败原因截断展示（约 30 字符），悬浮 title 看全量（error 最长 2000 字符）
function truncateError(error: string | null) {
  const text = error || '--'
  return text.length > 30 ? `${text.slice(0, 30)}…` : text
}

function switchTab(value: MediaJobTab) {
  tab.value = value
  void load(1)
}

function sortBy(value: 'createdAt' | 'elapsed') {
  if (orderBy.value === value) orderType.value = orderType.value === 'asc' ? 'desc' : 'asc'
  else {
    orderBy.value = value
    orderType.value = 'desc'
  }
}

/** "查看常见出错原因"静态提示弹窗（原平台文案照原样推断，仅提示） */
function showReasons() {
  toast.warn('常见出错原因：文件损坏、格式不支持、文件加密或转码服务暂不可用。')
}

/** 重试失败任务：成功后后端重置回 pending，当前行会移出失败 tab，刷新列表即可 */
async function retry(row: MediaJobItem) {
  retryingId.value = row.id
  try {
    await retryMediaJob(row.id)
    toast.info('已重新发起转码')
    await load()
  } finally {
    retryingId.value = ''
  }
}

async function load(nextPage?: number) {
  if (nextPage) page.value = nextPage
  const result = await listMediaJobs(
    { page: page.value, pageSize: pageSize.value },
    { type: 1, tab: tab.value, keyword: keyword.value },
  )
  total.value = result.total
  if (tab.value === 'processing') processingTotal.value = result.total
  records.value = result.records
  // 失败 tab 下补查转码中 total（silent，失败不打扰用户）
  if (tab.value === 'failed') {
    try {
      const processing = await listMediaJobs(
        { page: 1, pageSize: 1 },
        { type: 1, tab: 'processing', keyword: '' },
        { silent: true },
      )
      processingTotal.value = processing.total
    } catch {
      /* 辅助数字查询失败时保持旧值 */
    }
  }
}

onMounted(() => {
  void load()
  // 30s 跳动：驱动 running 行的"已转换时间"重算（见 nowTick 注释）
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (tickTimer !== null) window.clearInterval(tickTimer)
})
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px 16px;

}

.manage-search {
  width: 350px;

  :deep(.el-input__wrapper) {
    min-height: 38px;
    border-radius: 5px;
  }
}

.toolbar-note,
.reason-link {
  color: #667085;
  font-size: 13px;

  strong {
    color: #2e7cf6;
    font-size: 18px;
  }

  i {
    width: 14px;
    height: 14px;
    display: inline-grid;
    place-items: center;
    border: 1px solid #b8c0cd;
    border-radius: 50%;
    font-size: 9px;
    font-style: normal;
  }
}

.reason-link {
  border: none;
  background: transparent;
  color: #2e7cf6;
  cursor: pointer;
}

.table-wrap {
  padding: 0 24px;
}

.media-table span {
  color: #a2a9b7;
  font-size: 11px;
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
