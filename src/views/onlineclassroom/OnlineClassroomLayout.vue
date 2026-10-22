<template>
  <div class="kng-layout">
    <header class="kng-header">
      <el-button class="back-btn" @click="router.push('/homepage')">‹</el-button>
      <div>
        <h1>在线课堂</h1>
        <p>企业学习资源运营</p>
      </div>
    </header>
    <div class="kng-body">
      <aside class="kng-sidebar">
        <el-menu :default-active="route.path" router class="kng-menu">
          <el-menu-item
            v-for="item in visibleMenus"
            :key="item.path"
            :index="item.path"
            class="menu-item"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </aside>
      <main class="kng-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menus = [
  { path: '/kng/courseware', label: '课件管理', icon: '▤', permission: 'kng:courseware' },
  { path: '/kng/course', label: '课程管理', icon: '▣', permission: 'kng:course' },
  { path: '/kng/catalog', label: '分类管理', icon: '☷', permission: 'kng:catalog' },
  { path: '/kng/setting', label: '课程设置', icon: '⚙', permission: 'kng:setting' }
]

const visibleMenus = computed(() => menus.filter(item => auth.hasPermission(item.permission)))
</script>

<style scoped lang="scss">
.kng-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
  color: #253047;
}

.kng-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: #fff;
  border-bottom: 1px solid #e6eaf1;

  h1 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 3px 0 0;
    color: #8a92a5;
    font-size: 12px;
  }
}

.back-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #596274;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.kng-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.kng-sidebar {
  width: 200px;
  flex-shrink: 0;
  padding: 14px 10px;
  background: #fff;
  border-right: 1px solid #e6eaf1;
}

.kng-menu {
  border-right: none;
  background: transparent;
}

.menu-item {
  height: 42px;
  margin-bottom: 6px;
  padding: 0 14px;
  border-radius: 7px;
  color: #596274;
  font-size: 14px;
  line-height: 42px;

  &:hover,
  &.is-active {
    color: #e75487;
    background: #fff1f6;
  }
}

.menu-icon {
  width: 18px;
  text-align: center;
}

.kng-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

@media (max-width: 900px) {
  .kng-sidebar {
    width: 64px;
    padding: 14px 8px;
  }

  .menu-item {
    justify-content: center;
    padding: 0;
  }

  .menu-item > span:last-child {
    display: none;
  }

  .kng-content {
    padding: 14px;
  }
}

@media (max-width: 640px) {
  .kng-header {
    height: 56px;
    padding: 0 12px;
  }

  .kng-sidebar {
    display: none;
  }

  .kng-content {
    padding: 10px;
  }
}
</style>
