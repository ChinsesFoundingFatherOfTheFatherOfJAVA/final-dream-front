<template>
  <teleport to="body">
    <div v-if="visible" class="kng-drawer-overlay" :style="{ zIndex }" @click.self="emit('close')">
      <aside class="kng-drawer" :style="{ width: `${width}px` }">
        <header class="drawer-header">
          <div>
            <h3>{{ title }}</h3>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
          <button type="button" aria-label="关闭" @click="emit('close')">×</button>
        </header>
        <div class="drawer-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="drawer-footer">
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </teleport>
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
</script>

<style scoped lang="scss">
.kng-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.kng-drawer {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: -14px 0 38px rgba(15, 23, 42, 0.16);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #e9edf4;

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

  button {
    border: none;
    background: transparent;
    color: #8a92a5;
    font-size: 26px;
    cursor: pointer;
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px;
}

.drawer-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid #e9edf4;
}
</style>
