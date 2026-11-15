<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK <em class="logo-accent">杰克</em></span>
      </router-link>
      <nav class="nav-menu">
        <router-link to="/homepage" class="nav-item" :class="{ active: currentRoute === '/homepage' }">
          首页
        </router-link>
        <div class="nav-item dropdown" @mouseenter="showApps = true" @mouseleave="showApps = false">
          全部应用 <span class="arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
          <div v-if="showApps" class="dropdown-menu apps-menu cut">
            <div
              v-for="app in allApps"
              :key="app.id"
              class="app-grid-item"
              role="button"
              tabindex="0"
              @click="handleAppClick(app)"
              @keydown.enter.prevent="handleAppClick(app)"
            >
              <div class="app-icon" :style="{ background: app.color }">
                <span class="app-icon-text" aria-hidden="true">{{ app.title.charAt(0) }}</span>
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
      <span class="nav-item">绚星云学习 <span class="arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span></span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待"><el-icon><Brush /></el-icon></span>
      <span class="nav-icon" aria-hidden="true" title="敬请期待"><el-icon><Bell /></el-icon></span>
      <div class="user-dropdown" @mouseenter="showUser = true" @mouseleave="showUser = false">
        <span class="user-info">
          <span class="user-avatar">{{ userInitial }}</span>
          <span>{{ userName }}</span>
          <span class="arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
        </span>
        <div v-if="showUser" class="dropdown-menu user-menu cut">
          <div
            class="dropdown-item"
            role="button"
            tabindex="0"
            @click="goToStudent"
            @keydown.enter.prevent="goToStudent"
          >前往学员端</div>
          <div class="dropdown-item">用户中心</div>
          <div class="dropdown-item has-sub">显示语言 <span class="arrow">›</span></div>
          <div class="dropdown-divider" aria-hidden="true"></div>
          <div class="dropdown-item">退出登录</div>
        </div>
      </div>
      <span class="nav-item workbench">
        <span aria-hidden="true">⊞</span> 工作台
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowDown, Brush, Bell } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { mockApps } from '@/mock/data'

const router = useRouter()
const route = useRoute()
const currentRoute = computed(() => route.path)
const userName = '管理员'
const userInitial = computed(() => userName.charAt(0))
const showApps = ref(false)
const showUser = ref(false)

const allApps = mockApps

const handleAppClick = (app: any) => {
  showApps.value = false
  if (app.title === 'AI对练') {
    router.push('/sparring/newmanage')
  }
}

const goToStudent = () => {
  showUser.value = false
  router.push('/study/userhome')
}
</script>

<style scoped lang="scss">
/* Hallmark Cobalt 顶栏：冷灰纸面 + 发丝线分隔，Familjen Grotesk，钴蓝只做激活/按压信号 */
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
  gap: 8px;
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
  display: inline-flex;
  align-items: center;
  color: var(--color-ink-2);
  text-decoration: none;
  font-size: var(--text-sm);
  // 下划线用透明边框常驻占位：激活只换颜色不改盒子高度
  border-bottom: 2px solid transparent;
  transition: color var(--dur-micro) var(--ease-out), border-color var(--dur-micro) var(--ease-out);
  cursor: pointer;
  position: relative;
  white-space: nowrap;

  // 批注17：横向顶栏窄项 hover 只字变色（div 整体变色太重），激活态才给 wash 底
  &:hover {
    color: var(--color-accent-2);
  }

  // 批注18：激活态去底色块——字变深钴蓝+下边信号条+加重字重，全程无底色
  &.active {
    color: var(--color-accent-deep);
    border-bottom-color: var(--color-accent);
    font-weight: 600;
  }
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
  gap: 8px;
  cursor: pointer;
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

// 下拉菜单
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--color-paper);
  border-radius: var(--radius-card);
  // 卡片立体：发丝描边 + 浅落影
  box-shadow: var(--shadow-card);
  z-index: var(--z-dropdown);
  padding: 8px 0;
}

.user-menu {
  right: 0;
  left: auto;
  min-width: 160px;

  .dropdown-item {
    padding: 8px 16px;
    font-size: var(--text-sm);
    color: var(--color-ink);
    cursor: pointer;
    transition: background-color var(--dur-micro) var(--ease-out);

    &:hover {
      background: var(--color-paper-2);
    }

    // role=button 的键盘可达性：焦点环仅键盘导航时出现
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }

    &.has-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .arrow {
        color: var(--color-muted);
      }
    }
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-rule);
    margin: 4px 0;
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
  border-radius: var(--radius-card);
  cursor: pointer;
  // 仅背景色/阴影参与过渡，禁 transition: all
  transition: background-color var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out);

  // role=button 的键盘可达性：焦点环仅键盘导航时出现
  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }

  // 按压态（keycap）：hover 抬起 1px，按下沉入键帽投影
  &:hover {
    background: var(--color-paper-2);
    box-shadow: var(--shadow-card);
  }

  &:active {
    box-shadow: var(--shadow-key-press);
  }

  .app-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--color-paper);
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
    color: var(--color-ink);
    margin-bottom: 2px;
  }

  .app-desc {
    font-size: var(--text-xs);
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
