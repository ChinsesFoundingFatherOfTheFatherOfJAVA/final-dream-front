<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK 杰克</span>
      </router-link>
      <nav class="nav-menu">
        <router-link
          to="/study/userhome"
          class="nav-item"
          :class="{ active: currentRoute === '/study/userhome' }"
        >
          我的陪练
        </router-link>
        <router-link
          to="/study/home"
          class="nav-item"
          :class="{ active: currentRoute === '/study/home' }"
        >
          首页
        </router-link>
        <span class="nav-item disabled" title="敬请期待">话术目录</span>
        <span class="nav-item disabled" title="敬请期待">课程中心</span>
        <router-link
          to="/sparring/web/speech/list"
          class="nav-item"
          :class="{ active: currentRoute === '/sparring/web/speech/list' }"
        >
          AI对练
        </router-link>
        <router-link
          to="/sparring/web/drillmate"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/sparring/web/drillmate') }"
        >
          AI实战训练场
        </router-link>
        <!-- 契约 02 §8B.1：学员考试入口紧跟「AI实战训练场」右侧。
             用 startsWith 而不是 === ：入考场后还有 /entry、/attempts/:id 等子页面，
             只判等会让进入考场时顶部导航失去激活态。 -->
        <router-link
          to="/exam/student/exams"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/exam/student') }"
        >
          考试
        </router-link>
        <span class="nav-item disabled" title="敬请期待">陪练看板</span>
        <el-dropdown trigger="hover">
          <span class="nav-item"
            >更多
            <span class="arrow"
              ><el-icon><ArrowDown /></el-icon></span
          ></span>
          <template #dropdown>
            <el-dropdown-menu class="more-menu">
              <el-dropdown-item disabled>学习路径</el-dropdown-item>
              <el-dropdown-item disabled>知识图谱</el-dropdown-item>
              <el-dropdown-item disabled>学习社区</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-icon" aria-hidden="true" title="敬请期待">🎨</span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待">🔍</span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待">🔔</span>
      <el-dropdown trigger="hover" @command="handleUserCommand">
        <span class="user-info">
          <span class="user-avatar">{{ auth.userInitial }}</span>
          <span class="user-name">{{ auth.displayName }}</span>
          <span class="arrow"
            ><el-icon><ArrowDown /></el-icon
          ></span>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="user-menu">
            <el-dropdown-item command="admin">前往管理端</el-dropdown-item>
            <el-dropdown-item disabled>个人中心</el-dropdown-item>
            <el-dropdown-item disabled>我的收藏</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="nav-item workbench"> <span>⊞</span> 工作台 </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const currentRoute = computed(() => route.path)

const logout = () => {
  auth.logout()
  router.replace('/login')
}

const handleUserCommand = (command: string) => {
  if (command === 'admin') {
    router.push('/homepage')
  } else if (command === 'logout') {
    logout()
  }
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
  align-items: center;
  gap: 24px;
}

.nav-item {
  // 统一 inline-flex 盒模型：文字位置只由盒模型决定，不被 el-dropdown 容器的
  // line-height 差异顶偏（实测 dropdown 项文字偏高 3.2px）
  display: inline-flex;
  align-items: center;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  // 显式行高：el-dropdown 会向触发项注入 line-height:1，导致与普通项行盒差 0.2px
  line-height: 20px;
  padding: 8px 0;
  // 下划线用透明边框常驻占位：激活只换颜色不改盒子高度，否则激活项多出的
  // 2px 会经 flex 拉伸让整排文字基线跳动（实测 1.2px）
  border-bottom: 2px solid transparent;
  transition: color 0.3s;
  cursor: pointer;
  position: relative;
  white-space: nowrap;

  &:hover,
  &.active {
    color: #1890ff;
  }

  &.disabled {
    color: #c0c4cc;
    cursor: not-allowed;
    &:hover {
      color: #c0c4cc;
    }
  }

  &.active {
    border-bottom-color: #1890ff;
  }
}

// el-dropdown 包裹的菜单项（更多）：与相邻项统一盒模型，文字保持同一水平线
.nav-menu > .el-dropdown {
  display: flex;
  align-items: center;
}

.arrow {
  font-size: 10px;
  margin-left: 2px;
}

// 占位图标无实际功能，不呈现可点击态，避免误导用户
.nav-icon {
  font-size: 18px;
  color: #666;
  cursor: default;
  padding: 8px;
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

.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.more-menu {
  min-width: 120px;
}

.user-menu {
  min-width: 160px;
}

@media (max-width: 760px) {
  .top-nav {
    padding: 0 12px;
  }

  .nav-left {
    gap: 0;
  }

  .nav-menu,
  .nav-right .nav-icon,
  .nav-right > .nav-item {
    display: none;
  }

  .nav-right {
    gap: 8px;
  }
}
</style>
