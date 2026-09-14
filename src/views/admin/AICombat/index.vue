<template>
  <div class="ai-combat-manage">
    <div class="layout">
      <!-- 左侧菜单 -->
      <aside class="side-menu">
        <h3 class="menu-title">AI对练</h3>
        <div class="menu-list">
          <div class="menu-group expanded">
            <div class="menu-group-title" @click="toggleGroup('speechNew')">
              <span>话术训练(新)</span>
              <span class="arrow" :class="{ open: openGroups.speechNew }">▾</span>
            </div>
            <div v-if="openGroups.speechNew" class="menu-group-items">
              <div class="menu-item active">话术训练中心</div>
              <div class="menu-item">话术模版</div>
            </div>
          </div>
          <div class="menu-item collapsed">演讲训练</div>
          <div class="menu-item collapsed">实战演练</div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 操作栏 -->
        <div class="action-bar">
          <div class="action-buttons">
            <button class="btn btn-primary">
              创建 <span class="arrow">▾</span>
            </button>
            <button class="btn btn-default">导出</button>
          </div>
          <div class="filter-bar">
            <select class="filter-select"><option>我负责的</option></select>
            <select class="filter-select"><option>来源</option></select>
            <select class="filter-select"><option>分类</option></select>
            <select class="filter-select"><option>状态</option></select>
            <select class="filter-select"><option>类型</option></select>
            <input type="text" class="filter-input" placeholder="请输入名称搜索" />
          </div>
        </div>

        <!-- 卡片网格 -->
        <div class="card-grid">
          <div v-for="project in projects" :key="project.id" class="project-card">
            <div class="card-cover">
              <span class="cover-tag">{{ project.tag }}</span>
              <span class="cover-status">{{ project.status }}</span>
            </div>
            <div class="card-content">
              <div class="card-tags">
                <span v-for="tag in project.tags" :key="tag" class="tag" :class="getTagClass(tag)">{{ tag }}</span>
              </div>
              <h4 class="card-title">{{ project.title }}</h4>
              <p class="card-time">{{ project.startTime }} 至 {{ project.endTime }}</p>
            </div>
          </div>
        </div>

        <!-- 分页器 -->
        <div class="pagination">
          <span class="total">共 {{ projects.length }} �span</span>
          <div class="page-buttons">
            <button class="page-btn" disabled>&lt;</button>
            <button class="page-btn active">1</button>
            <button class="page-btn">&gt;</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { mockProjects } from '@/mock/data'

const projects = ref(mockProjects)
const openGroups = reactive({ speechNew: true })

const toggleGroup = (key: string) => {
  (openGroups as any)[key] = !(openGroups as any)[key]
}

const getTagClass = (tag: string) => {
  const map: Record<string, string> = { '培训': 'tag-warning', '重要': 'tag-danger' }
  return map[tag] || 'tag-info'
}
</script>

<style scoped lang="scss">
.ai-combat-manage { height: 100%; }

.layout {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.side-menu {
  width: 200px;
  border-right: 1px solid #e8e8e8;

  .menu-title {
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    border-bottom: 1px solid #e8e8e8;
  }
}

.menu-list {
  .menu-group-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    font-size: 14px;
    color: #333;
    cursor: pointer;

    &:hover { background: #f5f5f5; }
    .arrow { font-size: 10px; transition: transform 0.2s; }
    .arrow.open { transform: rotate(0); }
  }
}

.menu-item {
  padding: 10px 20px 10px 40px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: #f5f5f5; color: #1890ff; }
  &.active { background: #e6f7ff; color: #1890ff; border-right: 3px solid #1890ff; }
  &.collapsed { padding-left: 20px; }
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.action-buttons { display: flex; gap: 12px; }

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &:hover { opacity: 0.85; }
  .arrow { font-size: 10px; margin-left: 4px; }
}

.filter-bar { display: flex; gap: 12px; align-items: center; }

.filter-select, .filter-input {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  outline: none;

  &:focus { border-color: #1890ff; }
}

.filter-input { width: 200px; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.project-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;

  &:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); transform: translateY(-2px); }

  .card-cover {
    height: 160px;
    background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px;

    .cover-tag { align-self: flex-start; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #fff; background: rgba(255,255,255,0.2); }
    .cover-status { color: #fff; font-size: 14px; }
  }

  .card-content {
    padding: 16px;
    .card-tags { display: flex; gap: 8px; margin-bottom: 8px; }
    .card-title { font-size: 14px; font-weight: 500; color: #333; margin: 0 0 8px 0; }
    .card-time { font-size: 12px; color: #999; margin: 0; }
  }
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  &.tag-warning { background: #fff7e6; color: #faad14; }
  &.tag-danger { background: #fff1f0; color: #f5222d; }
  &.tag-info { background: #e6f7ff; color: #1890ff; }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;

  .total { font-size: 14px; color: #666; }
}

.page-buttons { display: flex; gap: 8px; }

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;

  &:hover { color: #1890ff; border-color: #1890ff; }
  &.active { background: #1890ff; color: #fff; border-color: #1890ff; }
  &:disabled { color: #d9d9d9; cursor: not-allowed; }
}
</style>
