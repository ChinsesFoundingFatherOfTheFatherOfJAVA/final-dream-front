<template>
  <div class="student-home">
    <!-- 欢迎区域 -->
    <section class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">欢迎回来，管理员</h1>
        <p class="welcome-desc">今天是学习的好日子，继续加油吧！</p>
      </div>
      <div class="welcome-illustration" aria-hidden="true">
        <el-icon class="illustration-icon"><Reading /></el-icon>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="quick-access">
      <h2 class="section-title">快捷入口</h2>
      <div class="access-grid">
        <div class="access-card" role="button" tabindex="0" @click="goTo('/study/userhome')" @keydown.enter.prevent="goTo('/study/userhome')">
          <el-icon class="access-icon" aria-hidden="true"><EditPen /></el-icon>
          <span class="access-name">我的陪练</span>
        </div>
        <div class="access-card" role="button" tabindex="0" @click="goTo('/sparring/web/speech/list')" @keydown.enter.prevent="goTo('/sparring/web/speech/list')">
          <el-icon class="access-icon" aria-hidden="true"><ChatDotRound /></el-icon>
          <span class="access-name">AI对练</span>
        </div>
        <div class="access-card" role="button" tabindex="0" @click="goTo('/course')" @keydown.enter.prevent="goTo('/course')">
          <el-icon class="access-icon" aria-hidden="true"><Reading /></el-icon>
          <span class="access-name">课程中心</span>
        </div>
        <div class="access-card" role="button" tabindex="0" @click="goTo('/phrase')" @keydown.enter.prevent="goTo('/phrase')">
          <el-icon class="access-icon" aria-hidden="true"><DocumentCopy /></el-icon>
          <span class="access-name">话术目录</span>
        </div>
        <div class="access-card" role="button" tabindex="0" @click="goTo('/ai-combat')" @keydown.enter.prevent="goTo('/ai-combat')">
          <el-icon class="access-icon" aria-hidden="true"><Trophy /></el-icon>
          <span class="access-name">AI实战训练场</span>
        </div>
        <div class="access-card" role="button" tabindex="0" @click="goTo('/leaderboard')" @keydown.enter.prevent="goTo('/leaderboard')">
          <el-icon class="access-icon" aria-hidden="true"><Trophy /></el-icon>
          <span class="access-name">陪练看板</span>
        </div>
      </div>
    </section>

    <!-- 学习任务：考试 / 话术训练 / 实战训练 三 tab（契约 02 §8B.5，DER-09 只展示不派发） -->
    <LearningTaskCard />

    <!-- 学习统计 -->
    <section class="learning-stats">
      <h2 class="section-title">学习统计</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">今日学习时长</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">已完成课程</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">获得证书</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">总学分</div>
        </div>
      </div>
    </section>

    <!-- 最近学习 -->
    <section class="recent-learning">
      <h2 class="section-title">最近学习</h2>
      <el-empty description="暂无学习记录" :image-size="96" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import LearningTaskCard from './components/LearningTaskCard.vue'
import { Reading, EditPen, ChatDotRound, DocumentCopy, Trophy } from '@element-plus/icons-vue'

const router = useRouter()

const goTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped lang="scss">
.student-home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-section {
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-paper);

  .welcome-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .welcome-desc {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .welcome-illustration {
    .illustration-icon {
      font-size: 64px;
    }
  }
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 16px 0;
}

.access-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.access-card {
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;

  &:hover {
    border-color: var(--color-accent);
    box-shadow: 0 4px 12px var(--color-accent-wash);
    transform: translateY(-2px);
  }

  // 自定义可点卡片：补键盘焦点环，不改布局尺寸
  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .access-icon {
    font-size: 32px;
  }

  .access-name {
    font-size: 14px;
    color: var(--color-ink);
    font-weight: 500;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  padding: 20px;
  text-align: center;

  .stat-value {
    font-size: 32px;
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    color: var(--color-muted);
  }
}

.recent-learning {
  background: var(--color-paper);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px color-mix(in oklab, var(--color-graphite) 5%, transparent);
}

:deep(.el-empty) {
  padding: 24px 0;
}

:deep(.el-empty__description p) {
  color: var(--color-muted);
  font-size: 14px;
}
</style>
