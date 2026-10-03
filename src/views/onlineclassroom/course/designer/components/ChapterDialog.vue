<template>
  <!-- 截图12：添加/编辑章节弹窗（名称必填 0/200；说明 0/500 且填了至少 5 字） -->
  <teleport to="body">
    <div v-if="visible" class="chapter-mask" @click.self="emit('close')">
      <section class="chapter-dialog">
        <h3>{{ isEdit ? '编辑章节' : '添加章节' }}</h3>
        <div class="form">
          <label class="field">
            <span class="label">章节名称<em>*</em></span>
            <input v-model.trim="name" type="text" maxlength="200" placeholder="请输入章节名称" />
            <small class="counter">{{ name.length }}/200</small>
          </label>
          <label class="field">
            <span class="label">章节说明</span>
            <textarea v-model="description" rows="4" maxlength="500" placeholder="选填，不少于 5 字"></textarea>
            <small class="counter">{{ description.length }}/500</small>
            <small v-if="descriptionError" class="error">{{ descriptionError }}</small>
          </label>
        </div>
        <footer>
          <button type="button" @click="emit('close')">取消</button>
          <button type="button" class="primary" @click="confirm">确定</button>
        </footer>
      </section>
    </div>
  </teleport>
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
</script>

<style scoped lang="scss">
.chapter-mask {
  position: fixed;
  inset: 0;
  z-index: 3600;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.4);
}

.chapter-dialog {
  width: 480px;
  max-width: calc(100vw - 32px);
  padding: 24px 28px 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.2);

  h3 {
    margin: 0 0 18px;
    color: #253047;
    font-size: 16px;
  }
}

.field {
  display: block;
  margin-bottom: 16px;

  .label {
    display: block;
    margin-bottom: 7px;
    color: #4d5568;
    font-size: 13px;

    em {
      margin-left: 2px;
      color: #f45b69;
      font-style: normal;
    }
  }

  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #30384a;
    font-size: 13px;
    outline: none;
    resize: vertical;

    &:focus {
      border-color: #2e7cf6;
    }
  }

  .counter {
    display: block;
    margin-top: 4px;
    color: #a2a9b7;
    font-size: 11px;
    text-align: right;
  }

  .error {
    display: block;
    margin-top: 2px;
    color: #f45b69;
    font-size: 12px;
  }
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;

  button {
    height: 34px;
    padding: 0 18px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &.primary {
      border-color: #2e7cf6;
      background: #2e7cf6;
      color: #fff;
    }
  }
}
</style>
