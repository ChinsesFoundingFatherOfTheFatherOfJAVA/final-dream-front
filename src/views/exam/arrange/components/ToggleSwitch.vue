<template>
  <!-- 开关（Element 同款样式）：值统一用 0/1，和后端 JSON 设置保持一致 -->
  <label class="toggle" :class="{ disabled }">
    <el-checkbox :model-value="on" :disabled="disabled"
           @change="onChange(Boolean($event))" />
    <span class="slider"></span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ modelValue: number | boolean; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const on = computed(() => props.modelValue === 1 || props.modelValue === true)
const onChange = (checked: boolean) => emit('update:modelValue', checked ? 1 : 0)
</script>

<style scoped lang="scss">
.toggle {
  display: inline-flex;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  cursor: pointer;

  input { position: absolute; opacity: 0; width: 0; height: 0; }

  .slider {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background: #d9d9d9;
    transition: background .16s ease;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
      transition: transform .16s ease;
    }
  }

  input:checked + .slider {
    background: #1890ff;
    &::after { transform: translateX(16px); }
  }

  &.disabled { cursor: not-allowed; opacity: .5; }

  // 内部 checkbox 被 width/height:0 隐藏，键盘聚焦时用滑块描边提供可见焦点
  &:has(input:focus-visible) .slider {
    box-shadow: 0 0 0 2px rgba(24, 144, 255, .35);
  }
}
</style>
