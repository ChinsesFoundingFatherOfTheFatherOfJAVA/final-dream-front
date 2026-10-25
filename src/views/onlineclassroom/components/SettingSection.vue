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
  border-radius: 8px;
  background: #fff;
}

.section-header {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: #253047;
  text-align: left;
  cursor: pointer;

  // el-button 会把内容包进一层自带 span，flex 布局必须作用在它上面，
  // 否则"展开/收起"会紧贴标题（外层的 space-between 够不到孙级）
  :deep(> span) {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: space-between;
  }
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
  margin-left: auto;
  color: #2e7cf6;
  font-size: 13px;
}

.section-body {
  padding: 4px 20px 20px;
  border-top: 1px solid #eef1f6;
}

.section-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.apply-btn {
  height: 32px;
  padding: 0 20px;
  border: none;
  border-radius: 4px;
  background: #2e7cf6;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) { background: #1a66d9; }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
