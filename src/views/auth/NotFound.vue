<template>
  <div class="notfound-page">
    <div class="notfound-card cut">
      <div class="code">404</div>
      <h1>页面不存在</h1>
      <p>你访问的地址不存在或已被移除。</p>
      <div class="actions">
        <el-button type="primary" class="primary-btn" @click="goBack">返回上一页</el-button>
        <el-button class="plain-btn" @click="goHome">回到首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    goHome()
  }
}

const goHome = () => {
  void router.replace(auth.isAuthenticated ? '/homepage' : '/login')
}
</script>

<style scoped lang="scss">
/* Hallmark Cobalt 404 页：与登录/403 页同一材质语言（paper-2 底 + paper 切角卡片） */
.notfound-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-lg);
  box-sizing: border-box;
  font-family: var(--font-display);
  background: var(--color-paper-2);
}

.notfound-card {
  width: 460px;
  max-width: 100%;
  padding: 48px 40px;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  text-align: center;
  /* 键帽底边 + 轻落影，对齐 Login 卡片做法 */
  box-shadow: var(--shadow-key);
  box-sizing: border-box;

  /* 钴蓝只做信号：404 数字用深钴蓝 */
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
