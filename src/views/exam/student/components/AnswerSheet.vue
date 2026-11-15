<!--
  答题卡（契约 01 §S4、02 §8B.4）。

  视觉基线全部来自**原平台截图实测**（`观察素材/施工比对/原平台-答题页-一页.png`，
  按 2381×1136 原图逐像素量取，并用 `ph16=16px` 与 282px 卡宽互相验证比例 1:1）：

  | 项 | 实测值 |
  |---|---|
  | 卡片宽 | 282px，左右内边距 16px（`ph16`），与题目区间距 24px（`mr24`） |
  | 进度行 | 「进度」#8C8C8C 14px；进度条高 6px、轨 #F5F5F5、圆角 3px；「N/总」#595959 14px，数字 500 字重 |
  | 分隔线 | #E9E9E9，上下各 16px（`yxtf-divider mv16`） |
  | 「答题卡」 | 18px / 行高 26 / 500 字重 / #262626 / 下间距 12px / 左 16px |
  | 图例 | 色块 12×12、圆角 2px；文字 12px #262626；色块 mr8、下一项 ml16 |
  | 大题标题 | 14px / 行高 22 / 下间距 16 / 左 16 |
  | 题号按钮 | 24×24、圆角 4px、字 12px；行内间距 24px、行下间距 16px；分组下间距 12px |
  | 标记旗 | 9×9（原平台 `width:"9px" height:"9px"`），#F5222D，压在题号右上角 |

  <p>状态不额外存一份：`marked=1` → 标记；有有效作答 → 已做；等于当前题 → 当前。
  这三条由父组件从本地 `answers` 派生后传进来（契约 02 §8B.3 明确「不额外存一份状态」）。
-->
<template>
  <aside class="sheet">
    <!-- 顶部：剩余时间（仅限时考试）与进度 -->
    <div class="sheet__card sheet__card--top">
      <div v-if="countdownText" class="sheet__countdown">
        <span class="sheet__countdown-label">剩余时间</span>
        <span class="sheet__countdown-value" :class="{ 'is-urgent': urgent }">{{ countdownText }}</span>
      </div>

      <div class="sheet__progress">
        <span class="sheet__progress-label">进度</span>
        <span class="sheet__progress-track">
          <i class="sheet__progress-fill" :style="{ width: `${percent}%` }" />
        </span>
        <span class="sheet__progress-count">
          <span class="sheet__progress-num">{{ answeredCount }}</span>/{{ total }}
        </span>
      </div>
    </div>

    <div class="sheet__card">
      <h2 class="sheet__title">答题卡</h2>

      <!-- 图例四项：未做 / 已做 / 当前 / 标记（契约 01 §S4 明确四项，不放第五项） -->
      <ul class="sheet__legend">
        <li class="sheet__legend-item">
          <span class="sheet__swatch sheet__swatch--todo" aria-hidden="true" />
          <span class="sheet__legend-text">未做</span>
        </li>
        <li class="sheet__legend-item">
          <span class="sheet__swatch sheet__swatch--done" aria-hidden="true" />
          <span class="sheet__legend-text">已做</span>
        </li>
        <li class="sheet__legend-item">
          <span class="sheet__swatch sheet__swatch--current" aria-hidden="true" />
          <span class="sheet__legend-text">当前</span>
        </li>
        <li class="sheet__legend-item">
          <span class="sheet__swatch sheet__swatch--flag" aria-hidden="true">
            <svg class="sheet__flag" viewBox="0 0 12 12" width="9" height="9">
              <g fill="currentColor">
                <path d="M5.2 1h1.1v10.2H5.2z" />
                <path d="M6.3 1h3.9v3.6H6.3z" />
                <path d="M6.3 4.6h2.6v1.6H6.3z" />
                <ellipse cx="5.75" cy="11.1" rx="3.2" ry="0.9" />
              </g>
            </svg>
          </span>
          <span class="sheet__legend-text">标记</span>
        </li>
      </ul>

      <div class="sheet__divider" role="separator" />

      <!-- 按大题分组列题号；组合题子题已摊平，各自占一个题号（与原平台一致） -->
      <div class="sheet__groups">
        <section v-for="group in sections" :key="group.sectionIndex" class="sheet__group">
          <div class="sheet__group-title" :title="group.sectionName">{{ group.sectionName }}</div>
          <ul class="sheet__nums">
            <li v-for="item in group.items" :key="item.quesId" class="sheet__num-item">
              <button
                type="button"
                class="sheet__num"
                :class="{
                  'is-done': isDone(item.quesId),
                  'is-current': item.quesId === currentQuesId,
                  'is-marked': isMarked(item.quesId)
                }"
                :aria-label="ariaOf(item.quesId, item.no)"
                :aria-current="item.quesId === currentQuesId ? 'true' : undefined"
                @click="emit('jump', item.quesId)"
              >
                {{ item.no }}
                <span v-if="isMarked(item.quesId)" class="sheet__num-flag" aria-hidden="true">
                  <svg viewBox="0 0 12 12" width="12" height="12">
                    <g fill="currentColor">
                      <path d="M5.2 1h1.1v10.2H5.2z" />
                      <path d="M6.3 1h3.9v3.6H6.3z" />
                      <path d="M6.3 4.6h2.6v1.6H6.3z" />
                      <ellipse cx="5.75" cy="11.1" rx="3.2" ry="0.9" />
                    </g>
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <div class="sheet__card sheet__card--submit">
      <el-button
        class="sheet__submit"
        type="primary"
        :loading="submitting"
        :disabled="submitted"
        @click="emit('submit')"
      >
        {{ submitted ? '已交卷' : '提交考试' }}
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * 答题卡。
 *
 * <p>为什么状态全部由 props 派生而不在本地 `ref`：答题卡、题目区、保存逻辑三方都要读
 * 「这题做了没」，任何一方另存一份就会在乐观更新失败时出现「题目区回滚了、答题卡还是已做」。
 * 契约 02 §8B.3 因此把 `answers` 定为唯一事实源，本组件只做投影。
 */
import { computed } from 'vue'
import type { AnswerDraft } from '@/types/studentExam'
import type { SheetSection } from '../attemptModel'
import { isAnswered } from '../attemptModel'

const props = withDefaults(
  defineProps<{
    /** 按大题分组、已摊平组合题子题的题号表 */
    sections: SheetSection[]
    /** 全卷题数（= 摊平后的题数） */
    total: number
    /** 已作答题数 */
    answeredCount: number
    /** 当前题 quesId；single 模式由滚动位置派生，paged 模式即分页指针 */
    currentQuesId: string
    answers: Record<string, AnswerDraft>
    /** 限时考试的倒计时文本；不限时传空串，整行不渲染 */
    countdownText?: string
    /** 剩余时间不足 5 分钟时标红提示 */
    urgent?: boolean
    submitting?: boolean
    submitted?: boolean
  }>(),
  {
    countdownText: '',
    urgent: false,
    submitting: false,
    submitted: false
  }
)

const emit = defineEmits<{
  (e: 'jump', quesId: string): void
  (e: 'submit'): void
}>()

/** 进度条百分比；0 题时给 0，避免 0/0 得到 NaN 让宽度变成 `NaN%` */
const percent = computed(() => {
  if (!props.total) return 0
  return Math.round((props.answeredCount / props.total) * 100)
})

const isDone = (quesId: string) => isAnswered(props.answers[quesId], typeOf(quesId))

const isMarked = (quesId: string) => Number(props.answers[quesId]?.marked) === 1

/** 题型从分组数据里取，不依赖 answer 的存在性（未答题也要能判断「已做」） */
const typeMap = computed(() => {
  const map: Record<string, number> = {}
  for (const group of props.sections) {
    for (const item of group.items) map[item.quesId] = item.type
  }
  return map
})

const typeOf = (quesId: string) => typeMap.value[quesId] ?? 0

/** 读屏要能听出「第几题、什么状态」，纯题号数字对无障碍没有信息量 */
const ariaOf = (quesId: string, no: number) => {
  const states: string[] = []
  states.push(isDone(quesId) ? '已做' : '未做')
  if (isMarked(quesId)) states.push('已标记')
  if (quesId === props.currentQuesId) states.push('当前题')
  return `第 ${no} 题，${states.join('，')}`
}
</script>

<style scoped lang="scss">
/* 主色 #436BFF：原平台答题卡实测色（题号已做态、当前描边、提交按钮三处一致） */
$primary: var(--color-accent);
$danger: var(--color-error);
$line: var(--color-rule);

.sheet {
  width: 282px;
  flex: 0 0 282px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: flex-start;
  /* 右侧答题卡跟随滚动（契约 01 §S4「右侧固定答题卡」） */
  position: sticky;
  top: 16px;
}

.sheet__card {
  background: var(--color-paper);
  border-radius: 4px;
  padding: 16px 0;
}

.sheet__card--top {
  /* 进度行自身 ph16，卡片不再重复给左右内边距 */
  padding: 16px 0;
}

.sheet__countdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 20px;

  &-label {
    color: var(--color-muted);
  }

  &-value {
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
    font-weight: 500;

    &.is-urgent {
      color: $danger;
    }
  }
}

.sheet__progress {
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  line-height: 20px;
}

.sheet__progress-label {
  flex: none;
  color: var(--color-muted);
  margin-right: 8px;
}

.sheet__progress-track {
  flex: 1 1 auto;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  background: var(--color-paper-3);
  margin-right: 8px;
  overflow: hidden;
}

.sheet__progress-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: $primary;
  /* 只过渡宽度：进度跳变时不要连带触发重排动画 */
  transition: width 0.2s linear;
}

.sheet__progress-count {
  flex: none;
  color: var(--color-ink-2);
  font-variant-numeric: tabular-nums;
}

.sheet__progress-num {
  font-weight: 500;
}

.sheet__title {
  margin: 0 0 12px;
  padding: 0 16px;
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: var(--color-ink);
}

.sheet__legend {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sheet__legend-item {
  display: inline-flex;
  align-items: center;
  /* 首项距卡片左缘 16px（实测 1277−1261），其余项各间隔 16px；
     「色块 mr8」由 .sheet__swatch 负责 */
  margin-left: 16px;
}

.sheet__swatch {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
  box-sizing: border-box;

  &--todo {
    background: var(--color-paper);
    border: 1px solid var(--color-rule-2);
  }

  &--done {
    background: $primary;
  }

  &--current {
    background: var(--color-paper);
    border: 1px solid $primary;
  }

  &--flag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: $danger;
  }
}

.sheet__legend-text {
  font-size: 12px;
  line-height: 20px;
  color: var(--color-ink);
  white-space: nowrap;
}

.sheet__divider {
  height: 1px;
  margin: 16px 0;
  background: $line;
}

.sheet__groups {
  /* 题号多时答题卡自身滚动，页面滚动留给题目区；上限避免长卷把提交按钮顶出视口 */
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  padding-bottom: 0;
}

.sheet__group {
  padding: 0 16px 12px;

  &:last-child {
    padding-bottom: 0;
  }
}

.sheet__group-title {
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet__nums {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0 0 0 0;
  list-style: none;
}

.sheet__num-item {
  /* 按钮 24 + 间距 24 = 48 步距，与原平台实测一致 */
  margin: 0 24px 16px 0;

  &:last-child {
    margin-right: 0;
  }
}

.sheet__num {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  box-sizing: border-box;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  /* 只过渡颜色与边框，禁 transition:all（AGENTS §4 样式基线） */
  transition:
    color 0.15s,
    background-color 0.15s,
    border-color 0.15s;

  &:hover {
    border-color: $primary;
    color: $primary;
  }

  &:focus-visible {
    outline: 2px solid $primary;
    outline-offset: 1px;
  }

  /* 已做：蓝底白字（实测 #436BFF 实心） */
  &.is-done {
    background: $primary;
    border-color: $primary;
    color: var(--color-accent-ink);
  }

  /* 当前：蓝描边（已做态也要能看出是当前题，所以描边用内阴影而不是换边框色） */
  &.is-current {
    border-color: $primary;
    color: $primary;

    &.is-done {
      color: var(--color-accent-ink);
      box-shadow: inset 0 0 0 1px var(--color-accent-ink);
    }
  }
}

.sheet__num-flag {
  position: absolute;
  top: -6px;
  right: -6px;
  display: inline-flex;
  color: $danger;
  /* 红旗要压在题号右上角之外，且不参与点击命中判断 */
  pointer-events: none;
}

.sheet__flag {
  display: block;
}

.sheet__card--submit {
  padding: 0;
  background: transparent;
}

.sheet__submit {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 4px;
  /* 用原平台实测色覆盖 Element Plus 的全局 #1890ff，保证与答题卡其他蓝色元素同色 */
  --el-button-bg-color: #{$primary};
  --el-button-border-color: #{$primary};
  --el-button-hover-bg-color: color-mix(in oklab, var(--color-accent) 82%, white);
  --el-button-hover-border-color: color-mix(in oklab, var(--color-accent) 82%, white);
  --el-button-active-bg-color: var(--color-accent-deep);
  --el-button-active-border-color: var(--color-accent-deep);
}

@media (max-width: 1180px) {
  .sheet {
    width: 100%;
    flex: 1 1 auto;
    position: static;
  }
}
</style>
