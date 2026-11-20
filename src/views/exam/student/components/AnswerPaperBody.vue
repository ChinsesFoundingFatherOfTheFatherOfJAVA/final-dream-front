<script setup lang="ts">
/**
 * 答卷正文 —— 学员只读 / 批阅打分 **双模式一份实现**（契约 `01` §S7、§M3；`02` §8B.4）
 *
 * <p>为什么一个组件两种模式：批阅页就是「答案详情 + 可改分」，两套实现必然漂移——
 * 学员看得到答案而批阅人看不到考点这种不一致会直接导致误判。故差异只用 `mode` 开关控制。
 *
 * <p>职责边界（与 QuestionRenderer 的分工，勿越界）：
 * - 本组件负责**页面编排**：大题分节、题号/题干/分值、答案·考点·解析三行、打分区。
 * - 题干与作答控件的渲染交给 `QuestionRenderer`。
 * - 打分区放在本层：它是「每题一个、被三行信息包裹」的区块，属于编排而非题型渲染。
 *
 * <p>视觉基线**全部为原平台实机计算样式**（2026-11-10，见
 * `观察素材/原平台样式观察细节.md` §6 / §8B），不要凭印象改：
 * 三行块 #FAFAFA / 4px / padding 8px 24px / mt10；蓝色胶囊 #ECF0FF 底、#436BFF 字、2px 圆角；
 * 打分区 mt29、对错按钮 32×32、分值框 81×32 / 1px #D9D9D9 / 4px 圆角。
 *
 * <p>「只看错题」是**后端真过滤**（`04` §11.13 `wrongOnly=1` 只返回含错题的大题），
 * 本组件只渲染传入的 sections，**不在前端二次过滤**——前端过滤会漏掉「整大题都答对」的情况。
 */
import { computed } from 'vue'
import QuestionRenderer from './QuestionRenderer.vue'
import type {
  AnswerDraft,
  GradeDraft,
  PaperCard,
  PaperSection
} from '@/types/studentExam'

const props = withDefaults(
  defineProps<{
    /** readonly=学员答卷详情；grading=批阅打分 */
    mode: 'readonly' | 'grading'
    sections: PaperSection[]
    /** readonly：是否显示「答案」行（answerView.viewAnswer 由页面换算后传入） */
    showAnswer?: boolean
    /** readonly：是否显示「解析」行（answerView.viewAnalysis） */
    showAnalysis?: boolean
    /** grading：quesId → 打分草稿 */
    grades?: Record<string, GradeDraft>
    /** readonly：是否显示已打分的得分（answerView.viewScoreValue） */
    showScore?: boolean
  }>(),
  {
    showAnswer: false,
    showAnalysis: false,
    grades: () => ({}),
    showScore: true
  }
)

const emit = defineEmits<{
  'update:grades': [value: Record<string, GradeDraft>]
}>()

const isGrading = computed(() => props.mode === 'grading')

/**
 * 学员只读态的打分区是**灰化禁用**而非隐藏。
 * 原平台实测就是一个 disabled 的只读分值框（`.yxtulcdsdk-ques-score_type` 内 input 带 disabled），
 * 保留它能让学员看到每题得了多少分，隐藏反而丢信息。
 */
const gradeDisabled = computed(() => props.mode === 'readonly')

const emptyText = computed(() =>
  props.mode === 'grading' ? '本卷暂无可批阅题目' : '暂无答卷内容'
)

const ALL_SECTION_TITLE = 5

const fmt = (v: number | string | null | undefined) => {
  // 后端分数字段理论上是 number，但历史快照与空值可能给 '' 或字符串数字，
  // 类型放宽到 string 以覆盖这两种情况；NaN 统一显示 '--' 而不是 'NaN'
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  return Number.isNaN(n) ? '--' : String(n)
}

const sectionFullScore = (sec: PaperSection) =>
  fmt(sec.cards.reduce((sum, c) => sum + (Number(c.score) || 0), 0))

/** 题干后的分值提示；组合题额外标注子题数，与原平台「共3分，漏选不得分」同位置。 */
const scoreText = (card: PaperCard) => {
  if (card.type === ALL_SECTION_TITLE) {
    const n = card.subQuestions?.length ?? 0
    return `共${fmt(card.score)}分，含${n}个小题`
  }
  return `共${fmt(card.score)}分`
}

/** 由只读题面推出 QuestionRenderer 需要的作答草稿。 */
const draftOf = (card: PaperCard): AnswerDraft => ({
  answer: card.userAnswer ?? [],
  attach: [],
  marked: 0
})

const gradeOf = (quesId: string): GradeDraft =>
  props.grades?.[quesId] ?? { correctFlag: null, score: null, comment: '' }

const patchGrade = (quesId: string, patch: Partial<GradeDraft>) => {
  emit('update:grades', {
    ...(props.grades || {}),
    [quesId]: { ...gradeOf(quesId), ...patch }
  })
}

/** 线性找题：单卷题量在 10 题级（契约 `02` §8B.7），不值得为此建索引。 */
const findCard = (quesId: string): PaperCard | null => {
  for (const sec of props.sections || []) {
    for (const c of sec.cards) {
      if (c.quesId === quesId) return c
      const sub = (c.subQuestions || []).find(s => s.quesId === quesId)
      if (sub) return sub
    }
  }
  return null
}

/**
 * 点对/错按钮。
 * 再次点同一个按钮视为撤销（回到未判分），避免批阅人误点后无处可退。
 * 判对默认给满分、判错默认 0 分，仍可手改——这是批阅最快的路径。
 */
const toggleFlag = (quesId: string, flag: 1 | 0) => {
  const current = gradeOf(quesId).correctFlag
  const nextFlag = current === flag ? null : flag
  const card = findCard(quesId)
  const nextScore =
    nextFlag === 1 ? (card ? Number(card.score) : null) : nextFlag === 0 ? 0 : null
  patchGrade(quesId, { correctFlag: nextFlag, score: nextScore })
}

const onScoreInput = (quesId: string, raw: string) => {
  if (raw === '') {
    patchGrade(quesId, { score: null })
    return
  }
  const n = Number(raw)
  patchGrade(quesId, { score: Number.isNaN(n) ? null : n })
}

const onCommentInput = (quesId: string, raw: string) => {
  patchGrade(quesId, { comment: raw })
}

/** 按钮上显示的对错态：批阅态看草稿，只读态看后端判分结果。 */
const flagOf = (card: PaperCard): number | null =>
  isGrading.value ? gradeOf(card.quesId).correctFlag : (card.correctFlag ?? null)

const scoreOf = (card: PaperCard) =>
  isGrading.value ? gradeOf(card.quesId).score : (card.earnedScore ?? null)

/** 「答案」行：后端下发 + 页面开关同时为真才渲染（批阅态恒显，批阅人必须看到标准答案）。 */
const showAnswerRow = (card: PaperCard) =>
  card.answerContent != null && (isGrading.value || props.showAnswer)

/** 「解析」行：无解析时仍显示「暂无试题解析」，与原平台一致。 */
const showAnalysisRow = (card: PaperCard) =>
  isGrading.value || props.showAnalysis

const analysisText = (card: PaperCard) =>
  card.analysis && card.analysis.trim() ? card.analysis : '暂无试题解析'

const hasPointsRow = (card: PaperCard) => (card.points?.length ?? 0) > 0

const showInfoBlock = (card: PaperCard) =>
  showAnswerRow(card) || hasPointsRow(card) || showAnalysisRow(card)
</script>

<template>
  <div class="ap-body" :class="`ap-body--${mode}`">
    <p v-if="!sections || !sections.length" class="ap-empty">{{ emptyText }}</p>

    <section v-for="sec in sections" :key="sec.sectionIndex" class="ap-section">
      <h3 class="ap-section__head">
        <span class="ap-section__name">{{ sec.sectionName }}</span>
        <span class="ap-section__meta">
          （本题共{{ sec.cards.length }}小题，共{{ sectionFullScore(sec) }}分）
        </span>
      </h3>

      <!-- id 供右侧答题卡「点题号跳转」定位（学员答卷详情/批阅页共用同一锚点规则） -->
      <article v-for="(card, i) in sec.cards" :id="`ques-${card.quesId}`" :key="card.quesId" class="ap-q">
        <div class="ap-q__head">
          <span class="ap-q__index">{{ i + 1 }}.</span>
          <div class="ap-q__stem" v-html="card.content"></div>
          <span class="ap-q__score">（{{ scoreText(card) }}）</span>
        </div>

        <!-- 题干与作答状态交由 QuestionRenderer；本组件不重复渲染题型控件 -->
        <QuestionRenderer
          :card="card"
          :model-value="draftOf(card)"
          :mode="mode"
          :correct-flag="card.correctFlag ?? undefined"
          :show-answer="showAnswer"
        />

        <!-- 答案 / 考点 / 解析 三行 -->
        <div v-if="showInfoBlock(card)" class="ap-info">
          <div v-if="showAnswerRow(card)" class="ap-info__row">
            <span class="ap-tag"><span>答案</span></span>
            <span class="ap-info__text">{{ card.answerContent }}</span>
          </div>
          <div v-if="hasPointsRow(card)" class="ap-info__row">
            <span class="ap-tag"><span>考点</span></span>
            <span class="ap-info__text">{{ (card.points || []).join(',') }}</span>
          </div>
          <div v-if="showAnalysisRow(card)" class="ap-info__row">
            <span class="ap-tag"><span>解析</span></span>
            <span class="ap-info__text">{{ analysisText(card) }}</span>
          </div>
        </div>

        <!-- 已批阅的评语（有值才出现，空评语不占位） -->
        <div v-if="card.gradeComment" class="ap-info">
          <div class="ap-info__row">
            <span class="ap-tag"><span>批阅评语</span></span>
            <span class="ap-info__text">{{ card.gradeComment }}</span>
          </div>
          <div v-if="card.keywords && card.keywords.length" class="ap-info__row">
            <span class="ap-tag"><span>关键词</span></span>
            <span class="ap-info__text">{{ card.keywords.join('、') }}</span>
          </div>
        </div>

        <!-- 打分区（readonly 灰化只读 / grading 可交互）。
             DER-14：v1 不提供「按空打分」，只按题给分，故此处没有该单选组。

             V-01（2026-11-10 走查发现）：组合题**父题**不渲染打分区。
             DER-02 定的是「子题各自一行答案、父题无答案行」，父题的分数就是子题之和，
             给父题一个分输入框会让批阅人以为能单独给组合题打分，而提交时
             grades[] 按 quesId 走、后端无父题的行——这个输入框写了也不生效。 -->
        <div v-if="card.type !== ALL_SECTION_TITLE" class="ap-grade">
          <span class="ap-grade__label">打分：</span>

          <el-button
            class="ap-grade__btn"
            :class="{ 'is-success': flagOf(card) === 1 }"
            :disabled="gradeDisabled"
            aria-label="判对"
            text
            @click="isGrading && toggleFlag(card.quesId, 1)"
          >
            <svg width="17" height="15" viewBox="0 0 17 15" aria-hidden="true">
              <g fill="none" fill-rule="evenodd" transform="translate(-8 -9)">
                <rect width="32" height="32" rx="4"></rect>
                <path
                  fill="currentcolor"
                  d="M13.913 18.356L9.848 15.09 8 16.574 15.096 24c1.256-3.193 5.174-9.505 9.904-13.96L24.557 9c-5.174 3.267-8.944 7.351-10.644 9.356z"
                ></path>
              </g>
            </svg>
          </el-button>

          <el-button
            class="ap-grade__btn"
            :class="{ 'is-error': flagOf(card) === 0 }"
            :disabled="gradeDisabled"
            aria-label="判错"
            text
            @click="isGrading && toggleFlag(card.quesId, 0)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <g fill="none" fill-rule="evenodd" transform="translate(-8 -8)">
                <rect width="32" height="32" rx="4"></rect>
                <path
                  fill="currentcolor"
                  d="M9.324 8L8.007 9.104c2.344 1.744 4.526 3.744 6.445 5.744C11.515 17.8 9.212 20.704 8 21.872l2.503 2.088c.89-1.832 2.825-4.608 5.417-7.52 2.591 2.928 4.533 5.72 5.424 7.56 0 0 2.44-2.584 2.656-2.184-.939-1.056-3.234-4.128-6.315-7.272 1.766-1.808 3.747-3.6 5.865-5.176l-.578-1.072c-2.399 1.192-4.685 2.96-6.74 4.84-2.07-1.96-4.412-3.824-6.908-5.136z"
                ></path>
              </g>
            </svg>
          </el-button>

          <el-input
            class="ap-grade__input"
            :model-value="scoreOf(card) === null ? '' : String(scoreOf(card))"
            :disabled="gradeDisabled"
            maxlength="6"
            inputmode="decimal"
            placeholder="输入分数"
            @update:model-value="(v: string) => isGrading && onScoreInput(card.quesId, v)"
          />
          <span class="ap-grade__max">({{ fmt(card.score) }}分)</span>

          <el-input
            v-if="isGrading"
            class="ap-grade__comment"
            :model-value="gradeOf(card.quesId).comment"
            maxlength="200"
            placeholder="评语（选填）"
            @update:model-value="(v: string) => onCommentInput(card.quesId, v)"
          />
        </div>

        <!-- 组合题：父题给题干与考点，子题逐个展开并各自打分（契约 `01` §S7） -->
        <div v-if="card.type === ALL_SECTION_TITLE && card.subQuestions?.length" class="ap-subs">
          <article
            v-for="(sub, si) in card.subQuestions"
            :id="`ques-${sub.quesId}`"
            :key="sub.quesId"
            class="ap-q ap-q--sub"
          >
            <div class="ap-q__head">
              <span class="ap-q__index">{{ i + 1 }}.{{ si + 1 }}</span>
              <div class="ap-q__stem" v-html="sub.content"></div>
              <span class="ap-q__score">（{{ scoreText(sub) }}）</span>
            </div>

            <QuestionRenderer
              :card="sub"
              :model-value="draftOf(sub)"
              :mode="mode"
              :correct-flag="sub.correctFlag ?? undefined"
              :show-answer="showAnswer"
            />

            <div v-if="showInfoBlock(sub)" class="ap-info">
              <div v-if="showAnswerRow(sub)" class="ap-info__row">
                <span class="ap-tag"><span>答案</span></span>
                <span class="ap-info__text">{{ sub.answerContent }}</span>
              </div>
              <div v-if="hasPointsRow(sub)" class="ap-info__row">
                <span class="ap-tag"><span>考点</span></span>
                <span class="ap-info__text">{{ (sub.points || []).join(',') }}</span>
              </div>
              <div v-if="showAnalysisRow(sub)" class="ap-info__row">
                <span class="ap-tag"><span>解析</span></span>
                <span class="ap-info__text">{{ analysisText(sub) }}</span>
              </div>
            </div>

            <div class="ap-grade">
              <span class="ap-grade__label">打分：</span>
              <el-button
                class="ap-grade__btn"
                :class="{ 'is-success': flagOf(sub) === 1 }"
                :disabled="gradeDisabled"
                aria-label="判对"
                text
                @click="isGrading && toggleFlag(sub.quesId, 1)"
              >
                <svg width="17" height="15" viewBox="0 0 17 15" aria-hidden="true">
                  <g fill="none" fill-rule="evenodd" transform="translate(-8 -9)">
                    <rect width="32" height="32" rx="4"></rect>
                    <path
                      fill="currentcolor"
                      d="M13.913 18.356L9.848 15.09 8 16.574 15.096 24c1.256-3.193 5.174-9.505 9.904-13.96L24.557 9c-5.174 3.267-8.944 7.351-10.644 9.356z"
                    ></path>
                  </g>
                </svg>
              </el-button>
              <el-button
                class="ap-grade__btn"
                :class="{ 'is-error': flagOf(sub) === 0 }"
                :disabled="gradeDisabled"
                aria-label="判错"
                text
                @click="isGrading && toggleFlag(sub.quesId, 0)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <g fill="none" fill-rule="evenodd" transform="translate(-8 -8)">
                    <rect width="32" height="32" rx="4"></rect>
                    <path
                      fill="currentcolor"
                      d="M9.324 8L8.007 9.104c2.344 1.744 4.526 3.744 6.445 5.744C11.515 17.8 9.212 20.704 8 21.872l2.503 2.088c.89-1.832 2.825-4.608 5.417-7.52 2.591 2.928 4.533 5.72 5.424 7.56 0 0 2.44-2.584 2.656-2.184-.939-1.056-3.234-4.128-6.315-7.272 1.766-1.808 3.747-3.6 5.865-5.176l-.578-1.072c-2.399 1.192-4.685 2.96-6.74 4.84-2.07-1.96-4.412-3.824-6.908-5.136z"
                    ></path>
                  </g>
                </svg>
              </el-button>
              <el-input
                class="ap-grade__input"
                :model-value="scoreOf(sub) === null ? '' : String(scoreOf(sub))"
                :disabled="gradeDisabled"
                maxlength="6"
                inputmode="decimal"
                placeholder="输入分数"
                @update:model-value="(v: string) => isGrading && onScoreInput(sub.quesId, v)"
              />
              <span class="ap-grade__max">({{ fmt(sub.score) }}分)</span>
              <el-input
                v-if="isGrading"
                class="ap-grade__comment"
                :model-value="gradeOf(sub.quesId).comment"
                maxlength="200"
                placeholder="评语（选填）"
                @update:model-value="(v: string) => onCommentInput(sub.quesId, v)"
              />
            </div>
          </article>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.ap-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ap-empty {
  padding: 60px 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
}

.ap-section {
  background: var(--color-paper);
  /* 批注（2026-11-20）：题干/选项/打分区原来直接贴卡片左右边缘（容器 padding 为 0），
   * 统一给分节 24px 水平内边距，让所有题面内容一起内收。 */
  padding: 0 24px;
}

.ap-section__head {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);

  .ap-section__meta {
    font-weight: 400;
    color: var(--color-muted);
  }
}

.ap-q + .ap-q {
  margin-top: 24px;
}

.ap-q--sub {
  margin-top: 16px;
}

.ap-q__head {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 14px;
  color: var(--color-ink);
  line-height: 22px;
}

.ap-q__index {
  flex: 0 0 auto;
}

.ap-q__stem {
  flex: 1 1 auto;
  min-width: 0;
  word-break: break-word;
}

.ap-q__score {
  flex: 0 0 auto;
  color: var(--color-muted);
}

/* 三行信息块：原平台 #FAFAFA / 圆角 4px / margin-top 10px。
 * 水平 padding 由 .ap-section 的 24px 统一提供，这里不再二次缩进 */
.ap-info {
  margin-top: 10px;
  padding: 8px 0;
  border-radius: 4px;
  background: var(--color-paper-2);
}

.ap-info__row {
  display: flex;
  align-items: flex-start;
  gap: 16px;

  /* 行间距 16px：原平台每行是 mv16（上下各 8），这里用 padding 复现同一视觉 */
  padding: 8px 0;
}

/* 蓝色胶囊标签：实测 #ECF0FF 底 / #436BFF 字 / 圆角 2px / 14px·22px */
.ap-tag {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 2px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
}

.ap-info__text {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-ink-2);
  font-size: 14px;
  line-height: 22px;
  word-break: break-word;
}

/* 打分区：实测 margin-top 29px、行高 32px、对错按钮 32×32、分值框 81×32 */
.ap-grade {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 29px;
  min-height: 32px;
}

.ap-grade__label {
  color: var(--color-ink-2);
  font-size: 14px;
}

.ap-grade__btn {
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-rule-2);

  svg {
    display: block;
  }

  &.is-success {
    color: var(--color-success);
  }

  &.is-error {
    color: var(--color-error);
  }
}

.ap-grade__input {
  width: 81px;
  margin-left: 4px;

  :deep(.el-input__wrapper) {
    height: 32px;
    border-radius: 4px;
    box-shadow: 0 0 0 1px var(--color-rule-2) inset;
  }
}

.ap-grade__max {
  margin-left: 8px;
  color: var(--color-muted);
  font-size: 14px;
}

.ap-grade__comment {
  width: 260px;
  margin-left: 16px;

  :deep(.el-input__wrapper) {
    height: 32px;
    border-radius: 4px;
  }
}

.ap-subs {
  margin-top: 8px;
  padding-left: 16px;
  border-left: 2px solid var(--color-rule);
}
</style>
