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
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  text-align: center;

  strong {
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: 18px;
  }

  p {
    margin: 10px 0 0;
    color: var(--color-muted);
    font-size: 13px;
  }
}
</style>
