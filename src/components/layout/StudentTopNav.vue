<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK 杰克</span>
      </router-link>
      <nav class="nav-menu">
        <router-link to="/study/userhome" class="nav-item" :class="{ active: currentRoute === '/study/userhome' }">
          我的陪练
        </router-link>
        <router-link to="/study/home" class="nav-item" :class="{ active: currentRoute === '/study/home' }">
          首页
        </router-link>
        <router-link to="/phrase" class="nav-item">话术目录</router-link>
        <router-link to="/course" class="nav-item">课程中心</router-link>
        <router-link to="/sparring/web/speech/list" class="nav-item" :class="{ active: currentRoute === '/sparring/web/speech/list' }">
          AI对练
        </router-link>
        <router-link to="/ai-combat" class="nav-item">AI实战训练场</router-link>
        <router-link to="/leaderboard" class="nav-item">陪练看板</router-link>
        <div class="nav-item dropdown" @mouseenter="openDropdown('more')" @mouseleave="closeDropdown('more')">
          更多 <span class="arrow">▾</span>
          <div v-if="activeDropdown === 'more'" class="dropdown-menu more-menu" @mouseenter="keepDropdown('more')" @mouseleave="closeDropdown('more')">
            <div class="dropdown-item">学习路径</div>
            <div class="dropdown-item">知识图谱</div>
            <div class="dropdown-item">学习社区</div>
          </div>
        </div>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-icon">🎨</span>
      <span class="nav-icon">🔍</span>
      <span class="nav-icon">🔔</span>
      <div class="user-dropdown" @mouseenter="openDropdown('user')" @mouseleave="closeDropdown('user')">
        <span class="user-info">
          <span class="user-avatar">{{ userInitial }}</span>
          <span class="arrow">▾</span>
        </span>
        <div v-if="activeDropdown === 'user'" class="dropdown-menu user-menu" @mouseenter="keepDropdown('user')" @mouseleave="closeDropdown('user')">
          <div class="dropdown-item" @click="goToAdmin">前往管理端</div>
          <div class="dropdown-item">个人中心</div>
          <div class="dropdown-item">我的收藏</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item">退出登录</div>
        </div>
      </div>
      <span class="nav-item workbench">
        <span>⊞</span> 工作台
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const currentRoute = computed(() => route.path)
const userInitial = computed(() => '员')
const activeDropdown = ref<string | null>(null)
let closeTimer: number | null = null

const openDropdown = (name: string) => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  activeDropdown.value = name
}

const closeDropdown = (name: string) => {
  closeTimer = window.setTimeout(() => {
    if (activeDropdown.value === name) {
      activeDropdown.value = null
    }
  }, 150)
}

const keepDropdown = (name: string) => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const goToAdmin = () => {
  activeDropdown.value = null
  router.push('/homepage')
}
</script>

<style scoped lang="scss">
.top-nav {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  display: flex;
  gap: 24px;
}

.nav-item {
  color: #333;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 0;
  transition: color 0.3s;
  cursor: pointer;
  position: relative;
  white-space: nowrap;

  &:hover, &.active {
    color: #1890ff;
  }

  &.active {
    border-bottom: 2px solid #1890ff;
  }
}

.arrow {
  font-size: 10px;
  margin-left: 2px;
}

.nav-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 8px;

  &:hover {
    color: #1890ff;
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e6f7ff;
  color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.workbench {
  display: flex;
  align-items: center;
  gap: 4px;
}

// 下拉菜单
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  padding: 8px 0;
}

.more-menu {
  min-width: 120px;

  .dropdown-item {
    padding: 10px 16px;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f5f5f5;
    }
  }
}

.user-menu {
  right: 0;
  left: auto;
  min-width: 160px;

  .dropdown-item {
    padding: 10px 16px;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f5f5f5;
    }
  }

  .dropdown-divider {
    height: 1px;
    background: #e8e8e8;
    margin: 4px 0;
  }
}
</style>
