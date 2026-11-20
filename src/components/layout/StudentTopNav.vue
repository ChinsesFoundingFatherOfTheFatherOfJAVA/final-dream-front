<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK <em class="logo-accent">杰克</em></span>
      </router-link>
      <nav ref="navMenu" class="nav-menu nav-underline">
        <span class="nav-indicator" :style="indicatorStyle" aria-hidden="true"></span>
        <router-link
          to="/study/home"
          class="nav-item"
          :class="{ active: currentRoute === '/study/home' }"
        >
          <NavFlipLabel text="首页" />
        </router-link>
        <router-link
          to="/study/userhome"
          class="nav-item"
          :class="{ active: currentRoute === '/study/userhome' }"
        >
          <NavFlipLabel text="我的陪练" />
        </router-link>
        <router-link
          to="/sparring/web/speech/list"
          class="nav-item"
          :class="{ active: currentRoute === '/sparring/web/speech/list' }"
        >
          <NavFlipLabel text="AI对练" />
        </router-link>
        <router-link
          to="/sparring/web/drillmate"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/sparring/web/drillmate') }"
        >
          <NavFlipLabel text="AI实战训练场" />
        </router-link>
        <!-- 契约 02 §8B.1：学员考试入口紧跟「AI实战训练场」右侧。
             用 startsWith 而不是 === ：入考场后还有 /entry、/attempts/:id 等子页面，
             只判等会让进入考场时顶部导航失去激活态。 -->
        <router-link
          to="/exam/student/exams"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/exam/student') }"
        >
          <NavFlipLabel text="考试" />
        </router-link>
        <span class="nav-item disabled" title="敬请期待"><NavFlipLabel text="话术目录" /></span>
        <span class="nav-item disabled" title="敬请期待"><NavFlipLabel text="课程中心" /></span>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-icon" aria-hidden="true" title="敬请期待"
        ><el-icon><Brush /></el-icon
      ></span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待"
        ><el-icon><Search /></el-icon
      ></span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待"
        ><el-icon><Bell /></el-icon
      ></span>
      <el-dropdown trigger="hover" @command="handleUserCommand">
        <span class="user-info">
          <span class="user-avatar">{{ auth.userInitial }}</span>
          <span class="user-name">{{ auth.displayName }}</span>
          <span class="arrow"
            ><el-icon><ArrowDown /></el-icon
          ></span>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="user-menu cut">
            <el-dropdown-item command="admin">前往管理端</el-dropdown-item>
            <el-dropdown-item disabled>个人中心</el-dropdown-item>
            <el-dropdown-item disabled>我的收藏</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="nav-item workbench"> <span aria-hidden="true">⊞</span> 工作台 </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowDown, Brush, Search, Bell } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavFlipLabel from '@/components/common/NavFlipLabel.vue'
import { useNavUnderline } from '@/utils/useNavUnderline'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const currentRoute = computed(() => route.path)
const navMenu = ref<HTMLElement | null>(null)
const { x: indX, width: indW, shown: indShown } = useNavUnderline(navMenu)
// 指示器几何由 composable 测量，这里只负责写内联样式，过渡交给 CSS
const indicatorStyle = computed(() => ({
  width: `${indW.value}px`,
  transform: `translateX(${indX.value}px)`,
  opacity: indShown.value ? 1 : 0,
}))

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
/* Hallmark Cobalt 顶栏：冷灰纸面 + 发丝线分隔，Familjen Grotesk，钴蓝只做激活信号 */
.top-nav {
  height: 60px;
  background: var(--color-paper);
  border-bottom: 1px solid var(--color-rule);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky-nav);
  font-family: var(--font-display);
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

// 品牌字标改双色：墨色为主、钴蓝只点在「杰克」，不再做渐变蓝大色块
.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: var(--tracking-display);
  color: var(--color-ink);

  .logo-accent {
    margin-left: 2px;
    color: var(--color-accent-2);
    font-style: normal;
  }
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
  color: var(--color-ink-2);
  text-decoration: none;
  font-size: var(--text-sm);
  // 显式行高：el-dropdown 会向触发项注入 line-height:1，导致与普通项行盒差 0.2px
  line-height: 20px;
  padding: 8px 0;
  // 下划线用透明边框常驻占位：激活只换颜色不改盒子高度，否则激活项多出的
  // 2px 会经 flex 拉伸让整排文字基线跳动（实测 1.2px）
  border-bottom: 2px solid transparent;
  transition: color var(--dur-micro) var(--ease-out);
  cursor: pointer;
  position: relative;
  white-space: nowrap;

  // 批注17：横向顶栏窄项 hover 只字变色（div 整体变色太重），激活态才给 wash 底
  &:hover {
    color: var(--color-accent-2);
  }

  &.disabled {
    color: var(--color-muted);
    cursor: not-allowed;
    &:hover {
      color: var(--color-muted);
      background: transparent;
    }
  }

  // 批注3（2026-11-20）：激活态只换字色+字重；下边信号条改由导航容器里的单条滑动指示器统一点亮
  &.active {
    color: var(--color-accent-deep);
    font-weight: 600;
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
  color: var(--color-muted);
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
  background: color-mix(in oklab, var(--color-accent) 18%, var(--color-paper));
  color: var(--color-accent-2);
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
