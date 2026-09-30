<template>
  <teleport to="body">
    <div v-if="visible" class="dialog-mask" @click.self="emit('close')">
      <section class="dialog-card">
        <div class="dialog-body">
          <div class="warning-icon">!</div>
          <div>
            <h3>确定下架【{{ courseware?.title || '' }}】吗？</h3>
            <p>检测到课件被课程、培训等业务使用，下架后学员无法再学习，请谨慎操作</p>
            <button type="button" class="detail-link" @click="emit('detail')">查看详情</button>
          </div>
        </div>
        <footer>
          <button type="button" @click="emit('close')">取消</button>
          <button type="button" class="danger" :disabled="remaining > 0" @click="emit('confirm')">
            {{ remaining > 0 ? `下架(${remaining}s)` : '下架' }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CoursewareListItem } from '@/api/courseware'

const props = defineProps<{
  visible: boolean
  courseware: CoursewareListItem | null
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  detail: []
}>()

const remaining = ref(2)
let timer: number | null = null

function stopTimer() {
  if (timer) window.clearInterval(timer)
  timer = null
}

watch(() => props.visible, visible => {
  stopTimer()
  if (!visible) return
  remaining.value = 2
  timer = window.setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) stopTimer()
  }, 1000)
})
</script>

<style scoped lang="scss">
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.34);
}

.dialog-card {
  width: 552px;
  max-width: calc(100vw - 32px);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
}

.dialog-body {
  display: flex;
  gap: 14px;
  padding: 44px 40px 34px;

  h3 {
    margin: 0 0 12px;
    color: #30384a;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #6f788a;
    font-size: 13px;
    line-height: 1.7;
  }
}

.warning-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f59f2f;
  color: #fff;
  font-weight: 700;
}

.detail-link {
  margin-top: 7px;
  padding: 0;
  border: none;
  background: transparent;
  color: #2e7cf6;
  cursor: pointer;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 40px 22px;

  button {
    height: 36px;
    padding: 0 18px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &.danger {
      border-color: #2e7cf6;
      background: #2e7cf6;
      color: #fff;

      &:disabled {
        border-color: #d9deea;
        background: #f2f4f8;
        color: #a6adba;
      }
    }
  }
}
</style>
