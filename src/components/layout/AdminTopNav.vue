<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK 杰克</span>
      </router-link>
      <nav class="nav-menu">
        <router-link to="/homepage" class="nav-item" :class="{ active: currentRoute === '/homepage' }">
          首页
        </router-link>
        <div class="nav-item dropdown" @mouseenter="openDropdown('apps')" @mouseleave="closeDropdown('apps')">
          全部应用 <span class="arrow">▾</span>
          <div v-if="activeDropdown === 'apps'" class="dropdown-menu apps-menu" @mouseenter="keepDropdown('apps')" @mouseleave="closeDropdown('apps')">
            <div v-for="app in allApps" :key="app.id" class="app-grid-item" @click="handleAppClick(app)">
              <div class="app-icon" :style="{ background: app.color }">
                <span class="app-icon-text">{{ app.title.charAt(0) }}</span>
              </div>
              <div class="app-info">
                <div class="app-name">{{ app.title }}</div>
                <div class="app-desc">{{ app.description }}</div>
              </div>
            </div>
          </div>
        </div>
        <router-link to="/operation" class="nav-item">平台运营</router-link>
        <router-link to="/enterprise" class="nav-item">我的企业</router-link>
        <router-link to="/report" class="nav-item">报表中心</router-link>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-item">绚星云学习 <span class="arrow">▾</span></span>
      <span class="nav-icon">🎨</span>
      <span class="nav-icon">🔔</span>
      <div class="user-dropdown" @mouseenter="openDropdown('user')" @mouseleave="closeDropdown('user')">
        <span class="user-info">
          <span class="user-avatar">{{ userInitial }}</span>
          <span>管理员</span>
          <span class="arrow">▾</span>
        </span>
        <div v-if="activeDropdown === 'user'" class="dropdown-menu user-menu" @mouseenter="keepDropdown('user')" @mouseleave="closeDropdown('user')">
          <div class="dropdown-item" @click="goToStudent">前往学员端</div>
          <div class="dropdown-item">用户中心</div>
          <div class="dropdown-item has-sub">显示语言 <span class="arrow-right">›</span></div>
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
import { mockApps } from '@/mock/data'

const router = useRouter()
const route = useRoute()
const currentRoute = computed(() => route.path)
const userInitial = computed(() => '管')
const activeDropdown = ref<string | null>(null)
let closeTimer: number | null = null

const allApps = mockApps

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

const handleAppClick = (app: any) => {
  activeDropdown.value = null
  if (app.title === 'AI对练') {
    router.push('/sparring/newmanage')
  }
}

const goToStudent = () => {
  activeDropdown.value = null
  router.push('/study/home')
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
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
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

    &.has-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .dropdown-divider {
    height: 1px;
    background: #e8e8e8;
    margin: 4px 0;
  }

  .arrow-right {
    font-size: 14px;
    color: #999;
  }
}

// 全部应用网格
.apps-menu {
  width: 520px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px;
}

.app-grid-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  .app-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    font-size: 16px;
    font-weight: 500;
  }

  .app-info {
    flex: 1;
    min-width: 0;
  }

  .app-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 2px;
  }

  .app-desc {
    font-size: 12px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
