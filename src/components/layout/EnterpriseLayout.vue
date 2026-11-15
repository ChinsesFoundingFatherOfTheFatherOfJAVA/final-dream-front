<template>
  <div class="enterprise-layout">
    <aside class="enterprise-sidebar">
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

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
  // 左信号条：伪元素常驻占位，激活/悬停只改颜色，不产生布局位移
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: var(--radius-pill);
    background: transparent;
    transition: background-color var(--dur-micro) var(--ease-out);
  }

  &:hover {
    background: var(--color-accent-wash);
    color: var(--color-accent-2);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  // 钴蓝只做激活信号：wash 底 + 左信号条 + 深钴蓝文字
  &.is-active {
    background: var(--color-accent-wash);
    color: var(--color-accent-2);
    font-weight: 600;

    &::before { background: var(--color-accent); }
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
