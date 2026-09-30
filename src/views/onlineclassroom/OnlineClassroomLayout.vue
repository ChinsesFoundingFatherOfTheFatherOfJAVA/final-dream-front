<template>
  <div class="kng-layout">
    <header class="kng-header">
      <button type="button" class="back-btn" @click="router.push('/homepage')">‹</button>
      <div>
        <h1>在线课堂</h1>
        <p>企业学习资源运营</p>
      </div>
    </header>
    <div class="kng-body">
      <aside class="kng-sidebar">
        <router-link
          v-for="item in visibleMenus"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ active: route.path === item.path }"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
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

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  margin-bottom: 6px;
  padding: 0 14px;
  border-radius: 7px;
  color: #596274;
  text-decoration: none;
  font-size: 14px;

  &:hover,
  &.active {
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
</style>
