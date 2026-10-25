<template>
  <!-- 截图16：编辑任务抽屉（课件名称必填 + "..."换选课件 + "编辑课件"链接嵌套抽屉） -->
  <KngDrawer
    :visible="visible"
    title="编辑任务"
    :width="560"
    :z-index="zIndex"
    @close="emit('close')"
  >
    <div class="edit-task-form">
      <label class="field">
        <span class="label">课件名称<em>*</em></span>
        <el-input
          v-model.trim="taskName"
          maxlength="200"
          show-word-limit
          placeholder="请输入任务名称"
        />
      </label>

      <div class="field">
        <span class="label">选择课件</span>
        <div class="courseware-row">
          <span class="courseware-name" :title="coursewareTitle">{{ coursewareTitle || '--' }}</span>
          <el-button class="mini-btn" aria-label="换选课件" @click="pickerVisible = true">...</el-button>
        </div>
      </div>

      <div class="field">
        <span class="label">课件信息</span>
        <div class="snapshot-row">
          <span>学分：{{ credits ?? '--' }}</span>
          <span>时长：{{ durationText || '--' }}</span>
          <el-button
            v-if="coursewareId"
           
            class="link-btn"
            @click="simpleEditVisible = true"
          >
            编辑课件
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button class="btn" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" @click="confirm">确定</el-button>
    </template>
  </KngDrawer>

  <!-- 嵌套抽屉①：换选课件（单选），z-index 阶梯 +100 -->
  <CoursewarePickerDrawer
    :visible="pickerVisible"
    single
    :z-index="zIndex + 100"
    @close="pickerVisible = false"
    @confirm="onRepick"
  />

  <!-- 嵌套抽屉②：编辑课件（精简表单），z-index 阶梯 +200；遮罩点击只关最上层（KngDrawer 自身语义） -->
  <SimpleCoursewareEditDrawer
    :visible="simpleEditVisible"
    :courseware-id="coursewareId"
    :z-index="zIndex + 200"
    @close="simpleEditVisible = false"
    @saved="onCoursewareSaved"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import KngDrawer from '../../../components/KngDrawer.vue'
import CoursewarePickerDrawer, { type PickedCourseware } from './CoursewarePickerDrawer.vue'
import SimpleCoursewareEditDrawer from './SimpleCoursewareEditDrawer.vue'
import type { CoursewareDetail } from '@/api/courseware'
import { formatDurationText, type DesignerTask } from '../model'

/**
 * 编辑任务抽屉（CS-07a/截图16）。
 * 保存任务=更新主页本地状态（随设计器整体保存落库，无独立接口）。
 * 嵌套抽屉 z-index 阶梯：本抽屉 zIndex、换选课件 +100、编辑课件 +200。
 */
const props = withDefaults(defineProps<{
  visible: boolean
  /** 正在编辑的任务（打开时回显） */
  task: DesignerTask | null
  /** 抽屉层叠起点 z-index */
  zIndex?: number
}>(), {
  zIndex: 3050
})

/** 保存结果：主页据此更新任务行 */
export interface TaskEditResult {
  coursewareId: string
  taskName: string
  credits: number | null
  durationText: string
  coursewareStatus: number
  coursewareType: number
}

const emit = defineEmits<{
  close: []
  confirm: [result: TaskEditResult]
}>()

const taskName = ref('')
const coursewareId = ref('')
const coursewareTitle = ref('')
const credits = ref<number | null>(null)
const durationText = ref('')
const coursewareStatus = ref(2)
const coursewareType = ref(1)

const pickerVisible = ref(false)
const simpleEditVisible = ref(false)

// 打开时按任务行回显（未落库任务无 taskName 快照前用 courseware 快照）
watch(
  () => props.visible,
  visible => {
    if (!visible) return
    const task = props.task
    taskName.value = task?.taskName ?? ''
    coursewareId.value = task?.coursewareId ?? ''
    coursewareTitle.value = task?.taskName ?? ''
    credits.value = task?.credits ?? null
    durationText.value = task?.durationText ?? ''
    coursewareStatus.value = task?.coursewareStatus ?? 2
    coursewareType.value = task?.coursewareType ?? 1
    pickerVisible.value = false
    simpleEditVisible.value = false
  },
  { immediate: true }
)

/** "..."换选课件：单选确认后更新本地回显（需点确定才落到任务行） */
function onRepick(rows: PickedCourseware[]) {
  const picked = rows[0]
  if (!picked) return
  pickerVisible.value = false
  coursewareId.value = picked.id
  coursewareTitle.value = picked.title
  // 任务名默认跟随新选课件名（用户可在名称框继续改）
  taskName.value = picked.title
  credits.value = picked.credits
  durationText.value = picked.durationText
  coursewareStatus.value = picked.status
  coursewareType.value = picked.type
}

/** 嵌套"编辑课件"保存成功：同步任务行快照与任务名（需求 CS-07a 编辑任务口径） */
function onCoursewareSaved(detail: CoursewareDetail) {
  coursewareTitle.value = detail.title
  taskName.value = detail.title
  credits.value = detail.studyScoreCalc
  durationText.value = formatDurationText(detail.standardMinutes, detail.standardSeconds)
  coursewareStatus.value = detail.status
  coursewareType.value = detail.type
}

function confirm() {
  if (!taskName.value) return
  if (!coursewareId.value) return
  emit('confirm', {
    coursewareId: coursewareId.value,
    taskName: taskName.value,
    credits: credits.value,
    durationText: durationText.value,
    coursewareStatus: coursewareStatus.value,
    coursewareType: coursewareType.value
  })
}
</script>

<style scoped lang="scss">
.edit-task-form {
  display: flex;
  flex-direction: column;
}

.field {
  display: block;
  margin-bottom: 18px;

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

  :deep(.el-input__wrapper) {
    width: 100%;
    border-radius: 6px;
    font-size: 13px;
  }
}

.courseware-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.courseware-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 8px 10px;
  border: 1px solid #e9edf4;
  border-radius: 6px;
  background: #fafbfd;
  color: #30384a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-btn {
  flex-shrink: 0;
  min-width: 40px;
  height: 32px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    border-color: #2e7cf6;
    color: #2e7cf6;
  }
}

.snapshot-row {
  display: flex;
  align-items: center;
  gap: 18px;
  color: #4d5568;
  font-size: 13px;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.btn {
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
</style>
