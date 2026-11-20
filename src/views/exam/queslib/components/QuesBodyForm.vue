<template>
  <!-- 题型相关的"下半表单"：主试题与组合题子题共用。
       body 由父组件以 reactive 对象传入，这里直接改它的嵌套字段（Vue 对嵌套属性是响应式的）。 -->
  <div class="body-form">
    <div class="block">
      <label class="block-label required">题干</label>
      <RichTextEditor v-model="body.content" :placeholder="typeHint" />
      <p class="hint">支持富文本与图片/视频/音频；填空请用 _(1)_ _(2)_ 标记空格</p>
    </div>

    <!-- 单选 / 多选 -->
    <div v-if="type === 0 || type === 1" class="block">
      <label class="block-label required">选项</label>
      <div v-for="(opt, index) in body.options" :key="index" class="option-row"
           :class="{ dragging: dragIndex === index }"
           @dragover.prevent
           @drop="onDrop(index)">
        <!-- 手柄才 draggable：整行 draggable 会妨碍在 input 里选中文字 -->
        <span class="drag-handle" draggable="true" title="拖拽调整顺序" aria-hidden="true"
              @dragstart="dragIndex = index" @dragend="dragIndex = null">⠿</span>
        <span class="option-key">{{ String.fromCharCode(65 + index) }}</span>
        <RichTextEditor v-model="opt.itemContent" class="option-editor" compact placeholder="选项内容（可含富文本/图片）" />
        <label class="answer-flag">
          <el-radio v-if="type === 0" :model-value="opt.answer === 1"
                 @change="setSingleAnswer(index)" />
          <el-checkbox v-else :model-value="opt.answer === 1"
                 @change="opt.answer = Boolean($event) ? 1 : 0" />
          正确答案
        </label>
        <el-button class="icon-btn" :disabled="index === 0" aria-label="上移选项" @click="moveOption(index, -1)">
          <el-icon><Top /></el-icon>
        </el-button>
        <el-button class="icon-btn" :disabled="index === body.options.length - 1" aria-label="下移选项" @click="moveOption(index, 1)">
          <el-icon><Bottom /></el-icon>
        </el-button>
        <el-button class="icon-btn danger" :disabled="body.options.length <= 2" aria-label="删除选项"
                @click="body.options.splice(index, 1)">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <el-button class="btn" :disabled="body.options.length >= 12" @click="addOption">+ 新增选项</el-button>
    </div>

    <!-- 判断题 -->
    <div v-else-if="type === 2" class="block">
      <label class="block-label required">选项内容</label>
      <div class="option-row">
        <span class="option-key">对</span>
        <el-input v-model.trim="body.judgeCorrect" placeholder="正确选项内容" />
      </div>
      <div class="option-row">
        <span class="option-key">错</span>
        <el-input v-model.trim="body.judgeWrong" placeholder="错误选项内容" />
      </div>
      <label class="block-label">参考答案</label>
      <div class="radio-row">
        <label><el-radio v-model.number="body.judgeAnswer" :value="0" /> 正确</label>
        <label><el-radio v-model.number="body.judgeAnswer" :value="1" /> 错误</label>
      </div>
    </div>

    <!-- 填空题：答案是按空位顺序的列表，另可勾选「空之间答案不分先后」 -->
    <div v-else-if="type === 3" class="block">
      <label class="block-label required">填空答案</label>
      <p class="block-hint">题干用 _(1)_ _(2)_ 标出空位，下面第 N 行对应第 N 个空的答案。</p>
      <div v-for="(_, index) in fillAnswers" :key="index" class="option-row">
        <span class="fill-index">第 {{ index + 1 }} 空</span>
        <el-input
          :model-value="fillAnswers[index]"
          :placeholder="`第 ${index + 1} 个空的答案`"
          @update:model-value="(v: string) => updateFillAnswer(index, v)"
        />
        <!-- 按空得分：勾选后每行后面出现分值框（对齐原平台，分值随该空计入该题得分） -->
        <template v-if="blankScoreModel">
          <el-input-number
            :model-value="blankScoreAt(index)"
            :min="0"
            :step="0.5"
            class="blank-score-input"
            controls-position="right"
            @update:model-value="(v: number | undefined) => setBlankScore(index, v)"
          />
          <span class="percent">分</span>
        </template>
        <el-button
          class="icon-btn danger"
          :disabled="fillAnswers.length <= 1"
          @click="removeFillAnswer(index)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <el-button class="btn" @click="addFillAnswer">+ 新增空</el-button>

      <div class="block-check">
        <el-checkbox v-model="noOrderModel">多个空之间的答案不分先后</el-checkbox>
      </div>
      <div class="block-check">
        <el-checkbox v-model="blankScoreModel">按空得分，可自定义每空得分</el-checkbox>
        <!--
          这个开关只决定「每空分值由谁定」，不改变判分宽严：两种情况都是每空独立给分。
          不写清楚，老师会以为不勾就得全对才给分，从而误开开关并手工填一堆分值。
        -->
        <el-tooltip placement="right" :show-after="150">
          <template #content>
            <div class="blank-score-tip">
              <p><strong>不勾选（默认）</strong>：每题总分按空数自动均分，答对几个空就拿几份分。
                例：10 分 3 个空 → 每空 3.3 分，最后一个空 3.4 分（保留一位小数），答对 1 个得 3.3 分。</p>
              <p><strong>勾选</strong>：每个空后面出现分值框，由你决定每空分值，
                各空之和必须等于该题总分；判分同样按空给分。
                例：关键参数 8 分、修饰语 2 分，答对关键参数得 8 分。</p>
              <p>两种情况都是<strong>部分答对也给分</strong>，勾选只用于区分各空的重要程度。</p>
            </div>
          </template>
          <el-icon class="check-help" aria-label="按空得分说明" tabindex="0">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
    </div>

    <!-- 问答题 -->
    <div v-else-if="type === 4" class="block">
      <label class="block-label">参考答案</label>
      <el-input v-model.trim="body.answerContent" :rows="4" type="textarea" />

      <label class="block-label">关键词及占比</label>
      <div v-for="(kw, index) in body.keywords" :key="index" class="option-row">
        <el-input v-model.trim="kw.keyword" placeholder="关键词" />
        <el-input-number v-model="kw.scoreRatio" :min="0" :max="100" class="score-input" controls-position="right" />
        <span class="percent">%</span>
        <el-button class="icon-btn danger" @click="body.keywords.splice(index, 1)">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <el-button class="btn" @click="body.keywords.push({ keyword: '', scoreRatio: 0 })">
        + 新增关键词
      </el-button>
    </div>

    <div class="block">
      <label class="block-label">试题解析</label>
      <RichTextEditor v-model="body.explainText" compact placeholder="试题解析（可含富文本/图片）" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { QuesBodyDraft } from '@/api/exam'
import RichTextEditor from './RichTextEditor.vue'
import { Top, Bottom, Close, QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps<{ type: number; body: QuesBodyDraft }>()

const typeHint = computed(() => {
  switch (props.type) {
    case 0: return '请输入单选题题干'
    case 1: return '请输入多选题题干'
    case 2: return '请输入判断题题干'
    case 3: return '请输入填空题题干，空格用 _(1)_ _(2)_ 标记'
    case 4: return '请输入问答题题干'
    default: return '请输入题干'
  }
})

const dragIndex = ref<number | null>(null)

/**
 * 填空题答案列表。
 *
 * 原平台结构是「按空位顺序的答案列表 + 空之间答案是否不分先后」，
 * 而库里 answerContent 以换行分隔存答案、noOrderMark 记是否乱序（1 乱序）。
 * 这里把两者接起来：界面按行编辑，保存时仍是一行一个答案，不改库结构。
 */
const fillAnswers = computed<string[]>(() => {
  const raw = props.body.answerContent ?? ''
  const lines = raw.split('\n')
  return lines.length ? lines : ['']
})

const updateFillAnswer = (index: number, value: string) => {
  const next = [...fillAnswers.value]
  next[index] = value
  props.body.answerContent = next.join('\n')
}

const addFillAnswer = () => {
  props.body.answerContent = [...fillAnswers.value, ''].join('\n')
}

const removeFillAnswer = (index: number) => {
  const next = fillAnswers.value.filter((_, i) => i !== index)
  props.body.answerContent = (next.length ? next : ['']).join('\n')
  // 删空要同步删掉该空的分值，否则第 N 空的分值会错位到下一个空
  const scores = [...(props.body.blankScoreValues ?? [])]
  scores.splice(index, 1)
  props.body.blankScoreValues = scores
}

/** 取第 index 个空的分值（未填按 0） */
const blankScoreAt = (index: number) => props.body.blankScoreValues?.[index] ?? 0

const setBlankScore = (index: number, value: number | undefined) => {
  const scores = [...(props.body.blankScoreValues ?? [])]
  while (scores.length < fillAnswers.value.length) scores.push(0)
  scores[index] = value ?? 0
  props.body.blankScoreValues = scores
}

/** noOrderMark：1 = 多个空之间答案不分先后，仅填空题有意义 */
const noOrderModel = computed({
  get: () => props.body.noOrderMark === 1,
  set: (v: boolean) => {
    props.body.noOrderMark = v ? 1 : 0
  },
})

/**
 * 按空得分开关：1 = 每个空可自定义分值（原平台新功能，契约后补）。
 * 关闭时把每空分值清空，避免残留旧分值影响判分。
 */
const blankScoreModel = computed({
  get: () => props.body.blankScoreMark === 1,
  set: (v: boolean) => {
    props.body.blankScoreMark = v ? 1 : 0
    if (!v) props.body.blankScoreValues = []
  },
})

/** 拖拽排序：把拖起的选项插到目标位置（↑↓ 按钮保留，便于键盘/精细调整）。 */
const onDrop = (targetIndex: number) => {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === targetIndex) return
  const list = props.body.options
  const [item] = list.splice(from, 1)
  if (!item) return
  list.splice(targetIndex, 0, item)
}

const addOption = () => props.body.options.push({ itemContent: '', answer: 0, orderIndex: props.body.options.length + 1 })

const setSingleAnswer = (index: number) => {
  props.body.options.forEach((opt, i) => { opt.answer = i === index ? 1 : 0 })
}

const moveOption = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= props.body.options.length) return
  const list = props.body.options
  const [item] = list.splice(index, 1)
  if (!item) return
  list.splice(target, 0, item)
}
</script>

<style scoped lang="scss">
.body-form { display: flex; flex-direction: column; gap: 14px; }

.block { display: flex; flex-direction: column; gap: 8px; }

.block-label {
  font-size: 13px; color: var(--color-ink-2); font-weight: 500;
  &.required::after { content: ' *'; color: var(--color-error); }
}

.block textarea {
  width: 100%;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  &:focus { border-color: var(--color-accent); }
}

.hint { margin: 0; font-size: 11px; color: var(--color-rule-2); }

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .option-editor { flex: 1; min-width: 0; }

  /* 判断题的两个纯文字输入（截图规定"仅文字"，不上富文本） */
  > input {
    flex: 1;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    outline: none;
    &:focus { border-color: var(--color-accent); }
  }
}

.option-key { width: 22px; text-align: center; font-size: 13px; color: var(--color-ink-2); font-weight: 600; }

.drag-handle {
  width: 16px;
  color: var(--color-rule-2);
  cursor: grab;
  user-select: none;
  text-align: center;
  &:active { cursor: grabbing; }
}

.option-row.dragging { opacity: .5; background: var(--color-accent-wash); border-radius: 4px; }

.answer-flag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--color-ink-2); white-space: nowrap;
}

// 幽灵图标按钮：常态无边框融入行内，悬停才浮现底色，替代原"边框方块 + 文字箭头"的笨重样式
.icon-btn {
  width: 26px; height: 26px; padding: 0;
  border: none; border-radius: 4px; background: transparent;
  cursor: pointer; color: var(--color-muted);
  .el-icon { font-size: 15px; }
  &:hover:not(:disabled) { color: var(--color-accent); background: var(--color-accent-wash); }
  &:disabled { color: var(--color-rule-2); cursor: not-allowed; }
  &.danger {
    color: var(--color-rule-2);
    &:hover:not(:disabled) { color: var(--color-error); background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper)); }
  }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
}

.radio-row { display: flex; gap: 20px; font-size: 13px; color: var(--color-ink-2); }

.score-input { width: 90px; }
.percent { font-size: 12px; color: var(--color-muted); }
.block-hint { margin: -4px 0 8px; font-size: 12px; color: var(--color-muted); }
.fill-index { flex: none; width: 62px; font-size: 13px; color: var(--color-ink-2); }
.blank-score-input { flex: none; width: 88px; }
.block-check { margin-top: 8px; }
/* 开关旁的说明图标：可聚焦，键盘也能看到提示 */
.check-help {
  margin-left: 6px;
  color: var(--color-muted);
  font-size: 14px;
  vertical-align: middle;
  cursor: help;
}
.check-help:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
.blank-score-tip {
  max-width: 380px;
  line-height: 1.7;
}
.blank-score-tip p { margin: 0 0 8px; }
.blank-score-tip p:last-child { margin-bottom: 0; }

.btn {
  align-self: flex-start;
  padding: 7px 16px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  font-size: 13px;
  color: var(--color-ink-2);
  cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>