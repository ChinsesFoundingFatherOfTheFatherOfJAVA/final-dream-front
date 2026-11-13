<template>
  <!-- 测练中心布局（截图02：题库分组菜单 + 五个未建设项 → PlaceholderPage） -->
  <div class="exam-layout">
    <header class="exam-header">
      <el-button class="back-btn" aria-label="返回首页" @click="router.push('/homepage')">‹</el-button>
      <div>
        <h1>测练中心</h1>
        <p>题库与考试管理</p>
      </div>
    </header>
    <div class="exam-body">
      <aside class="exam-sidebar">
        <div class="menu-group">
          <p class="group-title">题库</p>
          <router-link to="/exam/queslib" class="menu-item" :class="{ active: route.path.startsWith('/exam/queslib') }">
            <span class="menu-icon" aria-hidden="true">▦</span>
            <span>题库管理</span>
          </router-link>
        </div>
        <!-- 组卷（试卷管理已实现，仅样式沿用占位项） -->
        <router-link
          to="/exam/paper"
          class="menu-item pending"
          :class="{ active: route.path.startsWith('/exam/paper') }"
        >
          <span class="menu-icon" aria-hidden="true">▥</span>
          <span>组卷</span>
          <span class="pending-arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
        </router-link>
        <!-- 考试管理（原平台为「考试管理 > 考试管理 / 考试批阅」两级菜单） -->
        <div class="menu-group">
          <p class="group-title">考试管理</p>
          <router-link
            to="/exam/exam-mgmt"
            class="menu-item"
            :class="{ active: route.path.startsWith('/exam/exam-mgmt') }"
          >
            <span class="menu-icon" aria-hidden="true">▦</span>
            <span>考试管理</span>
          </router-link>
          <router-link
            to="/exam/mark"
            class="menu-item"
            :class="{ active: route.path.startsWith('/exam/mark') }"
          >
            <span class="menu-icon" aria-hidden="true">✎</span>
            <span>考试批阅</span>
          </router-link>
        </div>
        <router-link
          v-for="item in pendingMenus"
          :key="item.path"
          :to="item.path"
          class="menu-item pending"
          :class="{ active: route.path === item.path }"
        >
          <span class="menu-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span class="pending-arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
        </router-link>
      </aside>
      <main class="exam-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CaretRight } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/**
 * 未建设菜单（点击 PlaceholderPage「功能建设中」，01 §2）。
 *
 * <p>2026-11-13：按用户要求移除「题目反馈」与「字段设置」两个入口——
 * 它们不在复刻范围内，留着只会让人点进去看到占位页。
 * DER-10 早已把「题目反馈」定为本期不做，这次把入口一并撤掉，
 * 让菜单与实现范围保持一致。
 */
const pendingMenus = [
  { path: '/exam/practice', label: '练习管理', icon: '▤' },
]
</script>

<style scoped lang="scss">
.exam-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
  color: #253047;
}

.exam-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: #fff;
  border-bottom: 1px solid #e6eaf1;

  h1 { margin: 0; font-size: 18px; }
  p { margin: 3px 0 0; color: #8a92a5; font-size: 12px; }
}

.back-btn {
  width: 30px; height: 30px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;
  color: #5b6478;
  cursor: pointer;
  font-size: 16px;

  &:hover { color: #1890ff; border-color: #1890ff; }
}

.exam-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.exam-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e6eaf1;
  padding: 12px 0;
  overflow-y: auto;
}

.menu-group {
  margin-bottom: 8px;
}

.group-title {
  margin: 0;
  padding: 6px 22px 4px;
  font-size: 11px;
  color: #a0a7b8;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  font-size: 14px;
  color: #4a5368;
  text-decoration: none;
  position: relative;

  .menu-icon { width: 18px; text-align: center; color: #8a92a5; }

  &:hover { background: #f2f6ff; color: #1890ff; }

  &.active {
    background: #e8f1ff;
    color: #1890ff;
    font-weight: 500;

    &::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 2px;
      background: #1890ff;
    }
  }
}

.pending-arrow { margin-left: auto; color: #c2c8d4; font-size: 12px; }

/*
 * 内容区（2026-11-13 改为整页滚动）。
 *
 * **原先的问题**：`.exam-layout` 锁 `height: 100vh`、`.exam-content` 又
 * `overflow: hidden`，把内容死死困在视口内。于是页面内部各区块只能二选一：
 * 要么被压扁（考生表格一度只剩 108px，只能看到半个表头），
 * 要么自己开一个内层滚动条（滚起来很别扭，且分页条会被推出视野）。
 *
 * **现在**：内容区允许纵向滚动，页面整体滚动，外层不再裁切。
 * 各业务页可以按自然高度铺开，表格按「每页条数 × 行高」定高即可，
 * 长内容由这个滚动条统一承载 —— 与原平台的行为一致。
 */
.exam-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
