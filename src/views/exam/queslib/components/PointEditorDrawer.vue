<template>
  <!-- 考核点编辑抽屉（对齐原平台）：列表可滚动，悬浮出现编辑/删除图标，
       点编辑行内变输入框，底部「+ 添加考核点」。每次改动即时落库（/point/batch 全量覆盖）。 -->
  <div class="drawer-overlay">
    <div class="drawer" @click.self="noop">
      <div class="drawer-header">
        <span>考核点编辑</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div v-for="point in list" :key="point.id" class="point-row"
             @mouseenter="hoverId = point.id" @mouseleave="hoverId = ''">
          <template v-if="editingId === point.id">
            <input v-model.trim="editingName" placeholder="考核点名称" @keyup.enter="confirmEdit(point)" />
            <button class="icon-btn" type="button" @click="confirmEdit(point)">✓</button>
            <button class="icon-btn" type="button" @click="editingId = ''">×</button>
          </template>
          <template v-else>
            <span class="point-name">{{ point.name }}</span>
            <span v-if="point.defaultPoint === 1" class="default-tag">默认</span>
            <span v-show="hoverId === point.id" class="row-actions">
              <button class="icon-btn" type="button" title="编辑" @click="startEdit(point)">✎</button>
              <button class="icon-btn danger" type="button" title="删除"
                      :disabled="point.defaultPoint === 1" @click="remove(point)">🗑</button>
            </span>
          </template>
        </div>

        <div v-if="adding" class="point-row">
          <input v-model.trim="newName" placeholder="考核点名称" @keyup.enter="confirmAdd" />
          <button class="icon-btn" type="button" @click="confirmAdd">✓</button>
          <button class="icon-btn" type="button" @click="adding = false; newName = ''">×</button>
        </div>

        <p v-if="!loading && !list.length" class="empty">该题库下暂无考核点</p>
      </div>

      <div class="drawer-footer">
        <button class="btn" type="button" @click="adding = true; newName = ''">+ 添加考核点</button>
        <span class="tip">改动即时保存</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import { getPointList, savePointBatch, type PointItem } from '@/api/exam'

/**
 * 考核点编辑抽屉（FP-09）。
 * /point/batch 是全量覆盖式接口：每次改动都把"当前完整清单"提交上去，
 * 所以增/改/删共用同一个 persist()。
 */
const props = defineProps<{ libId: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const list = ref<PointItem[]>([])
const hoverId = ref('')
const editingId = ref('')
const editingName = ref('')
const adding = ref(false)
const newName = ref('')
const loading = ref(false)

const noop = () => { /* 点遮罩不关闭，避免误触丢改动 */ }

const load = async () => {
  loading.value = true
  try {
    list.value = await getPointList(props.libId)
  } finally {
    loading.value = false
  }
}

/** 全量覆盖提交：把 list 映射成 {id,name} 数组。 */
const persist = async (next: { id?: string; name: string }[]) => {
  try {
    await savePointBatch(props.libId, next)
    await load()
    emit('changed')
  } catch { /* 拦截器已提示 */ }
}

const startEdit = (point: PointItem) => {
  editingId.value = point.id
  editingName.value = point.name
}

const confirmEdit = async (point: PointItem) => {
  const name = editingName.value.trim()
  if (!name) {
    toast.warn('考核点名称不能为空')
    return
  }
  await persist(list.value.map(p => ({ id: p.id, name: p.id === point.id ? name : p.name })))
  editingId.value = ''
  toast.success('考核点已更新')
}

const remove = async (point: PointItem) => {
  const ok = await confirmDialog({
    title: '确认删除该考核点？',
    message: `考核点「${point.name}」删除后，已关联试题的该考核点标记也会消失`,
    danger: true
  })
  if (!ok) return
  await persist(list.value.filter(p => p.id !== point.id).map(p => ({ id: p.id, name: p.name })))
  toast.success('考核点已删除')
}

const confirmAdd = async () => {
  const name = newName.value.trim()
  if (!name) {
    toast.warn('请输入考核点名称')
    return
  }
  if (list.value.some(p => p.name === name)) {
    toast.warn('已存在同名考核点')
    return
  }
  await persist([...list.value.map(p => ({ id: p.id, name: p.name })), { name }])
  adding.value = false
  newName.value = ''
  toast.success('考核点已添加')
}

onMounted(load)
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  justify-content: flex-end;
  z-index: 3300;
}

.drawer {
  width: 520px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 12px; }

.point-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #4a5368;

  &:hover { background: #f7f9fd; }

  input {
    flex: 1;
    border: 1px solid #1890ff;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 13px;
    outline: none;
  }

  .point-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .default-tag {
    padding: 1px 6px;
    border-radius: 3px;
    background: #f0f5ff;
    border: 1px solid #d6e4ff;
    color: #2f54eb;
    font-size: 11px;
  }

  .row-actions { display: inline-flex; gap: 4px; }
}

.icon-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #4a5368;
  cursor: pointer;

  &.danger { color: #f5222d; }
  &:disabled { opacity: .35; cursor: not-allowed; }
}

.empty { text-align: center; color: #b0b7c3; font-size: 13px; padding: 40px 0; }

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #eee;

  .tip { margin-left: auto; font-size: 11px; color: #a0a7b8; }
}

.btn {
  padding: 7px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4a5688;
  cursor: pointer;

  &:hover { border-color: #1890ff; color: #1890ff; }
}
</style>