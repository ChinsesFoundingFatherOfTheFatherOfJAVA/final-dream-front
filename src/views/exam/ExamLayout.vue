<template>
  <!-- 测练中心布局（截图02：题库分组菜单 + 五个未建设项 → PlaceholderPage） -->
  <div class="exam-layout">
    <header class="exam-header">
      <el-button class="back-btn" aria-label="返回首页" @click="router.push('/homepage')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div>
        <h1>测练中心</h1>
        <p>题库与考试管理</p>
      </div>
    </header>
    <div class="exam-body">
      <aside ref="sideRef" class="exam-sidebar">
        <span class="menu-indicator" :style="indicatorStyle" aria-hidden="true"></span>
        <div class="menu-group">
          <p class="group-title">题库</p>
          <router-link to="/exam/queslib" class="menu-item" :class="{ active: route.path.startsWith('/exam/queslib') }">
            <span class="menu-icon" aria-hidden="true"><el-icon><Menu /></el-icon></span>
            <span>题库管理</span>
          </router-link>
        </div>
        <!-- 组卷（试卷管理已实现，仅样式沿用占位项） -->
        <router-link
          to="/exam/paper"
          class="menu-item pending"
          :class="{ active: route.path.startsWith('/exam/paper') }"
        >
          <span class="menu-icon" aria-hidden="true"><el-icon><Files /></el-icon></span>
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
            <span class="menu-icon" aria-hidden="true"><el-icon><List /></el-icon></span>
            <span>考试管理</span>
          </router-link>
          <router-link
            to="/exam/mark"
            class="menu-item"
            :class="{ active: route.path.startsWith('/exam/mark') }"
          >
            <span class="menu-icon" aria-hidden="true"><el-icon><EditPen /></el-icon></span>
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
          <span class="menu-icon" aria-hidden="true"><el-icon><Notebook /></el-icon></span>
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
import { ArrowLeft, CaretRight, EditPen, Files, List, Menu, Notebook } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActiveIndicator } from '@/utils/useActiveIndicator'

const route = useRoute()
const router = useRouter()

// 批注（2026-11-20）：侧栏 tab 改「纵向滑动侧边线」——激活项之间一条指示线滑动过渡
const sideRef = ref<HTMLElement | null>(null)
const { position: sideY, size: sideH, shown: sideShown } = useActiveIndicator(sideRef, {
  axis: 'y',
  itemSelector: '.menu-item.active'
})
const indicatorStyle = computed(() => ({
  transform: `translateY(${sideY.value + 8}px)`,
  height: `${Math.max(0, sideH.value - 16)}px`,
  opacity: sideShown.value ? 1 : 0
}))

/**
 * 未建设菜单（点击 PlaceholderPage「功能建设中」，01 §2）。
 *
 * <p>2026-11-13：按用户要求移除「题目反馈」与「字段设置」两个入口——
 * 它们不在复刻范围内，留着只会让人点进去看到占位页。
 * DER-10 早已把「题目反馈」定为本期不做，这次把入口一并撤掉，
 * 让菜单与实现范围保持一致。
 *
 * <p>2026-11-14 Hallmark 重构：菜单图标从字符 glyph 换成 EP 图标组件，
 * 未建设项统一用 Notebook，图标语义不再依赖数据字段。
 */
const pendingMenus = [
  { path: '/exam/practice', label: '练习管理' },
]
</script>

<style scoped lang="scss">
.exam-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper-2);
  color: var(--color-ink);
}

.exam-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: var(--color-paper);
  border-bottom: var(--rule-hair) solid var(--color-rule);

  h1 { margin: 0; font-size: 18px; font-family: var(--font-display); }
  p { margin: 3px 0 0; color: var(--color-muted); font-size: 12px; }
}

.back-btn {
  width: 30px;
  height: 30px;
  padding: 0;
}

.exam-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* 纵向滑动指示线：原本每项 ::before 的左侧静态条，现在由这一条统一滑动 */
.menu-indicator {
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--color-accent);
  pointer-events: none;
  transition:
    transform var(--dur-short) var(--ease-out),
    height var(--dur-short) var(--ease-out),
    opacity var(--dur-micro) var(--ease-out);
}

.exam-sidebar {
  position: relative;
  width: 200px;
  flex-shrink: 0;
  background: var(--color-paper);
  border-right: var(--rule-hair) solid var(--color-rule);
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
  color: var(--color-muted);
}

/*
 * 侧栏宽行（敢做档）：hover wash + 抬升，激活 accent-wash 底 + 左侧信号条。
 * 颜色全部走 Cobalt token，信号位只花 accent（<5% 占比铁律）。
 */
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  font-size: 14px;
  color: var(--color-ink-2);
  text-decoration: none;
  position: relative;
  transition: background-color var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out);

  .menu-icon { width: 18px; text-align: center; color: var(--color-muted); display: inline-flex; }

  &:hover {
    background: var(--color-accent-wash);
    color: var(--color-accent-deep);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  /* 激活条由容器里的单条滑动指示线统一给出，这里只换底色/字色 */
  &.active {
    background: var(--color-accent-wash);
    color: var(--color-accent-deep);
    font-weight: 500;

    .menu-icon { color: var(--color-accent); }
  }
}

.pending-arrow { margin-left: auto; color: var(--color-rule-2); font-size: 12px; }

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
