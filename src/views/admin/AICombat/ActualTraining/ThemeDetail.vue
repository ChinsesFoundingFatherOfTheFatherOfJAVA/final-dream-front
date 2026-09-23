<template>
  <div class="theme-detail">
    <div v-if="loading" class="page-tip">加载中…</div>
    <div v-else-if="!detail" class="page-tip">主题不存在</div>
    <template v-else>
      <!-- FP-07~09 头部：信息 + 统计 + 操作 -->
      <DetailHeader :detail="detail" @refresh="refreshAll" />

      <!-- FP-10 Tab 导航 -->
      <div class="tab-bar">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="tab-item"
          :class="{ active: activeTab === t.key }"
          @click="switchTab(t.key)"
        >
          {{ t.label }}
          <span v-if="t.key === 'versions'" class="tab-count">({{ detail.versionCount }})</span>
        </button>
      </div>

      <!-- Tab 内容区 -->
      <div class="tab-content">
        <ScenarioUnitList v-if="activeTab === 'scenario'" :units="units" :theme-id="detail.id" />
        <StudentPanel
          v-else-if="activeTab === 'students'"
          :participant-count="detail.stats.participantCount"
        />
        <ThemeSettings
          v-else-if="activeTab === 'settings'"
          :theme-id="detail.id"
          :theme-status="detail.status"
          @saved="refreshAll"
        />
        <VersionHistory v-else-if="activeTab === 'versions'" :theme-id="detail.id" @rolled-back="refreshAll" />
        <DataAnalysis v-else-if="activeTab === 'analysis'" :units="units" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScenarioUnits, getThemeDetail } from '@/api/actTheme'
import type { ActScenarioUnit, ActThemeDetail } from '@/types/actTheme'
import DetailHeader from './components/DetailHeader.vue'
import ScenarioUnitList from './components/ScenarioUnitList.vue'
import StudentPanel from './components/StudentPanel.vue'
import ThemeSettings from './components/ThemeSettings.vue'
import VersionHistory from './components/VersionHistory.vue'
import DataAnalysis from './components/DataAnalysis.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<ActThemeDetail | null>(null)
const units = ref<ActScenarioUnit[]>([])

const tabs = [
  { key: 'scenario', label: '场景单元管理' },
  { key: 'students', label: '学员管理' },
  { key: 'settings', label: '主题设置' },
  { key: 'versions', label: '版本历史' },
  { key: 'analysis', label: '数据分析' }
] as const

type TabKey = (typeof tabs)[number]['key']

const activeTab = computed<TabKey>(() => {
  const q = route.query.tab
  const valid = tabs.some(t => t.key === q)
  return (valid ? (q as TabKey) : 'scenario')
})

const switchTab = (key: TabKey) => {
  router.replace({ query: { ...route.query, tab: key } })
}

const loadDetail = async () => {
  loading.value = true
  try {
    detail.value = await getThemeDetail(route.params.id as string)
  } finally {
    loading.value = false
  }
}

const loadUnits = async () => {
  units.value = await getScenarioUnits(route.params.id as string)
}

/** 详情 + 场景单元整体刷新（暂停/结束/保存/回滚后调用） */
const refreshAll = async () => {
  await Promise.all([loadDetail(), loadUnits()])
}

// 路由 id 变化时重新加载
watch(
  () => route.params.id,
  (id) => {
    if (id && route.name === 'ActualThemeDetail') refreshAll()
  }
)

onMounted(refreshAll)
</script>

<style scoped lang="scss">
.theme-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.page-tip {
  padding: 80px 0;
  text-align: center;
  font-size: 15px;
  color: #999;
}

.tab-bar {
  display: flex;
  gap: 28px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 0 20px;

  .tab-item {
    position: relative;
    padding: 13px 2px;
    background: none;
    border: none;
    font-size: 15px;
    color: #646a73;
    cursor: pointer;
    transition: color 0.2s;

    .tab-count { color: #a5a9b0; }

    &:hover { color: #1890ff; }

    &.active {
      color: #1890ff;
      font-weight: 500;

      .tab-count { color: #1890ff; }

      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 2px;
        background: #1890ff;
        border-radius: 1px;
      }
    }
  }
}

.tab-content {
  flex: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top: 1px solid #f2f3f5;
  border-radius: 0 0 8px 8px;
  padding: 18px 20px;
}
</style>
