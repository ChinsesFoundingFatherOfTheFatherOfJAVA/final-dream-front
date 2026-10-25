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

    <!-- 填空题 -->
    <div v-else-if="type === 3" class="block">
      <label class="block-label required">填空答案</label>
      <el-input v-model.trim="body.answerContent" :rows="4"
                placeholder="每行一个空的答案，与题干中 _(1)_ _(2)_ 顺序对应" type="textarea" />
    </div>

    <!-- 问答题 -->
    <div v-else-if="type === 4" class="block">
      <label class="block-label">参考答案</label>
      <el-input v-model.trim="body.answerContent" :rows="4" type="textarea" />

      <label class="block-label">关键词及占比</label>
      <div v-for="(kw, index) in body.keywords" :key="index" class="option-row">
        <el-input v-model.trim="kw.keyword" placeholder="关键词" />
        <el-input-number v-model="kw.scoreRatio" :min="0" :max="100" class="score-input" :controls="false" />
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
import { Top, Bottom, Close } from '@element-plus/icons-vue'

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
  font-size: 13px; color: #4a5368; font-weight: 500;
  &.required::after { content: ' *'; color: #f5222d; }
}

.block textarea {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  &:focus { border-color: #1890ff; }
}

.hint { margin: 0; font-size: 11px; color: #a0a7b8; }

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .option-editor { flex: 1; min-width: 0; }

  /* 判断题的两个纯文字输入（截图规定"仅文字"，不上富文本） */
  > input {
    flex: 1;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    outline: none;
    &:focus { border-color: #1890ff; }
  }
}

.option-key { width: 22px; text-align: center; font-size: 13px; color: #4a5368; font-weight: 600; }

.drag-handle {
  width: 16px;
  color: #b0b7c3;
  cursor: grab;
  user-select: none;
  text-align: center;
  &:active { cursor: grabbing; }
}

.option-row.dragging { opacity: .5; background: #f3f7ff; border-radius: 4px; }

.answer-flag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: #4a5368; white-space: nowrap;
}

// 幽灵图标按钮：常态无边框融入行内，悬停才浮现底色，替代原"边框方块 + 文字箭头"的笨重样式
.icon-btn {
  width: 26px; height: 26px; padding: 0;
  border: none; border-radius: 4px; background: transparent;
  cursor: pointer; color: #8a92a5;
  .el-icon { font-size: 15px; }
  &:hover:not(:disabled) { color: #1890ff; background: #f0f7ff; }
  &:disabled { color: #d5dae3; cursor: not-allowed; }
  &.danger {
    color: #b0b7c3;
    &:hover:not(:disabled) { color: #f5222d; background: #fff1f0; }
  }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 1px; }
}

.radio-row { display: flex; gap: 20px; font-size: 13px; color: #4a5368; }

.score-input { width: 90px; }
.percent { font-size: 12px; color: #8a92a5; }

.btn {
  align-self: flex-start;
  padding: 7px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>