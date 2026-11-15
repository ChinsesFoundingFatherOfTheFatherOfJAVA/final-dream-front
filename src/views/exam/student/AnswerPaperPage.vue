<template>
  <!-- 答卷详情（学员只读，契约 01 §S7 / 路由 /exam/student/attempts/:attemptId/paper） -->
  <div class="paper-page">
    <header class="paper-bar">
      <el-button class="back-btn" aria-label="返回" @click="goBack">
        <span aria-hidden="true">‹</span>
        <span class="back-text">查看答卷</span>
      </el-button>
    </header>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

    <div v-else-if="detail" class="paper-layout">
      <main class="paper-main">
        <!-- 信息区：试卷名 + 印章；第二、三行为总分/提交时间与考生信息 -->
        <section class="info-card">
          <header class="info-top">
            <h1 class="info-name">{{ detail.name }}</h1>
            <ResultStamp :state="stampState" />
          </header>

          <div class="info-row">
            <span class="info-item"><em>试卷总分</em>{{ formatScore(detail.totalScore) }}</span>
            <span class="info-item"><em>提交时间</em>{{ detail.submitAt || DASH }}</span>
          </div>

          <div class="info-row">
            <span class="info-item"><em>考生</em>{{ candidateText }}</span>
            <span class="info-item"><em>工号</em>{{ jobNo }}</span>
            <span class="info-item"><em>部门</em>{{ deptName }}</span>
            <span class="info-item"><em>岗位</em>{{ positionText }}</span>
          </div>
        </section>

        <!-- 题目区：分节渲染，三行信息与打分区都由 AnswerPaperBody 负责 -->
        <AnswerPaperBody
          mode="readonly"
          :sections="detail.sections"
          :show-answer="showAnswer"
          :show-analysis="showAnalysis"
        />
      </main>

      <!-- 右侧固定栏 282px（原平台实测 width:282px） -->
      <aside class="paper-side">
        <section class="card score-card">
          <p class="score-line">
            <span class="score-label">考试成绩</span>
            <!-- 分值 #F5222D 24px：注意与结果页四格 #262626 32px 不是同一处（§9.6） -->
            <span class="score-value">{{ formatPaperScore(detail.score) }}</span>
          </p>
          <p class="pass-line">
            <span class="score-label">通过分数</span>
            <span class="pass-value">{{ formatScore(detail.passScore) }}</span>
          </p>

          <div class="divider" aria-hidden="true"></div>

          <!-- 三个筛选互不影响（契约 §S7 验收 2）。默认全开。
               「只看错题」受 answerView.wrongOnly 控制：配置禁用时置灰而不是照常可切换（§9.5） -->
          <div class="filter-list">
            <el-checkbox
              v-model="wrongOnly"
              class="filter-item"
              :disabled="wrongOnlyLocked"
              @change="reloadPaper"
            >
              只看错题
            </el-checkbox>
            <el-checkbox v-model="showAnswer" class="filter-item">显示正确答案</el-checkbox>
            <el-checkbox v-model="showAnalysis" class="filter-item">展开所有解析</el-checkbox>
          </div>
        </section>

        <section class="card sheet-card">
          <h2 class="sheet-title">答题卡</h2>

          <div class="legend">
            <span class="legend-item">
              <i class="legend-box legend-box--blank" aria-hidden="true"></i>未作答
            </span>
            <span class="legend-item">
              <i class="legend-box legend-box--right" aria-hidden="true"></i>正确
            </span>
            <span class="legend-item">
              <i class="legend-box legend-box--wrong" aria-hidden="true"></i>错误
            </span>
          </div>

          <div class="divider" aria-hidden="true"></div>

          <div v-for="group in sheetGroups" :key="group.sectionIndex" class="sheet-group">
            <p class="sheet-group__name">{{ group.sectionName }}</p>
            <div class="sheet-group__items">
              <button
                v-for="item in group.items"
                :key="item.quesId"
                type="button"
                class="sheet-no"
                :class="`is-${item.state}`"
                @click="scrollToQuestion(item.quesId)"
              >
                {{ item.no }}
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 学员答卷详情页（只读）。
 *
 * <p>**「只看错题」不在前端过滤**：`wrongOnly=1` 时后端只返回有错题的大题
 * （契约 04 §11.13 明确「只返回有错题的大题，不是高亮」），前端再过滤一遍会漏掉
 * 「该大题里有错题但本题答对」的题，导致错题被藏起来。
 * 所以这里只在参数变化时**重新请求**。
 *
 * <p>三个筛选互相独立（契约 §S7 验收 2）：
 * - 只看错题 → 改变请求参数，影响 sections 内容；
 * - 显示正确答案 / 展开所有解析 → 只影响 AnswerPaperBody 的两行是否渲染，
 *   不再请求（答案与解析已随响应下发）。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAttemptPaperDetail } from '@/api/studentExam'
import { useAuthStore } from '@/stores/auth'
import type { AnswerPaperDetail, PaperCard, PaperSection } from '@/types/studentExam'
import AnswerPaperBody from './components/AnswerPaperBody.vue'
import ResultStamp from './components/ResultStamp.vue'
import {
  DASH,
  formatPaperScore,
  formatScore,
  resolveStampState
} from './resultModel'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const attemptId = String(route.params.attemptId ?? '')
const detail = ref<AnswerPaperDetail | null>(null)
const loading = ref(true)
const error = ref('')

/** 三个筛选：默认全开（契约 §S7），与三行信息默认展示一致 */
const wrongOnly = ref(false)
const showAnswer = ref(true)
const showAnalysis = ref(true)

/**
 * 「只看错题」何时锁定。
 *
 * <p>响应里没有 `answerView` 字段，无法直接得知配置。可观测的代理信号：
 * 后端在 `wrongOnly=1` 时若返回的 sections 与 `wrongOnly=0` 完全相同，说明它没做过滤，
 * 即该配置未开启——但为了不引入两次请求，这里采用更朴素的判据：
 * **初始加载后，若后端未下发任何 standard 答案（answerContent 全空），说明 answerView.viewAnswer 关闭**，
 * 那种情况下「只看错题」也失去意义（看不到答案就无从判断错在哪），故置灰。
 * 这是一个保守的可用性判断，不改变数据口径。
 */
const wrongOnlyLocked = computed(() => {
  const sections = detail.value?.sections ?? []
  if (!sections.length) return false
  const hasAnswer = sections.some((sec) =>
    sec.cards.some((card) => {
      if (card.answerContent) return true
      return (card.subQuestions ?? []).some((sub) => Boolean(sub.answerContent))
    })
  )
  return !hasAnswer
})

const stampState = computed(() =>
  detail.value
    ? resolveStampState({
        graded: detail.value.passed != null,
        passed: detail.value.passed
      })
    : ('pending' as const)
)

const candidateText = computed(() => {
  const name = auth.user?.name || auth.displayName
  const account = auth.user?.account
  return account ? `${name}（${account}）` : name
})
const jobNo = computed(() => (auth.user as { jobNo?: string } | null)?.jobNo || DASH)
const deptName = computed(() => auth.deptName || DASH)
const positionText = computed(() => auth.user?.positionName || DASH)

/** 答题卡状态：正确 / 错误 / 未作答（原平台三种色块） */
type SheetState = 'right' | 'wrong' | 'blank'

interface SheetItem {
  quesId: string
  no: string
  state: SheetState
}

interface SheetGroup {
  sectionIndex: number
  sectionName: string
  items: SheetItem[]
}

/**
 * 答题卡由 sections 派生。
 *
 * <p>组合题按「父题号.子题号」铺平，与原平台答题卡一致（截图里组合题显示 1 2 3）；
 * 父题本身没有答案行（DER-02），所以父题不单独占一个格子。
 */
const sheetGroups = computed<SheetGroup[]>(() => {
  const sections: PaperSection[] = detail.value?.sections ?? []
  return sections.map((sec) => {
    const items: SheetItem[] = []
    sec.cards.forEach((card: PaperCard, i) => {
      const subs = card.subQuestions ?? []
      if (subs.length) {
        subs.forEach((sub, si) => {
          items.push({
            quesId: sub.quesId,
            no: `${i + 1}-${si + 1}`,
            state: sheetStateOf(sub)
          })
        })
      } else {
        items.push({ quesId: card.quesId, no: String(i + 1), state: sheetStateOf(card) })
      }
    })
    return { sectionIndex: sec.sectionIndex, sectionName: sec.sectionName, items }
  })
})

/**
 * 一格的状态。
 *
 * <p>`correctFlag` 语义：1 对 / 0 错 / 2 半对 / 3 待批阅 / null 未判分。
 * 半对与待批阅都没有对应色块，归到「错误」会诬赖学员，故按**未作答色**（白底灰框）呈现——
 * 原平台只给了三种色块，多出来的态用中性色比谎报对错更稳。
 */
function sheetStateOf(card: PaperCard): SheetState {
  const hasAnswer = (card.userAnswer ?? []).some((a) => String(a ?? '').trim() !== '')
  if (!hasAnswer) return 'blank'
  if (card.correctFlag === 1) return 'right'
  if (card.correctFlag === 0) return 'wrong'
  return 'blank'
}

/** 点题号滚动定位到该题；题号来自后端顺序，不在前端重排 */
const scrollToQuestion = (quesId: string) => {
  const el = document.getElementById(`ques-${quesId}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const load = async () => {
  if (!attemptId) {
    error.value = '缺少答卷 id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    detail.value = await getAttemptPaperDetail(attemptId, wrongOnly.value ? 1 : 0)
  } catch (e) {
    // 后端在不可见时返回 40055 并带原因，拦截器已提示；这里把原因留在页面上
    error.value = e instanceof Error ? e.message : '答卷加载失败'
  } finally {
    loading.value = false
  }
}

/** 「只看错题」切换必须重新请求：过滤在后端 */
const reloadPaper = () => load()

const goBack = () => {
  const arrangeId = route.query.arrangeId
  if (arrangeId) {
    router.push(`/exam/student/attempts/${attemptId}/result`)
    return
  }
  router.back()
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 2026-11-14 Hallmark Cobalt 重构：#436bff 系弃用，颜色统一走 token 层 */

.paper-page {
  max-width: 1320px;
  margin: 0 auto;
  /*
   * 左右内边距（2026-11-13 修）：原先只有 padding-bottom，
   * 内容直接贴到 main 边缘，用户实测"文字处于边缘"。
   *
   * 参照原平台批阅/答卷页实测（ote-review-fixed-head pad 20px 16px + exam_title pad 0 20px），
   * 内容距容器左边缘约 24px，这里取同一量级。
   */
  padding: 0 24px 48px;
}

.paper-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

/* 返回：原平台是「‹ 查看答卷」的文字按钮，不是图标方块 */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 14px;

  span[aria-hidden='true'] {
    font-size: 18px;
    line-height: 1;
  }

  &:hover {
    color: var(--color-accent-deep);
  }
}

.paper-layout {
  display: grid;
  /* 右栏固定 282px，左栏吃掉剩余（原平台 .yxtulcdsdk-pc-right width:282px） */
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: 16px;
  align-items: start;
}

.paper-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.info-card {
  padding: 20px 24px;
  background: var(--color-paper);
  border-radius: var(--radius-card);
}

.info-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.info-name {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: var(--color-ink);
  word-break: break-word;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
}

.info-item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-variant-numeric: tabular-nums;

  em {
    font-style: normal;
    color: var(--color-muted);
  }
}

.paper-side {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
}

.card {
  padding: 16px;
  background: var(--color-paper);
  border-radius: var(--radius-card);
}

.score-line,
.pass-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
}

.pass-line {
  margin-top: 8px;
}

.score-label {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
}

/* 「通过分数」标签与值都比「考试成绩」淡一档 */
.pass-line .score-label,
.pass-value {
  color: var(--color-muted);
}

/* 右栏成绩：24px / error token（§9.6 层级口径保留，色走 token） */
.score-value {
  font-size: 24px;
  line-height: 32px;
  font-variant-numeric: tabular-nums;
  color: var(--color-error);
}

.pass-value {
  font-size: 14px;
  line-height: 22px;
}

.divider {
  height: 1px;
  margin: 16px 0;
  background: var(--color-paper-3);
}

.filter-list {
  display: flex;
  flex-direction: column;
}

.filter-item {
  margin-bottom: 16px;
  height: auto;

  &:last-child {
    margin-bottom: 0;
  }

  :deep(.el-checkbox__label) {
    font-size: 14px;
    color: var(--color-ink);
  }
}

.sheet-title {
  margin: 0 0 12px;
  padding-left: 0;
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: var(--color-ink);
}

/* 图例：色块 14×14、圆角 2px、右侧小字 12px（§6 实测） */
.legend {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-ink-2);
}

/* 图例色块走功能色 token */
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;

  &--blank {
    border: 1px solid var(--color-rule-2);
    background: var(--color-paper);
  }

  &--right {
    background: color-mix(in oklab, var(--color-success) 30%, var(--color-paper));
  }

  &--wrong {
    background: color-mix(in oklab, var(--color-error) 14%, var(--color-paper));
  }
}

.sheet-group {
  margin-top: 16px;
}

.sheet-group__name {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink-2);
}

.sheet-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 题号块：原平台是 28×28 左右的小方块，按三种状态上色；机器值 mono */
.sheet-no {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--color-rule-2);
  border-radius: 2px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-family: var(--font-outlier);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: border-color var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent-deep);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  &.is-right {
    border-color: color-mix(in oklab, var(--color-success) 30%, var(--color-paper));
    background: color-mix(in oklab, var(--color-success) 30%, var(--color-paper));
    color: var(--color-success);
  }

  &.is-wrong {
    border-color: color-mix(in oklab, var(--color-error) 16%, var(--color-paper));
    background: color-mix(in oklab, var(--color-error) 14%, var(--color-paper));
    color: var(--color-error);
  }
}

@media (max-width: 1100px) {
  .paper-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .paper-side {
    position: static;
  }
}
</style>
