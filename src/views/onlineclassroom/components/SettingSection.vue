<template>
  <section class="setting-section">
    <el-button class="section-header" @click="emit('toggle')">
      <span class="section-title">
        <span class="title-bar"></span>
        <strong>{{ title }}</strong>
      </span>
      <span class="toggle-link">{{ expanded ? '收起' : '展开' }}</span>
    </el-button>

    <ExpandTransition>
      <div v-if="expanded" class="section-body">
        <slot />
        <div v-if="showApply" class="section-footer">
          <el-button class="apply-btn" :disabled="loading" @click="emit('apply')">
            {{ loading ? '保存中...' : '应用' }}
          </el-button>
        </div>
      </div>
    </ExpandTransition>
  </section>
</template>

<script setup lang="ts">
import ExpandTransition from '@/components/common/ExpandTransition.vue'
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
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
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
  color: var(--color-ink);
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
  background: var(--color-accent);
}

.toggle-link {
  margin-left: auto;
  color: var(--color-accent);
  font-size: 13px;
}

.section-body {
  padding: 4px 20px 20px;
  border-top: var(--rule-hair) solid var(--color-rule);
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
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) { background: var(--color-accent-deep); }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
