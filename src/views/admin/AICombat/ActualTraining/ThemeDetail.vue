<template>
  <div class="theme-detail-page">
    <div class="dm-breadcrumb">
      <span class="dm-breadcrumb__link" role="button" tabindex="0" @keydown.enter.prevent="goBack" @click="goBack">
        训练主题
      </span>
      <span class="dm-breadcrumb__sep">/</span>
      <span class="dm-breadcrumb__current">主题详情</span>
    </div>

    <div v-if="loading" class="page-tip">加载中…</div>
    <div v-else-if="!detail" class="page-tip">主题不存在</div>
    <template v-else>
      <!-- FP-07~09 头部：信息 + 统计 + 操作（DetailHeader 双根节点：.dm-header + .dm-stats） -->
      <DetailHeader :detail="detail" @refresh="refreshAll" />

      <!-- FP-10 Tab 导航：原平台无外框，靠 1.6px 底边区分选中 -->
      <div class="dm-tabs">
        <nav class="dm-tabs__nav">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="dm-tab"
            :class="{ 'is-active': activeTab === t.key }"
            @click="switchTab(t.key)"
          >
            {{ t.label }}<template v-if="t.key === 'versions'"> ({{ detail.versionCount }})</template>
          </button>
        </nav>
      </div>

      <div class="dm-tab-panel">
        <ScenarioUnitList v-if="activeTab === 'scenario'" :units="units" :theme-id="detail.id" />
        <StudentPanel v-else-if="activeTab === 'students'" :theme-id="detail.id" :theme-mode="detail.themeMode" />
        <ThemeSettings
          v-else-if="activeTab === 'settings'"
          :theme-id="detail.id"
          :theme-status="detail.status"
          @saved="refreshAll"
        />
        <VersionHistory v-else-if="activeTab === 'versions'" :theme-id="detail.id" @rolled-back="refreshAll" />
        <DataAnalysis v-else-if="activeTab === 'analysis'" :theme-id="detail.id" :units="units" />
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
  const valid = tabs.some((t) => t.key === q)
  return valid ? (q as TabKey) : 'scenario'
})

const switchTab = (key: TabKey) => {
  router.replace({ query: { ...route.query, tab: key } })
}

const goBack = () => {
  router.push('/sparring/freesimulate/topic')
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
/* 尺寸全部取自视觉契约 visual/measured/admin-theme-detail.json（原平台 viewport 1509x887）。
   内容列宽 1301 由布局提供：左侧导航 184（原平台 .yxt-layout__aside 同宽）+ 内容区 12px 内边距。 */
.theme-detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
}

.dm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 22px;
  font-size: 14px;
  line-height: 22px;
  color: #757575;

  &__link {
    color: #757575;
    cursor: pointer;

    &:hover { color: #436bff; }
  }

  /* 分隔符在原平台是 / 文本，同色 */
  &__sep { color: #a8a8a8; }

  &__current { color: #757575; }
}

.page-tip {
  padding: 80px 0;
  text-align: center;
  font-size: 15px;
  color: #999;
}

/* FP-10 Tab：无外框，1.6px 底边在选中时点亮 */
.dm-tabs {
  display: block;
  margin-top: 24px;

  &__nav {
    display: flex;
    gap: 32px;
  }
}

.dm-tab {
  height: 38px;
  padding: 0 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #595959;
  cursor: pointer;
  white-space: nowrap;

  &:hover { color: #436bff; }

  &.is-active {
    color: #436bff;
    border-bottom-color: #436bff;
  }
}

.dm-tab-panel {
  margin-top: 24px;
}
</style>
