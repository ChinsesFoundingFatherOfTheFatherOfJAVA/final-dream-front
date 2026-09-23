<template>
  <div class="actual-training-app">
    <!-- FP-02 左侧菜单栏：训练主题真实，其余占位 -->
    <aside class="side-menu">
      <h3 class="menu-title">AI实战训练场</h3>
      <nav class="menu-list">
        <router-link to="/sparring/freesimulate/topic" class="menu-item active-item">
          <span class="menu-icon">🎯</span>
          <span class="menu-text">训练主题</span>
        </router-link>
        <div class="menu-item" @click="comingSoon('功能建设中')">
          <span class="menu-icon">📊</span>
          <span class="menu-text">数据分析</span>
          <span class="chevron">▾</span>
        </div>
        <div class="menu-item" @click="comingSoon('功能建设中')">
          <span class="menu-icon">🗂️</span>
          <span class="menu-text">素材库</span>
          <span class="chevron">▾</span>
        </div>
        <div class="menu-item" @click="comingSoon('功能建设中')">
          <span class="menu-icon">⚙️</span>
          <span class="menu-text">设置</span>
          <span class="chevron">▾</span>
        </div>
      </nav>
      <div class="menu-footer">
        <button class="collapse-btn" title="收起菜单" @click="comingSoon('功能建设中')">⇤</button>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { comingSoon } from './components/ui'
</script>

<style scoped lang="scss">
.actual-training-app {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #fff;
  overflow: hidden;
}

.side-menu {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;

  .menu-title {
    padding: 16px 20px;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
    border-bottom: 1px solid #e8e8e8;
  }

  .menu-list {
    flex: 1;
    padding: 8px 0;
  }

  .menu-footer {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;

    .collapse-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      background: #fff;
      color: #999;
      cursor: pointer;
      font-size: 15px;

      &:hover { color: #1890ff; border-color: #1890ff; }
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;

  .menu-icon { font-size: 18px; }
  .chevron { font-size: 11px; margin-left: auto; color: #bbb; }

  &:hover { background: #f5f5f5; color: #1890ff; }

  &.active-item,
  &.router-link-active {
    background: #e6f7ff;
    color: #1890ff;
    border-right: 3px solid #1890ff;
  }
}

.app-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: #f5f6f8;
}
</style>
