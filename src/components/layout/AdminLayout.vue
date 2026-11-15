<template>
  <div class="admin-layout" :class="{ 'full-bleed-layout': isFullBleed }">
    <AdminTopNav />
    <main class="main-content" :class="{ 'full-bleed': isFullBleed }">
      <router-view />
    </main>
    <footer v-if="!isFullBleed" class="footer">
      <p>2026 杰克数字人陪练 · Animated icons by <a class="attribution" href="https://lordicon.com" target="_blank" rel="noopener">Lordicon</a></p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminTopNav from './AdminTopNav.vue'

const route = useRoute()
// fullBleed 页面（如 AI实战训练场）：内容铺满顶栏以下的整个窗口，自身管理滚动
const isFullBleed = computed(() => route.meta.fullBleed === true)
</script>

<style scoped lang="scss">
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-display);

  // 铺满模式：锁定视口高度（min-height 只是下限，内容高时会被撑破导致整页滚动）
  &.full-bleed-layout {
    height: 100vh;
    min-height: 100vh;
  }
}

.main-content {
  flex: 1;
  padding: var(--space-lg);
  // Hallmark Cobalt：内容区是冷灰工作面（paper-2），业务卡片承载纸面色
  background: var(--color-paper-2);

  // 铺满模式：无内边距、占满顶栏以下空间（flex 列容器），由模块内部滚动
  // 注意不用 height:calc——flex:1 的 flex-basis:0 会覆盖 height，且该高度对子元素百分比不生效
  &.full-bleed {
    padding: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--color-paper);
    display: flex;
    flex-direction: column;
  }
}

.footer {
  padding: var(--space-lg);
  text-align: center;
  color: var(--color-muted);
  font-size: var(--text-xs);
  background: var(--color-paper);
  border-top: 1px solid var(--color-rule);
}

@media (max-width: 760px) {
  .main-content {
    padding: 16px 12px;
  }
}
</style>
