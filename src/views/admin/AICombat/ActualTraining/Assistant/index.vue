<template>
  <div class="assistant-page" :class="store.panelVisible ? 'two-column' : 'single-column'">
    <!-- 页头：返回 + 标题 -->
    <div class="page-head">
      <el-button class="back-btn" @click="goList">‹ 返回训练主题</el-button>
      <div class="head-title">
        AI 设计助手
        <span v-if="store.readOnly" class="readonly-tag">主题已结束 · 只读</span>
      </div>
      <div class="head-right">
        <el-button
          v-if="mockEnabled"
          class="debug-btn"
          title="模拟服务端断开，验证指数退避重连与消息恢复"
          @click="store.simulateDrop()"
        >
          断线测试
        </el-button>
        <span class="head-hint">{{ store.panelVisible ? '左侧对话 · 右侧主题产物' : '对话中，方向明确后自动展开产物面板' }}</span>
      </div>
    </div>

    <!-- 主体：纯聊天态单栏居中；topic-changed 后左右两栏（左 45% / 右 55%） -->
    <div class="page-body">
      <div v-if="initError" class="init-error">
        <div class="err-icon" aria-hidden="true">⚠️</div>
        <p class="err-text">{{ initError }}</p>
        <el-button class="err-retry" @click="bootstrap">重试</el-button>
      </div>
      <template v-else>
        <ChatColumn class="chat-slot" />
        <ArtifactPanel v-if="store.panelVisible" class="panel-slot" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ASSISTANT_USE_MOCK } from '@/api/assistant'
import { getThemeDetail } from '@/api/actTheme'
import ArtifactPanel from './components/ArtifactPanel.vue'
import ChatColumn from './components/ChatColumn.vue'
import { useAssistantStore } from './composables/useAssistantStore'
import { useAssistantWs } from './composables/useAssistantWs'

const route = useRoute()
const router = useRouter()
const store = useAssistantStore()
const ws = useAssistantWs()
const mockEnabled = ASSISTANT_USE_MOCK

const routeThemeId = computed(() => {
  const id = route.params.themeId
  return typeof id === 'string' && id ? id : ''
})

/** 会话建立失败信息（可重试），避免失败时页面像卡死 */
const initError = ref('')

const goList = () => router.push('/sparring/freesimulate/topic')

/** 主题状态决定确认文案与只读态（FP-30/33）；主题尚未建立时不请求 */
async function loadThemeMeta(themeId: string) {
  if (!themeId) return
  try {
    const detail = await getThemeDetail(themeId)
    store.themeStatus = detail.status
    store.themeName = detail.themeName
  } catch {
    // 主题可能刚建（接口未就绪）——不阻塞对话页
  }
}

/** 初始化：建/恢复会话 → 拉历史与 artifact → 连 WS（连上自动发 common-session-start） */
async function bootstrap() {
  store.reset()
  initError.value = ''
  // 主题元信息（状态/名称）失败不阻塞对话页
  try {
    await loadThemeMeta(routeThemeId.value)
  } catch {
    /* 忽略：主题可能刚建或接口异常 */
  }
  try {
    await store.initSession(routeThemeId.value)
  } catch (e) {
    // 会话建不出来就真的没法连 WS——把原因显示出来并可重试，避免页面像"卡死"
    initError.value = e instanceof Error && e.message ? e.message : '会话建立失败，请重试'
  }
  // 只要拿到 sessionId 就连接（历史/artifact 拉取失败不影响连接）
  ws.register()
  if (store.sessionId) ws.connect(store.sessionId)
}

onMounted(bootstrap)

// 路由 themeId 变化（列表新建 ↔ 详情进入）时重新建立会话
watch(routeThemeId, (_id, prev) => {
  if (prev !== undefined) void bootstrap()
})
</script>

<style scoped lang="scss">
.assistant-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #fff;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  border-bottom: 1px solid #eceef2;
  background: #fff;
  flex-shrink: 0;

  .back-btn {
    padding: 5px 12px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    font-size: 13px;
    color: #4e5969;
    cursor: pointer;

    &:hover { color: #1890ff; border-color: #1890ff; }
  }

  .head-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2329;
    display: flex;
    align-items: center;
    gap: 8px;

    .readonly-tag {
      font-size: 12px;
      font-weight: 400;
      color: #8a8f98;
      background: #f2f3f5;
      border-radius: 4px;
      padding: 2px 8px;
    }
  }

  .head-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;

    .debug-btn {
      padding: 4px 10px;
      background: #fff;
      border: 1px dashed #d0d3d9;
      border-radius: 6px;
      font-size: 12px;
      color: #8a8f98;
      cursor: pointer;

      &:hover { color: #fa8c16; border-color: #fa8c16; }
    }

    .head-hint { font-size: 12px; color: #a5a9b0; }
  }
}

/* 主体：单栏时聊天区居中收窄；两栏时左 45% / 右 55% */
.page-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.chat-slot {
  flex: 1;
  min-width: 0;
}

.single-column {
  .page-body {
    justify-content: center;
    background: #f7f8fa;
  }

  .chat-slot {
    flex: 0 1 880px;
    max-width: 880px;
    border-left: 1px solid #eceef2;
    border-right: 1px solid #eceef2;
  }
}

.two-column {
  .chat-slot {
    flex: 0 0 45%;
    max-width: 45%;
  }

  .panel-slot {
    flex: 0 0 55%;
    max-width: 55%;
  }
}

/* 会话建立失败的可见兜底（避免页面看起来只是"卡住"） */
.init-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;

  .err-icon { font-size: 34px; }

  .err-text {
    margin: 0;
    max-width: 560px;
    text-align: center;
    font-size: 14px;
    color: #8a3d3d;
    line-height: 1.7;
  }

  .err-retry {
    padding: 7px 22px;
    background: #1890ff;
    border: 1px solid #1890ff;
    color: #fff;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;

    &:hover { opacity: 0.85; }
  }
}
</style>