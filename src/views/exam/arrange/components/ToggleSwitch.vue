<template>
  <!-- 开关（Element 同款样式）：兼容布尔、0/1 和字符串枚举值 -->
  <label class="toggle" :class="{ disabled }">
    <input type="checkbox" :checked="on" :disabled="disabled"
           @change="onChange(Boolean(($event.target as HTMLInputElement).checked))" />
    <span class="slider"></span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ToggleValue = number | string | boolean

const props = withDefaults(defineProps<{
  modelValue: ToggleValue
  disabled?: boolean
  activeValue?: ToggleValue
  inactiveValue?: ToggleValue
}>(), {
  activeValue: 1,
  inactiveValue: 0
})
const emit = defineEmits<{ 'update:modelValue': [value: ToggleValue] }>()

const on = computed(() => props.modelValue === props.activeValue)
const onChange = (checked: boolean) =>
  emit('update:modelValue', checked ? props.activeValue : props.inactiveValue)
</script>

<style scoped lang="scss">
.toggle {
  display: inline-flex;
  flex-shrink: 0;
  width: 52px;
  height: 28px;
  cursor: pointer;

  input { position: absolute; opacity: 0; width: 0; height: 0; }

  .slider {
    position: relative;
    width: 52px;
    height: 28px;
    border-radius: 14px;
    background: #d9d9d9;
    transition: background .16s ease;

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
      transition: transform .16s ease;
    }
  }

  input:checked + .slider {
    background: #1890ff;
    &::after { transform: translateX(24px); }
  }

  &.disabled { cursor: not-allowed; opacity: .5; }

  // 内部 checkbox 被 width/height:0 隐藏，键盘聚焦时用滑块描边提供可见焦点
  &:has(input:focus-visible) .slider {
    box-shadow: 0 0 0 2px rgba(24, 144, 255, .35);
  }
}
</style>
