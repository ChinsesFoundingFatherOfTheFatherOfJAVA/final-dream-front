<template>
  <div class="task-table">
    <div class="table-head">
      <div class="batch-area">
        <template v-if="selected.size > 0">
          <button type="button" class="batch-btn" @click="emit('batch-delete', selectedTasks)">删除任务</button>
          <button
            v-if="structureType === 1"
            type="button"
            class="batch-btn"
            @click="emit('batch-move', selectedTasks)"
          >
            移动到章节
          </button>
          <span class="batch-tip">已选 {{ selected.size }} 项</span>
        </template>
      </div>
      <!-- 附录D：右上方"包含 N 个任务"右对齐灰色小字 -->
      <span class="task-count">包含 {{ tasks.length }} 个任务</span>
    </div>

    <div class="table-wrap">
      <table>
        <colgroup>
          <col class="check-col" />
          <col class="type-col" />
          <col />
          <col class="num-col" />
          <col class="num-col" />
          <col class="status-col" />
          <col class="action-col" />
        </colgroup>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allChecked"
                :indeterminate.prop="someChecked"
                @change="toggleAll(($event.target as HTMLInputElement).checked)"
              />
            </th>
            <th>类型</th>
            <th>名称</th>
            <th>学分</th>
            <th>时长</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(task, index) in tasks" :key="task.id || `task-${index}`" :class="{ 'row-hidden': task.hidden }">
            <td>
              <input
                type="checkbox"
                :checked="selected.has(task)"
                @change="toggleOne(task, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td>
              <span class="type-icon" :style="{ background: typeColor(task.coursewareType) }">
                {{ typeGlyph(task.coursewareType) }}
              </span>
            </td>
            <td class="name-cell">
              <span class="name-text" :title="task.taskName">{{ task.taskName }}</span>
              <!-- 隐藏为独立标记（与课件状态列互不影响），行置灰 + 标签 -->
              <span v-if="task.hidden" class="hidden-tag">已隐藏</span>
            </td>
            <td>{{ task.credits ?? '--' }}</td>
            <td>{{ task.durationText || '--' }}</td>
            <td>
              <span class="status-text" :class="`status-${task.coursewareStatus}`">
                <i></i>{{ statusText(task.coursewareStatus) }}
              </span>
            </td>
            <td class="action-cell">
              <div class="action-list">
                <!-- 预览=隐藏确认弹窗入口（截图18）；已隐藏任务再点变"取消隐藏"直接恢复 -->
                <button type="button" @click="emit('toggle-hide', task)">
                  {{ task.hidden ? '取消隐藏' : '预览' }}
                </button>
                <button type="button" @click="emit('edit', task)">编辑</button>
                <button type="button" class="more-trigger" @click.stop="toggleMenu(task)">更多⌄</button>
              </div>
              <div v-if="menuTask === task" class="more-menu" @click.stop>
                <button type="button" @click="emit('remove', task); menuTask = null">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!tasks.length">
            <td colspan="7" class="empty-cell">
              <div class="empty-folder">▱</div>
              <span>从上方选择任务类型添加任务</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  TASK_TYPE_ITEMS,
  coursewareStatusText,
  coursewareTypeColor,
  type DesignerTask
} from '../model'

/**
 * 任务列表（CS-07a/截图09）。
 * 列=类型/名称/学分/时长/状态/操作；状态取课件状态（绿点=已发布，不做转码媒体态文案）。
 * 行内操作：预览（隐藏确认）/编辑/更多（删除）。批量：删除任务/移动到章节。
 * 勾选状态用任务对象引用（Set<DesignerTask>）维护，任务数组变化时自动清空。
 * 拖拽排序不做（附录A）。
 */
const props = defineProps<{
  tasks: DesignerTask[]
  /** 章节模式下才提供"移动到章节"批量操作 */
  structureType: number
}>()

const emit = defineEmits<{
  'toggle-hide': [task: DesignerTask]
  edit: [task: DesignerTask]
  remove: [task: DesignerTask]
  'batch-delete': [tasks: DesignerTask[]]
  'batch-move': [tasks: DesignerTask[]]
}>()

const selected = ref(new Set<DesignerTask>())
const menuTask = ref<DesignerTask | null>(null)

const selectedTasks = computed(() => [...selected.value])
const allChecked = computed(() => props.tasks.length > 0 && props.tasks.every(task => selected.value.has(task)))
const someChecked = computed(() => props.tasks.some(task => selected.value.has(task)) && !allChecked.value)

// 任务集合变化（追加/删除/切章节）时清空勾选与更多菜单，避免悬挂引用
watch(
  () => props.tasks,
  () => {
    selected.value = new Set()
    menuTask.value = null
  }
)

function toggleOne(task: DesignerTask, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(task)
  else next.delete(task)
  selected.value = next
}

function toggleAll(checked: boolean) {
  selected.value = checked ? new Set(props.tasks) : new Set()
}

function toggleMenu(task: DesignerTask) {
  menuTask.value = menuTask.value === task ? null : task
}

function statusText(status: number) {
  return coursewareStatusText(status)
}

function typeGlyph(type: number) {
  const found = TASK_TYPE_ITEMS.find(item => item.type === type)
  return found ? found.glyph : 'P'
}

function typeColor(type: number) {
  return coursewareTypeColor(type)
}

// 点击空白处收起行内"更多"菜单
function closeMenuOnClickOutside() {
  menuTask.value = null
}

onMounted(() => document.addEventListener('click', closeMenuOnClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeMenuOnClickOutside))
</script>

<style scoped lang="scss">
.task-table {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  margin-bottom: 6px;
}

.batch-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batch-btn {
  height: 30px;
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

.batch-tip {
  color: #98a1b2;
  font-size: 12px;
}

.task-count {
  color: #a2a9b7;
  font-size: 12px;
}

.table-wrap {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.check-col {
  width: 44px;
}

.type-col {
  width: 72px;
}

.num-col {
  width: 90px;
}

.status-col {
  width: 104px;
}

.action-col {
  width: 200px;
}

th,
td {
  height: 46px;
  padding: 0 12px;
  border-bottom: 1px solid #edf0f5;
  color: #4d5568;
  text-align: left;
  font-size: 13px;
}

th {
  background: #f8fafc;
  color: #667085;
  font-weight: 600;
}

tbody tr:hover {
  background: #fafcff;
}

/* 隐藏任务行置灰（独立双标记，可取消隐藏恢复） */
tr.row-hidden {
  background: #fafbfc;

  td {
    color: #b3bac7;
  }

  .name-text {
    color: #9aa2b1;
  }
}

input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: #2e7cf6;
}

.type-icon {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name-text {
  min-width: 0;
  overflow: hidden;
  color: #253047;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hidden-tag {
  flex-shrink: 0;
  padding: 1px 7px;
  border: 1px solid #f0b25e;
  border-radius: 4px;
  background: #fdf6ec;
  color: #d98a1f;
  font-size: 11px;
  white-space: nowrap;
}

.status-text {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #98a1b2;
  }
}

/* 绿点=已发布；发布中橙点；未发布/已下架灰点（取课件状态口径） */
.status-2 i {
  background: #35b56a;
}

.status-1 i {
  background: #f0a13b;
}

.action-cell {
  position: relative;
  white-space: nowrap;
}

.action-list {
  display: flex;
  align-items: center;
  gap: 9px;

  button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    font-size: 13px;
    cursor: pointer;
  }

  .more-trigger {
    color: #667085;
  }
}

.more-menu {
  position: absolute;
  top: 34px;
  right: 10px;
  z-index: 30;
  min-width: 92px;
  padding: 5px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(30, 45, 70, 0.16);

  button {
    display: block;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #4d5568;
    text-align: left;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background: #f2f7ff;
      color: #2e7cf6;
    }
  }
}

.empty-cell {
  height: 240px;
  color: #98a1b2;
  text-align: center;
}

.empty-folder {
  margin-bottom: 8px;
  color: #c7cdd7;
  font-size: 44px;
}
</style>
