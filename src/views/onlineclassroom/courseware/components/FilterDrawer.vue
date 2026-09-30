<template>
  <teleport to="body">
    <div v-if="visible" class="filter-panel" @click.stop>
      <div class="filter-grid">
        <label class="filter-item">
          <span>是否上架</span>
          <select v-model="form.onSale">
            <option :value="null">请选择</option>
            <option :value="1">是</option>
            <option :value="0">否</option>
          </select>
        </label>
        <label class="filter-item">
          <span>是否被课程引用</span>
          <select v-model="form.quoted">
            <option :value="null">请选择</option>
            <option :value="1">是</option>
            <option :value="0">否</option>
          </select>
        </label>
        <label class="filter-item date-item">
          <span>上传时间</span>
          <div class="date-range">
            <input v-model="form.uploadTimeStart" type="date" />
            <i>~</i>
            <input v-model="form.uploadTimeEnd" type="date" />
          </div>
        </label>
        <label class="filter-item date-item">
          <span>更新时间</span>
          <div class="date-range">
            <input v-model="form.updateTimeStart" type="date" />
            <i>~</i>
            <input v-model="form.updateTimeEnd" type="date" />
          </div>
        </label>
      </div>
      <footer>
        <button type="button" class="primary" @click="confirm">确定</button>
        <button type="button" @click="emit('close')">取消</button>
      </footer>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

export interface CoursewareFilters {
  onSale: number | null
  quoted: number | null
  uploadTimeStart: string
  uploadTimeEnd: string
  updateTimeStart: string
  updateTimeEnd: string
}

const props = defineProps<{
  visible: boolean
  modelValue: CoursewareFilters
}>()

const emit = defineEmits<{
  close: []
  confirm: [value: CoursewareFilters]
}>()

const form = reactive<CoursewareFilters>({
  onSale: null,
  quoted: null,
  uploadTimeStart: '',
  uploadTimeEnd: '',
  updateTimeStart: '',
  updateTimeEnd: ''
})

watch(() => [props.visible, props.modelValue], () => {
  if (props.visible) Object.assign(form, props.modelValue)
}, { immediate: true, deep: true })

function confirm() {
  if (form.uploadTimeStart && form.uploadTimeEnd && form.uploadTimeStart > form.uploadTimeEnd) return
  if (form.updateTimeStart && form.updateTimeEnd && form.updateTimeStart > form.updateTimeEnd) return
  emit('confirm', { ...form })
}
</script>

<style scoped lang="scss">
.filter-panel {
  position: fixed;
  z-index: 3500;
  left: min(470px, 30vw);
  right: 34px;
  top: 150px;
  padding: 22px 22px 18px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(30, 45, 70, 0.14);
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 26px;
}

.filter-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 112px 1fr;
  align-items: center;
  gap: 10px;
  color: #4d5568;
  font-size: 13px;

  select,
  input {
    min-width: 0;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    outline: none;
  }
}

.date-item {
  grid-template-columns: 82px 1fr;
}

.date-range {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr);
  align-items: center;

  i {
    color: #8b95a7;
    text-align: center;
    font-style: normal;
  }
}

footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;

  button {
    height: 36px;
    padding: 0 20px;
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
