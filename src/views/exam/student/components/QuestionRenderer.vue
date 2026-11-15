<!--
  题型渲染器（契约 01 §S4 / 02 §8B.4）。

  <p>职责边界（与 AnswerPaperBody 的分工，勿越界）：
  - 本组件只负责「题干 + 作答控件 + 作答状态」的渲染；
  - 答案 / 考点 / 解析三行、打分区（对错图标 + 分值输入）都归 AnswerPaperBody，
    因为那是页面编排，不是题型渲染。
  - 组合题在这里递归自己渲染子题。

  <p>三种模式：
  - edit：学员答题，控件可交互，emit update:modelValue
  - readonly：学员看答卷，控件全部禁用但保留已选项的勾选状态
  - grading：批阅人看答卷，同 readonly（控件禁用），区别在于外层会有打分区
-->
<template>
  <!-- type=5 组合题：父题只显示题干，子题由外层循环再调用本组件 -->
  <div class="qr" :class="[`qr--${mode}`]">
    <!-- 单选 -->
    <el-radio-group
      v-if="card.type === 0"
      :model-value="singleValue"
      :disabled="!editable"
      class="qr__options"
      @update:model-value="onSingleChange"
    >
      <el-radio v-for="(opt, i) in options" :key="opt.itemId" :value="opt.itemId" class="qr__opt">
        <span class="qr__letter">{{ letter(i) }}.</span>
        <span class="qr__opt-text" v-html="opt.content"></span>
      </el-radio>
    </el-radio-group>

    <!-- 多选 -->
    <el-checkbox-group
      v-else-if="card.type === 1"
      :model-value="draft.answer"
      :disabled="!editable"
      class="qr__options"
      @update:model-value="onMultiChange"
    >
      <el-checkbox v-for="(opt, i) in options" :key="opt.itemId" :value="opt.itemId" class="qr__opt">
        <span class="qr__letter">{{ letter(i) }}.</span>
        <span class="qr__opt-text" v-html="opt.content"></span>
      </el-checkbox>
    </el-checkbox-group>

    <!-- 判断：选项来自后端下发（正确/错误两个选项），不硬编码文案 -->
    <el-radio-group
      v-else-if="card.type === 2"
      :model-value="singleValue"
      :disabled="!editable"
      class="qr__options qr__options--judge"
      @update:model-value="onSingleChange"
    >
      <el-radio v-for="(opt, i) in options" :key="opt.itemId" :value="opt.itemId" class="qr__opt">
        <span class="qr__opt-text" v-html="opt.content || (i === 0 ? '正确' : '错误')" />
      </el-radio>
    </el-radio-group>

    <!-- 填空：按空数渲染 N 个输入框，不是一个 textarea（判分按空比对，合成一个框无法表达「答对 2/3 空」）。
         空数以**后端下发的 `card.blankCount`** 为准——答题态不下发标准答案，无法从答案文本推断空数。 -->
    <div v-else-if="card.type === 3" class="qr__blanks">
      <div v-for="(_, i) in blankCount" :key="i" class="qr__blank-row">
        <span class="qr__blank-no">{{ i + 1 }}.</span>
        <el-input
          :model-value="draft.answer[i] ?? ''"
          :disabled="!editable"
          class="qr__blank-input"
          @update:model-value="(v: string) => onBlankChange(i, v)"
        />
      </div>
      <p v-if="!blankCount" class="qr__empty-tip">该题未配置空位</p>
    </div>

    <!-- 问答 -->
    <div v-else-if="card.type === 4" class="qr__qa">
      <el-input
        :model-value="draft.answer[0] ?? ''"
        type="textarea"
        :rows="4"
        :maxlength="2000"
        :show-word-limit="editable"
        :disabled="!editable"
        @update:model-value="onQaChange"
      />
    </div>

    <!-- 组合题父题：只显示题干提示，子题由外层渲染 -->
    <div v-else-if="card.type === 5" class="qr__combo-tip">
      <span>本组合题含 {{ card.subQuestions?.length ?? 0 }} 个小题</span>
    </div>

    <p v-else class="qr__empty-tip">未知题型（type={{ card.type }}）</p>
  </div>
</template>

<script setup lang="ts">
/**
 * 题型渲染器。
 *
 * <p>为什么填空题要按空渲染而不是一个 textarea：原平台实测每个空是独立输入框，
 * 判分也是按空比对。做成一个 textarea 会让「答对 2/3 空」这种部分得分无法表达。
 */
import { computed } from 'vue'
import type { AnswerDraft, PaperCard, PaperOption } from '@/types/studentExam'

const props = defineProps<{
  card: PaperCard
  modelValue: AnswerDraft
  mode: 'edit' | 'readonly' | 'grading'
  /** 本题判分结果：1 对 / 0 错 / 2 半对 / 3 待批阅；仅 readonly/grading 有意义 */
  correctFlag?: number
  /** readonly 下是否显示正确答案相关标记（当前用于选项对错着色） */
  showAnswer?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AnswerDraft): void
}>()

/** 只有 edit 模式可交互；readonly / grading 一律禁用但保留勾选状态 */
const editable = props.mode === 'edit'

const draft = computed(() => props.modelValue)

const options = computed<PaperOption[]>(() => props.card.options ?? [])

/** 单选/判断题只取第一个答案 id */
const singleValue = computed(() => draft.value.answer[0] ?? '')

/**
 * 空数：**优先用后端下发的 `blankCount`**。
 *
 * <p>为什么不能靠 `answerContent` 推断：答题态接口按契约 §11.7 **不下发标准答案**，
 * 所以答题时该字段恒空，原推算会永远退化成 1 个框——多空填空直接答不了。
 * 后端 `StudentAnswerServiceImpl.blankCountOf()` 已从题干识别好空数并下发，必须以它为准；
 * `answerContent` 仅作为「阅卷态确实下发了标准答案」时的次级依据。
 */
const blankCount = computed(() => {
  const fromServer = Number(props.card.blankCount)
  if (Number.isFinite(fromServer) && fromServer > 0) return fromServer
  const byAnswer = props.card.answerContent
    ? String(props.card.answerContent).split('\n').filter((s) => s.trim()).length
    : 0
  const byUser = draft.value.answer.length
  return Math.max(byAnswer, byUser, 1)
})

const letter = (index: number) => String.fromCharCode(65 + index)

/** 统一发出新草稿，不改原对象，避免父组件引用被就地修改 */
const emitDraft = (answer: string[]) => {
  emit('update:modelValue', { ...draft.value, answer })
}

const onSingleChange = (value: string | number | boolean | undefined) => {
  emitDraft(value ? [String(value)] : [])
}

const onMultiChange = (value: (string | number | boolean)[]) => {
  emitDraft(value.map((v) => String(v)))
}

const onBlankChange = (index: number, value: string) => {
  const next = [...draft.value.answer]
  // 补齐中间空位，避免先填第 3 空时前两空变 undefined
  while (next.length <= index) next.push('')
  next[index] = value
  emitDraft(next)
}

const onQaChange = (value: string) => {
  emitDraft([value])
}
</script>

<style scoped lang="scss">
.qr {
  &__options {
    display: flex;
    flex-direction: column;
    /* Element Plus 的 .el-radio-group 自带 align-items:center，在 column 方向下等于
       **把每个选项水平居中**；不覆盖会让选项浮在题目区中间（原平台是左对齐）。
       这条必须显式写，别指望 flex-direction 会顺手改掉交叉轴。 */
    align-items: flex-start;
    gap: 10px;
    margin-top: 10px;
  }

  &__opt {
    height: 36px;
    margin: 0;
    display: flex;
    align-items: center;
    /* 选项自身撑满可用宽度，让「字母 + 内容」从同一条左基线开始，
       否则长短不一的选项会各自按内容宽度居中排布 */
    width: 100%;

    // el-radio/checkbox 默认有较大右侧间距，这里收掉让文字贴近
    :deep(.el-radio__label),
    :deep(.el-checkbox__label) {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      padding-left: 8px;
      font-size: 14px;
      color: var(--color-ink);
    }
  }

  &__letter {
    color: var(--color-muted);
  }

  &__opt-text {
    :deep(p) {
      margin: 0;
    }
  }

  &__options--judge {
    flex-direction: row;
    /* 判断题是同行的两个 radio，恢复按内容宽度排布，不要被上面的 width:100% 拉伸 */
    align-items: center;
    gap: 32px;

    .qr__opt {
      width: auto;
    }
  }

  &__blanks {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }

  &__blank-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__blank-no {
    flex: none;
    width: 20px;
    color: var(--color-muted);
    font-size: 14px;
  }

  &__blank-input {
    max-width: 420px;
  }

  &__qa {
    margin-top: 10px;

    :deep(.el-textarea__inner) {
      font-size: 14px;
    }
  }

  &__combo-tip {
    margin-top: 8px;
    font-size: 13px;
    color: var(--color-muted);
  }

  &__empty-tip {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--color-muted);
  }
}
</style>
