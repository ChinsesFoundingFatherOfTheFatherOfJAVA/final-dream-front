<template>
  <!-- 占位页：未建设菜单项（01 §2：组卷/考试管理/练习管理/题目反馈/字段设置） -->
  <div class="placeholder-page">
    <div class="placeholder-card">
      <div class="placeholder-icon" aria-hidden="true">🏗</div>
      <h2>功能建设中</h2>
      <p>该模块暂未开放，敬请期待</p>
      <el-button class="back-btn" @click="router.push('/exam/queslib')">返回题库管理</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped lang="scss">
.placeholder-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-card {
  text-align: center;
  padding: 48px 64px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e6eaf1;

  .placeholder-icon { font-size: 48px; margin-bottom: 12px; }
  h2 { margin: 0 0 8px; font-size: 18px; color: #253047; }
  p { margin: 0 0 20px; color: #8a92a5; font-size: 13px; }
}

.back-btn {
  padding: 8px 24px;
  border: 1px solid #1890ff;
  border-radius: 6px;
  background: #1890ff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover { opacity: 0.9; }
}
</style>
