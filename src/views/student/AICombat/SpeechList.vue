<template>
  <div class="speech-list">
    <!-- FP-01 三入口 Tab -->
    <div class="tab-bar">
      <div class="tab-item active">话术训练</div>
      <div class="tab-item disabled" title="暂未开放">演讲训练</div>
      <div class="tab-item disabled" title="暂未开放">实战演练</div>
    </div>

    <!-- FP-02 筛选栏（无分类下拉） -->
    <div class="filter-card">
      <div class="filter-left">
        <!-- 状态下拉 -->
        <div class="custom-select" :class="{ open: statusOpen }">
          <div class="select-trigger" @click.stop="toggleSelect('status')">
            <span :class="{ placeholder: !filter.status }">{{ statusLabel }}</span>
            <span class="chevron">▾</span>
          </div>
          <div v-if="statusOpen" class="select-dropdown" @click.stop>
            <div
              v-for="opt in statusOptions"
              :key="opt.value"
              class="select-option"
              :class="{ selected: filter.status === opt.value }"
              @click="chooseStatus(opt.value)"
            >
              {{ opt.label }}
            </div>
          </div>
        </div>
        <!-- 类型下拉 -->
        <div class="custom-select" :class="{ open: typeOpen }">
          <div class="select-trigger" @click.stop="toggleSelect('type')">
            <span :class="{ placeholder: filter.projectType === undefined }">{{ typeLabel }}</span>
            <span class="chevron">▾</span>
          </div>
          <div v-if="typeOpen" class="select-dropdown" @click.stop>
            <div
              v-for="opt in typeOptions"
              :key="opt.value"
              class="select-option"
              :class="{ selected: filter.projectType === opt.value }"
              @click="chooseType(opt.value)"
            >
              {{ opt.label }}
            </div>
          </div>
        </div>
      </div>
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="请输入名称搜索"
          @keyup.enter="doSearch"
        />
        <span class="search-icon" @click="doSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#999" stroke-width="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#999" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
      </div>
    </div>

    <!-- FP-03 项目卡片网格 -->
    <div v-if="list.length" class="card-grid">
      <div v-for="item in list" :key="item.projectId" class="project-card" @click="goDetail(item)">
        <div class="card-cover">
          <img v-if="item.coverImage" :src="item.coverImage" alt="" class="cover-img" />
          <!-- 默认封面：蓝色渐变 + 双对话气泡 -->
          <div v-else class="cover-default">
            <svg width="88" height="72" viewBox="0 0 88 72" fill="none">
              <path d="M8 8h44a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H24l-10 10V44H8a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Z" transform="translate(4 4)" fill="#ffffff" fill-opacity="0.9"/>
              <path d="M44 24h36a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-4v8l-9-8H44a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8Z" fill="#8FC7FF" fill-opacity="0.85"/>
              <circle cx="24" cy="28" r="3" fill="#4A7DFF"/>
              <circle cx="36" cy="28" r="3" fill="#4A7DFF"/>
              <circle cx="48" cy="28" r="3" fill="#4A7DFF"/>
              <circle cx="50" cy="48" r="3" fill="#fff"/>
              <circle cx="62" cy="48" r="3" fill="#fff"/>
              <circle cx="74" cy="48" r="3" fill="#fff"/>
            </svg>
          </div>
          <!-- 左上角类型徽标 -->
          <span class="badge-type" :class="item.projectType === 1 ? 'exam' : 'train'">
            {{ item.projectType === 1 ? '考' : '训练' }}
          </span>
          <!-- 右上角已完成徽标 -->
          <span v-if="item.completed" class="badge-done">已完成</span>
        </div>
        <div class="card-body">
          <div class="card-title" :title="item.name">{{ item.name }}</div>
          <div class="card-time">{{ fmtTime(item.startTime) }} 至 {{ fmtTime(item.endTime) }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <rect x="30" y="40" width="60" height="50" rx="4" fill="#e8e8e8" stroke="#d9d9d9" stroke-width="2"/>
        <rect x="40" y="30" width="40" height="20" rx="4" fill="#f5f5f5" stroke="#d9d9d9" stroke-width="2"/>
        <circle cx="60" cy="65" r="10" fill="#d9d9d9"/>
      </svg>
      <p class="empty-text">暂无数据</p>
    </div>

    <!-- FP-04 分页 -->
    <div v-if="total > 0" class="pagination-bar">
      <span class="total-text">共 {{ total }} 条</span>
      <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
      <button
        v-for="p in totalPages"
        :key="p"
        class="page-btn"
        :class="{ active: p === page }"
        @click="changePage(p)"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getStudentProjects } from '@/api/student'
import type { StudentProjectCard } from '@/types/student'

const router = useRouter()

const tabsPlaceholder = ['演讲训练', '实战演练']

// 筛选状态
const filter = reactive({
  status: 'ongoing' as 'not_started' | 'ongoing' | 'expired' | 'finished',
  projectType: undefined as number | undefined
})
const searchKeyword = ref('')
const appliedKeyword = ref('')

const statusOptions = [
  { label: '未开始', value: 'not_started' as const },
  { label: '进行中', value: 'ongoing' as const },
  { label: '已过期', value: 'expired' as const },
  { label: '已结束', value: 'finished' as const }
]
const typeOptions = [
  { label: '训练', value: 0 },
  { label: '考核', value: 1 }
]

const statusLabel = computed(
  () => statusOptions.find((o) => o.value === filter.status)?.label ?? '进行中'
)
const typeLabel = computed(() =>
  filter.projectType === undefined ? '类型' : typeOptions.find((o) => o.value === filter.projectType)?.label ?? '类型'
)

// 下拉开关
const statusOpen = ref(false)
const typeOpen = ref(false)
const toggleSelect = (which: 'status' | 'type') => {
  if (which === 'status') {
    statusOpen.value = !statusOpen.value
    typeOpen.value = false
  } else {
    typeOpen.value = !typeOpen.value
    statusOpen.value = false
  }
}
const closeDropdowns = () => {
  statusOpen.value = false
  typeOpen.value = false
}

const chooseStatus = (v: typeof filter.status) => {
  filter.status = v
  statusOpen.value = false
  page = 1
  fetchList()
}
const chooseType = (v: number | undefined) => {
  filter.projectType = v
  typeOpen.value = false
  page = 1
  fetchList()
}
const doSearch = () => {
  appliedKeyword.value = searchKeyword.value.trim()
  page = 1
  fetchList()
}

// 列表数据
const list = ref<StudentProjectCard[]>([])
const total = ref(0)
const pageSize = 20
let page = 1
const loading = ref(false)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function fetchList() {
  loading.value = true
  try {
    const data = await getStudentProjects({
      page,
      pageSize,
      status: filter.status,
      projectType: filter.projectType,
      keyword: appliedKeyword.value || undefined
    })
    list.value = data.records ?? []
    total.value = data.total ?? 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value || p === page) return
  page = p
  fetchList()
}

const goDetail = (item: StudentProjectCard) => {
  router.push(`/sparring/web/script/detail/${item.projectId}`)
}

/** 展示时间去掉秒：yyyy-MM-dd HH:mm:ss → yyyy-MM-dd HH:mm（对齐原平台） */
const fmtTime = (t: string) => (t ? t.slice(0, 16) : '')

onMounted(() => {
  document.addEventListener('click', closeDropdowns)
  fetchList()
})
onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
})
</script>

<script lang="ts">
export default { name: 'SpeechList' }
</script>

<style scoped lang="scss">
$primary: #2e7cf6;

.speech-list {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-height: calc(100vh - 60px - 48px);
  display: flex;
  flex-direction: column;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  gap: 40px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 20px;

  .tab-item {
    padding: 12px 0;
    font-size: 16px;
    color: #333;
    cursor: pointer;
    position: relative;

    &.active {
      color: $primary;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: $primary;
      }
    }

    &.disabled {
      color: #bbb;
      cursor: not-allowed;
    }
  }
}

/* 筛选卡 */
.filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  margin-bottom: 20px;
}

.filter-left {
  display: flex;
  gap: 12px;
}

.custom-select {
  position: relative;
  width: 140px;

  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    padding: 0 12px;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    background: #fff;

    .placeholder {
      color: #999;
    }

    .chevron {
      font-size: 10px;
      color: #999;
      transition: transform 0.2s;
    }
  }

  &.open .select-trigger .chevron {
    transform: rotate(180deg);
  }

  .select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 20;
    padding: 4px 0;
    max-height: 240px;
    overflow-y: auto;

    .select-option {
      padding: 8px 12px;
      font-size: 14px;
      color: #606266;
      cursor: pointer;

      &:hover {
        background: #f5f7fa;
      }

      &.selected {
        color: $primary;
        font-weight: 500;
      }
    }
  }
}

.search-box {
  display: flex;
  align-items: center;
  width: 220px;
  height: 34px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 0 10px;
  background: #fff;

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    color: #333;

    &::placeholder {
      color: #999;
    }
  }

  .search-icon {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 2px;
  }
}

/* 卡片网格 */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  flex: 1;
}

.project-card {
  width: 280px;
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    box-shadow: 0 6px 16px rgba(46, 124, 246, 0.15);
    transform: translateY(-2px);
  }
}

.card-cover {
  position: relative;
  height: 160px;

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-default {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #4a7dff 0%, #2e5cd8 60%, #1e3fa8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .badge-type {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #fff;
    line-height: 1.4;

    &.train {
      background: rgba(46, 124, 246, 0.92);
    }

    &.exam {
      background: rgba(255, 122, 26, 0.92);
    }
  }

  .badge-done {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #fff;
    background: rgba(56, 178, 92, 0.92);
  }
}

.card-body {
  padding: 12px 14px 14px;

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #222;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-time {
    margin-top: 6px;
    font-size: 12px;
    color: #999;
  }
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;

  .empty-text {
    font-size: 14px;
    color: #999;
  }
}

/* 分页 */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 20px;

  .total-text {
    font-size: 13px;
    color: #666;
    margin-right: 8px;
  }

  .page-btn {
    min-width: 30px;
    height: 30px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    color: #606266;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;

    &:hover:not(:disabled):not(.active) {
      color: $primary;
      border-color: #c6e2ff;
      background: #ecf5ff;
    }

    &.active {
      color: $primary;
      border-color: $primary;
    }

    &:disabled {
      color: #c0c4cc;
      cursor: not-allowed;
    }
  }
}
</style>
