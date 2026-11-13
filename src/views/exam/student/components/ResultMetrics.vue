<!--
  结果页四格指标（契约 01 §S6「是否通过 / 考试成绩 / 考试用时 / 本次考试排名」）。

  <p>样式全部取自原平台实机确认值（`观察素材/原平台样式观察细节.md` §5 表格 + §9.2）：
  - 图标是 **32×32 内联 SVG 线稿**，不是 icon 字体（原平台 `viewBox="0 0 32 32"`）；
    线稿 `fill=none`、描边 `#595959`、辅助面 `#E9E9E9`、主色 `currentcolor`；
  - 标签 14px / `#8C8C8C`，下间距 `mb4`；
  - 分数值 **`#262626` 32px**（注意：与答卷详情右栏的 `#F5222D` 24px 不是同一处，勿串用，见 §9.6）；
  - 「/18」与「分」是 16px 的次要单位。
-->
<template>
  <div class="metrics">
    <div v-for="cell in cells" :key="cell.key" class="metric" :class="{ 'is-pending': cell.pending }">
      <span class="metric__icon" aria-hidden="true">
        <!-- 是否通过：日历 + 对勾 -->
        <svg v-if="cell.key === 'pass'" viewBox="0 0 32 32" width="32" height="32" fill="none">
          <rect x="4" y="6" width="24" height="22" rx="4" stroke="#595959" stroke-width="1.6" />
          <path d="M4 12h24" stroke="#E9E9E9" stroke-width="1.6" />
          <path d="M10.5 3.5v5M21.5 3.5v5" stroke="#595959" stroke-width="1.6" stroke-linecap="round" />
          <path
            d="M11.293 19.536l3.12 3.12 6.294-6.292"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <!-- 考试成绩：文档 / 证书 -->
        <svg v-else-if="cell.key === 'score'" viewBox="0 0 32 32" width="32" height="32" fill="none">
          <path
            d="M20 27H4a1 1 0 01-1-1V6a1 1 0 011-1h16a1 1 0 011 1v20a1 1 0 01-1 1z"
            stroke="#595959"
            stroke-width="1.6"
          />
          <path d="M8 9h8M8 13h5" stroke="#595959" stroke-width="1.6" stroke-linecap="round" />
          <rect x="9" y="19" width="6" height="4" rx="1" fill="#E9E9E9" />
          <path d="M18 20.5h6M18 24h4" stroke="#E9E9E9" stroke-width="1.6" stroke-linecap="round" />
        </svg>

        <!-- 考试用时：时钟 -->
        <svg v-else-if="cell.key === 'used'" viewBox="0 0 32 32" width="32" height="32" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#595959" stroke-width="1.6" />
          <path d="M16 8.5V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="M16 17l5 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>

        <!-- 本次考试排名：三根圆角柱（高 16/25/19，§5 实测；线稿，中间柱为辅助面填充） -->
        <svg v-else viewBox="0 0 32 32" width="32" height="32" fill="none">
          <rect x="4" y="13" width="7" height="16" rx="3" stroke="#595959" stroke-width="1.6" />
          <rect x="12.5" y="4" width="7" height="25" rx="3" fill="#E9E9E9" />
          <rect x="21" y="10" width="7" height="19" rx="3" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </span>

      <div class="metric__body">
        <p class="metric__label">{{ cell.label }}</p>
        <p class="metric__value">
          <span class="metric__number">{{ cell.value }}</span>
          <span v-if="cell.unit" class="metric__unit">{{ cell.unit }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MetricCell } from '../resultModel'

defineProps<{
  cells: MetricCell[]
}>()
</script>

<style scoped lang="scss">
.metrics {
  display: flex;
  align-items: stretch;
  /* 原平台实测该行整体宽 252px 且四格不等分（按内容宽），格间分隔由外层卡片样式实现；
     这里用等分 + 竖线，宽度自适应，视觉关系与原平台一致 */
  width: 100%;
}

.metric {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 0;
  min-width: 0;
  padding: 0 24px;

  /* 第一格不缩进，其余格用竖线分隔（原平台实测无 border-left，分隔靠卡片分隔线） */
  & + & {
    border-left: 1px solid #f0f0f0;
  }

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }
}

.metric__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 原平台图标容器 32×54；用定宽避免图标把文案挤成多行 */
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  color: currentcolor;
}

.metric__body {
  min-width: 0;
}

.metric__label {
  margin: 0 0 4px;
  font-size: 14px;
  line-height: 22px;
  color: #8c8c8c;
}

.metric__value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin: 0;
  color: #262626;
  line-height: 40px;
}

.metric__number {
  font-size: 32px;
  font-weight: 500;
  white-space: nowrap;
}

.metric__unit {
  font-size: 16px;
}

/* 未出分：整格弱化，学员一眼能看出「这不是最终成绩」 */
.metric.is-pending {
  .metric__number,
  .metric__unit {
    color: #bfbfbf;
  }
}

@media (max-width: 900px) {
  .metrics {
    flex-wrap: wrap;
    row-gap: 16px;
  }

  .metric {
    flex: 1 1 45%;
    padding: 0 16px;

    &:nth-child(odd) {
      padding-left: 0;
      border-left: 0;
    }
  }
}
</style>
