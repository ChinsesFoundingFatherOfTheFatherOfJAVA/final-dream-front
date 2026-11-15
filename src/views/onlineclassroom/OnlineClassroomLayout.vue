<template>
  <div class="kng-layout">
    <header class="kng-header">
      <el-button class="back-btn" aria-label="返回首页" @click="router.push('/homepage')">
        <el-icon><Back /></el-icon>
      </el-button>
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
            <el-icon class="menu-icon" aria-hidden="true"><component :is="item.icon" /></el-icon>
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
import { Back, Notebook, Reading, FolderOpened, Setting } from '@element-plus/icons-vue'
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// t21：emoji 图标改 EP 图标组件（markRaw 避免组件对象被响应式代理）
const menus = [
  { path: '/kng/courseware', label: '课件管理', icon: markRaw(Notebook), permission: 'kng:courseware' },
  { path: '/kng/course', label: '课程管理', icon: markRaw(Reading), permission: 'kng:course' },
  { path: '/kng/catalog', label: '分类管理', icon: markRaw(FolderOpened), permission: 'kng:catalog' },
  { path: '/kng/setting', label: '课程设置', icon: markRaw(Setting), permission: 'kng:setting' }
]

const visibleMenus = computed(() => menus.filter(item => auth.hasPermission(item.permission)))
</script>

<style scoped lang="scss">
.kng-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper-2);
  color: var(--color-ink);
}

.kng-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: var(--color-paper);
  border-bottom: var(--rule-hair) solid var(--color-rule);

  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--color-ink);
  }

  p {
    margin: 3px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }
}

.back-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-rule-2);
  border-radius: var(--radius-input);
  background: var(--color-key-face);
  color: var(--color-ink-2);
  font-size: 18px;
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
  background: var(--color-paper);
  border-right: var(--rule-hair) solid var(--color-rule);
}

.kng-menu {
  border-right: none;
  background: transparent;
}

/* t21 侧栏宽行：hover wash+抬升，激活 accent 字色+左信号条（无底色块口径） */
.menu-item {
  position: relative;
  height: 42px;
  margin-bottom: 6px;
  padding: 0 14px;
  border-radius: var(--radius-input);
  color: var(--color-ink-2);
  font-size: 14px;
  line-height: 42px;
  transition: background-color var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out);

  &:hover {
    background: var(--color-accent-wash);
    transform: translateY(-1px);
  }

  &.is-active {
    color: var(--color-accent);
    font-weight: 500;

    /* 左缘 2px 族标信号条 */
    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 2px;
      border-radius: var(--radius-pill);
      background: var(--color-accent);
    }
  }
}

.menu-icon {
  width: 18px;
  margin-right: 8px;
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
