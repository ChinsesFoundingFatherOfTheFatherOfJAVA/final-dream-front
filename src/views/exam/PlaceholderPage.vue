<template>
  <!-- 占位页：未建设菜单项（01 §2：组卷/考试管理/练习管理/题目反馈/字段设置） -->
  <div class="placeholder-page">
    <div class="placeholder-card">
      <el-icon class="placeholder-icon" aria-hidden="true"><Tools /></el-icon>
      <h2>功能建设中</h2>
      <p>该模块暂未开放，敬请期待</p>
      <el-button class="back-btn" type="primary" @click="router.push('/exam/queslib')">返回题库管理</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tools } from '@element-plus/icons-vue'
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
  background: var(--color-paper);
  border-radius: var(--radius-card);
  border: var(--rule-hair) solid var(--color-rule);
  box-shadow: var(--shadow-card);

  .placeholder-icon {
    font-size: 48px;
    color: var(--color-accent-2);
    margin-bottom: 12px;
  }
  h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-ink); font-family: var(--font-display); }
  p { margin: 0 0 20px; color: var(--color-muted); font-size: 13px; }
}

/* 主按钮键帽化已由主题层承担，这里只管排版间距 */
.back-btn {
  padding: 8px 24px;
}
</style>
