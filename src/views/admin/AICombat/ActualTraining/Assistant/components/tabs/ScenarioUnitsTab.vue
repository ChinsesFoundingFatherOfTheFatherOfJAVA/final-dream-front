<template>
  <div class="scenario-units-tab">
    <p class="tab-desc">
      共 {{ scenarios.length }} 个场景单元。展开可查看 13 项内容与实战案例，内容由 AI 助手维护，确认后写入主题。
    </p>

    <div v-if="scenarios.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">🎯</div>
      <p class="empty-text">场景单元待生成，可在左侧对话中让助手开始生成</p>
    </div>

    <div
      v-for="(unit, i) in scenarios"
      :key="unit.id"
      class="unit-card"
      :class="{ expanded: expanded.has(unit.id) }"
    >
      <!-- 收起态：序号 + 名称 + 适用人群 + 限时 + 案例数 + 展开 -->
      <div class="unit-summary" role="button" tabindex="0" @keydown.enter.prevent="toggle(unit.id)" @click="toggle(unit.id)">
        <span class="seq-badge">{{ i + 1 }}</span>
        <span class="unit-name">{{ unit.name }}</span>
        <span v-if="maxTime(unit)" class="duration-tag">{{ maxTime(unit) }} 分钟</span>
        <span v-if="unit.cases.length" class="case-tag">{{ unit.cases.length }} 个案例</span>
        <span class="expand-toggle">{{ expanded.has(unit.id) ? '收起' : '展开' }}<el-icon class="fold" v-if="expanded.has(unit.id)"><CaretTop /></el-icon><el-icon class="fold" v-else><ArrowDown /></el-icon></span>
      </div>

      <!-- 展开态：13 项内容 + 案例卡 -->
      <div v-if="expanded.has(unit.id)" class="unit-detail">
        <!-- 1. 业务目标 -->
        <div class="block block-goal">
          <div class="block-title"><span aria-hidden="true">🎯</span> 业务目标</div>
          <p class="block-text">{{ unit.businessGoal || '—' }}</p>
          <div v-if="unit.behaviorGoals?.length" class="sub-list">
            <span class="sub-label">行为目标</span>
            <ul class="block-list">
              <li v-for="g in unit.behaviorGoals" :key="g">{{ g }}</li>
            </ul>
          </div>
        </div>

        <!-- 2. 关联冰山模型要素 -->
        <div class="block block-iceberg">
          <div class="block-title"><span aria-hidden="true">🔗</span> 关联冰山模型要素</div>
          <div v-if="icebergPills(unit).length" class="pill-cloud">
            <span
              v-for="(el, pi) in icebergPills(unit)"
              :key="el"
              class="iceberg-pill"
              :class="`pill-${pi % 3}`"
            >{{ el }}</span>
          </div>
          <p v-else class="block-text">—</p>
        </div>

        <!-- 3. 业务影响 / 失败代价 -->
        <div class="block-row">
          <div class="block block-impact">
            <div class="block-title"><span aria-hidden="true">✅</span> 业务影响</div>
            <p class="block-text">{{ unit.businessImpact || '—' }}</p>
          </div>
          <div class="block block-cost">
            <div class="block-title"><span aria-hidden="true">⚠️</span> 失败代价</div>
            <p class="block-text">{{ unit.failureCost || '—' }}</p>
          </div>
        </div>

        <!-- 4. 核心冲突 -->
        <div class="block block-conflict">
          <div class="block-title"><span aria-hidden="true">⚡</span> 核心冲突</div>
          <p class="block-text">{{ unit.coreConflict || '—' }}</p>
        </div>

        <!-- 5. 常见失败模式 / 困难挑战 -->
        <div class="block-row">
          <div class="block block-failure">
            <div class="block-title"><span aria-hidden="true">🕐</span> 常见失败模式</div>
            <ul v-if="unit.failureReasons?.length" class="block-list">
              <li v-for="m in unit.failureReasons" :key="m">{{ m }}</li>
            </ul>
            <p v-else class="block-text">—</p>
          </div>
          <div class="block block-challenge">
            <div class="block-title"><span aria-hidden="true">🚩</span> 困难挑战</div>
            <ul v-if="unit.difficulties?.length" class="block-list">
              <li v-for="d in unit.difficulties" :key="d">{{ d }}</li>
            </ul>
            <p v-else class="block-text">—</p>
          </div>
        </div>

        <!-- 6. 禁止行为 / 时间限制 -->
        <div class="block-row">
          <div class="block block-forbidden">
            <div class="block-title"><span aria-hidden="true">⛔</span> 禁止行为</div>
            <ul v-if="unit.constraints?.forbidBehaviors?.length" class="block-list">
              <li v-for="f in unit.constraints.forbidBehaviors" :key="f">× {{ f }}</li>
            </ul>
            <p v-else class="block-text">—</p>
          </div>
          <div class="block block-time">
            <div class="block-title"><span aria-hidden="true">⏱️</span> 时间限制</div>
            <p class="block-text time-value">{{ maxTime(unit) || '--' }} 分钟</p>
          </div>
        </div>

        <!-- 7. 评估标准：按本场景 dimensionWeights 引用全局维度渲染（权重为该场景权重） -->
        <div class="block block-standard">
          <div class="standard-head">
            <div class="block-title"><span aria-hidden="true">📋</span> 评估标准</div>
            <span class="pass-score">通过分 {{ passScore }}</span>
          </div>
          <div v-if="scenarioDimensions(unit).length === 0" class="block-text">该场景未配置评估维度</div>
          <div v-for="dim in scenarioDimensions(unit)" :key="dim.id" class="dimension-item">
            <div class="dim-name-row">
              <span class="dim-name">{{ dim.name }}</span>
              <span class="dim-weight">{{ dim.weight }}%</span>
            </div>
            <div class="dim-weight-bar">
              <div class="weight-fill" :style="{ width: Math.min(100, dim.weight) + '%' }"></div>
            </div>
            <p v-if="dim.description" class="dim-desc">{{ dim.description }}</p>
            <div class="dim-tiers">
              <div class="tier tier-excellent">
                <span class="tier-label">优秀 90-100 分</span>
                <p class="tier-text">{{ normalizeCriteria(dim.criteria).excellent || '—' }}</p>
              </div>
              <div class="tier tier-good">
                <span class="tier-label">良好 70-89 分</span>
                <p class="tier-text">{{ normalizeCriteria(dim.criteria).good || '—' }}</p>
              </div>
              <div class="tier tier-improve">
                <span class="tier-label">需改进 &lt;70 分</span>
                <p class="tier-text">{{ normalizeCriteria(dim.criteria).improve || '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. 实战案例（case-generated 后出现） -->
        <div class="block block-cases">
          <div class="block-title"> 实战案例（{{ unit.cases.length }}）</div>
          <div v-if="unit.cases.length === 0" class="block-text">该场景暂无案例</div>
          <div v-for="(c, ci) in unit.cases" :key="ci" class="case-card">
            <div class="case-head">
              <span class="case-name">{{ c.scriptName || '案例待命名' }}</span>
              <div class="case-head-right">
                <span class="case-difficulty">{{ difficultyText(c.difficulty) }}</span>
                <!--
                  换形象入口（L0 上传覆盖的写入侧，2026-11-05）：有图显示 24px 圆形缩略图，
                  无图显示首字占位，卡片其余布局不变（按钮与难度标签同一行右侧）。
                -->
                <button
                  type="button"
                  class="case-avatar-btn"
                  :class="{ 'has-image': avatarOf(c) }"
                  :aria-label="`换形象：${c.scriptName || '案例'}`"
                  :title="avatarOf(c) ? '更换角色形象' : '设置角色形象'"
                  @click="openAvatar(unit, c)"
                >
                  <img v-if="avatarOf(c)" :src="avatarOf(c)" :alt="`${c.actorName || '角色'}的形象`" />
                  <span v-else aria-hidden="true">{{ (c.actorName || '?').slice(0, 1) }}</span>
                  <em class="case-avatar-text">换形象</em>
                </button>
              </div>
            </div>
            <div class="case-actor">
              <span class="actor-label">角色</span>
              <span class="actor-name">{{ c.actorName || '—' }}</span>
              <span v-if="c.actorPosition" class="actor-position">{{ c.actorPosition }}</span>
              <span v-if="c.actorCompany" class="actor-company">{{ c.actorCompany }}</span>
            </div>
            <div v-if="c.actorPersonality || c.actorCommunicationStyle" class="case-traits">
              <span v-if="c.actorPersonality">性格：{{ c.actorPersonality }}</span>
              <span v-if="c.actorCommunicationStyle">沟通风格：{{ c.actorCommunicationStyle }}</span>
            </div>
            <p v-if="c.scriptBackground" class="case-bg">{{ c.scriptBackground }}</p>
            <div v-if="c.scriptOpening" class="case-opening">
              <span class="opening-label">开场白</span>
              <p class="opening-text">{{ c.scriptOpening }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 换形象弹窗：复用 AvatarGenField（AI 生成 / 本地上传 / 移除），保存后刷新 artifact -->
    <CaseAvatarDialog
      v-model="avatarDialogVisible"
      :theme-id="store.themeId"
      :script-name="avatarTarget.scriptName"
      :scenario-name="avatarTarget.scenarioName"
      :current-url="avatarTarget.currentUrl"
      @saved="onAvatarSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CaretTop } from '@element-plus/icons-vue'
import { computed, reactive, ref } from 'vue'
import { ACT_DIFFICULTY_TEXT } from '@/types/actTheme'
import { normalizeCriteria, useAssistantStore } from '../../composables/useAssistantStore'
import type { ArtifactDimension, ArtifactScenario } from '@/types/assistant'
import CaseAvatarDialog from './CaseAvatarDialog.vue'
import { avatarPreviewUrl, type CaseAvatarField } from './caseAvatar'

const store = useAssistantStore()
const scenarios = computed<ArtifactScenario[]>(() => store.artifactContent?.scenarios ?? [])
const expanded = ref(new Set<string>())

const passScore = computed(() => Number(store.artifactContent?.evaluationCriteria.passScore ?? 0))

/** 全局维度按 id 索引（场景通过 dimensionWeights 引用全局维度，权重取场景自己的） */
const dimensionsById = computed(() => {
  const map: Record<string, ArtifactDimension> = {}
  for (const d of store.artifactContent?.evaluationCriteria.dimensions ?? []) map[d.id] = d
  return map
})

/** 本场景的维度 + 场景权重（权重合计应为 100） */
function scenarioDimensions(unit: ArtifactScenario): (ArtifactDimension & { weight: number })[] {
  return (unit.dimensionWeights ?? [])
    .map((w) => {
      const dim = dimensionsById.value[w.dimensionId]
      return dim ? { ...dim, weight: Number(w.weight ?? 0) } : null
    })
    .filter((d): d is ArtifactDimension & { weight: number } => d != null)
}

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const maxTime = (unit: ArtifactScenario): number => Number(unit.constraints?.maxTime ?? 0)

/** 六层冰山要素合并为一组 pill */
function icebergPills(unit: ArtifactScenario): string[] {
  const el = unit.relatedIcebergElements
  if (!el) return []
  return [
    ...(el.knowledge ?? []),
    ...(el.skills ?? []),
    ...(el.roles ?? []),
    ...(el.selfConcept ?? []),
    ...(el.personalities ?? []),
    ...(el.motives ?? [])
  ]
}

function difficultyText(difficulty: number): string {
  return ACT_DIFFICULTY_TEXT[difficulty] ?? '正常'
}

// ==== 换形象（L0 上传覆盖，2026-11-05）====
/**
 * 案例形象地址（可直接给 img 的完整路径）。
 * artifact 里存的是 `/avatar/x.webp` 这种不带 `/api` 的相对路径，必须经 avatarPreviewUrl
 * 补前缀，否则图片 404（`/avatar` 只在后端应用内注册，浏览器要走网关的 `/api/avatar`）。
 */
function avatarOf(c: unknown): string {
  return avatarPreviewUrl((c as CaseAvatarField).actorAvatarUrl)
}

const avatarDialogVisible = ref(false)
const avatarTarget = reactive({
  scriptName: '',
  scenarioName: '',
  currentUrl: null as string | null,
})

/** 打开某案例的换形象弹窗：定位键是 scriptName（行 ID 每次确认都会重建） */
function openAvatar(unit: ArtifactScenario, c: unknown): void {
  const item = c as { scriptName?: string } & CaseAvatarField
  avatarTarget.scriptName = item.scriptName ?? ''
  avatarTarget.scenarioName = unit.name ?? ''
  avatarTarget.currentUrl = item.actorAvatarUrl ?? null
  avatarDialogVisible.value = true
}

/**
 * 保存后刷新产物：后端把值写进 artifact（权威源），前端必须重新拉一次，
 * 否则卡片缩略图还是旧值（store 里的 artifactContent 是快照，不会自动变）。
 */
async function onAvatarSaved(): Promise<void> {
  await store.refreshArtifact()
}
</script>

<style scoped lang="scss">
.tab-desc {
  font-size: 13px;
  color: #8a8f98;
  line-height: 1.7;
  margin: 0 0 14px;
}

.empty-state {
  padding: 50px 0;
  text-align: center;

  .empty-icon { font-size: 34px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; color: #999; margin: 0; }
}

.unit-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;

  &.expanded { border-color: #c9d4f5; }
}

.unit-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: #fafbfc; }
  &:focus-visible { outline: 2px solid #6b5ce7; outline-offset: -2px; }

  .seq-badge {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: #6b5ce7;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .unit-name {
    font-size: 14px;
    font-weight: 600;
    color: #1f2329;
    flex: 1;
    min-width: 0;
  }

  .duration-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #e8940c;
    background: #fff7e6;
    white-space: nowrap;
  }

  .case-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #1890ff;
    background: #e6f7ff;
    white-space: nowrap;
  }

  .expand-toggle {
    font-size: 13px;
    color: #8a8f98;
    flex-shrink: 0;
  }
}

.unit-detail {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.block {
  border-radius: 8px;
  padding: 11px 12px;

  .block-title { font-size: 13px; font-weight: 600; margin-bottom: 7px; }

  .block-text { font-size: 13px; line-height: 1.65; margin: 0; }

  .block-list {
    margin: 0;
    padding-left: 16px;

    li { font-size: 13px; line-height: 1.65; }
  }

  .sub-list { margin-top: 8px; }
  .sub-label { font-size: 12px; color: #3b5bdb; font-weight: 600; }

  &.block-goal { background: #eef2ff; .block-title { color: #3b5bdb; } .block-text { color: #3d4a6b; } }
  &.block-iceberg { background: #f5f7ff; .block-title { color: #3b5bdb; } }
  &.block-impact { background: #f0fbe8; .block-title { color: #52a035; } .block-text { color: #4a6b3a; } }
  &.block-cost { background: #fdecec; .block-title { color: #d43c3c; } .block-text { color: #8a3d3d; } }
  &.block-conflict { background: #fdeef3; .block-title { color: #d4477e; } .block-text { color: #8a4a63; } }
  &.block-failure { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-challenge { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-forbidden { background: #fdecec; .block-title { color: #d43c3c; } .block-list li { color: #8a3d3d; } }
  &.block-time { background: #f0edff; .block-title { color: #6b5ce7; } .block-text.time-value { font-size: 15px; font-weight: 600; color: #6b5ce7; } }
  &.block-cases { background: #fafbfc; border: 1px solid #eef0f3; }
  &.block-standard { background: #fafbfc; border: 1px solid #eef0f3; }
}

.standard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .block-title { margin-bottom: 0; }

  .pass-score {
    font-size: 12px;
    color: #8a8f98;
    background: #f2f3f5;
    border-radius: 4px;
    padding: 1px 9px;
  }
}

.dimension-item {
  margin-top: 10px;
  padding: 10px 11px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 7px;

  .dim-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;

    .dim-name { font-size: 13px; font-weight: 600; color: #1f2329; }
    .dim-weight { font-size: 13px; font-weight: 600; color: #3b5bdb; }
  }

  .dim-weight-bar {
    height: 5px;
    background: #f2f3f5;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 7px;

    .weight-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b5bdb, #6b5ce7);
      border-radius: 3px;
    }
  }

  .dim-desc {
    margin: 0 0 7px;
    font-size: 12px;
    color: #8a8f98;
    line-height: 1.65;
  }

  .dim-tiers {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .tier {
      padding: 6px 9px;
      border-radius: 5px;

      .tier-label { font-size: 11px; font-weight: 600; display: block; margin-bottom: 2px; }
      .tier-text { margin: 0; font-size: 12px; line-height: 1.65; }
    }

    .tier-excellent { background: #f0fbe8; .tier-label { color: #2e7d32; } .tier-text { color: #44603a; } }
    .tier-good { background: #e8edfb; .tier-label { color: #3b5bdb; } .tier-text { color: #43506f; } }
    .tier-improve { background: #fff3e8; .tier-label { color: #c2410c; } .tier-text { color: #7a4a2c; } }
  }
}

.pill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .iceberg-pill {
    padding: 2px 10px;
    border-radius: 11px;
    font-size: 12px;

    &.pill-0 { color: #3b5bdb; background: #e8edfb; }
    &.pill-1 { color: #6b5ce7; background: #f0edff; }
    &.pill-2 { color: #d4477e; background: #fdeef3; }
  }
}

.case-card {
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 8px;
  padding: 11px 12px;
  margin-top: 8px;

  .case-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .case-name { font-size: 13px; font-weight: 600; color: #1f2329; }

    .case-difficulty {
      font-size: 12px;
      color: #e8940c;
      background: #fff7e6;
      border-radius: 4px;
      padding: 1px 8px;
      white-space: nowrap;
    }
  }

  .case-head-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /**
   * 换形象入口：24px 圆形缩略图 + 13px 文字，与难度标签同一行右侧。
   * 高度控制在 24px，不改变案例卡原有行高/内边距（任务约束：不改变布局密度）。
   */
  .case-avatar-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 6px 0 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: #6b5ce7;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:hover { background: #f0edff; }

    &:focus-visible {
      outline: 2px solid #6b5ce7;
      outline-offset: 1px;
    }

    img,
    span {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #f0edff;
      color: #6b5ce7;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }

    img { object-fit: cover; display: block; }

    &.has-image { color: #3b5bdb; }

    .case-avatar-text { font-style: normal; }
  }

  .case-actor {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 7px;
    font-size: 13px;

    .actor-label { font-size: 12px; color: #8a8f98; }
    .actor-name { font-weight: 600; color: #1f2329; }
    .actor-position,
    .actor-company { font-size: 12px; color: #6b5ce7; background: #f0edff; border-radius: 4px; padding: 1px 8px; }
  }

  .case-traits {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 7px;
    font-size: 12px;
    color: #8a8f98;
  }

  .case-bg {
    margin: 8px 0 0;
    font-size: 12px;
    color: #646a73;
    line-height: 1.65;
  }

  .case-opening {
    margin-top: 9px;
    padding: 9px 11px;
    background: #f7f8fa;
    border-left: 3px solid #6b5ce7;
    border-radius: 4px;

    .opening-label { font-size: 12px; color: #6b5ce7; font-weight: 600; }

    .opening-text {
      margin: 4px 0 0;
      font-size: 13px;
      color: #4e5969;
      line-height: 1.7;
      white-space: pre-wrap;
    }
  }
}

.fold { vertical-align: -2px; margin-left: 2px; }
</style>