<template>
  <!-- SG-05 第二步对话大纲：环节卡片增删移改 + 语言下拉生成 -->
  <div class="step2">
    <div class="header-row">
      <span class="page-title">对话大纲</span>
      <button class="btn-text-back" :disabled="generating" @click="emit('back')">‹ 返回上一页</button>
    </div>

    <div v-for="(item, i) in localOutlines" :key="i" class="outline-card">
      <div class="card-head">
        <span class="card-index">环节{{ i + 1 }}：</span>
        <input class="name-input" v-model="item.name" maxlength="20" placeholder="环节名（必填）" />
        <span class="name-count">{{ item.name.length }}/20</span>
        <span class="ops">
          <span class="op" title="上移" @click="move(i, -1)">↑</span>
          <span class="op" title="下移" @click="move(i, 1)">↓</span>
          <span class="op" title="删除" @click="remove(i)">🗑</span>
        </span>
      </div>
      <div class="card-field">
        <label>✎ 考察点</label>
        <textarea v-model="item.assessmentPoints" maxlength="200" rows="3"></textarea>
        <span class="field-count">{{ item.assessmentPoints.length }}/200</span>
      </div>
      <div class="card-field">
        <label>✎ 应对思路</label>
        <textarea v-model="item.strategy" maxlength="200" rows="3"></textarea>
        <span class="field-count">{{ item.strategy.length }}/200</span>
      </div>
    </div>

    <button v-if="localOutlines.length < 10" class="add-link" @click="add">＋ 新增对话环节</button>

    <div class="footer-row">
      <div class="gen-group">
        <button
          class="btn-gradient"
          :disabled="generating || !valid"
          @click="openMenu = !openMenu"
        >✨ 确认无误，生成{{ language === 'en' ? '英语' : '普通话' }}话术 ▾</button>
        <div v-if="openMenu" class="lang-menu" @click.self="openMenu = false">
          <div :class="{ active: language === 'zh' }" @click="choose('zh')">普通话</div>
          <div :class="{ active: language === 'en' }" @click="choose('en')">英语</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OutlineItem } from '@/api/aiGen'

/**
 * 第二步大纲编辑（SG-05）：环节数即话术轮数（无独立轮次参数）；
 * 环节名必填；上限 10；上移/下移/删除即时生效；生成按钮下拉二选一语言。
 */
const props = defineProps<{ outlines: OutlineItem[]; generating: boolean }>()

const emit = defineEmits<{
  'update:outlines': [value: OutlineItem[]]
  back: []
  generate: [language: 'zh' | 'en']
}>()

const language = ref<'zh' | 'en'>('zh')
const openMenu = ref(false)

const localOutlines = computed({
  get: () => props.outlines,
  set: (v) => emit('update:outlines', v)
})

const valid = computed(() =>
  props.outlines.length > 0 && props.outlines.every((o) => o.name.trim().length > 0)
)

const setOutlines = (list: OutlineItem[]) => emit('update:outlines', list)

const add = () => {
  if (props.outlines.length >= 10) return
  setOutlines([...props.outlines, { name: '', assessmentPoints: '', strategy: '' }])
}

const remove = (index: number) => {
  const next = [...props.outlines]
  next.splice(index, 1)
  setOutlines(next)
}

const move = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= props.outlines.length) return
  const next = [...props.outlines]
  const a = next[index]!
  const b = next[target]!
  next[index] = b
  next[target] = a
  setOutlines(next)
}

const choose = (lang: 'zh' | 'en') => {
  language.value = lang
  openMenu.value = false
  emit('generate', lang)
}
</script>

<style scoped lang="scss">
.step2 { display: flex; flex-direction: column; gap: 14px; min-height: 100%; }

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .page-title { font-size: 16px; font-weight: 600; color: #333; }
}

.btn-text-back {
  border: none;
  background: none;
  color: #6b5ce7;
  font-size: 13px;
  cursor: pointer;

  &:disabled { opacity: 0.5; }
}

.outline-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 16px;

  & + .outline-card { margin-top: 0; }

  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;

    .card-index { font-size: 14px; font-weight: 600; color: #333; white-space: nowrap; }

    .name-input {
      flex: 1;
      border: none;
      border-bottom: 1px dashed #d9d9d9;
      outline: none;
      font-size: 14px;
      padding: 4px 2px;

      &:focus { border-bottom-color: #6b5ce7; }
    }

    .name-count { font-size: 12px; color: #999; }

    .ops {
      display: flex;
      gap: 8px;
      color: #999;

      .op { cursor: pointer; &:hover { color: #333; } }
    }
  }

  .card-field {
    margin-top: 10px;

    label { font-size: 13px; color: #666; display: block; margin-bottom: 4px; }

    textarea {
      width: 100%;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      outline: none;
      box-sizing: border-box;

      &:focus { border-color: #6b5ce7; }
    }

    .field-count { display: block; text-align: right; font-size: 11px; color: #bbb; margin-top: 2px; }
  }
}

.outline-card + .outline-card { border-top: 1px dashed #e8e8e8; }

.add-link {
  align-self: flex-start;
  border: none;
  background: none;
  color: #6b5ce7;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}

.footer-row {
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.gen-group { position: relative; }

.btn-gradient {
  padding: 10px 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #8f7bff, #6b5ce7);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { opacity: 0.92; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.lang-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 5;

  div {
    padding: 9px 0;
    text-align: center;
    font-size: 13px;
    color: #333;
    cursor: pointer;

    &:hover { background: #f6f4ff; }
    &.active { color: #6b5ce7; font-weight: 500; }
  }
}
</style>
