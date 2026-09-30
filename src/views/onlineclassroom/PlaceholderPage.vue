<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <strong>{{ title }}</strong>
      <p>功能建设中</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped lang="scss">
.placeholder-page {
  min-height: 100%;
  display: grid;
  place-items: center;
}

.placeholder-card {
  min-width: 280px;
  padding: 42px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  text-align: center;

  strong {
    color: #253047;
    font-size: 18px;
  }

  p {
    margin: 10px 0 0;
    color: #98a1b2;
    font-size: 13px;
  }
}
</style>
