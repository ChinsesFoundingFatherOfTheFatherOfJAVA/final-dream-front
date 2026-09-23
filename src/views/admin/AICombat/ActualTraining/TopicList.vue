<template>
  <div class="topic-list">
    <!-- FP-03 标题区 + 仅一个创建按钮 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">训练主题管理</h2>
        <p class="page-subtitle">管理所有训练主题</p>
      </div>
      <button class="btn-create" @click="goCreate">+ 创建新主题</button>
    </div>

    <!-- FP-04 五个筛选条件（归属/来源为占位，前端不传值） -->
    <div class="filter-bar">
      <select v-model="filters.jurisdiction" class="filter-select" title="归属（占位）">
        <option value="1">我管辖的</option>
        <option value="2">我负责的</option>
      </select>
      <select v-model="filters.status" class="filter-select" @change="fetchList">
        <option value="">所有状态</option>
        <option value="0">草稿</option>
        <option value="1">发布中</option>
        <option value="2">发布失败</option>
        <option value="3">已发布</option>
        <option value="4">已暂停</option>
        <option value="5">已结束</option>
      </select>
      <select v-model="filters.themeMode" class="filter-select" @change="fetchList">
        <option value="">所有模式</option>
        <option value="1">日常训练</option>
        <option value="2">通关考核</option>
        <option value="3">训考一体</option>
      </select>
      <select v-model="filters.sourceType" class="filter-select" title="来源（占位）">
        <option value="">来源</option>
        <option value="1">单独安排</option>
        <option value="2">项目安排</option>
      </select>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="filters.keyword"
          type="text"
          class="search-input"
          placeholder="搜索主题..."
          @keyup.enter="fetchList"
        />
      </div>
    </div>

    <!-- FP-05 主题卡片列表 -->
    <div v-if="loading" class="list-tip">加载中…</div>
    <div v-else-if="themes.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无训练主题</p>
    </div>
    <div v-else class="card-grid">
      <div
        v-for="theme in themes"
        :key="theme.id"
        class="theme-card"
        @click="goToDetail(theme.id)"
      >
        <span class="status-badge" :class="`status-${theme.status}`">{{ ACT_STATUS_TEXT[theme.status] }}</span>
        <h3 class="card-title">{{ theme.themeName }}</h3>
        <p class="card-desc">{{ theme.themeDesc || '暂无描述' }}</p>
        <div class="card-tags">
          <span class="tag-mode">{{ ACT_THEME_MODE_TEXT[theme.themeMode] }}</span>
          <span class="tag-source">{{ theme.sourceType ? ACT_SOURCE_TYPE_TEXT[theme.sourceType] : '单独安排' }}</span>
        </div>
        <div class="card-meta">
          <span>学员 {{ theme.participantCount }} 人</span>
          <span class="meta-dot">·</span>
          <span>{{ formatUpdatedAt(theme.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!loading && themes.length > 0" class="list-footer">已加载全部数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getThemeList } from '@/api/actTheme'
import {
  ACT_SOURCE_TYPE_TEXT,
  ACT_STATUS_TEXT,
  ACT_THEME_MODE_TEXT
} from '@/types/actTheme'
import type { ActThemeCard } from '@/types/actTheme'
import { comingSoon } from './components/ui'

const router = useRouter()
const loading = ref(false)
const themes = ref<ActThemeCard[]>([])

/** 归属/来源为占位展示：模型保留选中值，但查询时不加入请求参数 */
const filters = ref({
  jurisdiction: '1',
  status: '' as '' | '0' | '1' | '2' | '3' | '4' | '5',
  themeMode: '' as '' | '1' | '2' | '3',
  sourceType: '',
  keyword: ''
})

const fetchList = async () => {
  loading.value = true
  try {
    const params: { page: number; pageSize: number; status?: number; themeMode?: number; keyword?: string } = {
      page: 1,
      pageSize: 100
    }
    if (filters.value.status !== '') params.status = Number(filters.value.status)
    if (filters.value.themeMode !== '') params.themeMode = Number(filters.value.themeMode)
    if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
    const res = await getThemeList(params)
    themes.value = res.records || []
  } catch (e) {
    if (e instanceof Error && e.message) comingSoon(e.message)
    themes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const goToDetail = (id: string) => {
  router.push(`/sparring/freesimulate/theme/${id}`)
}

/** FP-30/FP-43：创建新主题 → AI 设计助手对话页（themeId 为空 = 新建） */
const goCreate = () => {
  router.push('/sparring/freesimulate/assistant')
}

/** 更新时间：24 小时内显示相对时间，否则显示日期 */
function formatUpdatedAt(time: string | null): string {
  if (!time) return '-- 更新'
  const t = new Date(time.replace(/-/g, '/')).getTime()
  if (Number.isNaN(t)) return `${time} 更新`
  const diff = Date.now() - t
  if (diff < 60 * 60 * 1000) return '刚刚 更新'
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前 更新`
  const d = new Date(t)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 更新`
}
</script>

<style scoped lang="scss">
.topic-list {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;

  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: #1f2329;
    margin: 0 0 4px;
  }

  .page-subtitle {
    font-size: 14px;
    color: #8a8f98;
    margin: 0;
  }
}

.btn-create {
  padding: 8px 18px;
  background: #1890ff;
  color: #fff;
  border: 1px solid #1890ff;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { opacity: 0.85; }
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.filter-select {
  height: 34px;
  min-width: 110px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
  outline: none;
  cursor: pointer;

  &:focus { border-color: #1890ff; }
}

.search-box {
  position: relative;

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
  }

  .search-input {
    width: 200px;
    height: 34px;
    padding: 0 12px 0 30px;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    font-size: 14px;
    color: #333;
    outline: none;

    &::placeholder { color: #bbb; }
    &:focus { border-color: #1890ff; }
  }
}

.list-tip {
  padding: 60px 0;
  text-align: center;
  font-size: 15px;
  color: #999;
}

.empty-state {
  padding: 80px 0;
  text-align: center;

  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-text { font-size: 15px; color: #999; margin: 0; }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.theme-card {
  position: relative;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px 16px 14px;
  cursor: pointer;
  transition: all 0.25s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    border-color: #c9d4f5;
  }

  .status-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 13px;

    &.status-0 { color: #8a8f98; background: #f2f3f5; }
    &.status-1 { color: #1890ff; background: #e6f7ff; }
    &.status-2 { color: #e5484d; background: #fdecec; }
    &.status-3 { color: #52c41a; background: #f0fbe8; }
    &.status-4 { color: #fa8c16; background: #fff7e6; }
    &.status-5 { color: #8a8f98; background: #f2f3f5; }
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2329;
    margin: 0 60px 8px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-desc {
    height: 40px;
    font-size: 14px;
    color: #8a8f98;
    line-height: 20px;
    margin: 0 0 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;

    .tag-mode {
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #52c41a;
      background: #f0fbe8;
    }

    .tag-source {
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #8a8f98;
      background: #f2f3f5;
    }
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid #f5f5f5;
    font-size: 13px;
    color: #a5a9b0;

    .meta-dot { color: #d5d8dd; }
  }
}

.list-footer {
  padding: 24px 0 8px;
  text-align: center;
  font-size: 14px;
  color: #bbb;
}
</style>
