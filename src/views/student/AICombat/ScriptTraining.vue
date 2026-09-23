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
        <span class="lang-badge" title="语音识别与评分一律按普通话处理，不提供语种切换">普通话</span>
        <button class="detail-toggle-btn" @click="toggleDetailPanel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          训练详情
        </button>
      </div>
    </header>

    <!-- FP-10 三栏主体：会话加载失败时整栏隐藏，改由下方错误卡承接 -->
    <div v-if="!loadingError" class="main-body">
      <!-- 左栏：虚拟陪练者（FP-27：生图固定输出 1024×1024 方图，形象卡按 1:1 完整展示，角色名放在图片下方） -->
      <aside class="trainer-panel">
        <div class="trainer-figure">
          <!-- 形象卡：项目配置了形象用生成图，未配置用内置默认形象图；两者都是 1:1，cover 不裁切 -->
          <img :src="trainerFace(store.trainerAvatar)" alt="" class="figure-img" />
        </div>
        <div class="trainer-info">
          <p class="info-label">AI扮演角色</p>
          <p class="info-name">{{ store.trainerName || '虚拟陪练者' }}</p>
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

    <!-- 会话加载失败：说清原因并给出口，否则只剩三栏空壳，学员不知道下一步做什么 -->
    <div v-else class="load-error">
      <p class="load-error-text">{{ loadingError }}</p>
      <div class="load-error-actions">
        <button class="error-btn primary" @click="load">重新加载</button>
        <button class="error-btn" @click="backToDetail">返回项目详情</button>
      </div>
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
import { trainerFace } from './trainerFace'
import { toast } from '@/utils/toast'
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
/**
 * 未通过时的提示：有要点走弹窗；一个要点都没有（节点未配 keyPoints，后端只告警不拦截）
 * 时弹窗只剩一句空话，改用轻提示说清"要重新说"。
 */
const showTip = (keyPoints: string[]) => {
  if (!keyPoints.length) {
    toast.warn('这次回答没有答到该轮要点，请参照话术再说一遍')
    return
  }
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

const load = async () => {
  store.reset()
  loadingError.value = ''

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
      finishedRounds: detail.finishedRounds,
      dialogueMode: detail.dialogueMode ?? 1,
      trainerAvatar: detail.trainerAvatar ?? null
    })
    store.setMessages(detail.messages ?? [])

    // 右栏说明取项目 description（失败只留空说明，不该弹提示打断训练）
    try {
      const project = await getStudentProjectDetail(projectId, { silent: true })
      description.value = project.description ?? ''
    } catch {
      /* 说明获取失败不阻塞训练 */
    }
  } catch (e: unknown) {
    loadingError.value = e instanceof Error ? e.message : '会话加载失败'
  }
}

const backToDetail = () => router.replace(`/sparring/web/script/detail/${projectId}`)

onMounted(load)
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

  /* 语种是识别口径而非可切换功能，故为静态标记而非按钮 */
  .lang-badge,
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

  .lang-badge {
    display: inline-flex;
    align-items: center;
    cursor: default;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
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
/* 会话加载失败卡：与三栏互斥出现，给出原因 + 重试/返回两个出口 */
.load-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 0 18px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);

  .load-error-text {
    margin: 0;
    font-size: 15px;
    color: #e8ecf7;
    text-align: center;
    max-width: 560px;
    line-height: 1.7;
  }

  .load-error-actions {
    display: flex;
    gap: 12px;
  }

  .error-btn {
    height: 36px;
    padding: 0 22px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: transparent;
    color: #cdd5e8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.primary {
      border-color: transparent;
      background: linear-gradient(90deg, #7a6cf0 0%, #4a7dff 100%);
      color: #fff;
    }
  }
}

.trainer-panel {
  width: 280px;
  flex-shrink: 0;
}

/* 形象卡：与生图输出同为 1:1，图片完整显示不裁切 */
.trainer-figure {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  background: #1d2547;

  .figure-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

/* 图片下方信息区：AI 扮演角色与角色名（原先叠在图片底部，现随图片变方移出） */
.trainer-info {
  padding: 14px 4px 0;

  .info-label {
    margin: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  .info-name {
    margin: 2px 0 0;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    word-break: break-all;
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
