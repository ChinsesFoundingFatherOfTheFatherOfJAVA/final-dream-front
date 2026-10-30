<template>
  <div class="scenario-unit-list">
    <!-- 工具栏：左「共 N 个场景单元」，右「+ 通过 AI 助手添加」（原平台为纯文字按钮，无底无边） -->
    <div class="list-toolbar">
      <p class="unit-count">共 {{ units.length }} 个场景单元</p>
      <button type="button" class="ai-add-link" @click="goAssistant">+ 通过 AI 助手添加</button>
    </div>

    <div v-if="units.length === 0" class="empty-state">
      <p class="empty-text">暂无场景单元</p>
    </div>

    <div v-else class="unit-cards">
      <div
        v-for="unit in units"
        :key="unit.id"
        class="unit-card"
        :class="{ 'is-expanded': expandedKeys.has(unit.id) }"
      >
        <!-- 收起态摘要：整行可点。序号 + 名称/标签 + 展开箭头（与原平台一致，卡片高 88） -->
        <button
          type="button"
          class="unit-summary"
          :aria-expanded="expandedKeys.has(unit.id)"
          @click="toggle(unit.id)"
        >
          <span class="card-main">
            <span class="seq-badge">{{ unit.sortOrder }}</span>
            <span class="unit-name-wrap">
              <span class="unit-name">{{ unit.unitName }}</span>
              <span class="unit-tags">
                <span v-for="a in audienceTags(unit)" :key="a" class="audience-tag">{{ a }}</span>
                <span v-if="unit.timeLimitMinutes" class="duration-tag">{{ unit.timeLimitMinutes }} 分钟</span>
              </span>
            </span>
          </span>
          <span class="expand-toggle">
            <span class="toggle-label">{{ expandedKeys.has(unit.id) ? '收起' : '展开' }}</span>
            <svg
              class="fold"
              :class="{ 'is-up': expandedKeys.has(unit.id) }"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M3.5 6l4.5 4.5L12.5 6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>

        <!-- 展开态：按原平台分组顺序（业务目标 → 冰山要素 → 影响/代价 → 冲突 → 失败模式/挑战 → 禁止行为/时间 → 评估标准） -->
        <div v-if="expandedKeys.has(unit.id)" class="unit-detail">
          <div class="sc-block sc-block--neutral">
            <div class="sc-block__head">
              <el-icon class="sc-block__icon"><Aim /></el-icon>
              <span class="sc-block__label">业务目标</span>
            </div>
            <p class="sc-block__text">{{ unit.businessGoal }}</p>
          </div>

          <div class="sc-block sc-block--white-neutral">
            <div class="sc-block__head">
              <el-icon class="sc-block__icon"><Connection /></el-icon>
              <span class="sc-block__label">关联冰山模型要素</span>
            </div>
            <div class="iceberg-tags">
              <span v-for="el in unit.icebergElements" :key="el" class="iceberg-tag">{{ el }}</span>
            </div>
          </div>

          <div class="sc-row">
            <div class="sc-block sc-block--positive">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><TrendCharts /></el-icon>
                <span class="sc-block__label">业务影响</span>
              </div>
              <p class="sc-block__text">{{ unit.businessImpact }}</p>
            </div>
            <div class="sc-block sc-block--warning">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><Warning /></el-icon>
                <span class="sc-block__label">失败代价</span>
              </div>
              <p class="sc-block__text">{{ unit.failureCost }}</p>
            </div>
          </div>

          <div class="sc-block sc-block--warning">
            <div class="sc-block__head">
              <el-icon class="sc-block__icon"><Switch /></el-icon>
              <span class="sc-block__label">核心冲突</span>
            </div>
            <p class="sc-block__text">{{ unit.coreConflict }}</p>
          </div>

          <div class="sc-row">
            <div class="sc-block sc-block--warning">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><Clock /></el-icon>
                <span class="sc-block__label">常见失败模式</span>
              </div>
              <div class="sc-block__list">
                <div v-for="m in unit.commonFailureModes" :key="m" class="sc-block__item">
                  <span class="sc-block__bullet" aria-hidden="true">•</span>
                  <span class="sc-block__text">{{ stripPrefix(m) }}</span>
                </div>
              </div>
            </div>
            <div class="sc-block sc-block--warning">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><Flag /></el-icon>
                <span class="sc-block__label">困难挑战</span>
              </div>
              <div class="sc-block__list">
                <div v-for="d in unit.difficulties" :key="d" class="sc-block__item">
                  <span class="sc-block__bullet" aria-hidden="true">•</span>
                  <span class="sc-block__text">{{ stripPrefix(d) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="sc-row">
            <div class="sc-block sc-block--warning">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><CircleClose /></el-icon>
                <span class="sc-block__label">禁止行为</span>
              </div>
              <div class="sc-block__list">
                <div v-for="f in unit.forbiddenBehaviors" :key="f" class="sc-block__item">
                  <el-icon class="sc-block__cross" aria-hidden="true"><CircleClose /></el-icon>
                  <span class="sc-block__text">{{ stripPrefix(f) }}</span>
                </div>
              </div>
            </div>
            <div class="sc-block sc-block--constraint">
              <div class="sc-block__head">
                <el-icon class="sc-block__icon"><Timer /></el-icon>
                <span class="sc-block__label">时间限制</span>
              </div>
              <p class="sc-block__text">{{ unit.timeLimitMinutes }}分钟</p>
            </div>
          </div>

          <div class="sc-group">
            <div class="sc-group__head">
              <el-icon class="sc-group__icon"><Document /></el-icon>
              <span class="sc-group__title">评估标准</span>
              <span class="sc-group__hint">通过分 {{ unit.passScore }}</span>
            </div>
            <div class="sc-block sc-block--white">
              <div v-for="dim in sortedDimensions(unit)" :key="dim.id" class="sc-dim">
                <div class="sc-dim__head">
                  <span class="sc-dim__name">{{ dim.dimensionName }}</span>
                  <span class="sc-dim__weight">{{ dim.weight }}%</span>
                </div>
                <div class="sc-dim__bar">
                  <div class="sc-dim__fill" :style="{ width: `${dim.weight}%` }"></div>
                </div>
                <p v-if="dim.dimensionDesc" class="sc-dim__desc">{{ dim.dimensionDesc }}</p>
                <p v-if="tierText(dim)" class="sc-dim__tiers">{{ tierText(dim) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Aim,
  CircleClose,
  Clock,
  Connection,
  Document,
  Flag,
  Switch,
  Timer,
  TrendCharts,
  Warning,
} from '@element-plus/icons-vue'
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

/**
 * 原平台把适用人群渲染成多个独立标签，而后端 audience 是逗号分隔的单字段，
 * 这里按中英文逗号/顿号拆分，保证标签数量与阅读密度和原平台一致。
 */
const audienceTags = (unit: ActScenarioUnit): string[] => {
  if (!unit.audience) return []
  return unit.audience
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 列表项首列已由「•」/叉号图标承担，文案里若自带「× 」「· 」前缀会重复，
 * 展示前统一剥掉一层前缀。
 */
const stripPrefix = (text: string): string => String(text ?? '').replace(/^\s*[×xX·•]\s*/, '')

/**
 * 等级说明：原平台是一段连续灰字，三个等级用「；」串起来（
 * 「优秀（90-100分）：…；良好（70-89分）：…；需改进（<70分）：…」），
 * 不是三行。这里按同一格式拼装。
 */
const tierText = (dim: ActEvaluationDimension): string => {
  const parts = [
    dim.excellentStandard ? `优秀（90-100分）：${dim.excellentStandard}` : '',
    dim.goodStandard ? `良好（70-89分）：${dim.goodStandard}` : '',
    dim.improveStandard ? `需改进（<70分）：${dim.improveStandard}` : '',
  ].filter(Boolean)
  return parts.join('；')
}
</script>

<style scoped lang="scss">
/* 折叠态：原平台 1253 宽面板 —— 工具栏 22 高、卡片 88 高（r12 / 1px #e9e9e9）、卡间距 16 */
.scenario-unit-list {
  display: block;
  width: 100%;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}

.unit-count {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: #757575;
}

.ai-add-link {
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: #436bff;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.empty-state {
  padding: 60px 0;
  text-align: center;

  .empty-text {
    margin: 0;
    font-size: 14px;
    line-height: 22px;
    color: #8c8c8c;
  }
}

.unit-cards {
  display: block;
  margin-top: 16px;
}

.unit-card {
  margin-bottom: 16px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 4px 12px rgb(15 23 42 / 8%);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

/* 88 = 1px 边框 ×2 + 16 内边距 ×2 + 54 内容行 */
.unit-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 54px;
  min-width: 0;
}

.seq-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  /* 原平台为 #4f46e5 → #7c3aed 渐变，审计无法对渐变取单色，故契约 skipProps:['background'] */
  background: linear-gradient(to bottom right, #4f46e5, #7c3aed);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  color: #fff;
}

.unit-name-wrap {
  display: block;
  min-width: 0;
}

.unit-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.audience-tag,
.duration-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  white-space: nowrap;
}

.audience-tag {
  color: #7e22ce;
  background: #faf5ff;
}

.duration-tag {
  color: #d97706;
  background: #fffbeb;
}

.expand-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  width: 48px;
  height: 22px;
  color: #8c8c8c;
}

.toggle-label {
  font-size: 14px;
  line-height: 22px;
  color: #8c8c8c;
}

.fold {
  flex-shrink: 0;
  color: #8c8c8c;
  transition: transform 0.2s;

  &.is-up {
    transform: rotate(180deg);
  }
}

/* 展开态：白底卡片内部，16px 内边距 + 顶部 1px 分隔线，块间距 12 */
.unit-detail {
  padding: 16px;
  border-top: 1px solid #f5f5f5;

  > * {
    margin-top: 12px;
  }

  > :first-child {
    margin-top: 0;
  }

  > .sc-group {
    margin-top: 16px;
  }
}

.sc-block {
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
}

.sc-block__head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  margin-bottom: 8px;
}

.sc-block__icon {
  flex-shrink: 0;
  font-size: 14px;
  color: inherit;
}

.sc-block__label {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.sc-block__text {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: #1d2129;
  word-break: break-word;
}

.sc-block__list {
  display: flex;
  flex-direction: column;
}

.sc-block__item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 列表首列（「•」/叉号）在原平台是正文色 #1d2129，不跟随块标签色 */
.sc-block__bullet {
  flex-shrink: 0;
  width: 5px;
  font-size: 14px;
  line-height: 22px;
  color: #1d2129;
}

.sc-block__cross {
  flex-shrink: 0;
  margin-top: 4px;
  font-size: 14px;
  color: #1d2129;
}

/* 变体配色全部取原平台 computed 值 */
.sc-block--neutral {
  background: #f8f9ff;
  color: #4460e8;
}

.sc-block--white-neutral {
  background: #fff;
  border-color: #e9e9e9;
  color: #4460e8;
}

.sc-block--positive {
  background: #f4fff5;
  color: #00b42a;
}

.sc-block--warning {
  background: #fff8f6;
  color: #f53f3f;
}

.sc-block--constraint {
  background: #fbf8ff;
  color: #722ed1;
}

.sc-block--white {
  background: #fff;
  border-color: #e9e9e9;
  color: #262626;
}

/* 两列布局：业务影响|失败代价、失败模式|困难挑战、禁止行为|时间限制 */
.sc-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.iceberg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.iceberg-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;

  &:nth-child(6n + 1) {
    color: #0369a1;
    background: #f0f9ff;
  }

  &:nth-child(6n + 2) {
    color: #075985;
    background: #e0f2fe;
  }

  &:nth-child(6n + 3) {
    color: #2e4dd9;
    background: #f0f6ff;
  }

  &:nth-child(6n + 4) {
    color: #4338ca;
    background: #eef2ff;
  }

  &:nth-child(6n + 5) {
    color: #7e22ce;
    background: #f3e8ff;
  }

  &:nth-child(6n + 6) {
    color: #be185d;
    background: #fdf2f8;
  }
}

.sc-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  margin-bottom: 8px;
}

.sc-group__icon {
  flex-shrink: 0;
  font-size: 16px;
  color: #0f172a;
}

.sc-group__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #0f172a;
}

.sc-group__hint {
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: #757575;
}

.sc-dim {
  & + & {
    margin-top: 12px;
  }
}

.sc-dim__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sc-dim__name {
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: #262626;
}

.sc-dim__weight {
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  color: #262626;
}

.sc-dim__bar {
  height: 6px;
  border-radius: 4px;
  background: #f5f5f5;
  overflow: hidden;
}

.sc-dim__fill {
  height: 100%;
  border-radius: 4px;
  background: #436bff;
  transition: width 0.2s;
}

.sc-dim__desc {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 23px;
  color: #595959;
}

.sc-dim__tiers {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 23px;
  color: #8c8c8c;
  white-space: pre-line;
}
</style>
