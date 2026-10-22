<template>
  <aside class="artifact-panel">
    <!-- 头部：主题名 + 确认按钮 -->
    <div class="panel-header">
      <div class="title-block">
        <div class="panel-title">{{ displayTitle }}</div>
        <div class="panel-sub">
          <span class="version">v{{ artifact?.versionNo || '1' }}</span>
          <span class="status-badge" :class="artifactStatusClass">{{ artifactStatusText }}</span>
          <el-button v-if="detailThemeId" class="detail-link" @click="goDetail">查看主题详情 →</el-button>
        </div>
      </div>
      <el-button
        class="confirm-btn"
        :disabled="!artifact || confirming || store.readOnly"
        @click="openConfirm"
      >
        {{ confirming ? '保存中…' : '确认' }}
      </el-button>
    </div>

    <!-- 五 Tab -->
    <div class="panel-tabs">
      <el-button
        v-for="t in tabs"
        :key="t.key"
        class="panel-tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span v-if="t.count" class="tab-badge">{{ t.count }}</span>
      </el-button>
    </div>

    <!-- Tab 内容 -->
    <div class="panel-body">
      <div v-if="!artifactContent" class="panel-empty">
        <div class="empty-icon">⏳</div>
        <p class="empty-text">产物待生成，继续告诉助手你的目标吧</p>
      </div>
      <template v-else>
        <MaterialsTab v-if="activeTab === 'materials'" :disabled="store.readOnly" />
        <ScenarioUnitsTab v-else-if="activeTab === 'scenarios'" />
        <ProfileTab v-else-if="activeTab === 'profiles'" />
        <IcebergTab v-else-if="activeTab === 'iceberg'" />
        <CriteriaTab v-else-if="activeTab === 'criteria'" />
      </template>
    </div>

    <!-- 确认弹窗：新建/已发布更新两文案（照线上） -->
    <ConfirmDialog
      :visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmText"
      :loading="confirming"
      @confirm="doConfirm"
      @cancel="confirmVisible = false"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import { showToast } from '../../components/ui'
import { useAssistantStore } from '../composables/useAssistantStore'
import MaterialsTab from './tabs/MaterialsTab.vue'
import ScenarioUnitsTab from './tabs/ScenarioUnitsTab.vue'
import ProfileTab from './tabs/ProfileTab.vue'
import IcebergTab from './tabs/IcebergTab.vue'
import CriteriaTab from './tabs/CriteriaTab.vue'
import type { AssistantPanelTab } from '@/types/assistant'

const store = useAssistantStore()
const router = useRouter()

const activeTab = ref<AssistantPanelTab>('scenarios')
const confirmVisible = ref(false)
const confirming = ref(false)
let confirmTimeout: number | null = null

const artifact = computed(() => store.artifact)
const artifactContent = computed(() => store.artifactContent)
const displayTitle = computed(() => store.themeName || '未命名主题')
const detailThemeId = computed(() => store.themeId || store.savedThemeId)

const tabs = computed(() => [
  { key: 'materials' as const, label: '培训材料', count: artifactContent.value?.materials.length ?? 0 },
  { key: 'scenarios' as const, label: '场景单元', count: artifactContent.value?.scenarios.length ?? 0 },
  { key: 'profiles' as const, label: 'AI角色类型', count: artifactContent.value?.customerProfiles.length ?? 0 },
  { key: 'iceberg' as const, label: '冰山模型', count: 0 },
  { key: 'criteria' as const, label: '评估标准', count: artifactContent.value?.evaluationCriteria.dimensions.length ?? 0 }
])

const artifactStatusText = computed(() => (artifact.value?.status === 'confirmed' ? '已保存' : '工作区'))
const artifactStatusClass = computed(() => (artifact.value?.status === 'confirmed' ? 'status-confirmed' : 'status-working'))

/** 已发布/已暂停 → 更新文案；草稿 → 保存文案（FP-33） */
const isPublishedUpdate = computed(() => store.themeStatus === 3 || store.themeStatus === 4)

const confirmTitle = computed(() =>
  isPublishedUpdate.value ? '确认更新已发布主题' : '确认保存当前内容'
)

const confirmMessage = computed(() => {
  const name = displayTitle.value
  return isPublishedUpdate.value
    ? `「${name}」当前已发布，确认后将以本次 AI 助手的内容更新该主题，更新后学员侧将看到调整后的场景与评估标准。`
    : `确认后将把当前 AI 助手生成的内容保存到主题「${name}」。保存后主题仍为草稿，可在主题详情中查看场景单元、客户画像与评估标准。`
})

const confirmText = computed(() => (isPublishedUpdate.value ? '确认更新' : '确认保存'))

function openConfirm() {
  if (!artifact.value || store.readOnly) return
  confirmVisible.value = true
}

/** 确认 → 发 biz-side-manage-confirm action；save-success 后提示成功 */
function doConfirm() {
  confirmVisible.value = false
  confirming.value = true
  store.confirmArtifact()
  if (confirmTimeout !== null) window.clearTimeout(confirmTimeout)
  // 兜底：一轮对话结束时若仍未收到 save-success 则解除 loading
  confirmTimeout = window.setTimeout(() => {
    confirming.value = false
  }, 60000)
}

watch(
  () => store.savedAt,
  (v) => {
    if (!v || !confirming.value) return
    confirming.value = false
    if (confirmTimeout !== null) window.clearTimeout(confirmTimeout)
    showToast(isPublishedUpdate.value ? '已更新已发布主题' : '内容已保存到主题')
  }
)

// 主题已结束：输入只读，确认按钮同步禁用
watch(
  () => store.generating,
  (g) => {
    if (!g && confirming.value && confirmTimeout === null) confirming.value = false
  }
)

onBeforeUnmount(() => {
  if (confirmTimeout !== null) window.clearTimeout(confirmTimeout)
})

const goDetail = () => {
  if (detailThemeId.value) router.push(`/sparring/freesimulate/theme/${detailThemeId.value}`)
}
</script>

<style scoped lang="scss">
.artifact-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #fbfbfc;
  border-left: 1px solid #eceef2;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  background: #fff;
  border-bottom: 1px solid #eceef2;

  .title-block { flex: 1; min-width: 0; }

  .panel-title {
    font-size: 17px;
    font-weight: 600;
    color: #1f2329;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-sub {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;

    .version { font-size: 12px; color: #8a8f98; }

    .status-badge {
      font-size: 12px;
      border-radius: 4px;
      padding: 1px 8px;

      &.status-working { color: #e8940c; background: #fff7e6; }
      &.status-confirmed { color: #52c41a; background: #f0fbe8; }
    }

    .detail-link {
      background: none;
      border: none;
      padding: 0;
      font-size: 12px;
      color: #1890ff;
      cursor: pointer;

      &:hover { text-decoration: underline; }
    }
  }

  /* 确认：紫色主按钮（照线上） */
  .confirm-btn {
    flex-shrink: 0;
    padding: 8px 20px;
    background: #6b5ce7;
    border: 1px solid #6b5ce7;
    color: #fff;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { opacity: 0.88; }

    &:disabled {
      background: #d6d2f2;
      border-color: #d6d2f2;
      cursor: not-allowed;
    }
  }
}

.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #eceef2;
  overflow-x: auto;

  .panel-tab {
    position: relative;
    padding: 11px 10px;
    background: none;
    border: none;
    font-size: 14px;
    color: #646a73;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.2s;

    .tab-badge {
      font-size: 11px;
      color: #8a8f98;
      background: #f2f3f5;
      border-radius: 8px;
      padding: 0 6px;
      margin-left: 3px;
    }

    &:hover { color: #6b5ce7; }

    &.active {
      color: #6b5ce7;
      font-weight: 500;

      .tab-badge { color: #6b5ce7; background: #f0edff; }

      &::after {
        content: '';
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: -1px;
        height: 2px;
        background: #6b5ce7;
        border-radius: 1px;
      }
    }
  }
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
}

.panel-empty {
  padding: 60px 0;
  text-align: center;

  .empty-icon { font-size: 34px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; color: #999; margin: 0; }
}
</style>