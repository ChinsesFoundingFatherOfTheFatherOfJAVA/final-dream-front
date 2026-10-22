<template>
  <section class="setting-section">
    <el-button class="section-header" @click="emit('toggle')">
      <span class="section-title">
        <span class="title-bar"></span>
        <strong>{{ title }}</strong>
      </span>
      <span class="toggle-link">{{ expanded ? '收起' : '展开' }}</span>
    </el-button>

    <div v-if="expanded" class="section-body">
      <slot />
      <div v-if="showApply" class="section-footer">
        <el-button class="apply-btn" :disabled="loading" @click="emit('apply')">
          {{ loading ? '保存中...' : '应用' }}
        </el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  expanded: boolean
  loading?: boolean
  showApply?: boolean
}>(), {
  loading: false,
  showApply: true
})

const emit = defineEmits<{
  toggle: []
  apply: []
}>()
</script>

<style scoped lang="scss">
.setting-section {
  border: 1px solid #e6eaf1;
  border-radius: 4px;
  background: #fff;
}

.section-header {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: #253047;
  text-align: left;
  cursor: pointer;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.title-bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #2e7cf6;
}

.toggle-link {
  color: #2e7cf6;
  font-size: 12px;
}

.section-body {
  padding: 0 12px 12px;
  border-top: 1px solid #eef1f6;
}

.section-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.apply-btn {
  height: 26px;
  padding: 0 14px;
  border: none;
  border-radius: 3px;
  background: #2e7cf6;
  color: #fff;
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
