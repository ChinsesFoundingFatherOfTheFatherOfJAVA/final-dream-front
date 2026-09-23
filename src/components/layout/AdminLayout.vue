<template>
  <div class="admin-layout" :class="{ 'full-bleed-layout': isFullBleed }">
    <AdminTopNav />
    <main class="main-content" :class="{ 'full-bleed': isFullBleed }">
      <router-view />
    </main>
    <footer v-if="!isFullBleed" class="footer">
      <p>2026 杰克数字人陪练</p>
    </footer>
    <div class="floating-tool">
      <div class="tool-icon">🤖</div>
      <div class="tool-text">平台操作<br/>答疑助手</div>
    </div>
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

  // 铺满模式：锁定视口高度（min-height 只是下限，内容高时会被撑破导致整页滚动）
  &.full-bleed-layout {
    height: 100vh;
    min-height: 100vh;
  }
}

.main-content {
  flex: 1;
  padding: 24px;
  background: #f5f5f5;

  // 铺满模式：无内边距、占满顶栏以下空间（flex 列容器），由模块内部滚动
  // 注意不用 height:calc——flex:1 的 flex-basis:0 会覆盖 height，且该高度对子元素百分比不生效
  &.full-bleed {
    padding: 0;
    min-height: 0;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
  }
}

.footer {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.floating-tool {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  z-index: 1000;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .tool-icon {
    font-size: 24px;
  }

  .tool-text {
    font-size: 12px;
    color: #333;
    line-height: 1.4;
  }
}
</style>
