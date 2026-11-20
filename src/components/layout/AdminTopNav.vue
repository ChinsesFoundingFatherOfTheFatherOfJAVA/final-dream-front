<template>
  <header class="top-nav">
    <div class="nav-left">
      <router-link to="/homepage" class="logo">
        <span class="logo-text">JACK <em class="logo-accent">杰克</em></span>
      </router-link>
      <nav ref="navMenu" class="nav-menu nav-underline">
        <span class="nav-indicator" :style="indicatorStyle" aria-hidden="true"></span>
        <router-link
          to="/homepage"
          class="nav-item"
          :class="{ active: currentRoute === '/homepage' }"
        >
          <NavFlipLabel text="首页" />
        </router-link>
        <span class="nav-item disabled" title="敬请期待"><NavFlipLabel text="平台运营" /></span>
        <router-link
          v-if="hasEnterpriseAccess"
          to="/enterprise"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/enterprise') }"
        >
          <NavFlipLabel text="我的企业" />
        </router-link>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-icon" aria-hidden="true" title="敬请期待"
        ><el-icon><Brush /></el-icon
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
            <el-dropdown-item command="student">前往学员端</el-dropdown-item>
            <el-dropdown-item disabled>用户中心</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item disabled
              >显示语言 <span class="arrow-right">›</span></el-dropdown-item
            >
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="nav-item workbench"> <WorkbenchIcon :size="14" /> 工作台 </span>
    </div>
  </header>

  <el-dialog v-model="passwordVisible" title="修改密码" width="420px" append-to-body>
    <el-form class="password-form" label-position="top" @submit.prevent="submitPassword">
      <el-form-item label="原密码">
        <el-input
          v-model="passwordForm.oldPassword"
          type="password"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input
          v-model="passwordForm.newPassword"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input
          v-model="passwordForm.confirmPassword"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
    </el-form>
    <el-alert
      v-if="passwordError"
      :title="passwordError"
      type="error"
      :closable="false"
      show-icon
    />
    <template #footer>
      <el-button @click="passwordVisible = false">取消</el-button>
      <el-button type="primary" :loading="passwordSubmitting" @click="submitPassword">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ArrowDown, Brush, Bell } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { changePassword } from '@/api/sm'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'
import WorkbenchIcon from '@/components/icons/WorkbenchIcon.vue'
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
const passwordVisible = ref(false)
const passwordSubmitting = ref(false)
const passwordError = ref('')
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const hasEnterpriseAccess = computed(
  () =>
    auth.isSuperAdmin ||
    auth.permissions.includes('org:employee') ||
    auth.permissions.includes('org:department') ||
    auth.permissions.includes('role:mgmt'),
)

const logout = () => {
  auth.logout()
  router.replace('/login')
}

const openChangePassword = () => {
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  passwordError.value = ''
  passwordVisible.value = true
}

const handleUserCommand = (command: string) => {
  if (command === 'student') {
    router.push('/study/home')
  } else if (command === 'password') {
    openChangePassword()
  } else if (command === 'logout') {
    logout()
  }
}

const submitPassword = async () => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value
  if (!oldPassword || !newPassword) {
    passwordError.value = '请填写原密码和新密码'
    return
  }
  if (newPassword.length < 6 || newPassword.length > 32) {
    passwordError.value = '新密码长度须为 6-32 位'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  passwordSubmitting.value = true
  passwordError.value = ''
  try {
    await changePassword(oldPassword, newPassword)
    passwordVisible.value = false
    toast.info('密码修改成功，当前登录仍有效')
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : '密码修改失败'
  } finally {
    passwordSubmitting.value = false
  }
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
  .arrow-right {
    font-size: 14px;
    color: var(--color-muted);
  }
}

.password-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.2;
  }
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
