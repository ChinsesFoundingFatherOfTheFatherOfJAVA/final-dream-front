<template>
  <div class="forbidden-page">
    <div class="forbidden-card">
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
.forbidden-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: #f5f7fb;
}

.forbidden-card {
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
    color: #2e7cf6;
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
}
</style>
