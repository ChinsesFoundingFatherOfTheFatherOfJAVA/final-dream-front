<template>
  <!-- 截图09 左侧章节栏（structureType=1 时显示）：+添加章节 / 章节项选中高亮 / ⋯菜单编辑删除 -->
  <aside class="chapter-panel">
    <header class="panel-head">
      <span class="title">章节</span>
      <el-button class="add-btn" @click="emit('add')">+ 添加章节</el-button>
    </header>

    <div class="chapter-list">
      <div
        v-for="(chapter, index) in chapters"
        :key="chapter.id || `chapter-${index}`"
        class="chapter-item"
        :class="{ active: index === selectedIndex }"
        role="button"
        tabindex="0"
        @click="emit('select', index)"
        @keydown.enter.prevent="emit('select', index)"
      >
        <div class="item-main">
          <span class="chapter-name" :title="chapter.name">{{ chapter.name }}</span>
          <span class="task-count">{{ chapter.tasks.length }} 个任务</span>
        </div>
        <el-button
          class="more-btn"
          aria-label="更多操作"
          @click.stop="toggleMenu(index)"
        >
          ⋯
        </el-button>
        <div v-if="menuIndex === index" class="more-menu" @click.stop>
          <el-button @click="emit('edit', index); menuIndex = -1">编辑</el-button>
          <el-button @click="emit('remove', index); menuIndex = -1">删除</el-button>
        </div>
      </div>

      <div v-if="!chapters.length" class="empty">暂无章节</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DesignerChapter } from '../model'

/**
 * 章节栏（CS-07a）：仅展示与交互，增删改逻辑由主页处理（章节删除连带删任务、
 * 结构切换等都在主页状态模型上操作）。章节拖拽排序不做（附录A 口径）。
 */
defineProps<{
  chapters: DesignerChapter[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  select: [index: number]
  add: []
  edit: [index: number]
  remove: [index: number]
}>()

// ⋯菜单当前展开的章节下标；-1=全部收起
const menuIndex = ref(-1)

function toggleMenu(index: number) {
  menuIndex.value = menuIndex.value === index ? -1 : index
}
</script>

<style scoped lang="scss">
.chapter-panel {
  box-sizing: border-box;
  width: 236px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 12px;
  border-right: 1px solid #e9edf4;
  background: #fafbfd;
  overflow-y: auto;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .title {
    color: #30384a;
    font-size: 14px;
    font-weight: 600;
  }
}

.add-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e9edf4;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;

  /* 自定义可点章节行：键盘可达，补可见焦点环（不占布局空间） */
  &:focus-visible {
    outline: 2px solid #2e7cf6;
    outline-offset: 1px;
  }

  /* 附录D：章节项=白卡+选中浅蓝底 */
  &.active {
    border-color: #b9d4fb;
    background: #eef5ff;
  }

  &:hover {
    border-color: #b9d4fb;
  }
}

.item-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chapter-name {
  max-width: 100%;
  overflow: hidden;
  color: #30384a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-count {
  color: #a2a9b7;
  font-size: 11px;
}

.more-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #8a92a5;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f1f4f9;
    color: #4d5568;
  }
}

.more-menu {
  position: absolute;
  top: 34px;
  right: 6px;
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

.empty {
  padding: 22px 0;
  color: #a2a9b7;
  font-size: 12px;
  text-align: center;
}
</style>
