<template>
  <div class="task-table">
    <div class="table-head">
      <div class="batch-area">
        <template v-if="selected.size > 0">
          <el-button class="batch-btn" @click="emit('batch-delete', selectedTasks)">删除任务</el-button>
          <el-button
            v-if="structureType === 1"
           
            class="batch-btn"
            @click="emit('batch-move', selectedTasks)"
          >
            移动到章节
          </el-button>
          <span class="batch-tip">已选 {{ selected.size }} 项</span>
        </template>
      </div>
      <!-- 附录D：右上方"包含 N 个任务"右对齐灰色小字 -->
      <span class="task-count">包含 {{ tasks.length }} 个任务</span>
    </div>

    <div class="table-wrap">
      <el-table
        :data="tasks"
        :row-key="taskRowKey"
        class="task-data-table"
        empty-text="从上方选择任务类型添加任务"
        :row-class-name="taskRowClass"
      >
        <el-table-column width="44" align="center">
          <template #header>
            <el-checkbox
              :model-value="allChecked"
              :indeterminate="someChecked"
              @change="toggleAll"
            />
          </template>
          <template #default="{ row }">
            <el-checkbox
              :model-value="selected.has(row)"
              @change="toggleOne(row, Boolean($event))"
            />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="72">
          <template #default="{ row }">
              <span class="type-icon" :style="{ background: typeColor(row.coursewareType) }">
                {{ typeGlyph(row.coursewareType) }}
              </span>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="260">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="name-text" :title="row.taskName">{{ row.taskName }}</span>
              <span v-if="row.hidden" class="hidden-tag">已隐藏</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="学分" width="90">
          <template #default="{ row }">{{ row.credits ?? '--' }}</template>
        </el-table-column>
        <el-table-column label="时长" width="120">
          <template #default="{ row }">{{ row.durationText || '--' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="104">
          <template #default="{ row }">
              <span class="status-text" :class="`status-${row.coursewareStatus}`">
                <i></i>{{ statusText(row.coursewareStatus) }}
              </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
              <div class="action-list">
                <el-button link type="primary" @click="emit('toggle-hide', row)">
                  {{ row.hidden ? '取消隐藏' : '预览' }}
                </el-button>
                <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
                <el-dropdown trigger="click" @command="() => emit('remove', row)">
                  <el-button link class="more-trigger">更多⌄</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="remove">删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const selectedTasks = computed(() => [...selected.value])
const allChecked = computed(() => props.tasks.length > 0 && props.tasks.every(task => selected.value.has(task)))
const someChecked = computed(() => props.tasks.some(task => selected.value.has(task)) && !allChecked.value)

// 任务集合变化（追加/删除/切章节）时清空勾选与更多菜单，避免悬挂引用
watch(
  () => props.tasks,
  () => {
    selected.value = new Set()
  }
)

const taskRowKey = (task: DesignerTask) => task.id || `${task.coursewareId}-${task.taskName}`
const taskRowClass = ({ row }: { row: DesignerTask }) => row.hidden ? 'row-hidden' : ''

function toggleOne(task: DesignerTask, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(task)
  else next.delete(task)
  selected.value = next
}

function toggleAll(checked: boolean) {
  selected.value = checked ? new Set(props.tasks) : new Set()
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

.task-data-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 46px;
    background: #f8fafc;
    color: #667085;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 46px;
    color: #4d5568;
    font-size: 13px;
  }
}

/* 隐藏任务行置灰（独立双标记，可取消隐藏恢复） */
.task-data-table :deep(.row-hidden) {
  background: #fafbfc;

  td {
    color: #b3bac7;
  }

  .name-text {
    color: #9aa2b1;
  }
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

</style>
