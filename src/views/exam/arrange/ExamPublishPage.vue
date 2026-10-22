<template>
  <!-- F18 发布配置页（/exam/exam-mgmt/publish?arrangeId=&examId=）：
       新建时是向导第三步，已发布时是同页编辑（白名单），保存入口显示「更新后发布」 -->
  <div class="publish-page">
    <header class="publish-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1>{{ arrange?.name || '发布考试' }}</h1>
      <span v-if="arrange?.status === 4" class="status-tag">已发布</span>
    </header>

    <div v-if="!arrangeId" class="empty-cell">缺少考试 id</div>
    <PublishFormPanel v-else :arrange-id="arrangeId" @saved="load" @published="load" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArrangeDetail, type ArrangeDetail } from '@/api/arrange'
import PublishFormPanel from './components/PublishFormPanel.vue'

const route = useRoute()
const router = useRouter()
const arrangeId = String(route.query.arrangeId ?? route.query.examId ?? '')
const arrange = ref<ArrangeDetail | null>(null)

const load = async () => {
  if (!arrangeId) return
  try {
    arrange.value = await getArrangeDetail(arrangeId)
  } catch { /* 拦截器已提示 */ }
}

const goBack = () => router.push('/exam/exam-mgmt')

// F18.1：发布配置统一收敛到向导第 3 步（已发布时前两步只读、可回看）。
// 保留该路由只为兼容旧链接，进入即重定向。
onMounted(() => {
  if (arrangeId) {
    router.replace(`/exam/exam-mgmt/create?examType=onlineExam&arrangeId=${arrangeId}&step=3`)
  } else {
    load()
  }
})
</script>

<style scoped lang="scss">
.publish-page { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 12px 16px 0; overflow-y: auto; }
.publish-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
  .back-btn { width: 28px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 18px; color: #4a5368; cursor: pointer; }
  h1 { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
  .status-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
}
.empty-cell { text-align: center; color: #999; padding: 60px 0; }
</style>
