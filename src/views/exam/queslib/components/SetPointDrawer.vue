<template>
  <!-- FP-15 设置考核点抽屉（截图28）：考核点多选，**不能编辑/新增**；
       确定后覆盖勾选试题的考核点关联（原有考核点会被这个选择整体替换）。 -->
    <el-drawer
    :model-value="true"
    size="560px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>设置考核点</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <p class="tip">已选 {{ count }} 道试题，确认后这些试题的考核点将**统一替换**为下方勾选项。</p>

        <div class="point-list">
          <label v-for="point in points" :key="point.id" class="point-row">
            <el-checkbox :model-value="pickedIds.includes(point.id)"
                   @change="toggle(point.id, Boolean($event))" />
            <span class="point-name">{{ point.name }}</span>
            <span v-if="point.defaultPoint === 1" class="default-tag">默认</span>
          </label>
          <p v-if="!loading && !points.length" class="empty">该题库下暂无考核点</p>
        </div>
      </div>

      <div class="drawer-footer">
        <span class="picked-count">已勾选 {{ pickedIds.length }} 个考核点</span>
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="saving" @click="confirm">
          {{ saving ? '设置中…' : '确定' }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { batchQues, getPointList, type PointItem } from '@/api/exam'

const props = defineProps<{ libId: string; quesIds: string[]; count?: number }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const points = ref<PointItem[]>([])
const pickedIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

const count = () => props.count ?? props.quesIds.length

const toggle = (id: string, checked: boolean) => {
  pickedIds.value = checked
    ? [...pickedIds.value, id]
    : pickedIds.value.filter(pid => pid !== id)
}

const confirm = async () => {
  saving.value = true
  try {
    await batchQues('setPoint', props.quesIds, { pointIds: pickedIds.value })
    toast.success(`已为 ${count()} 道试题设置考核点`)
    emit('saved')
    emit('close')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    points.value = await getPointList(props.libId)
  } catch { /* 拦截器已提示 */ } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.drawer { width: 560px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 14px 20px; }

.tip { margin: 0; font-size: 12px; color: #8a92a5; line-height: 1.8; }

.point-list { flex: 1; min-height: 0; overflow-y: auto; border: 1px solid #e6eaf1; border-radius: 6px; }

.point-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; font-size: 13px; color: #4a5368;
  border-bottom: 1px solid #f2f4f8; cursor: pointer;

  &:hover { background: #f7f9fd; }
  input { accent-color: #1890ff; }
  .point-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .default-tag {
    padding: 1px 6px; border-radius: 3px; background: #f0f5ff;
    border: 1px solid #d6e4ff; color: #2f54eb; font-size: 12px;
  }
}

.empty { text-align: center; color: #b0b7c3; font-size: 13px; padding: 40px 0; margin: 0; }

.drawer-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-top: 1px solid #eee;

  .picked-count { margin-right: auto; font-size: 12px; color: #8a92a5; }
}

.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>