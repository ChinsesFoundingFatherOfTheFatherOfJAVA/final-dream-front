<template>
  <div class="login-page">
    <!-- 石墨舞台：透视地平线 + 粒子连线。卡片仍是纸面，保证表单可读。 -->
    <canvas ref="stageEl" class="login-stage" aria-hidden="true"></canvas>
    <div class="login-copy">
      <h1>JACK</h1>
      <p class="login-lede">AI 话术训练平台<br />真实场景。反复对练。上场能用。</p>
    </div>
    <div class="login-panel cut">
      <div class="brand-block">
        <CourseIcon class="brand-icon" :size="22" />
        <div>
          <h2>登录</h2>
          <p>杰克</p>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CourseIcon from '@/components/icons/CourseIcon.vue'
import { mountLoginStage } from '@/assets/styles/login-stage'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const account = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref('')
const stageEl = ref<HTMLCanvasElement | null>(null)
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

let stopStage: (() => void) | null = null
onMounted(() => {
  if (auth.isAuthenticated) {
    void router.replace(targetAfterLogin())
    return
  }
  if (stageEl.value) stopStage = mountLoginStage(stageEl.value)
})

onUnmounted(() => {
  stopStage?.()
  stopStage = null
})
</script>

<style scoped lang="scss">
/* 入口是全站唯一整页石墨舞台：内容页保持纸面，这里用纵深把人推进去。 */
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
  align-items: center;
  gap: 32px;
  padding: 48px clamp(24px, 6vw, 88px);
  box-sizing: border-box;
  overflow: hidden;
  background: var(--color-graphite);
  color: var(--color-graphite-ink);
  font-family: var(--font-display);
}

.login-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-base);
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: var(--z-base);
  pointer-events: none;
  background: radial-gradient(
    ellipse at 36% 42%,
    transparent 0%,
    color-mix(in oklab, var(--color-graphite) 72%, transparent) 72%
  );
}

.login-copy {
  position: relative;
  z-index: var(--z-raised);
  max-width: 640px;
}

.login-copy h1 {
  margin: 0;
  color: var(--color-graphite-ink);
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  font-size: clamp(84px, 13vw, 164px);
  line-height: 0.84;
  letter-spacing: var(--tracking-display);
  text-wrap: balance;
}

.login-lede {
  margin: 24px 0 0;
  max-width: 16em;
  color: var(--color-graphite-muted);
  font-size: 18px;
  line-height: 1.45;
}

.login-panel {
  position: relative;
  z-index: var(--z-raised);
  width: 100%;
  padding: 36px 32px 32px;
  background: var(--color-paper);
  color: var(--color-ink);
  border: 1px solid var(--color-rule);
  box-shadow: var(--shadow-key);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  color: var(--color-accent);
}

.brand-icon {
  flex: none;
}

.brand-block h2 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: var(--display-weight);
  letter-spacing: var(--tracking-display);
  line-height: 1.1;
  text-wrap: balance;
}

.brand-block p {
  margin: 2px 0 0;
  color: var(--color-muted);
  font-size: var(--text-xs);
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 8px;
    color: var(--color-muted);
    font-size: var(--text-xs);
    font-weight: 500;
    line-height: 1.2;
  }

  :deep(.el-input__wrapper) {
    min-height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-input);
    box-shadow: 0 0 0 1px var(--color-rule-2) inset;
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow:
      0 0 0 1px var(--color-focus) inset,
      0 0 0 3px color-mix(in oklab, var(--color-focus) 18%, transparent);
  }

  :deep(.el-alert) {
    margin: 0 0 4px;
  }
}

.login-btn {
  width: 100%;
  height: 46px;
  margin-top: 16px;
  border-radius: var(--radius-input);
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 860px) {
  .login-page {
    grid-template-columns: 1fr;
    align-content: end;
    padding: 28px 20px 24px;
  }

  .login-copy h1 {
    font-size: 72px;
  }

  .login-lede {
    margin-bottom: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-stage {
    opacity: 0.72;
  }
}
</style>
