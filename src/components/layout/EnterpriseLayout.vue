<template>
  <div class="enterprise-layout">
    <aside ref="sideRef" class="enterprise-sidebar">
      <span class="menu-indicator" :style="indicatorStyle" aria-hidden="true"></span>
      <div class="sidebar-title">我的企业</div>
      <el-menu :default-active="route.path" router class="sidebar-menu">
        <el-menu-item
          v-for="item in visibleMenus"
          :key="item.path"
          :index="item.path"
          class="menu-item"
        >
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </aside>
    <main class="enterprise-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useActiveIndicator } from '@/utils/useActiveIndicator'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

// 批注（2026-11-20）：侧栏 tab 改「纵向滑动侧边线」——激活项之间一条指示线滑动过渡
const sideRef = ref<HTMLElement | null>(null)
const { position: sideY, size: sideH, shown: sideShown } = useActiveIndicator(sideRef, {
  axis: 'y',
  itemSelector: '.menu-item.is-active'
})
const indicatorStyle = computed(() => ({
  transform: `translateY(${sideY.value + 6}px)`,
  height: `${Math.max(0, sideH.value - 12)}px`,
  opacity: sideShown.value ? 1 : 0
}))

const menus = [
  { label: '员工名册', path: '/enterprise/staff', match: '/enterprise/staff', permission: 'org:employee' },
  {
    label: '部门管理',
    path: '/enterprise/departments',
    match: '/enterprise/departments',
    permission: 'org:department'
  },
  { label: '角色权限', path: '/enterprise/roles', match: '/enterprise/roles', permission: 'role:mgmt' }
]

const visibleMenus = computed(() =>
  menus.filter((item) => auth.isSuperAdmin || auth.permissions.includes(item.permission))
)
</script>

<style scoped lang="scss">
.enterprise-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  background: var(--color-paper-2);
  font-family: var(--font-display);
}

.enterprise-sidebar {
  /* 指示线定位基准 */
  position: relative;
  min-height: 0;
  padding: 20px 12px;
  border-right: 1px solid var(--color-rule);
  background: var(--color-paper);
  // 侧栏立体：发丝描边 + 浅落影
  box-shadow: var(--shadow-card);
}

.sidebar-title {
  padding: 0 12px 14px;
  color: var(--color-ink);
  font-size: var(--text-md);
  font-weight: 700;
}

/* 纵向滑动指示线：原本每项 ::before 的左侧静态条，现在由这一条统一滑动 */
.menu-indicator {
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  pointer-events: none;
  transition:
    transform var(--dur-short) var(--ease-out),
    height var(--dur-short) var(--ease-out),
    opacity var(--dur-micro) var(--ease-out);
}

.sidebar-menu {
  border-right: none;
  background: transparent;
}

.menu-item {
  height: 42px;
  margin-bottom: 4px;
  padding: 0 14px !important;
  border-radius: var(--radius-input);
  color: var(--color-ink-2);
  font-size: var(--text-sm);
  // 过渡只列具体属性，禁 transition: all
  transition: background-color var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out);
  // 左信号条由容器里的单条滑动指示线给出（见 .menu-indicator），这里不再挂伪元素
  position: relative;

  &:hover {
    background: var(--color-accent-wash);
    color: var(--color-accent-2);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  // 钴蓝只做激活信号：wash 底 + 滑动指示线（容器级）+ 深钴蓝文字
  &.is-active {
    background: var(--color-accent-wash);
    color: var(--color-accent-2);
    font-weight: 600;
  }
}

.enterprise-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 20px;
  box-sizing: border-box;
}

@media (max-width: 760px) {
  .enterprise-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .enterprise-sidebar {
    padding: 10px 12px;
    border-right: none;
    border-bottom: 1px solid var(--color-rule);
    box-shadow: none;
  }

  .sidebar-title {
    display: none;
  }

  .sidebar-menu {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
  }

  .menu-item {
    flex: 0 0 auto;
    margin-bottom: 0;
  }
}
</style>
