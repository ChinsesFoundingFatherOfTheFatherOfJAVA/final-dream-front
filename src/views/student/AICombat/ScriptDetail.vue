<template>
  <div class="script-detail" v-if="detail">
    <!-- FP-05 面包屑 -->
    <div class="breadcrumb">
      <span class="crumb-link" role="button" tabindex="0" @click="goList" @keydown.enter.prevent="goList">AI对练</span>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">话术训练详情</span>
    </div>

    <!-- FP-06 头部信息卡（深蓝渐变横幅） -->
    <div class="hero-card">
      <div class="hero-left">
        <div class="hero-cover">
          <img v-if="detail.coverImage" :src="detail.coverImage" alt="项目封面" />
          <div v-else class="cover-default">
            <svg width="56" height="46" viewBox="0 0 88 72" fill="none" aria-hidden="true">
              <path d="M8 8h44a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H24l-10 10V44H8a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Z" transform="translate(4 4)" fill="#ffffff" fill-opacity="0.9"/>
              <path d="M44 24h36a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-4v8l-9-8H44a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8Z" fill="#8FC7FF" fill-opacity="0.85"/>
            </svg>
          </div>
        </div>
        <div class="hero-info">
          <span class="type-pill" :class="detail.projectType === 1 ? 'exam' : 'train'">
            {{ detail.projectType === 1 ? '考核' : '训练' }}
          </span>
          <h1 class="hero-title">{{ detail.name }}</h1>
          <div class="hero-meta">
            <span class="meta-avatar">{{ avatarChar }}</span>
            <span class="meta-text">参与人数 {{ detail.participantCount }}</span>
          </div>
        </div>
      </div>
      <div class="hero-right">
        <div class="practice-panel">
          <div class="practice-count">
            已练 <span class="num">{{ detail.practicedCount }}</span> / {{ completionStandardText }} 次
          </div>
          <div v-if="detail.completed" class="completed-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#38b25c"/>
              <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            已完成
          </div>
        </div>
        <el-button class="start-btn" :disabled="starting" @click="onStart">
          {{ starting ? '正在进入...' : '开始' }}
        </el-button>
      </div>
    </div>

    <!-- FP-07 话术训练说明卡 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-icon doc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 2h9l5 5v15H6V2Z" stroke="#7a6cf0" stroke-width="1.6" fill="#efeaff"/>
            <path d="M15 2v5h5" stroke="#7a6cf0" stroke-width="1.6" fill="none"/>
            <line x1="9" y1="12" x2="16" y2="12" stroke="#7a6cf0" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="9" y1="16" x2="14" y2="16" stroke="#7a6cf0" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="card-title">话术训练说明</span>
      </div>
      <div class="card-body">{{ detail.description || '暂无说明' }}</div>
    </div>

    <!-- FP-08 练习规则卡 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-icon rule">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#efeaff"/>
            <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#7a6cf0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="card-title">练习规则</span>
      </div>
      <div class="rule-panels">
        <div class="rule-panel">
          <div class="rule-value">{{ ruleStandardText }}</div>
          <div class="rule-label">完成标准</div>
        </div>
        <div class="rule-panel">
          <div class="rule-value">不限</div>
          <div class="rule-label">剩余机会</div>
        </div>
      </div>
      <div class="rule-footer">起止时间：{{ fmtTime(detail.startTime) }} ~ {{ fmtTime(detail.endTime) }}</div>
    </div>

    <!-- FP-09 我的记录卡 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-icon record">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#efeaff"/>
            <path d="M12 7v5l3.5 2" stroke="#7a6cf0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="card-title">我的记录</span>
      </div>
      <div class="record-panels">
        <div
          class="record-panel"
          role="button"
          tabindex="0"
          @click="goRecords"
          @keydown.enter.prevent="goRecords"
        >
          <div class="record-num">{{ detail.recordCount }}</div>
          <div class="record-label">练习记录 ›</div>
        </div>
        <div
          class="record-panel"
          role="button"
          tabindex="0"
          @click="rankVisible = true"
          @keydown.enter.prevent="rankVisible = true"
        >
          <div class="record-num">{{ detail.rankNo ?? '--' }}</div>
          <div class="record-label">个人排名 ›</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 加载/错误态 -->
  <div v-else class="detail-loading">
    <p v-if="loading">加载中...</p>
    <template v-else>
      <p>{{ errorMsg || '项目不存在或未发布' }}</p>
      <el-button class="back-btn" @click="goList">返回列表</el-button>
    </template>
  </div>

  <RankDrawer :visible="rankVisible" :project-id="projectId" @close="rankVisible = false" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStudentProjectDetail, startSession } from '@/api/student'
import { resolveAssetUrl } from '@/api/request'
import RankDrawer from '@/views/admin/AICombat/SpeechTraining/components/RankDrawer.vue'
import type { StudentProjectDetail } from '@/types/student'

const route = useRoute()
const router = useRouter()
const projectId = route.params.projectId as string

const detail = ref<StudentProjectDetail | null>(null)
const loading = ref(true)
const errorMsg = ref('')
const starting = ref(false)
const rankVisible = ref(false)

const avatarChar = computed(() => '员')

/** 头部"已练 N / M 次"中的 M：考核类没有次数完成标准时显示 '-' */
const completionStandardText = computed(() =>
  detail.value?.projectType === 1 ? (detail.value.completionStandard ?? '-') : detail.value?.completionStandard ?? '-'
)

/** 练习规则-完成标准文案：日常训练 ≥N 次训练；考核 达标分数 ≥ X 分 */
const ruleStandardText = computed(() => {
  if (!detail.value) return ''
  return detail.value.projectType === 1
    ? `达标分数 ≥ ${detail.value.passScore ?? '-'} 分`
    : `≥${detail.value.completionStandard ?? '-'} 次训练`
})

const goList = () => router.push('/sparring/web/speech/list')
const goRecords = () => router.push(`/sparring/web/script/records/${projectId}`)

/** 展示时间去掉秒（对齐原平台） */
const fmtTime = (t: string) => (t ? t.slice(0, 16) : '')

/** FP-06 开始 → 创建会话 → 新窗口打开训练页 */
const onStart = async () => {
  if (starting.value) return
  starting.value = true
  try {
    const data = await startSession(projectId)
    const url = `${location.origin}${location.pathname}#/sparring/web/script/training/${projectId}?sessionId=${data.sessionId}`
    window.open(url, '_blank')
  } catch {
    // 创建会话失败已由 api/request.ts 的 toast 提示，按钮恢复可点即可重试
  } finally {
    starting.value = false
  }
}

onMounted(async () => {
  try {
    const data: any = await getStudentProjectDetail(projectId)
    detail.value = { ...data, coverImage: resolveAssetUrl(data.coverImage) || null }
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : ''
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.script-detail {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 面包屑 */
.breadcrumb {
  font-size: 13px;
  color: #999;

  .crumb-link {
    color: #2e7cf6;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid #2e7cf6;
      outline-offset: 2px;
    }
  }

  .crumb-sep {
    margin: 0 8px;
    color: #ccc;
  }
}

/* 头部 hero */
.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1b2a5e 0%, #223a8f 55%, #2b4bb5 100%);
  color: #fff;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.hero-cover {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-default {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(143, 199, 255, 0.35), rgba(74, 125, 255, 0.35));
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.hero-info {
  min-width: 0;

  .type-pill {
    display: inline-block;
    padding: 2px 12px;
    border-radius: 20px;
    font-size: 12px;
    background: rgba(74, 125, 255, 0.85);

    &.exam {
      background: rgba(255, 122, 26, 0.9);
    }
  }

  .hero-title {
    margin: 10px 0;
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);

    .meta-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e6f7ff;
      color: #2e7cf6;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  flex-shrink: 0;
}

.practice-panel {
  background: #fff;
  border-radius: 12px;
  padding: 14px 20px;
  color: #333;
  min-width: 150px;

  .practice-count {
    font-size: 14px;

    .num {
      font-size: 26px;
      font-weight: 700;
      color: #2e7cf6;
      margin: 0 2px;
    }
  }

  .completed-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 13px;
    color: #38b25c;
    font-weight: 500;
  }
}

.start-btn {
  width: 190px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(90deg, #7a6cf0 0%, #4a7dff 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;

  &:hover:not(:disabled) {
    opacity: 0.92;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* 信息卡通用 */
.info-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;

  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #222;
  }
}

.card-body {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

/* 练习规则 / 我的记录 双面板 */
.rule-panels,
.record-panels {
  display: flex;
  gap: 16px;
}

.rule-panel,
.record-panel {
  flex: 1;
  background: #f7f8fa;
  border-radius: 10px;
  padding: 18px 20px;
  text-align: center;
}

.rule-panel .rule-value {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}

.rule-panel .rule-label,
.record-panel .record-label {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.record-panel {
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f0f4ff;
  }

  // 可点面板已补按钮语义，补键盘焦点环
  &:focus-visible {
    outline: 2px solid #2e7cf6;
    outline-offset: 2px;
  }

  .record-num {
    font-size: 24px;
    font-weight: 700;
    color: #2e7cf6;
  }

  .record-label {
    color: #666;
  }
}

.rule-footer {
  margin-top: 14px;
  font-size: 12px;
  color: #999;
}

/* 加载/错误态 */
.detail-loading {
  background: #fff;
  border-radius: 12px;
  padding: 80px 0;
  text-align: center;
  color: #999;
  font-size: 14px;

  .back-btn {
    margin-top: 16px;
    padding: 8px 24px;
    border: 1px solid #2e7cf6;
    border-radius: 18px;
    background: #fff;
    color: #2e7cf6;
    cursor: pointer;
    font-size: 14px;
  }
}

@media (max-width: 760px) {
  .script-detail {
    width: 100%;
  }

  .hero-card {
    align-items: stretch;
    flex-direction: column;
    padding: 18px 16px;
  }

  .hero-left {
    align-items: flex-start;
  }

  .hero-cover {
    width: 72px;
    height: 72px;
  }

  .hero-info .hero-title {
    font-size: 20px;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .hero-right {
    align-items: stretch;
    width: 100%;
  }

  .practice-panel {
    min-width: 0;
  }

  .start-btn {
    width: 100%;
  }

  .info-card {
    padding: 16px;
  }

  .rule-panel,
  .record-panel {
    min-width: 0;
    padding: 16px 10px;
  }
}
</style>
