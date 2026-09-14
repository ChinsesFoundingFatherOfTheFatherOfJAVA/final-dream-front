<template>
  <div class="admin-layout">
    <AdminTopNav />
    <main class="main-content">
      <router-view />
    </main>
    <footer class="footer">
      <p>2026 杰克数字人陪练</p>
    </footer>
    <div class="floating-tool">
      <div class="tool-icon">🤖</div>
      <div class="tool-text">平台操作<br/>答疑助手</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AdminTopNav from './AdminTopNav.vue'
</script>

<style scoped lang="scss">
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 24px;
  background: #f5f5f5;
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
