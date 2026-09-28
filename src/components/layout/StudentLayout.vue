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
.student-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.main-content {
  flex: 1;
  padding: 24px;
}

@media (max-width: 760px) {
  .main-content {
    padding: 16px 12px;
  }
}
</style>
