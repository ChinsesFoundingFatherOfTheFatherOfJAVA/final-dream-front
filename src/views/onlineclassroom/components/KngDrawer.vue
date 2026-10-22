<template>
  <el-drawer
    :model-value="visible"
    :size="`${width}px`"
    class="kng-drawer"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
    <template #header>
      <div class="drawer-header">
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean
  title: string
  subtitle?: string
  width?: number
  zIndex?: number
}>(), {
  subtitle: '',
  width: 560,
  zIndex: 3000
})

const emit = defineEmits<{ close: [] }>()

const handleVisibleChange = (visible: boolean) => {
  if (!visible) emit('close')
}
</script>

<style scoped lang="scss">
.kng-drawer {
  max-width: 96vw;

  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e9edf4;
  }

  :deep(.el-drawer__body) {
    padding: 18px 22px;
    overflow-y: auto;
  }

  :deep(.el-drawer__footer) {
    padding: 14px 22px;
    border-top: 1px solid #e9edf4;
  }
}

.drawer-header {
  h3 {
    margin: 0;
    color: #253047;
    font-size: 16px;
  }

  p {
    margin: 5px 0 0;
    color: #8a92a5;
    font-size: 12px;
  }

}
</style>
