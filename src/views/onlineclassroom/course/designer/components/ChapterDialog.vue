<template>
  <!-- 截图12：添加/编辑章节弹窗（名称必填 0/200；说明 0/500 且填了至少 5 字） -->
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑章节' : '添加章节'"
    width="480px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div class="form">
      <label class="field">
        <span class="label">章节名称<em>*</em></span>
        <el-input
          v-model.trim="name"
          maxlength="200"
          show-word-limit
          placeholder="请输入章节名称"
        />
      </label>
      <label class="field">
        <span class="label">章节说明</span>
        <el-input
          v-model="description"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="选填，不少于 5 字"
        />
        <small v-if="descriptionError" class="error">{{ descriptionError }}</small>
      </label>
    </div>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 章节弹窗（CS-07a）：添加与编辑共用，编辑时由主页回显 initial。
 * 校验口径与接口文档 FP-CS-07a-2 一致：章节名必填≤200；说明填了才校验≥5 字。
 */
const props = defineProps<{
  visible: boolean
  /** 编辑时回显；添加时传 null */
  initial: { name: string; description: string } | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [value: { name: string; description: string }]
}>()

const isEdit = computed(() => props.initial !== null)
const name = ref('')
const description = ref('')

// 弹窗打开时用 initial 回显（无 initial 则清空），避免上次输入残留
watch(
  () => props.visible,
  visible => {
    if (!visible) return
    name.value = props.initial?.name ?? ''
    description.value = props.initial?.description ?? ''
  },
  { immediate: true }
)

// 说明填了才校验≥5 字（trim 后比较，空串/纯空格视为未填）
const descriptionError = computed(() => {
  const text = description.value.trim()
  if (text && text.length < 5) return '章节说明不少于 5 字'
  return ''
})

function confirm() {
  if (!name.value) return
  if (descriptionError.value) return
  emit('confirm', { name: name.value, description: description.value.trim() })
}

function handleVisibleChange(visible: boolean) {
  if (!visible) emit('close')
}
</script>

<style scoped lang="scss">
.field {
  display: block;
  margin-bottom: 16px;

  .label {
    display: block;
    margin-bottom: 7px;
    color: var(--color-ink-2);
    font-size: 13px;

    em {
      margin-left: 2px;
      color: var(--color-accent-deep);
      font-style: normal;
    }
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
  }

  .error {
    display: block;
    margin-top: 2px;
    color: var(--color-accent-deep);
    font-size: 12px;
  }
}
</style>
