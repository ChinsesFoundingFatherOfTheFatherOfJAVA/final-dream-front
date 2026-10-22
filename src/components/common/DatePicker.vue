<template>
  <el-date-picker
    :model-value="modelValue"
    type="datetime"
    format="YYYY-MM-DD HH:mm"
    value-format="YYYY-MM-DD HH:mm"
    :placeholder="placeholder"
    class="date-picker"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  showTime?: boolean
}

withDefaults(defineProps<Props>(), {
  placeholder: '请选择日期',
  showTime: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const onUpdate = (value: string | null) => emit('update:modelValue', value ?? '')
</script>

<style scoped lang="scss">
.date-picker {
  width: 100%;
}
</style>
