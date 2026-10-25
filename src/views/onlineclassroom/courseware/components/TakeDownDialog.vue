<template>
  <el-dialog
    :model-value="visible"
    width="552px"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    @close="emit('close')"
  >
    <template #header>
      <span class="dialog-title">确定下架【{{ courseware?.title || '' }}】吗？</span>
    </template>
    <div class="dialog-body">
      <div class="warning-icon" aria-hidden="true">!</div>
      <div>
        <p>检测到课件被课程、培训等业务使用，下架后学员无法再学习，请谨慎操作</p>
        <el-button link type="primary" class="detail-link" @click="emit('detail')">查看详情</el-button>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" class="danger" :disabled="remaining > 0" @click="emit('confirm')">
        {{ remaining > 0 ? `下架(${remaining}s)` : '下架' }}
      </el-button>
    </template>
  </el-dialog>
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
.dialog-title {
  color: #30384a;
  font-size: 17px;
  font-weight: 600;
}

.dialog-body {
  display: flex;
  gap: 14px;
  padding: 8px 0 10px;

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
}
</style>
