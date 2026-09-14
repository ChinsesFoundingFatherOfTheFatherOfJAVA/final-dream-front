<template>
  <div class="my-practice">
    <div class="layout">
      <!-- 左侧用户信息栏 -->
      <aside class="user-sidebar">
        <div class="user-avatar">
          <span class="avatar-text">员</span>
        </div>
        <h3 class="user-name">管理员</h3>
        <div class="user-badges">
          <span class="medal-badge">🏅 0枚勋章</span>
          <span class="level-badge">Lv.2</span>
        </div>
        <div class="user-exp">
          <span class="exp-text">等级经验值 <strong>280</strong>/24000</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 1.2%"></div>
          </div>
        </div>
        <div class="user-stats">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">今日学习</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">获得证书</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">获得积分</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">总学分</span>
          </div>
        </div>
        <div class="user-credits">
          <span class="credits-label">我的学分</span>
          <span class="credits-value">0</span>
          <span class="credits-icon">💎</span>
        </div>
        <div class="pk-ranking">
          <div class="ranking-header">
            <span class="ranking-title">PK榜 ▾</span>
          </div>
          <div class="ranking-content">
            <span class="view-all">查看全部 ></span>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <div class="content-header">
          <div class="header-left">
            <h2 class="page-title">待学习</h2>
            <span class="task-count">学习任务 <strong>1</strong></span>
          </div>
          <div class="header-right">
            <select class="filter-select"><option>全部分类</option></select>
            <select class="filter-select"><option>全部状态</option></select>
            <select class="filter-select"><option>优先级从高到低</option></select>
            <select class="filter-select"><option>全部时间</option></select>
          </div>
        </div>

        <div class="task-list">
          <div v-for="task in tasks" :key="task.id" class="task-card">
            <div class="task-tags">
              <span v-for="tag in task.tags" :key="tag" class="tag" :class="getTagClass(tag)">{{ tag }}</span>
            </div>
            <h4 class="task-title">{{ task.title }}</h4>
            <p class="task-time">{{ task.startTime }} ~ {{ task.endTime }}</p>
          </div>
        </div>
      </main>
    </div>

    <!-- 右侧悬浮工具栏 -->
    <div class="floating-toolbar">
      <div class="tool-item">🤖</div>
      <div class="tool-item">📄</div>
      <div class="tool-item">🎧</div>
      <div class="tool-item">💬</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mockTasks } from '@/mock/data'

const tasks = ref(mockTasks)

const getTagClass = (tag: string) => {
  const map: Record<string, string> = { '培训': 'tag-info', '重要': 'tag-danger' }
  return map[tag] || 'tag-info'
}
</script>

<style scoped lang="scss">
.my-practice { height: 100%; position: relative; }

.layout {
  display: flex;
  height: 100%;
  gap: 24px;
}

.user-sidebar {
  width: 240px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .user-avatar {
    width: 80px; height: 80px; border-radius: 50%; background: #e6f7ff;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    .avatar-text { font-size: 32px; color: #1890ff; font-weight: 500; }
  }

  .user-name { text-align: center; font-size: 16px; font-weight: 600; color: #333; margin: 0 0 12px 0; }

  .user-badges {
    display: flex; justify-content: center; gap: 12px; margin-bottom: 16px;
    .medal-badge { font-size: 12px; color: #faad14; background: #fffbe6; padding: 4px 8px; border-radius: 4px; }
    .level-badge { font-size: 12px; color: #1890ff; background: #e6f7ff; padding: 4px 8px; border-radius: 4px; }
  }

  .user-exp {
    margin-bottom: 20px;
    .exp-text { font-size: 12px; color: #999; display: block; margin-bottom: 8px; strong { color: #333; } }
  }

  .progress-bar { height: 6px; background: #e8e8e8; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: #1890ff; border-radius: 3px; }

  .user-stats {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;
    .stat-item { text-align: center; }
    .stat-value { display: block; font-size: 24px; font-weight: 600; color: #333; margin-bottom: 4px; }
    .stat-label { font-size: 12px; color: #999; }
  }

  .user-credits {
    display: flex; align-items: center; gap: 8px; padding: 12px; background: #f5f5f5;
    border-radius: 8px; margin-bottom: 20px;
    .credits-label { font-size: 14px; color: #333; }
    .credits-value { font-size: 18px; font-weight: 600; color: #1890ff; margin-left: auto; }
    .credits-icon { font-size: 20px; }
  }

  .pk-ranking {
    border-top: 1px solid #e8e8e8; padding-top: 16px;
    .ranking-header { cursor: pointer; .ranking-title { font-size: 14px; font-weight: 500; color: #333; } }
    .ranking-content { margin-top: 12px; .view-all { font-size: 12px; color: #1890ff; cursor: pointer; } }
  }
}

.main-content {
  flex: 1; background: #fff; border-radius: 8px; padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.content-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
  .header-left { display: flex; align-items: center; gap: 16px; }
  .page-title { font-size: 20px; font-weight: 600; color: #333; margin: 0; }
  .task-count { font-size: 14px; color: #999; strong { color: #f5222d; } }
  .header-right { display: flex; gap: 12px; }
}

.filter-select {
  height: 32px; padding: 0 12px; border: 1px solid #d9d9d9; border-radius: 4px;
  font-size: 14px; color: #333; outline: none;
  &:focus { border-color: #1890ff; }
}

.task-list { display: flex; flex-direction: column; gap: 16px; }

.task-card {
  border: 1px solid #e8e8e8; border-radius: 8px; padding: 20px;
  cursor: pointer; transition: all 0.3s;
  &:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-color: #1890ff; }
  .task-tags { display: flex; gap: 8px; margin-bottom: 12px; }
  .task-title { font-size: 14px; font-weight: 500; color: #333; margin: 0 0 8px 0; }
  .task-time { font-size: 12px; color: #999; margin: 0; }
}

.tag {
  padding: 2px 8px; border-radius: 4px; font-size: 12px;
  &.tag-info { background: #f0f0f0; color: #666; }
  &.tag-danger { background: #fff1f0; color: #f5222d; }
}

.floating-toolbar {
  position: fixed; right: 24px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 12px; z-index: 1000;

  .tool-item {
    width: 48px; height: 48px; background: #fff; border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: flex; align-items: center;
    justify-content: center; cursor: pointer; font-size: 20px; transition: all 0.3s;
    &:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transform: scale(1.1); }
  }
}
</style>
