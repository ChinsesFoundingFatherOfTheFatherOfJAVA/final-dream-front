<template>
  <div class="actual-training-app">
    <!-- FP-02 左侧菜单栏：训练主题真实，其余占位 -->
    <aside class="side-menu">
      <h3 class="menu-title">AI实战训练场</h3>
      <nav class="menu-list">
        <router-link to="/sparring/freesimulate/topic" class="menu-item active-item">
          <el-icon class="menu-icon" aria-hidden="true"><Aim /></el-icon>
          <span class="menu-text">训练主题</span>
        </router-link>
        <!-- 占位菜单：仍可聚焦触发提示，保证键盘可达 -->
        <div class="menu-item" role="button" tabindex="0" @keydown.enter.prevent="comingSoon('功能建设中')" @click="comingSoon('功能建设中')">
          <el-icon class="menu-icon" aria-hidden="true"><DataAnalysis /></el-icon>
          <span class="menu-text">数据分析</span>
          <span class="chevron" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </div>
        <div class="menu-item" role="button" tabindex="0" @keydown.enter.prevent="comingSoon('功能建设中')" @click="comingSoon('功能建设中')">
          <el-icon class="menu-icon" aria-hidden="true"><Folder /></el-icon>
          <span class="menu-text">素材库</span>
          <span class="chevron" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </div>
        <div class="menu-item" role="button" tabindex="0" @keydown.enter.prevent="comingSoon('功能建设中')" @click="comingSoon('功能建设中')">
          <el-icon class="menu-icon" aria-hidden="true"><Setting /></el-icon>
          <span class="menu-text">设置</span>
          <span class="chevron" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </div>
      </nav>
      <div class="menu-footer">
        <el-button class="collapse-btn" aria-label="收起菜单" title="收起菜单" @click="comingSoon('功能建设中')">⇤</el-button>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Aim, DataAnalysis, Folder, Setting } from '@element-plus/icons-vue'
import { comingSoon } from './components/ui'
</script>

<style scoped lang="scss">
.actual-training-app {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--color-paper);
  overflow: hidden;
}

.side-menu {
  // 与原平台左导航同宽（原平台 aside 实测 184px），内容区宽度才对得上视觉契约
  width: 184px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-rule);

  .menu-title {
    padding: 16px 20px;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0;
    border-bottom: 1px solid var(--color-rule);
  }

  .menu-list {
    flex: 1;
    padding: 8px 0;
  }

  .menu-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--color-paper-2);

    .collapse-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--color-rule);
      border-radius: 4px;
      background: var(--color-paper);
      color: var(--color-muted);
      cursor: pointer;
      font-size: 15px;

      &:hover { color: var(--color-accent); border-color: var(--color-accent); }
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  font-size: 15px;
  color: var(--color-muted);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;

  .menu-icon { font-size: 18px; }
  .chevron { font-size: 11px; margin-left: auto; color: var(--color-rule-2); }

  &:hover { background: var(--color-paper-2); color: var(--color-accent); }

  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }

  &.active-item,
  &.router-link-active {
    background: var(--color-accent-wash);
    color: var(--color-accent);
    border-right: 3px solid var(--color-accent);
  }
}

.app-content {
  padding: 0 12px;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: var(--color-paper-2);
}
</style>
