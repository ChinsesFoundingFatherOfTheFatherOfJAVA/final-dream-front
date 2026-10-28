<template>
  <div class="designer-page">
    <!-- 顶栏（截图09）：← 返回 / 课程名 / 结构切换 / 解锁模式下拉+暂存关闭+保存（右对齐） -->
    <header class="top-bar">
      <div class="bar-left">
        <el-button class="back-btn" circle aria-label="返回列表" title="返回列表" @click="backToList">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <span class="divider"></span>
        <h1 class="course-name" :title="courseTitle">{{ courseTitle || '课程设计器' }}</h1>
        <!-- 顶栏按钮：有章节↔无章节 切换（CS-07a） -->
        <el-button class="toggle-btn" @click="toggleStructure">
          <el-icon><Tickets /></el-icon>
          <span>{{ structureType === 1 ? '切换为无章节' : '切换为章节模式' }}</span>
        </el-button>
      </div>
      <div class="bar-right">
        <el-button class="mode-btn" @click="unlockVisible = true">
          {{ unlockMode === UNLOCK_MODE_ORDER ? '按顺序学习' : '自由学习模式' }}
          <el-icon class="caret" aria-hidden="true"><ArrowDown /></el-icon>
        </el-button>
        <el-button class="btn ghost" :disabled="saving || loading" @click="submitDesigner(false)">
          暂存关闭
        </el-button>
        <el-button class="btn primary" :disabled="saving || loading" @click="submitDesigner(true)">
          {{ saving ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </header>

    <div class="designer-body">
      <!-- 左侧章节栏：仅章节模式显示 -->
      <ChapterPanel
        v-if="structureType === 1"
        :chapters="chapters"
        :selected-index="selectedChapterIndex"
        @select="selectedChapterIndex = $event"
        @add="openAddChapter"
        @edit="openEditChapter"
        @remove="removeChapter"
      />

      <!-- 右侧内容区：任务类型图标行 + 当前章节任务列表 -->
      <section class="designer-content">
        <TaskTypeBar @pick="onPickType" />
        <TaskTable
          class="task-area"
          :tasks="currentTasks"
          :structure-type="structureType"
          @toggle-hide="onToggleHide"
          @edit="openEditTask"
          @remove="removeTask"
          @batch-delete="batchDeleteTasks"
          @batch-move="openBatchMove"
        />
      </section>

      <div v-if="loading" class="page-loading">加载中...</div>
    </div>

    <!-- 创建首入：结构选择弹窗（route query choose=1 时弹一次） -->
    <StructureChooseDialog :visible="structureChooseVisible" @choose="onStructureChoose" @close="structureChooseVisible = false" />

    <!-- 添加/编辑章节弹窗 -->
    <ChapterDialog
      :visible="chapterDialogVisible"
      :initial="chapterEditingIndex >= 0 ? chapterInitial : null"
      @close="chapterDialogVisible = false"
      @confirm="confirmChapter"
    />

    <!-- 选课件抽屉（多选，加入当前章节/平铺列表末尾） -->
    <CoursewarePickerDrawer
      :visible="pickerVisible"
      :preset-type="pickerPresetType"
      :z-index="3100"
      @close="pickerVisible = false"
      @confirm="onPickerConfirm"
    />

    <!-- 编辑任务抽屉（内含换选课件/编辑课件嵌套抽屉） -->
    <EditTaskDrawer :visible="editTaskVisible" :task="editTaskTarget" :z-index="3050" @close="editTaskVisible = false" @confirm="onEditTaskConfirm" />

    <!-- 移动任务到章节弹窗 -->
    <MoveTaskDialog
      :visible="moveDialogVisible"
      :chapters="chapters"
      :count="moveTargets.length"
      @close="moveDialogVisible = false"
      @confirm="confirmMoveTasks"
    />

    <!-- 解锁模式抽屉 -->
    <UnlockModeDrawer
      :visible="unlockVisible"
      :unlock-mode="unlockMode"
      :unlock-unit="unlockUnit"
      :z-index="3050"
      @close="unlockVisible = false"
      @confirm="onUnlockConfirm"
    />

    <!-- 隐藏任务确认弹窗（与课件/课程共用的 HideConfirmDialog，截图18 语义） -->
    <HideConfirmDialog
      :visible="hideDialogVisible"
      target-type="任务"
      :name="hideTarget?.taskName || ''"
      @close="hideDialogVisible = false"
      @confirm="confirmHideTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowLeft, Tickets } from '@element-plus/icons-vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRoute, useRouter } from 'vue-router'
import {
  getCourseDesigner,
  getCourseDetail,
  saveCourseDesigner
} from '@/api/course'
import type { CourseDesignerDetail, CourseDesignerSaveReq } from '@/api/course'
import { toast } from '@/utils/toast'
import ChapterPanel from './components/ChapterPanel.vue'
import ChapterDialog from './components/ChapterDialog.vue'
import StructureChooseDialog from './components/StructureChooseDialog.vue'
import TaskTypeBar from './components/TaskTypeBar.vue'
import TaskTable from './components/TaskTable.vue'
import CoursewarePickerDrawer, { type PickedCourseware } from './components/CoursewarePickerDrawer.vue'
import EditTaskDrawer, { type TaskEditResult } from './components/EditTaskDrawer.vue'
import MoveTaskDialog from './components/MoveTaskDialog.vue'
import UnlockModeDrawer from './components/UnlockModeDrawer.vue'
import HideConfirmDialog from '../../components/HideConfirmDialog.vue'
import {
  MAX_TASK_COUNT,
  UNLOCK_MODE_ORDER,
  UNLOCK_UNIT_CONTENT,
  type DesignerChapter,
  type DesignerTask
} from './model'

/**
 * 课程章节任务设计器（CS-07a，路由 /kng/course/edit/:id/designer）。
 * 状态模型（02 方案 §4）：{ structureType, chapters, flatTasks, unlockMode, unlockUnit }
 * 组件内维护，进入时 GET designer 回显；【保存】/【暂存关闭】整体 PUT（全删全插），
 * 日常增删改（加任务/隐藏/编辑/移动/切结构/改解锁模式）只改本地状态，随保存落库。
 */
const route = useRoute()
const router = useRouter()
// 后端 id 全部是 string（铁律 3）
const courseId = String(route.params.id || '')

const courseTitle = ref('')
const courseCatalogId = ref('')
const structureType = ref(0)
const chapters = ref<DesignerChapter[]>([])
const flatTasks = ref<DesignerTask[]>([])
const unlockMode = ref(1)
const unlockUnit = ref(UNLOCK_UNIT_CONTENT)
const loading = ref(true)
const saving = ref(false)

// 章节模式下当前选中章节下标；-1=无章节可选
const selectedChapterIndex = ref(-1)

// 当前展示的任务集合：章节模式取选中章节，无章节取平铺列表
const currentTasks = computed<DesignerTask[]>(() => {
  if (structureType.value === 1) {
    return chapters.value[selectedChapterIndex.value]?.tasks ?? []
  }
  return flatTasks.value
})

/** 任务总数（后端校验 ≤999，前端提交前先拦一道） */
function totalTaskCount(): number {
  return chapters.value.reduce((sum, chapter) => sum + chapter.tasks.length, 0) + flatTasks.value.length
}

/** 回显映射：GET designer 的任务行 → 本地 DesignerTask（join 展示字段直接快照） */
function mapServerTask(task: CourseDesignerDetail['chapters'][number]['tasks'][number]): DesignerTask {
  return {
    id: task.id,
    coursewareId: task.coursewareId,
    taskName: task.taskName,
    hidden: task.hidden,
    credits: task.credits ?? null,
    durationText: task.durationText ?? '',
    coursewareStatus: task.coursewareStatus,
    coursewareType: task.coursewareType
  }
}

/** 进入设计器：课程详情（名称/分类，用于顶栏与本地上传预选）+ 设计器结构整体回显 */
async function load() {
  loading.value = true
  try {
    const [detail, designer] = await Promise.all([getCourseDetail(courseId), getCourseDesigner(courseId)])
    courseTitle.value = detail.title
    courseCatalogId.value = detail.catalogId
    structureType.value = designer.structureType
    unlockMode.value = designer.unlockMode || 1
    unlockUnit.value = designer.unlockUnit || UNLOCK_UNIT_CONTENT
    chapters.value = designer.chapters.map(chapter => ({
      id: chapter.id,
      name: chapter.name,
      description: chapter.description,
      tasks: chapter.tasks.map(mapServerTask)
    }))
    flatTasks.value = designer.flatTasks.map(mapServerTask)
    selectedChapterIndex.value = chapters.value.length ? 0 : -1
  } finally {
    loading.value = false
  }
}

// ---------- 保存语义 ----------

/** 组装整体保存请求（落库字段不含展示快照；id 有则带，后端全删全插） */
function buildSaveReq(publish: boolean): CourseDesignerSaveReq {
  const slimTasks = (tasks: DesignerTask[]) =>
    tasks.map(task => ({
      id: task.id,
      coursewareId: task.coursewareId,
      taskName: task.taskName,
      hidden: task.hidden
    }))
  return {
    publish,
    structureType: structureType.value,
    unlockMode: unlockMode.value,
    // 解锁单元仅按顺序学习时生效，自由模式固定按内容
    unlockUnit: unlockMode.value === UNLOCK_MODE_ORDER ? unlockUnit.value : UNLOCK_UNIT_CONTENT,
    chapters: chapters.value.map(chapter => ({
      id: chapter.id,
      name: chapter.name,
      description: chapter.description,
      tasks: slimTasks(chapter.tasks)
    })),
    flatTasks: slimTasks(flatTasks.value)
  }
}

/**
 * 【保存】=publish=true（后端置已发布）→ 返回列表；
 * 【暂存关闭】=publish=false（状态不变）→ 返回列表。
 */
async function submitDesigner(publish: boolean) {
  if (totalTaskCount() > MAX_TASK_COUNT) {
    toast.warn(`任务总数不能超过 ${MAX_TASK_COUNT} 个`)
    return
  }
  if (structureType.value === 1 && chapters.value.some(chapter => !chapter.name.trim())) {
    toast.warn('章节名称不能为空')
    return
  }
  saving.value = true
  try {
    await saveCourseDesigner(courseId, buildSaveReq(publish))
    toast.info(publish ? '保存成功，课程已发布' : '已暂存')
    router.push('/kng/course')
  } finally {
    saving.value = false
  }
}

function backToList() {
  router.push('/kng/course')
}

// ---------- 结构选择（创建首入） ----------

// route query choose=1 时弹结构选择；选择后清 query，关闭后不再弹
const structureChooseVisible = ref(false)

onMounted(() => {
  structureChooseVisible.value = route.query.choose === '1'
})

/** 结构选择确认：本地切换 + 立即 PUT(publish=false) 落库（状态保持未发布），并清掉 query 防刷新再弹 */
async function onStructureChoose(chosen: number) {
  structureChooseVisible.value = false
  structureType.value = chosen
  if (chosen === 1 && !chapters.value.length) {
    // 有章节：自动建"章节1"并把平铺任务归入
    chapters.value = [{ name: '章节1', description: '', tasks: [...flatTasks.value] }]
    flatTasks.value = []
    selectedChapterIndex.value = 0
  }
  // 若路由仍有 choose=1（例如保存失败重试），replace 掉避免刷新后再次弹出
  if (route.query.choose !== undefined) {
    router.replace({ path: route.path })
  }
  try {
    await saveCourseDesigner(courseId, buildSaveReq(false))
  } catch {
    // 落库失败不打断设计流程（用户可再点暂存/保存）；拦截器已提示错误
  }
}

// ---------- 结构切换（有章节↔无章节） ----------

/**
 * 顶栏结构切换：
 * 有→无：确认"切换后任务将平铺"后展平保留任务（附录C 待验证项，按平铺保留实现）；
 * 无→有：自动建"章节1"并把 flatTasks 归入。均为本地状态变化，保存后落库。
 */
async function toggleStructure() {
  if (structureType.value === 1) {
    if (!(await confirmDialog({ message: '切换为无章节后，各章节任务将平铺展示，是否继续？', danger: true }))) return
    flatTasks.value = chapters.value.flatMap(chapter => chapter.tasks)
    chapters.value = []
    structureType.value = 0
  } else {
    chapters.value = [{ name: '章节1', description: '', tasks: [...flatTasks.value] }]
    flatTasks.value = []
    structureType.value = 1
    selectedChapterIndex.value = 0
  }
  toast.info('结构已切换，保存后生效')
}

// ---------- 章节管理 ----------

const chapterDialogVisible = ref(false)
const chapterEditingIndex = ref(-1)
const chapterInitial = ref<{ name: string; description: string } | null>(null)

function openAddChapter() {
  chapterEditingIndex.value = -1
  chapterInitial.value = null
  chapterDialogVisible.value = true
}

function openEditChapter(index: number) {
  const chapter = chapters.value[index]
  if (!chapter) return
  chapterEditingIndex.value = index
  chapterInitial.value = { name: chapter.name, description: chapter.description }
  chapterDialogVisible.value = true
}

/** 章节弹窗确认：新增或回显编辑（名称必填/说明≥5 字校验在 ChapterDialog 内） */
function confirmChapter(value: { name: string; description: string }) {
  const index = chapterEditingIndex.value
  if (index >= 0) {
    const chapter = chapters.value[index]
    if (chapter) {
      chapter.name = value.name
      chapter.description = value.description
    }
  } else {
    chapters.value.push({ name: value.name, description: value.description, tasks: [] })
    // 新建章节后自动选中，便于立即添加任务
    selectedChapterIndex.value = chapters.value.length - 1
  }
  chapterDialogVisible.value = false
}

/** 删除章节：二次确认，连带删该章节任务（本地状态层面） */
async function removeChapter(index: number) {
  const chapter = chapters.value[index]
  if (!chapter) return
  if (!(await confirmDialog({ message: `确定删除章节「${chapter.name}」吗？章节下的 ${chapter.tasks.length} 个任务将一并删除`, danger: true }))) return
  chapters.value.splice(index, 1)
  if (selectedChapterIndex.value >= chapters.value.length) {
    selectedChapterIndex.value = chapters.value.length - 1
  }
}

// ---------- 任务类型图标行 ----------

const pickerVisible = ref(false)
const pickerPresetType = ref<number | null>(null)

/** 图标行点击：本地上传=新窗口打开课件发布页；其余=打开选课件抽屉（类型预选） */
function onPickType(type: number) {
  if (type === 0) {
    openLocalUpload()
    return
  }
  if (structureType.value === 1 && selectedChapterIndex.value < 0) {
    toast.warn('请先添加章节')
    return
  }
  pickerPresetType.value = type
  pickerVisible.value = true
}

// 本地上传回跳刷新标记：发布页操作后回到本窗口时刷新一次任务数据（轻量实现，不做自动监听）
let pendingFocusRefresh = false

function openLocalUpload() {
  pendingFocusRefresh = true
  // hash 路由：拼接发布页地址并带当前课程分类预选（对齐课件模块增补B）
  const base = `${window.location.origin}${window.location.pathname}`
  const query = courseCatalogId.value ? `?catalogId=${encodeURIComponent(courseCatalogId.value)}` : ''
  window.open(`${base}#/kng/courseware/publish/file${query}`, '_blank')
}

/** 本地发布后回到本窗口：重拉设计器结构（含新发布课件） */
function onWindowFocus() {
  if (!pendingFocusRefresh) return
  pendingFocusRefresh = false
  void load()
}

// ---------- 选课件 → 追加任务 ----------

/** 选课件抽屉确认：勾选课件快照为任务行，追加到当前章节/平铺列表末尾 */
function onPickerConfirm(rows: PickedCourseware[]) {
  pickerVisible.value = false
  if (!rows.length) return
  if (totalTaskCount() + rows.length > MAX_TASK_COUNT) {
    toast.warn(`任务总数不能超过 ${MAX_TASK_COUNT} 个`)
    return
  }
  const newTasks: DesignerTask[] = rows.map(row => ({
    coursewareId: row.id,
    taskName: row.title,
    hidden: false,
    credits: row.credits,
    durationText: row.durationText,
    coursewareStatus: row.status,
    coursewareType: row.type
  }))
  if (structureType.value === 1) {
    const chapter = chapters.value[selectedChapterIndex.value]
    if (!chapter) {
      toast.warn('请先添加章节')
      return
    }
    chapter.tasks.push(...newTasks)
  } else {
    flatTasks.value.push(...newTasks)
  }
  toast.info(`已添加 ${newTasks.length} 个任务`)
}

// ---------- 任务行内操作 ----------

const hideDialogVisible = ref(false)
const hideTarget = ref<DesignerTask | null>(null)

/**
 * 预览按钮：未隐藏 → 隐藏确认弹窗（截图18）；
 * 已隐藏 → 再点变"取消隐藏"，直接恢复（隐藏为可恢复标记，无需再确认）。
 */
function onToggleHide(task: DesignerTask) {
  if (task.hidden) {
    task.hidden = false
    toast.info('已取消隐藏')
    return
  }
  hideTarget.value = task
  hideDialogVisible.value = true
}

function confirmHideTask() {
  if (hideTarget.value) {
    hideTarget.value.hidden = true
    toast.info('已隐藏')
  }
  hideDialogVisible.value = false
}

/** 从当前展示集合中移除一组任务（对象引用匹配） */
function removeFromCurrent(targets: DesignerTask[]) {
  const set = new Set(targets)
  if (structureType.value === 1) {
    const chapter = chapters.value[selectedChapterIndex.value]
    if (chapter) chapter.tasks = chapter.tasks.filter(task => !set.has(task))
  } else {
    flatTasks.value = flatTasks.value.filter(task => !set.has(task))
  }
}

async function removeTask(task: DesignerTask) {
  if (!(await confirmDialog({ message: `确定删除任务「${task.taskName}」吗？`, danger: true }))) return
  removeFromCurrent([task])
  toast.info('已删除')
}

async function batchDeleteTasks(targets: DesignerTask[]) {
  if (!targets.length) return
  if (!(await confirmDialog({ message: `确定删除选中的 ${targets.length} 个任务吗？`, danger: true }))) return
  removeFromCurrent(targets)
  toast.info('已删除')
}

// ---------- 批量移动任务到章节 ----------

const moveDialogVisible = ref(false)
const moveTargets = ref<DesignerTask[]>([])

function openBatchMove(targets: DesignerTask[]) {
  moveTargets.value = targets
  moveDialogVisible.value = true
}

/** 移动确认：先从所有章节剔除，再追加到目标章节末尾（避免同章节移动被误删） */
function confirmMoveTasks(chapterIndex: number) {
  const target = chapters.value[chapterIndex]
  if (!target || !moveTargets.value.length) return
  const set = new Set(moveTargets.value)
  for (const chapter of chapters.value) {
    chapter.tasks = chapter.tasks.filter(task => !set.has(task))
  }
  target.tasks.push(...moveTargets.value)
  moveDialogVisible.value = false
  toast.info(`已移动 ${moveTargets.value.length} 个任务到「${target.name}」`)
}

// ---------- 编辑任务 ----------

const editTaskVisible = ref(false)
const editTaskTarget = ref<DesignerTask | null>(null)

function openEditTask(task: DesignerTask) {
  editTaskTarget.value = task
  editTaskVisible.value = true
}

/** 编辑任务确认：仅更新本地状态（随整体保存落库） */
function onEditTaskConfirm(result: TaskEditResult) {
  const task = editTaskTarget.value
  if (task) Object.assign(task, result)
  editTaskVisible.value = false
}

// ---------- 解锁模式 ----------

const unlockVisible = ref(false)

/** 解锁模式确定：仅更新本地状态（下拉展示随动，随保存落库） */
function onUnlockConfirm(mode: number, unit: number) {
  unlockMode.value = mode
  unlockUnit.value = unit
  unlockVisible.value = false
  toast.info('解锁模式已更新，保存后生效')
}

onMounted(async () => {
  window.addEventListener('focus', onWindowFocus)
  await load()
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', onWindowFocus)
})
</script>

<style scoped lang="scss">
.designer-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  min-height: 0;
  background: #fff;
  overflow: hidden;
}

.top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid #e9edf4;
  background: #fff;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.back-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid #d9deea;
  border-radius: 8px;
  background: #fff;
  color: #4d5568;
  font-size: 17px;
  cursor: pointer;

  &:hover {
    border-color: #2e7cf6;
    color: #2e7cf6;
  }
}

.divider {
  width: 1px;
  height: 16px;
  background: #e2e7f0;
}

.course-name {
  margin: 0;
  max-width: 320px;
  overflow: hidden;
  color: #253047;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #f8fafc;
  color: #596274;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: #2e7cf6;
    color: #2e7cf6;
  }
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 附录D：顶栏按钮组右对齐（模式下拉+暂存关闭白钮+保存蓝钮） */
.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: #2e7cf6;
    color: #2e7cf6;
  }
}

.caret {
  margin-left: 2px;
  font-size: 12px;
  color: #98a1b2;
}

.btn {
  height: 34px;
  padding: 0 18px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    color: #b3bac7;
    cursor: not-allowed;
  }

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;

    &:disabled {
      border-color: #b9d4fb;
      background: #b9d4fb;
      color: #fff;
    }
  }
}

.designer-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.designer-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  background: #f7f9fc;
  overflow: hidden;
}

.task-area {
  flex: 1;
  min-height: 0;
  padding: 14px 16px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.page-loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.7);
  color: #7b8496;
  font-size: 13px;
}
</style>
