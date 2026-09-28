<template>
  <div class="enterprise-layout">
    <aside class="enterprise-sidebar">
      <div class="sidebar-title">我的企业</div>
      <nav class="sidebar-menu">
        <router-link
          v-for="item in visibleMenus"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ active: route.path.startsWith(item.match) }"
        >
          {{ item.label }}
        </router-link>
      </nav>
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
  background: #f5f7fa;
}

.enterprise-sidebar {
  min-height: 0;
  padding: 20px 12px;
  border-right: 1px solid #e5e9f0;
  background: #fff;
}

.sidebar-title {
  padding: 0 12px 14px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 7px;
  color: #596274;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover {
    background: #f4f7fc;
    color: #245fbd;
  }

  &.active {
    background: #eaf2ff;
    color: #1f6fe8;
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
    border-bottom: 1px solid #e5e9f0;
  }

  .sidebar-title {
    display: none;
  }

  .sidebar-menu {
    flex-direction: row;
    overflow-x: auto;
  }

  .menu-item {
    flex: 0 0 auto;
  }
}
</style>
