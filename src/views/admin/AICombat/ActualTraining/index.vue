<template>
  <div class="actual-training-app">
    <!-- FP-02 左侧菜单栏：训练主题真实，其余占位 -->
    <aside ref="sideRef" class="side-menu">
      <span class="menu-indicator" :style="indicatorStyle" aria-hidden="true"></span>
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
import { computed, ref } from 'vue'
import { useActiveIndicator } from '@/utils/useActiveIndicator'
import { comingSoon } from './components/ui'

// 批注（2026-11-20）：侧栏 tab 改「纵向滑动侧边线」——激活项之间一条指示线滑动过渡
const sideRef = ref<HTMLElement | null>(null)
const { position: sideY, size: sideH, shown: sideShown } = useActiveIndicator(sideRef, {
  axis: 'y',
  itemSelector: '.menu-item.router-link-active, .menu-item.active-item'
})
const indicatorStyle = computed(() => ({
  transform: `translateY(${sideY.value + 8}px)`,
  height: `${Math.max(0, sideH.value - 16)}px`,
  opacity: sideShown.value ? 1 : 0
}))
</script>

<style scoped lang="scss">
.actual-training-app {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--color-paper);
  overflow: hidden;
}

/* 纵向滑动指示线：原本每项自带右侧 3px 静态条，现在由这一条统一滑动 */
.menu-indicator {
  position: absolute;
  right: 0;
  top: 0;
  width: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  pointer-events: none;
  transition:
    transform var(--dur-short) var(--ease-out),
    height var(--dur-short) var(--ease-out),
    opacity var(--dur-micro) var(--ease-out);
}

.side-menu {
  position: relative;
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
  /* 右侧 3px 常驻透明占位：信号条改由单条滑动指示线给出后，文字不会左右跳动 */
  border-right: 3px solid transparent;
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
