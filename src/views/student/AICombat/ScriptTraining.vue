<template>
  <div class="script-training">
    <!-- FP-11 顶部栏 -->
    <header class="top-bar">
      <div class="bar-left">
        <button class="exit-btn" @click="onExit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M12 12l7-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </svg>
          退出训练
        </button>
      </div>
      <div class="bar-center">
        <span class="train-pill">训练</span>
        <span class="project-name">{{ store.projectName }}</span>
      </div>
      <div class="bar-right">
        <span class="progress-text">进度 {{ store.progressPercent }}%</span>
        <button class="lang-btn">普通话</button>
        <button class="detail-toggle-btn" @click="toggleDetailPanel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          训练详情
        </button>
      </div>
    </header>

    <!-- FP-10 三栏主体 -->
    <div class="main-body">
      <!-- 左栏：虚拟陪练者 -->
      <aside class="trainer-panel">
        <!-- 静态默认占位图（不做数字人视频） -->
        <div class="trainer-figure">
          <svg viewBox="0 0 280 420" preserveAspectRatio="xMidYMid slice" class="figure-svg">
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#33406e"/>
                <stop offset="100%" stop-color="#1d2547"/>
              </linearGradient>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#e9edf6"/>
                <stop offset="100%" stop-color="#c6cfdf"/>
              </linearGradient>
            </defs>
            <rect width="280" height="420" fill="url(#bgGrad)"/>
            <!-- 背景装饰圆 -->
            <circle cx="230" cy="70" r="90" fill="#3a4a80" opacity="0.35"/>
            <circle cx="40" cy="360" r="110" fill="#2a3560" opacity="0.5"/>
            <!-- 人物 -->
            <ellipse cx="140" cy="430" rx="110" ry="70" fill="url(#bodyGrad)"/>
            <circle cx="140" cy="150" r="52" fill="#d9dfeb"/>
            <path d="M88 150 Q88 92 140 92 Q192 92 192 150 Q192 118 140 112 Q88 118 88 150Z" fill="#b9c2d4"/>
            <path d="M75 260 Q140 225 205 260 L215 330 Q140 300 65 330 Z" fill="url(#bodyGrad)"/>
            <path d="M120 210 h40 v20 q-20 12 -40 0 Z" fill="#aab4c8"/>
          </svg>
          <div class="trainer-overlay">
            <p class="overlay-label">AI扮演角色</p>
            <p class="overlay-name">{{ store.trainerName || '虚拟陪练者' }}</p>
          </div>
        </div>
      </aside>

      <!-- 中栏：对话区 -->
      <main class="chat-panel">
        <TrainChat @tip="showTip" />
      </main>

      <!-- 右栏：训练详情面板（可收起） -->
      <aside v-if="store.detailPanelVisible" class="detail-panel">
        <div class="detail-card">
          <div class="detail-header">
            <span class="detail-title">训练详情</span>
            <span class="detail-close" @click="store.detailPanelVisible = false">×</span>
          </div>
          <div class="detail-body">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 2h9l5 5v15H6V2Z" stroke="#8fa3d9" stroke-width="1.6" fill="#232b47"/>
                <line x1="9" y1="12" x2="16" y2="12" stroke="#8fa3d9" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="9" y1="16" x2="14" y2="16" stroke="#8fa3d9" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              话术训练说明
            </div>
            <p class="section-text">{{ description || '暂无说明' }}</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- 底部声明 -->
    <footer class="page-footer">语音、人像及背景均由AI生成</footer>

    <!-- FP-12 要点提示弹窗 -->
    <TipModal :visible="tipVisible" :key-points="tipKeyPoints" @close="tipVisible = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TrainChat from './TrainChat.vue'
import TipModal from './TipModal.vue'
import { exitSession, getSession, getStudentProjectDetail } from '@/api/student'
import { useTrainingStore } from '@/stores/training'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()

const projectId = route.params.projectId as string
const sessionId = (route.query.sessionId as string) || ''

const description = ref('')
const loadingError = ref('')

// 要点提示弹窗
const tipVisible = ref(false)
const tipKeyPoints = ref<string[]>([])
const showTip = (keyPoints: string[]) => {
  tipKeyPoints.value = keyPoints
  tipVisible.value = true
}

const toggleDetailPanel = () => {
  store.detailPanelVisible = !store.detailPanelVisible
}

/** FP-13/19 退出训练：保存未完成记录 → 关闭窗口（非脚本打开时退回详情页） */
const exiting = ref(false)
const onExit = async () => {
  if (exiting.value) return
  if (!confirm('确定退出训练吗？本次练习将保存为未完成记录。')) return
  exiting.value = true
  try {
    if (store.sessionId && store.sessionStatus === 0) {
      await exitSession(store.sessionId).catch(() => undefined)
    }
  } finally {
    // window.open 打开的窗口可直接关闭；否则退回详情页
    window.close()
    router.replace(`/sparring/web/script/detail/${projectId}`)
  }
}

onMounted(async () => {
  store.reset()

  if (!sessionId) {
    loadingError.value = '缺少会话参数，请从项目详情页点击"开始"进入训练'
    return
  }

  try {
    const detail = await getSession(sessionId)

    // 会话已结束：引导跳转（FP-19）
    if (detail.status === 1) {
      router.replace(`/sparring/standpracticereport?sessionId=${sessionId}`)
      return
    }
    if (detail.status === 2) {
      router.replace(`/sparring/web/script/records/${detail.projectId}`)
      return
    }

    store.setSession({
      sessionId: detail.sessionId,
      projectId: detail.projectId,
      projectName: detail.projectName,
      trainerName: detail.trainerName,
      status: detail.status,
      totalRounds: detail.totalRounds,
      finishedRounds: detail.finishedRounds
    })
    store.setMessages(detail.messages ?? [])

    // 右栏说明取项目 description
    try {
      const project = await getStudentProjectDetail(projectId)
      description.value = project.description ?? ''
    } catch {
      /* 说明获取失败不阻塞训练 */
    }
  } catch (e: unknown) {
    loadingError.value = e instanceof Error ? e.message : '会话加载失败'
  }
})
</script>

<script lang="ts">
export default { name: 'ScriptTraining' }
</script>

<style scoped lang="scss">
.script-training {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(90, 80, 200, 0.18) 0%, transparent 45%),
    radial-gradient(ellipse at 100% 100%, rgba(60, 100, 220, 0.14) 0%, transparent 45%),
    linear-gradient(160deg, #10142b 0%, #0c1024 50%, #0a0d1e 100%);
  color: #e8ecf7;
  overflow: hidden;
}

/* 顶部栏 */
.top-bar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(16, 20, 43, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.bar-left .exit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  color: #dfe5f2;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
}

.bar-center {
  display: flex;
  align-items: center;
  gap: 10px;

  .train-pill {
    padding: 3px 14px;
    border-radius: 12px;
    background: #3b6cf5;
    color: #fff;
    font-size: 12px;
  }

  .project-name {
    font-size: 15px;
    color: #cdd5e8;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 14px;

  .progress-text {
    font-size: 13px;
    color: #aab4cf;
  }

  .lang-btn,
  .detail-toggle-btn {
    height: 32px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    color: #cdd5e8;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  .detail-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

/* 三栏主体 */
.main-body {
  flex: 1;
  display: flex;
  gap: 14px;
  padding: 14px 18px 0;
  min-height: 0;
}

/* 左栏 陪练者 */
.trainer-panel {
  width: 280px;
  flex-shrink: 0;
}

.trainer-figure {
  position: relative;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: #1d2547;

  .figure-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .trainer-overlay {
    position: absolute;
    left: 14px;
    bottom: 14px;

    .overlay-label {
      margin: 0;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }

    .overlay-name {
      margin: 2px 0 0;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    }
  }
}

/* 中栏 对话 */
.chat-panel {
  flex: 1;
  min-width: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 右栏 训练详情 */
.detail-panel {
  width: 320px;
  flex-shrink: 0;
}

.detail-card {
  height: 100%;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);

  .detail-title {
    font-size: 15px;
    font-weight: 600;
    color: #e8ecf7;
  }

  .detail-close {
    font-size: 20px;
    color: #8892ad;
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: #fff;
    }
  }
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #aab4cf;
    margin-bottom: 10px;
  }

  .section-text {
    font-size: 13px;
    color: #c3cbde;
    line-height: 1.8;
    margin: 0;
    word-break: break-word;
  }
}

/* 底部声明 */
.page-footer {
  flex-shrink: 0;
  text-align: center;
  padding: 10px 0 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
