<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="brand-block">
        <div class="brand-mark">J</div>
        <div>
          <h1>JACK 杰克</h1>
          <p>AI话术训练平台</p>
        </div>
      </div>

      <el-form class="login-form" label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input
            v-model.trim="account"
            autocomplete="username"
            placeholder="请输入账号"
            size="large"
            autofocus
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            size="large"
            show-password
          />
        </el-form-item>
        <el-alert v-if="errorMsg" :title="errorMsg" type="error" :closable="false" show-icon />
        <el-button
          class="login-btn"
          type="primary"
          native-type="submit"
          size="large"
          :loading="submitting"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const account = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref('')
const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : ''))

const targetAfterLogin = () => {
  if (redirect.value && !redirect.value.startsWith('/login') && !redirect.value.startsWith('/403')) {
    return redirect.value
  }
  return auth.isSuperAdmin || auth.permissions.length > 0 ? '/homepage' : '/study/home'
}

const submit = async () => {
  if (!account.value || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    await auth.login(account.value, password.value)
    await router.replace(targetAfterLogin())
  } catch (error: unknown) {
    errorMsg.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (auth.isAuthenticated) {
    void router.replace(targetAfterLogin())
  }
})
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background:
    linear-gradient(135deg, rgba(74, 124, 255, 0.08), transparent 42%),
    linear-gradient(315deg, rgba(46, 197, 182, 0.08), transparent 38%),
    #f5f7fb;
}

.login-panel {
  width: 420px;
  max-width: 100%;
  background: #fff;
  border: 1px solid #e7ebf3;
  border-radius: 16px;
  padding: 38px 40px 42px;
  box-shadow: 0 18px 48px rgba(31, 45, 76, 0.12);
  box-sizing: border-box;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 34px;

  .brand-mark {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #2e7cf6;
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 700;
  }

  h1 {
    margin: 0 0 3px;
    color: #1e2638;
    font-size: 22px;
    line-height: 1.2;
  }

  p {
    margin: 0;
    color: #8a92a5;
    font-size: 13px;
  }
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 8px;
    color: #4d5568;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
  }

  :deep(.el-input__wrapper) {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 8px;
    box-shadow: 0 0 0 1px #d9deea inset;
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #1890ff inset, 0 0 0 3px rgba(24, 144, 255, 0.12);
  }

  :deep(.el-alert) {
    margin: -4px 0 4px;
  }
}

.login-btn {
  width: 100%;
  height: 46px;
  margin-top: 18px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 520px) {
  .login-panel {
    padding: 30px 24px 34px;
  }
}
</style>
