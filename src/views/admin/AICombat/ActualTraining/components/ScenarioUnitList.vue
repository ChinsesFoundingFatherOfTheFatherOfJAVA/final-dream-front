<template>
  <div class="scenario-unit-list">
    <div class="list-toolbar">
      <span class="unit-count">共 {{ units.length }} 个场景单元</span>
      <a class="ai-add-link" @click="goAssistant">+ 通过 AI 助手添加</a>
    </div>

    <div v-if="units.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无场景单元</p>
    </div>

    <div
      v-for="unit in units"
      :key="unit.id"
      class="unit-card"
      :class="{ expanded: expandedKeys.has(unit.id) }"
    >
      <!-- 收起态：序号 + 名称 + 适用人群 + 时长 + 展开 -->
      <div class="unit-summary" @click="toggle(unit.id)">
        <span class="seq-badge">{{ unit.sortOrder }}</span>
        <span class="unit-name">{{ unit.unitName }}</span>
        <span v-if="unit.audience" class="audience-tag">{{ unit.audience }}</span>
        <span v-if="unit.timeLimitMinutes" class="duration-tag">{{ unit.timeLimitMinutes }} 分钟</span>
        <span class="expand-toggle">
          {{ expandedKeys.has(unit.id) ? '收起 ⌃' : '展开 ⌄' }}
        </span>
      </div>

      <!-- 展开态：13 项内容 -->
      <div v-if="expandedKeys.has(unit.id)" class="unit-detail">
        <!-- 1. 业务目标 -->
        <div class="block block-goal">
          <div class="block-title">🎯 业务目标</div>
          <p class="block-text">{{ unit.businessGoal }}</p>
        </div>

        <!-- 2. 关联冰山模型要素 -->
        <div class="block block-iceberg">
          <div class="block-title">🔗 关联冰山模型要素</div>
          <div class="pill-cloud">
            <span
              v-for="(el, i) in unit.icebergElements"
              :key="el"
              class="iceberg-pill"
              :class="`pill-${i % 3}`"
            >{{ el }}</span>
          </div>
        </div>

        <!-- 3. 业务影响 / 失败代价 -->
        <div class="block-row">
          <div class="block block-impact">
            <div class="block-title">✅ 业务影响</div>
            <p class="block-text">{{ unit.businessImpact }}</p>
          </div>
          <div class="block block-cost">
            <div class="block-title">⚠️ 失败代价</div>
            <p class="block-text">{{ unit.failureCost }}</p>
          </div>
        </div>

        <!-- 4. 核心冲突 -->
        <div class="block block-conflict">
          <div class="block-title">⚡ 核心冲突</div>
          <p class="block-text">{{ unit.coreConflict }}</p>
        </div>

        <!-- 5. 常见失败模式 / 困难挑战 -->
        <div class="block-row">
          <div class="block block-failure">
            <div class="block-title">🕐 常见失败模式</div>
            <ul class="block-list">
              <li v-for="m in unit.commonFailureModes" :key="m">{{ m }}</li>
            </ul>
          </div>
          <div class="block block-challenge">
            <div class="block-title">🚩 困难挑战</div>
            <ul class="block-list">
              <li v-for="d in unit.difficulties" :key="d">{{ d }}</li>
            </ul>
          </div>
        </div>

        <!-- 6. 禁止行为 / 时间限制 -->
        <div class="block-row">
          <div class="block block-forbidden">
            <div class="block-title">⛔ 禁止行为</div>
            <ul class="block-list forbidden">
              <li v-for="f in unit.forbiddenBehaviors" :key="f">× {{ f }}</li>
            </ul>
          </div>
          <div class="block block-time">
            <div class="block-title">⏱️ 时间限制</div>
            <p class="block-text time-value">{{ unit.timeLimitMinutes }} 分钟</p>
          </div>
        </div>

        <!-- 7. 评估标准 -->
        <div class="block block-standard">
          <div class="standard-head">
            <div class="block-title">📋 评估标准</div>
            <span class="pass-score">通过分 {{ unit.passScore }}</span>
          </div>
          <div
            v-for="dim in sortedDimensions(unit)"
            :key="dim.id"
            class="dimension-item"
          >
            <div class="dim-name-row">
              <span class="dim-name">{{ dim.dimensionName }}</span>
              <span class="dim-weight">{{ dim.weight }}%</span>
            </div>
            <div class="dim-weight-bar">
              <div class="weight-fill" :style="{ width: dim.weight + '%' }"></div>
            </div>
            <p v-if="dim.dimensionDesc" class="dim-desc">{{ dim.dimensionDesc }}</p>
            <div class="dim-tiers">
              <div v-if="dim.excellentStandard" class="tier tier-excellent">{{ dim.excellentStandard }}</div>
              <div v-if="dim.goodStandard" class="tier tier-good">{{ dim.goodStandard }}</div>
              <div v-if="dim.improveStandard" class="tier tier-improve">{{ dim.improveStandard }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ActEvaluationDimension, ActScenarioUnit } from '@/types/actTheme'

const props = defineProps<{ units: ActScenarioUnit[]; themeId?: string }>()

const router = useRouter()

/** FP-30/FP-43：+ 通过 AI 助手添加 → 携带该主题 ID 进入对话页 */
const goAssistant = () => {
  if (props.themeId) router.push(`/sparring/freesimulate/assistant/${props.themeId}`)
  else router.push('/sparring/freesimulate/assistant')
}

const expandedKeys = ref(new Set<string>())

const toggle = (id: string) => {
  const keys = new Set(expandedKeys.value)
  if (keys.has(id)) keys.delete(id)
  else keys.add(id)
  expandedKeys.value = keys
}

const sortedDimensions = (unit: ActScenarioUnit): ActEvaluationDimension[] => {
  return [...unit.dimensions].sort((a, b) => a.sortOrder - b.sortOrder)
}
</script>

<style scoped lang="scss">
.scenario-unit-list {
  .list-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;

    .unit-count { font-size: 14px; color: #8a8f98; }

    .ai-add-link {
      font-size: 14px;
      color: #1890ff;
      cursor: pointer;

      &:hover { text-decoration: underline; }
    }
  }
}

.empty-state {
  padding: 60px 0;
  text-align: center;

  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-text { font-size: 15px; color: #999; margin: 0; }
}

.unit-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;

  &.expanded { border-color: #c9d4f5; }
}

.unit-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: #fafbfc; }

  .seq-badge {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #6b5ce7;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .unit-name {
    font-size: 15px;
    font-weight: 600;
    color: #1f2329;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .audience-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 13px;
    color: #6b5ce7;
    background: #f0edff;
    white-space: nowrap;
  }

  .duration-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 13px;
    color: #e8940c;
    background: #fff7e6;
    white-space: nowrap;
  }

  .expand-toggle {
    font-size: 14px;
    color: #8a8f98;
    flex-shrink: 0;
  }
}

.unit-detail {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.block {
  border-radius: 8px;
  padding: 12px 14px;

  .block-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .block-text {
    font-size: 14px;
    line-height: 1.6;
    margin: 0;

    &.time-value { font-size: 16px; font-weight: 600; color: #6b5ce7; }
  }

  .block-list {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      font-size: 14px;
      line-height: 1.6;
      padding-left: 14px;
      position: relative;

      &::before {
        content: '•';
        position: absolute;
        left: 0;
      }

      &.forbidden::before { content: none; }
    }
  }

  &.block-goal { background: #eef2ff; .block-title { color: #3b5bdb; } .block-text { color: #3d4a6b; } }
  &.block-iceberg { background: #f5f7ff; .block-title { color: #3b5bdb; } }
  &.block-impact { background: #f0fbe8; .block-title { color: #52a035; } .block-text { color: #4a6b3a; } }
  &.block-cost { background: #fdecec; .block-title { color: #d43c3c; } .block-text { color: #8a3d3d; } }
  &.block-conflict { background: #fdeef3; .block-title { color: #d4477e; } .block-text { color: #8a4a63; } }
  &.block-failure { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-challenge { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-forbidden { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-time { background: #f0edff; .block-title { color: #6b5ce7; } }
  &.block-standard { background: #fafbfc; border: 1px solid #eef0f3; }
}

.pill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .iceberg-pill {
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 13px;

    &.pill-0 { color: #3b5bdb; background: #e8edfb; }
    &.pill-1 { color: #6b5ce7; background: #f0edff; }
    &.pill-2 { color: #d4477e; background: #fdeef3; }
  }
}

.standard-head {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .block-title { margin-bottom: 0; color: #1f2329; }

  .pass-score {
    font-size: 13px;
    color: #8a8f98;
    background: #f2f3f5;
    padding: 2px 10px;
    border-radius: 4px;
  }
}

.dimension-item {
  margin-top: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 8px;

  .dim-name-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .dim-name { font-size: 14px; font-weight: 600; color: #1f2329; }
    .dim-weight { font-size: 14px; font-weight: 600; color: #3b5bdb; }
  }

  .dim-weight-bar {
    height: 6px;
    background: #f2f3f5;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;

    .weight-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b5bdb, #6b5ce7);
      border-radius: 3px;
    }
  }

  .dim-desc {
    font-size: 13px;
    color: #8a8f98;
    margin: 0 0 8px;
    line-height: 1.6;
  }

  .dim-tiers {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .tier {
      font-size: 13px;
      line-height: 1.6;
      padding: 6px 10px;
      border-radius: 6px;

      &.tier-excellent { color: #2e7d32; background: #f0fbe8; }
      &.tier-good { color: #3b5bdb; background: #e8edfb; }
      &.tier-improve { color: #c2410c; background: #fff3e8; }
    }
  }
}
</style>
