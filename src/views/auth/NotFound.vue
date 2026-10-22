<template>
  <div class="notfound-page">
    <div class="notfound-card">
      <div class="code">404</div>
      <h1>页面不存在</h1>
      <p>你访问的地址不存在或已被移除。</p>
      <div class="actions">
        <button class="primary-btn" @click="goBack">返回上一页</button>
        <button class="plain-btn" @click="goHome">回到首页</button>
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
.notfound-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: #f5f7fb;
}

.notfound-card {
  width: 460px;
  max-width: 100%;
  padding: 48px 40px;
  border: 1px solid #e7ebf3;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  box-shadow: 0 18px 48px rgba(31, 45, 76, 0.1);
  box-sizing: border-box;

  .code {
    color: #1890ff;
    font-size: 42px;
    font-weight: 700;
    line-height: 1;
  }

  h1 {
    margin: 18px 0 10px;
    color: #1e2638;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #7a8396;
    font-size: 14px;
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
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: #1890ff;
  color: #fff;
}

.plain-btn {
  border: 1px solid #d9deea;
  background: #fff;
  color: #4d5568;
}
</style>
