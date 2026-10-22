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
        <el-dropdown trigger="hover">
          <span class="nav-item">全部应用 <span class="arrow">▾</span></span>
          <template #dropdown>
            <div class="apps-menu">
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
          </template>
        </el-dropdown>
        <span class="nav-item disabled" title="敬请期待">平台运营</span>
        <router-link
          v-if="hasEnterpriseAccess"
          to="/enterprise"
          class="nav-item"
          :class="{ active: currentRoute.startsWith('/enterprise') }"
        >
          我的企业
        </router-link>
        <span class="nav-item disabled" title="敬请期待">报表中心</span>
      </nav>
    </div>
    <div class="nav-right">
      <span class="nav-item">绚星云学习 <span class="arrow">▾</span></span>
      <span class="nav-icon">🎨</span>
      <span class="nav-icon">🔔</span>
      <el-dropdown trigger="hover" @command="handleUserCommand">
        <span class="user-info">
          <span class="user-avatar">{{ auth.userInitial }}</span>
          <span class="user-name">{{ auth.displayName }}</span>
          <span class="arrow">▾</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="user-menu">
            <el-dropdown-item command="student">前往学员端</el-dropdown-item>
            <el-dropdown-item disabled>用户中心</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item disabled>显示语言 <span class="arrow-right">›</span></el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="nav-item workbench">
        <span>⊞</span> 工作台
      </span>
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
    <el-alert v-if="passwordError" :title="passwordError" type="error" :closable="false" show-icon />
    <template #footer>
      <el-button @click="passwordVisible = false">取消</el-button>
      <el-button type="primary" :loading="passwordSubmitting" @click="submitPassword">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { mockApps } from '@/mock/data'
import { changePassword } from '@/api/sm'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const currentRoute = computed(() => route.path)
const passwordVisible = ref(false)
const passwordSubmitting = ref(false)
const passwordError = ref('')
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const allApps = mockApps
const hasEnterpriseAccess = computed(
  () =>
    auth.isSuperAdmin ||
    auth.permissions.includes('org:employee') ||
    auth.permissions.includes('org:department') ||
    auth.permissions.includes('role:mgmt')
)

const handleAppClick = (app: any) => {
  if (app.title === 'AI对练') {
    router.push('/sparring/newmanage')
  }
}

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

  &.disabled {
    color: #c0c4cc;
    cursor: not-allowed;
    &:hover { color: #c0c4cc; }
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

.user-menu {
  min-width: 160px;
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

.password-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    color: #4d5568;
    font-size: 13px;
    line-height: 1.2;
  }
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
