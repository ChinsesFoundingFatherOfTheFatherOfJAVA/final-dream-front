<template>
  <!-- F21 答卷详情页（/exam/result?ueId=）：考生信息 + 大题分组 + 逐题作答 + 导出 PDF -->
  <div class="result-page">
    <header class="result-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1 class="title">{{ data?.arrName || '答卷详情' }}</h1>
      <div class="header-actions">
        <el-button class="btn" :disabled="!data" @click="downloadPdf">导出 PDF</el-button>
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
.result-page { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--color-paper); }
.result-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: var(--rule-hair) solid var(--color-rule);
  .back-btn { width: 28px; height: 28px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); font-size: 18px; color: var(--color-ink-2); cursor: pointer; }
  .title { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-ink); }
  .header-actions { margin-left: auto; }
}
.result-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 30px; }
.info-card {
  display: flex; flex-wrap: wrap; gap: 22px; padding: 14px 18px;
  border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-card); background: var(--color-paper-2); margin-bottom: 16px;
  .info-item { display: flex; align-items: baseline; gap: 8px; font-size: 13px; span { color: var(--color-muted); } b { color: var(--color-ink); font-weight: 500; } .score { color: var(--color-accent-deep); font-size: 15px; } }
}
.section { margin-bottom: 20px; }
.section-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; .section-title { font-size: 15px; font-weight: 600; color: var(--color-ink); } .section-desc { font-size: 12px; color: var(--color-muted); } }
.q-card { border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-card); padding: 12px 14px; margin-bottom: 10px; }
.q-head {
  display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--color-ink);
  .q-index { width: 20px; height: 20px; border-radius: 50%; background: var(--color-accent-wash); color: var(--color-accent-deep); font-size: 11px; line-height: 20px; text-align: center; flex: 0 0 auto; }
  .q-content { flex: 1; min-width: 0; line-height: 1.8; }
  .q-score { flex: 0 0 auto; color: var(--color-success); &.wrong { color: var(--color-error); } }
}
.options { margin: 8px 0 0 28px; }
.option {
  display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: var(--color-ink-2);
  .opt-key { width: 16px; }
  .opt-text { flex: 1; min-width: 0; }
  .opt-flag { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: var(--color-accent-wash); color: var(--color-accent-deep); border: 1px solid color-mix(in oklab, var(--color-accent) 30%, var(--color-paper)); }
  .correct-flag { background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); border-color: color-mix(in oklab, var(--color-success) 40%, var(--color-paper)); color: var(--color-success); }
  &.picked .opt-text { color: var(--color-accent-deep); font-weight: 500; }
  &.correct .opt-key { color: var(--color-success); font-weight: 600; }
}
.answers { margin: 8px 0 0 28px; display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: var(--color-muted); .answer-item b { font-weight: 600; } b.ok { color: var(--color-success); } b.wrong { color: var(--color-error); } }
.explain { margin: 8px 0 0 28px; font-size: 12px; color: var(--color-ink-2); line-height: 1.8; b { color: var(--color-muted); } }
.empty-cell { text-align: center; color: var(--color-muted); padding: 60px 0; }
.btn {
  padding: 7px 16px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper);
  font-size: 13px; color: var(--color-ink-2); cursor: pointer;
  &:disabled { opacity: .55; cursor: not-allowed; }
}
</style>