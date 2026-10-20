<template>
  <!-- F21 答卷详情页（/exam/result?ueId=）：考生信息 + 大题分组 + 逐题作答 + 导出 PDF -->
  <div class="result-page">
    <header class="result-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1 class="title">{{ data?.arrName || '答卷详情' }}</h1>
      <div class="header-actions">
        <button class="btn" type="button" :disabled="!data" @click="downloadPdf">导出 PDF</button>
      </div>
    </header>

    <div v-if="!data" class="empty-cell">加载中…</div>

    <div v-else class="result-body">
      <!-- 考生信息 -->
      <section class="info-card">
        <div class="info-item"><span>考生</span><b>{{ data.fullname || '--' }}</b></div>
        <div class="info-item"><span>账号</span><b>{{ data.userName || '--' }}</b></div>
        <div class="info-item"><span>部门</span><b>{{ data.deptName || '--' }}</b></div>
        <div class="info-item"><span>岗位</span><b>{{ data.positionName || '--' }}</b></div>
        <div class="info-item"><span>得分</span><b class="score">{{ data.score }} / {{ data.totalScore }}</b></div>
        <div class="info-item"><span>及格分</span><b>{{ data.passScore ?? '--' }}</b></div>
        <div class="info-item"><span>用时</span><b>{{ usedMinutes }} 分钟</b></div>
        <div class="info-item"><span>交卷时间</span><b>{{ data.submitAt || '--' }}</b></div>
        <div v-if="data.markerUsers?.length" class="info-item"><span>阅卷人</span><b>{{ data.markerUsers.join('、') }}</b></div>
      </section>

      <!-- 大题分组 + 逐题 -->
      <section v-for="title in data.quesTypeTitles" :key="title.type" class="section">
        <div class="section-head">
          <span class="section-title">{{ title.alias }}</span>
          <span class="section-desc">（{{ title.description }}）</span>
        </div>

        <article v-for="q in quesOfType(title.type)" :key="q.id" class="q-card">
          <div class="q-head">
            <span class="q-index">{{ q.orderIndex }}</span>
            <span class="q-content" v-html="q.content"></span>
            <span class="q-score" :class="{ wrong: q.checked === 0 }">{{ q.score }} / {{ q.totalScore }} 分</span>
          </div>

          <div v-if="q.choiceItems?.length" class="options">
            <div v-for="(o, i) in q.choiceItems" :key="i" class="option"
                 :class="{ picked: o.checked, correct: o.answer === 1 }">
              <span class="opt-key">{{ String.fromCharCode(65 + i) }}</span>
              <span class="opt-text" v-html="o.itemContent"></span>
              <span v-if="o.checked" class="opt-flag">考生所选</span>
              <span v-if="o.answer === 1" class="opt-flag correct-flag">正确答案</span>
            </div>
          </div>

          <div class="answers">
            <span class="answer-item">考生答案：<b :class="{ wrong: q.checked === 0 }">{{ q.submitContent || '未作答' }}</b></span>
            <span class="answer-item">正确答案：<b class="ok">{{ q.answerContent || '--' }}</b></span>
            <span v-if="q.pointNames" class="answer-item">考核点：{{ q.pointNames }}</span>
          </div>

          <div v-if="q.explainText" class="explain"><b>解析：</b><span v-html="q.explainText"></span></div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { exportArrangeResultPdf, getArrangeResult, type ArrangeResultView } from '@/api/arrange'

const route = useRoute()
const router = useRouter()
const ueId = String(route.query.ueId ?? '')
const data = ref<ArrangeResultView | null>(null)

const usedMinutes = computed(() => {
  const sec = data.value?.usedTime ?? 0
  return sec > 0 ? Math.round(sec / 60) : 0
})

const quesOfType = (type: number) => (data.value?.userQues || []).filter(q => q.quesType === type)

const load = async () => {
  if (!ueId) {
    toast.error('缺少答卷 id')
    return
  }
  try {
    data.value = await getArrangeResult(ueId)
  } catch { /* 拦截器已提示 */ }
}

const downloadPdf = async () => {
  if (!data.value) return
  try {
    await exportArrangeResultPdf(ueId, `${data.value.fullname || '考生'}_${data.value.examName || '试卷'}_答卷.pdf`)
    toast.success('PDF 已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

const goBack = () => router.push('/exam/exam-mgmt')

onMounted(load)
</script>

<style scoped lang="scss">
.result-page { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #fff; }
.result-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid #e8eaef;
  .back-btn { width: 28px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 18px; color: #4a5368; cursor: pointer; }
  .title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
  .header-actions { margin-left: auto; }
}
.result-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 30px; }
.info-card {
  display: flex; flex-wrap: wrap; gap: 22px; padding: 14px 18px;
  border: 1px solid #e5e8ef; border-radius: 8px; background: #fafbfd; margin-bottom: 16px;
  .info-item { display: flex; align-items: baseline; gap: 8px; font-size: 13px; span { color: #8a92a5; } b { color: #1f2937; font-weight: 500; } .score { color: #1890ff; font-size: 15px; } }
}
.section { margin-bottom: 20px; }
.section-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; .section-title { font-size: 15px; font-weight: 600; color: #303133; } .section-desc { font-size: 12px; color: #8a92a5; } }
.q-card { border: 1px solid #eef1f6; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
.q-head {
  display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #303133;
  .q-index { width: 20px; height: 20px; border-radius: 50%; background: #f0f5ff; color: #2f54eb; font-size: 11px; line-height: 20px; text-align: center; flex: 0 0 auto; }
  .q-content { flex: 1; min-width: 0; line-height: 1.8; }
  .q-score { flex: 0 0 auto; color: #52c41a; &.wrong { color: #f5222d; } }
}
.options { margin: 8px 0 0 28px; }
.option {
  display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: #4a5368;
  .opt-key { width: 16px; }
  .opt-text { flex: 1; min-width: 0; }
  .opt-flag { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
  .correct-flag { background: #f6ffed; border-color: #b7eb8f; color: #389e0d; }
  &.picked .opt-text { color: #1890ff; font-weight: 500; }
  &.correct .opt-key { color: #52c41a; font-weight: 600; }
}
.answers { margin: 8px 0 0 28px; display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #8a92a5; .answer-item b { font-weight: 600; } b.ok { color: #52c41a; } b.wrong { color: #f5222d; } }
.explain { margin: 8px 0 0 28px; font-size: 12px; color: #4a5368; line-height: 1.8; b { color: #8a92a5; } }
.empty-cell { text-align: center; color: #999; padding: 60px 0; }
.btn {
  padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;
  &:disabled { opacity: .55; cursor: not-allowed; }
}
</style>