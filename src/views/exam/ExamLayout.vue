<template>
  <!-- 测练中心布局（截图02：题库分组菜单 + 五个未建设项 → PlaceholderPage） -->
  <div class="exam-layout">
    <header class="exam-header">
      <button type="button" class="back-btn" @click="router.push('/homepage')">‹</button>
      <div>
        <h1>测练中心</h1>
        <p>题库与考试管理</p>
      </div>
    </header>
    <div class="exam-body">
      <aside class="exam-sidebar">
        <div class="menu-group">
          <p class="group-title">题库</p>
          <router-link to="/exam/queslib" class="menu-item" :class="{ active: route.path.startsWith('/exam/queslib') }">
            <span class="menu-icon">▦</span>
            <span>题库管理</span>
          </router-link>
        </div>
        <router-link
          v-for="item in pendingMenus"
          :key="item.path"
          :to="item.path"
          class="menu-item pending"
          :class="{ active: route.path === item.path }"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span class="pending-arrow">›</span>
        </router-link>
      </aside>
      <main class="exam-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/** 未建设菜单（点击 PlaceholderPage"功能建设中"，01 §2） */
const pendingMenus = [
  { path: '/exam/paper', label: '组卷', icon: '▥' },
  { path: '/exam/exam-mgmt', label: '考试管理', icon: '▦' },
  { path: '/exam/practice', label: '练习管理', icon: '▤' },
  { path: '/exam/feedback', label: '题目反馈', icon: '✎' },
  { path: '/exam/field', label: '字段设置', icon: '⚙' }
]
</script>

<style scoped lang="scss">
.exam-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
  color: #253047;
}

.exam-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: #fff;
  border-bottom: 1px solid #e6eaf1;

  h1 { margin: 0; font-size: 18px; }
  p { margin: 3px 0 0; color: #8a92a5; font-size: 12px; }
}

.back-btn {
  width: 30px; height: 30px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  color: #5b6478;
  cursor: pointer;
  font-size: 16px;

  &:hover { color: #1890ff; border-color: #1890ff; }
}

.exam-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.exam-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e6eaf1;
  padding: 12px 0;
  overflow-y: auto;
}

.menu-group {
  margin-bottom: 8px;
}

.group-title {
  margin: 0;
  padding: 6px 22px 4px;
  font-size: 11px;
  color: #a0a7b8;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  font-size: 14px;
  color: #4a5368;
  text-decoration: none;
  position: relative;

  .menu-icon { width: 18px; text-align: center; color: #8a92a5; }

  &:hover { background: #f2f6ff; color: #1890ff; }

  &.active {
    background: #e8f1ff;
    color: #1890ff;
    font-weight: 500;

    &::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 2px;
      background: #1890ff;
    }
  }
}

.pending-arrow { margin-left: auto; color: #c2c8d4; font-size: 12px; }

.exam-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
