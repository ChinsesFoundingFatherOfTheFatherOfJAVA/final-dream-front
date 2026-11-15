<template>
  <div class="student-layout">
    <StudentTopNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import StudentTopNav from './StudentTopNav.vue'
</script>

<style scoped lang="scss">
// Hallmark Cobalt：内容区是冷灰工作面（paper-2），纸面色交给业务卡片承载
.student-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper-2);
  font-family: var(--font-display);
}

.main-content {
  flex: 1;
  padding: var(--space-lg);
}

@media (max-width: 760px) {
  .main-content {
    padding: 16px 12px;
  }
}
</style>
