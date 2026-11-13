<!--
  通过 / 未通过 / 批阅中 印章（契约 01 §S6「通过/未通过印章」）。

  <p>尺寸与颜色全部取自原平台实机 computed style（`观察素材/原平台样式观察细节.md` §9.1）：
  - 66×66px，双环内联 SVG，外环实线、内环 `opacity=.6`；
  - 未通过文字 14px / `font-weight:500` / `#FF7875`（浅红，**不是** `#F5222D`）；
  - 倾斜 −20°（原文档写 −15°，实测 matrix 换算为 −20°，已更正）。

  <p>**批阅中必须单独一态**：原平台批阅中也画「未通过」红章，那是因为它把未出分和未通过混为一谈；
  学员看到「未通过」会以为成绩已定，所以这里给灰色「批阅中」，颜色沿用中性灰而非红/绿。

  <p>已通过态的颜色原平台未实测到（截图里只有未通过），按同结构推导为绿色 `#52C41A`，
  见文档 §5 表格末尾的说明。
-->
<template>
  <div class="stamp" :class="`stamp--${state}`" :aria-label="ariaText" role="img">
    <svg class="stamp__ring" viewBox="0 0 66 66" width="66" height="66" aria-hidden="true">
      <!-- 外环：原平台实测 path 起点 M33 0，逆时针一圈闭合 -->
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        d="M33 0c18.225 0 33 14.775 33 33S51.225 66 33 66 0 51.225 0 33 14.775 0 33 0z"
      />
      <!-- 内环：同样的圆，半径小 5px，opacity .6（实测内环第二段 opacity=.6） -->
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        opacity=".6"
        d="M33 5c15.464 0 28 12.536 28 28S48.464 61 33 61 5 48.464 5 33 17.536 5 33 5z"
      />
    </svg>
    <span class="stamp__text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StampState } from '../resultModel'

const props = defineProps<{
  state: StampState
}>()

/** 三种态的文案；批阅中不用「未通过」，避免提前定性 */
const text = computed(() => {
  if (props.state === 'passed') return '已通过'
  if (props.state === 'pending') return '批阅中'
  return '未通过'
})

/** 印章是纯图形，屏幕阅读器需要一句完整的话 */
const ariaText = computed(() => `考试结果：${text.value}`)
</script>

<style scoped lang="scss">
.stamp {
  position: relative;
  width: 66px;
  height: 66px;
  flex: 0 0 auto;
  /* −20°：实测 matrix(0.939693,-0.34202,0.34202,0.939693,0,0) */
  transform: rotate(-20deg);
  color: #ff7875;

  &--passed {
    color: #52c41a;
  }

  &--pending {
    /* 批阅中给中性灰：红色会被读成"已判未通过" */
    color: #bfbfbf;
  }
}

.stamp__ring {
  display: block;
}

.stamp__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
