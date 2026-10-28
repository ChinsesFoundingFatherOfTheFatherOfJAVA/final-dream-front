<template>
  <teleport to="body">
    <div v-if="visible" class="filter-panel" @click.stop>
      <div class="filter-grid">
        <label class="filter-item">
          <span>是否上架</span>
          <el-select v-model="form.onSale" placeholder="请选择" popper-class="filter-control-popper">
            <el-option label="请选择" :value="null" />
            <el-option label="是" :value="1" />
            <el-option label="否" :value="0" />
          </el-select>
        </label>
        <label class="filter-item date-item">
          <span>上传时间</span>
          <div class="date-range">
            <el-date-picker
              v-model="form.uploadTimeStart"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              popper-class="filter-control-popper"
            />
            <i aria-hidden="true">~</i>
            <el-date-picker
              v-model="form.uploadTimeEnd"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="结束日期"
              popper-class="filter-control-popper"
            />
          </div>
        </label>
        <label class="filter-item date-item">
          <span>更新时间</span>
          <div class="date-range">
            <el-date-picker
              v-model="form.updateTimeStart"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              popper-class="filter-control-popper"
            />
            <i aria-hidden="true">~</i>
            <el-date-picker
              v-model="form.updateTimeEnd"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="结束日期"
              popper-class="filter-control-popper"
            />
          </div>
        </label>
      </div>
      <footer>
        <el-button class="primary" @click="confirm">确定</el-button>
        <el-button @click="emit('close')">取消</el-button>
      </footer>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

/** 课程"更多筛选"表单：同课件但不含"是否被课程引用"（课程无此概念，CS-01 差异②） */
export interface CourseFilters {
  onSale: number | null
  uploadTimeStart: string
  uploadTimeEnd: string
  updateTimeStart: string
  updateTimeEnd: string
}

const props = defineProps<{
  visible: boolean
  modelValue: CourseFilters
}>()

const emit = defineEmits<{
  close: []
  confirm: [value: CourseFilters]
}>()

const form = reactive<CourseFilters>(emptyFilters())

function emptyFilters(): CourseFilters {
  return { onSale: null, uploadTimeStart: '', uploadTimeEnd: '', updateTimeStart: '', updateTimeEnd: '' }
}

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
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  color: #4d5568;
  font-size: 13px;

  > span {
    white-space: nowrap;
  }

  :deep(.el-select),
  :deep(.el-date-editor) {
    min-width: 0;
    width: 100%;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 36px;
    border-radius: 6px;
  }
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

<style lang="scss">
/* 复合筛选面板在 3500 层，EP 下拉/日期弹层必须位于其上方 */
.filter-control-popper.el-popper {
  z-index: 3600 !important;
}
</style>
