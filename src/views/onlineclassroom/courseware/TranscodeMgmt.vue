<template>
  <div class="manage-page">
    <header>
      <button type="button" class="back-btn" @click="router.push('/kng/courseware')">‹</button>
      <h1>转码管理</h1>
    </header>
    <nav class="tabs">
      <button type="button" :class="{ active: tab === 'processing' }" @click="switchTab('processing')">转码中</button>
      <button type="button" :class="{ active: tab === 'failed' }" @click="switchTab('failed')">转码失败</button>
    </nav>
    <div class="manage-toolbar">
      <label>
        <span>⌕</span>
        <input v-model.trim="keyword" placeholder="请输入名称/分类/分享者姓名搜索" @keyup.enter="load(1)" />
      </label>
      <div v-if="tab === 'processing'" class="toolbar-note">
        有 <strong>{{ processingCount }}</strong> 个课程处于转码中 <i>i</i>
      </div>
      <button v-else type="button" class="reason-link" @click="showReasons">查看常见出错原因</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>分类</th>
            <th class="sortable" @click="sortBy('uploadTime')">
              上传日期 <span>{{ orderBy === 'uploadTime' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
            </th>
            <th class="sortable" @click="sortBy('convertedSeconds')">
              已转换时间 <span>{{ orderBy === 'convertedSeconds' ? (orderType === 'asc' ? '↑' : '↓') : '⇅' }}</span>
            </th>
            <th>分享者</th>
            <th>{{ tab === 'failed' ? '失败原因' : '备注' }}</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in displayRecords" :key="row.id">
            <td>{{ row.title }}</td>
            <td>{{ row.catalogName || '--' }}</td>
            <td>{{ row.uploadTime }}</td>
            <td>{{ formatSeconds(row.convertedSeconds) }}</td>
            <td>{{ row.createdByName || '--' }}</td>
            <td>{{ tab === 'failed' ? '--' : row.remark || '--' }}</td>
            <td><button type="button" class="retry-btn" disabled>重试</button></td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="7" class="empty-cell">
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PaginationBar from './components/PaginationBar.vue'
import { getTranscodeList } from '@/api/courseware'

const router = useRouter()
const tab = ref<'processing' | 'failed'>('processing')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const processingCount = ref(0)
const records = ref<Awaited<ReturnType<typeof getTranscodeList>>['records']>([])
const orderBy = ref<'uploadTime' | 'convertedSeconds'>('uploadTime')
const orderType = ref<'asc' | 'desc'>('desc')
const displayRecords = computed(() => {
  const factor = orderType.value === 'asc' ? 1 : -1
  return [...records.value].sort((left, right) => {
    if (orderBy.value === 'convertedSeconds') {
      return (left.convertedSeconds - right.convertedSeconds) * factor
    }
    return left.uploadTime.localeCompare(right.uploadTime) * factor
  })
})

function formatSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0
    ? `${hours}时${minutes}分${rest}秒`
    : minutes > 0 ? `${minutes}分${rest}秒` : `${rest}秒`
}

function switchTab(value: 'processing' | 'failed') {
  tab.value = value
  void load(1)
}

function sortBy(value: 'uploadTime' | 'convertedSeconds') {
  if (orderBy.value === value) orderType.value = orderType.value === 'asc' ? 'desc' : 'asc'
  else {
    orderBy.value = value
    orderType.value = 'desc'
  }
}

function showReasons() {
  window.alert('常见出错原因：文件损坏、格式不支持、文件加密或转码服务暂不可用。')
}

async function load(nextPage?: number) {
  if (nextPage) page.value = nextPage
  const result = await getTranscodeList(
    { page: page.value, pageSize: pageSize.value },
    { tab: tab.value, keyword: keyword.value }
  )
  total.value = result.total
  processingCount.value = result.processingCount
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px 16px;

  > label {
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

.sortable {
  cursor: pointer;
}

.sortable span {
  color: #a2a9b7;
  font-size: 11px;
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

.retry-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;

  &:disabled {
    color: #c2c8d2;
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
