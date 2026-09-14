<template>
  <div class="project-overview">
    <div class="empty-state">
      <span class="empty-icon">📊</span>
      <p class="empty-text">整体概览功能开发中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.project-overview {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 16px;
    color: #999;
    margin: 0;
  }
}
</style>
