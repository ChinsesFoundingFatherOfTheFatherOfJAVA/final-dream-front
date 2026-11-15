<template>
  <div class="criteria-tab">
    <p class="tab-desc">
      评估标准为全局维度定义，各场景单元通过权重引用维度。权重合计需为 100%。
    </p>

    <!-- 通过分数线 -->
    <div class="pass-score-card">
      <div class="pass-label">通过分数线</div>
      <div class="pass-value">
        {{ passScore }}<span class="pass-unit">分</span>
      </div>
      <div class="pass-hint">学员单场景得分达到该分数即视为达标</div>
    </div>

    <div v-if="dimensions.length === 0" class="empty-state">
      <div class="empty-icon"></div>
      <p class="empty-text">暂无评估维度，可在左侧对话中让助手生成</p>
    </div>

    <div v-for="(dim, i) in dimensions" :key="dim.id" class="dimension-card">
      <div class="dim-head">
        <span class="dim-seq">{{ i + 1 }}</span>
        <span class="dim-name">{{ dim.name }}</span>
        <span class="dim-weight">{{ weightOf(dim.id) }}%</span>
      </div>

      <div class="dim-weight-bar">
        <div class="weight-fill" :style="{ width: Math.min(100, weightOf(dim.id)) + '%' }"></div>
      </div>

      <p v-if="dim.description" class="dim-desc">{{ dim.description }}</p>

      <div class="dim-tiers">
        <div class="tier tier-excellent">
          <span class="tier-label">优秀 90-100 分</span>
          <p class="tier-text">{{ tiers(dim.criteria).excellent || '—' }}</p>
        </div>
        <div class="tier tier-good">
          <span class="tier-label">良好 70-89 分</span>
          <p class="tier-text">{{ tiers(dim.criteria).good || '—' }}</p>
        </div>
        <div class="tier tier-improve">
          <span class="tier-label">需改进 &lt;70 分</span>
          <p class="tier-text">{{ tiers(dim.criteria).improve || '—' }}</p>
        </div>
      </div>
    </div>

    <p v-if="dimensions.length" class="weight-sum">
      维度权重合计：{{ weightSum }}%
      <span v-if="weightSum !== 100" class="weight-warn">（应为 100%，请让助手调整）</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeCriteria, useAssistantStore } from '../../composables/useAssistantStore'
import type { ArtifactDimension } from '@/types/assistant'

const store = useAssistantStore()

const criteria = computed(() => store.artifactContent?.evaluationCriteria)
const dimensions = computed<ArtifactDimension[]>(() => criteria.value?.dimensions ?? [])
const passScore = computed(() => Number(criteria.value?.passScore ?? 0))

/** 权重：优先取全局 defaultDimensionWeights，缺失时按 0 处理 */
const weightMap = computed(() => {
  const map: Record<string, number> = {}
  for (const w of criteria.value?.defaultDimensionWeights ?? []) {
    map[w.dimensionId] = Number(w.weight ?? 0)
  }
  return map
})

const weightOf = (id: string): number => weightMap.value[id] ?? 0

const weightSum = computed(() =>
  Object.values(weightMap.value).reduce((sum, w) => sum + Number(w || 0), 0)
)

/** criteria 形状在 03 文档未固定，统一归一化为三档 */
const tiers = (c: unknown) => normalizeCriteria(c)
</script>

<style scoped lang="scss">
.tab-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 14px;
}

.pass-score-card {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 16px;
  background: var(--color-accent-wash);
  border: 1px solid var(--color-accent-wash);
  border-radius: 8px;
  margin-bottom: 14px;

  .pass-label { font-size: 13px; color: var(--color-accent); font-weight: 600; }

  .pass-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-accent);
    line-height: 1;

    .pass-unit { font-size: 13px; font-weight: 400; margin-left: 2px; }
  }

  .pass-hint { font-size: 12px; color: var(--color-muted); margin-left: auto; }
}

.empty-state {
  padding: 50px 0;
  text-align: center;

  .empty-icon { font-size: 34px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; color: var(--color-muted); margin: 0; }
}

.dimension-card {
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  padding: 13px 14px;
  margin-bottom: 10px;
  background: var(--color-paper);

  .dim-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 8px;

    .dim-seq {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: var(--color-accent-wash);
      color: var(--color-accent);
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dim-name { font-size: 14px; font-weight: 600; color: var(--color-ink); flex: 1; min-width: 0; }
    .dim-weight { font-size: 14px; font-weight: 600; color: var(--color-accent); }
  }

  .dim-weight-bar {
    height: 6px;
    background: var(--color-paper-2);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 9px;

    .weight-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-accent), var(--color-accent));
      border-radius: 3px;
    }
  }

  .dim-desc {
    margin: 0 0 9px;
    font-size: 13px;
    color: var(--color-muted);
    line-height: 1.7;
  }

  .dim-tiers {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .tier {
      padding: 8px 11px;
      border-radius: 6px;

      .tier-label {
        font-size: 12px;
        font-weight: 600;
        display: block;
        margin-bottom: 3px;
      }

      .tier-text { margin: 0; font-size: 13px; line-height: 1.7; }
    }

    .tier-excellent { background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper)); .tier-label { color: var(--color-success); } .tier-text { color: var(--color-success); } }
    .tier-good { background: var(--color-accent-wash); .tier-label { color: var(--color-accent); } .tier-text { color: var(--color-ink-2); } }
    .tier-improve { background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper)); .tier-label { color: var(--color-warning); } .tier-text { color: var(--color-warning); } }
  }
}

.weight-sum {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--color-ink-2);

  .weight-warn { color: var(--color-error); }
}
</style>