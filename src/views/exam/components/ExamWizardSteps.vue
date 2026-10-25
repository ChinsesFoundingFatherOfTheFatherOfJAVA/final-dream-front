<template>
  <!-- 创建考试三步条（截图25）：创建试卷 › 编辑试题 › 发布考试。
       创建向导页和各试卷编辑页共用，保证三步之间的切换方式一致。 -->
  <ol class="wizard-steps">
    <li v-for="s in STEPS" :key="s.no" class="wizard-step"
        :class="{ active: current === s.no, done: current > s.no, clickable: !!canJump?.(s.no) }"
        :role="canJump?.(s.no) ? 'button' : undefined"
        :tabindex="canJump?.(s.no) ? 0 : undefined"
        @click="onJump(s.no)"
        @keydown.enter.prevent="onJump(s.no)">
      <span class="step-no" aria-hidden="true">{{ s.no }}</span>
      <span class="step-label">{{ s.label }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
const STEPS = [
  { no: 1, label: '创建试卷' },
  { no: 2, label: '编辑试题' },
  { no: 3, label: '发布考试' }
]

const props = defineProps<{
  current: number
  /** 哪些步骤允许点击跳转；不传则三步都不可点 */
  canJump?: (no: number) => boolean
}>()
const emit = defineEmits<{ jump: [no: number] }>()

const onJump = (no: number) => {
  if (props.canJump?.(no)) emit('jump', no)
}
</script>

<style scoped lang="scss">
.wizard-steps {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wizard-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #8a92a5;
  white-space: nowrap;

  & + &::before {
    content: '›';
    margin: 0 10px 0 4px;
    color: #c2c8d4;
  }

  .step-no {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 1px solid #d9d9d9;
    border-radius: 50%;
    background: #f5f7fa;
    color: #8a92a5;
    font-size: 11px;
    line-height: 1;
  }

  &.done {
    color: #1890ff;
    .step-no { border-color: #bcd7ff; background: #e8f1ff; color: #1890ff; }
  }

  &.active {
    color: #1890ff;
    font-weight: 600;
    .step-no { border-color: #1890ff; background: #1890ff; color: #fff; }
  }

  &.clickable {
    cursor: pointer;
    &:hover { color: #1890ff; }
    &:focus-visible {
      outline: 2px solid #1890ff;
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
}
</style>
