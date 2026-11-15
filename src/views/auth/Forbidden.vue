<template>
  <div class="forbidden-page">
    <div class="forbidden-card cut">
      <div class="code">403</div>
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <div class="actions">
        <el-button class="primary-btn" type="primary" @click="goBack">返回上一页</el-button>
        <el-button class="plain-btn" @click="logout">退出登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const title = computed(() => (auth.isAuthenticated ? '暂无访问权限' : '登录状态已失效'))
const message = computed(() =>
  auth.isAuthenticated
    ? '当前账号没有话术训练管理权限，或不是该项目的创建者。'
    : '请重新登录后继续访问。'
)

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    void router.replace('/login')
  }
}

const logout = () => {
  auth.logout()
  void router.replace('/login')
}
</script>

<style scoped lang="scss">
// Hallmark Cobalt 403 页：与登录页同一材质语言（paper-2 底 + paper 切角卡片）
.forbidden-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-lg);
  box-sizing: border-box;
  font-family: var(--font-display);
  background: var(--color-paper-2);
}

.forbidden-card {
  width: 460px;
  max-width: 100%;
  padding: 48px 40px;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  text-align: center;
  box-shadow: var(--shadow-key);
  box-sizing: border-box;

  // 钴蓝只做信号：403 数字用深钴蓝
  .code {
    color: var(--color-accent-2);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 56px;
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--tracking-display);
    line-height: 1;
  }

  h1 {
    margin: 18px 0 10px;
    color: var(--color-ink);
    font-weight: var(--display-weight);
    letter-spacing: var(--tracking-display);
    text-wrap: balance;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--text-sm);
    line-height: 1.7;
  }
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.primary-btn,
.plain-btn {
  min-width: 110px;
  height: 40px;
  padding: 0 18px;
  border-radius: var(--radius-input);
  font-size: var(--text-sm);
}
</style>
