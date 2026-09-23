<template>
  <div class="score-detail">
    <div v-for="dim in sortedDimensions" :key="dim.dimensionName" class="dim-block">
      <!-- 维度头 -->
      <div class="dim-header">
        <span class="dim-bar"></span>
        <span class="dim-name">{{ dim.dimensionName }}</span>
        <span class="dim-help" title="评分说明由AI生成，仅供参考">?</span>
        <span class="dim-weight">权重 {{ dim.weight }}%</span>
        <span v-if="dim.score == null" class="dim-score dim-score-na">未参与评分</span>
        <span v-else class="dim-score" :class="{ low: dim.score < 60 }">{{ dim.score }} 分</span>
      </div>

      <!-- 总评 -->
      <p class="dim-comment">{{ dim.comment || '暂无总评' }}</p>

      <template v-if="dim.score != null">
        <!-- 做得好的点 -->
        <div class="dim-section">
          <p class="section-title">做得好的点:</p>
          <ul v-if="dim.goodPoints?.length" class="point-list">
            <li v-for="(point, i) in dim.goodPoints" :key="i">{{ point }}</li>
          </ul>
          <p v-else class="empty-hint">暂无</p>
        </div>

        <!-- 待改进点与建议 -->
        <div class="dim-section">
          <p class="section-title">待改进点与建议:</p>
          <ul v-if="dim.improvements?.length" class="point-list">
            <li v-for="(item, i) in dim.improvements" :key="i">{{ item }}</li>
          </ul>
          <p v-else class="empty-hint">暂无</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReportDimension } from '@/types/student'

const props = defineProps<{
  dimensions: ReportDimension[]
}>()

const sortedDimensions = computed(() =>
  [...(props.dimensions ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)
</script>

<style scoped lang="scss">
.score-detail {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.dim-block {
  .dim-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;

    .dim-bar {
      width: 4px;
      height: 16px;
      border-radius: 2px;
      background: linear-gradient(180deg, #4a7dff, #7a6cf0);
    }

    .dim-name {
      font-size: 15px;
      font-weight: 600;
      color: #222;
    }

    .dim-help {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid #c0c6d2;
      color: #98a0b0;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: help;
      flex-shrink: 0;
    }

    .dim-weight {
      padding: 2px 10px;
      border-radius: 10px;
      background: #f2f4f8;
      color: #8a92a5;
      font-size: 12px;
    }

    .dim-score {
      margin-left: auto;
      font-size: 15px;
      font-weight: 700;
      color: #333;

      &.low {
        color: #e54545;
      }

      &.dim-score-na {
        font-size: 13px;
        font-weight: 400;
        color: #999;
      }
    }
  }

  .dim-comment {
    font-size: 13px;
    color: #555;
    line-height: 1.7;
    margin: 0 0 12px 12px;
  }

  .dim-section {
    margin-left: 12px;
    margin-bottom: 8px;

    .section-title {
      font-size: 13px;
      color: #444;
      font-weight: 500;
      margin: 0 0 6px;
    }

    .point-list {
      margin: 0;
      padding-left: 18px;

      li {
        font-size: 13px;
        color: #666;
        line-height: 1.8;
      }
    }

    .empty-hint {
      font-size: 13px;
      color: #aaa;
      margin: 0;
    }
  }
}
</style>
