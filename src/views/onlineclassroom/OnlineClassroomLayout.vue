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
      <aside ref="sideRef" class="kng-sidebar">
        <span class="kng-indicator" :style="indicatorStyle" aria-hidden="true"></span>
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
import { computed, ref } from 'vue'
import { Back, Notebook, Reading, FolderOpened, Setting } from '@element-plus/icons-vue'
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActiveIndicator } from '@/utils/useActiveIndicator'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 批注（2026-11-20）：侧栏 tab 改「纵向滑动侧边线」——激活项之间用一条指示线滑动过渡，
// 与顶栏的下划线同一套测量逻辑（useActiveIndicator 的 y 轴模式）。
const sideRef = ref<HTMLElement | null>(null)
const { position: sideY, size: sideH, shown: sideShown } = useActiveIndicator(sideRef, {
  axis: 'y',
  itemSelector: '.menu-item.is-active'
})
const indicatorStyle = computed(() => ({
  /* 激活条在条目内上下各留 8px，和原来的静态条同高 */
  transform: `translateY(${sideY.value + 8}px)`,
  height: `${Math.max(0, sideH.value - 16)}px`,
  opacity: sideShown.value ? 1 : 0
}))

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
  position: relative;
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

/* 批注（2026-11-20）：纵向滑动侧边线——一条 2px 指示线在激活项之间滑动，替代每项自带静态条 */
.kng-indicator {
  position: absolute;
  left: 10px;
  top: 0;
  width: 2px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  pointer-events: none;
  transition:
    transform var(--dur-short) var(--ease-out),
    height var(--dur-short) var(--ease-out),
    opacity var(--dur-micro) var(--ease-out);
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

  /* 激活态只换字色/字重；左边信号条由容器里的单条滑动指示线统一给出 */
  &.is-active {
    color: var(--color-accent);
    font-weight: 500;
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
