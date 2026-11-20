<template>
  <div class="dm-detail">
    <nav class="dm-breadcrumb" aria-label="面包屑">
      <span class="dm-breadcrumb__link" role="button" tabindex="0" @click="goBack" @keydown.enter="goBack">
        AI实战训练场
      </span>
      <span class="dm-breadcrumb__sep">›</span>
      <span class="dm-breadcrumb__current">主题详情</span>
    </nav>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

    <div v-else-if="detail" class="dm-inner">
      <!-- 页头：模式 / 难度 / 名称 / 描述 / 场景数 / 已通过 / 进度（契约 F07） -->
      <div class="dm-banner">
        <div class="dm-banner__pad">
          <div class="dm-banner__row">
            <div class="dm-banner__info">
              <div class="dm-banner__tags">
                <span class="dm-mode-pill">{{ head.modeText }}</span>
                <span class="dm-difficulty">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    />
                  </svg>
                  {{ head.difficultyText ?? '中等' }}
                </span>
              </div>
              <h1>{{ head.name }}</h1>
              <p>{{ head.description || '暂无主题描述' }}</p>
              <div class="dm-banner__stats">
                <span>训练场景 {{ head.scenarioCount }} 个</span>
                <span class="dm-banner__sep">|</span>
                <span>已通过 {{ head.passedScenarioCount }} 个</span>
                <span class="dm-banner__sep">|</span>
                <span>进度 {{ head.progress }} %</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 计划期外 / 主题暂停：页面可看，但不能开始新 attempt（契约 F07） -->
      <div v-if="!head.startable" class="dm-stop">
        <el-alert
          :title="head.stopReason || '当前不可开始新练习'"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>

      <div class="dm-grid">
        <!-- 左列：全部场景单元 -->
        <div class="dm-left">
          <section>
            <div class="dm-section__head">
              <h2>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                全部场景单元
              </h2>
              <span class="dm-section__hint">
                共 {{ scenarios.length }} 个 · 点击场景可查看训练准备信息
              </span>
            </div>

            <el-empty
              v-if="!scenarios.length"
              description="该主题还没有已发布的场景"
              :image-size="80"
            />

            <div v-else class="dm-scene-list">
              <div
                v-for="scenario in scenarios"
                :key="scenario.scenarioId"
                class="dm-scene"
                role="button"
                tabindex="0"
                @click="openPrepare(scenario)"
                @keydown.enter.prevent="openPrepare(scenario)"
              >
                <div class="dm-scene__index">{{ seq(scenario.sortOrder) }}</div>
                <div class="dm-scene__main">
                  <div class="dm-scene__title-row">
                    <h3>{{ scenario.name }}</h3>
                    <span class="dm-scene__status" :class="`is-${scenario.status}`">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="8 12 11 15 16 9" />
                      </svg>
                      {{ scenario.statusText }}
                    </span>
                  </div>
                  <div class="dm-scene__meta">
                    <div class="dm-scene__audience">适用人群：{{ audienceText(scenario) }}</div>
                    <div class="dm-scene__count">练习 {{ scenario.attemptCount ?? 0 }} 次</div>
                  </div>
                </div>
                <div class="dm-scene__actions">
                  <div class="dm-scene__score">
                    <div class="dm-scene__score-label">最高分</div>
                    <div class="dm-scene__score-value">{{ scoreText(scenario) }}</div>
                    <span
                      v-if="examAvailable(scenario)"
                      class="dm-scene__exam-link"
                      role="button"
                      tabindex="0"
                      @click.stop="openExam(scenario)"
                      @keydown.enter.stop.prevent="openExam(scenario)"
                    >
                      考核
                    </span>
                  </div>
                  <button
                    type="button"
                    class="dm-scene__btn"
                    :disabled="!scenario.trainingAction?.enabled"
                    :title="scenario.trainingAction?.reason ?? ''"
                    @click.stop="openPrepare(scenario)"
                  >
                    {{ primaryActionText(scenario) }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 右列：评估标准 / 学习资料 / 产品档案 / 我的训练记录（契约 F07 顺序） -->
        <aside class="dm-aside">
          <section>
            <h2>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              评估标准
            </h2>
            <div class="dm-eval__score">通过分数：<strong>{{ criteria.passScore ?? '—' }}</strong> 分</div>
            <div class="dm-eval__desc">
              完成场景练习后，系统将从 {{ criteria.dimensions.length }} 个维度进行综合评估。
            </div>
            <div class="dm-eval__dims">
              <div v-for="dim in criteria.dimensions" :key="dim.name" class="dm-eval__dim">
                {{ dim.name }}
              </div>
              <div v-if="!criteria.dimensions.length" class="dm-eval__dim dm-eval__dim--empty">
                暂无评估维度
              </div>
            </div>
          </section>

          <section>
            <h2>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M4 5h11l5 5v9H4z" />
                <path d="M15 5v5h5" />
              </svg>
              学习资料
            </h2>
            <div class="dm-material-list">
              <div
                v-for="material in detail.materials"
                :key="material.materialId"
                class="dm-material"
                role="button"
                tabindex="0"
                @click="openMaterial(material.materialId)"
                @keydown.enter.prevent="openMaterial(material.materialId)"
              >
                <span class="dm-material__icon">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M6 2h9l5 5v15H6z" />
                    <path d="M15 2v5h5" />
                  </svg>
                </span>
                <span class="dm-material__body">
                  <span class="dm-material__name">{{ material.name }}</span>
                  <span class="dm-material__meta">{{ materialMeta(material) }}</span>
                </span>
              </div>
              <div v-if="!detail.materials.length" class="dm-empty-line">暂无学习资料</div>
            </div>
          </section>

          <section>
            <h2>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 7v10l9 4 9-4V7" />
              </svg>
              产品档案
            </h2>
            <div class="dm-material-list">
              <div
                v-for="profile in productProfiles"
                :key="profile.profileKey"
                class="dm-material dm-material--profile"
                role="button"
                tabindex="0"
                @click="openProfile(profile)"
                @keydown.enter.prevent="openProfile(profile)"
              >
                <el-icon class="dm-material__icon dm-material__icon--profile"><Box /></el-icon>
                <span class="dm-material__body">
                  <span class="dm-material__name">{{ profile.name }}</span>
                  <span class="dm-material__meta">{{ profile.description || '暂无简介' }}</span>
                  <span v-if="profile.category" class="dm-material__category">
                    {{ profile.category }}
                  </span>
                </span>
              </div>
              <div v-if="!productProfiles.length" class="dm-empty-line">暂无产品档案</div>
            </div>
          </section>

          <section>
            <div class="dm-section__head dm-section__head--records">
              <h2>我的训练记录</h2>
              <span class="dm-records__count">{{ records.length }} 次</span>
            </div>
            <div class="dm-records">
              <div
                v-for="record in records"
                :key="record.attemptId"
                class="dm-record"
                role="button"
                tabindex="0"
                @click="openRecord(record)"
                @keydown.enter.prevent="openRecord(record)"
              >
                <div class="dm-record__main">
                  <div class="dm-record__name">{{ record.scenarioName || '已下线场景' }}</div>
                  <div class="dm-record__time">{{ formatTime(record.startedAt) }}</div>
                </div>
                <span class="dm-record__score">
                  {{ record.totalScore == null ? '—' : `${record.totalScore} 分` }}
                </span>
                <span class="dm-record__status" :class="recordClass(record)">
                  {{ recordText(record) }}
                </span>
              </div>
              <div v-if="!records.length" class="dm-empty-line">还没有练习记录</div>
            </div>
            <div v-if="records.length" class="dm-records__more">
              <span role="button" tabindex="0" @click="openHistory" @keydown.enter.prevent="openHistory">
                查看全部
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <!-- 场景准备弹窗：三类练习统一入口（内含 preflight + 随机难度 / 自定义向导） -->
    <ScenarioPrepareDialog
      v-model="prepareVisible"
      :theme-id="themeId"
      :scenario-id="prepare.scenarioId"
      :practice-type="prepare.practiceType"
      :study-mode="prepare.studyMode"
      :default-difficulty="detail?.difficulty ?? 2"
      :allow-custom-difficulty="detail?.allowCustomDifficulty === 1"
      @created="goAttempt"
      @resume="goAttempt"
    />

    <!-- 产品档案详情弹窗：自定义字段 + Markdown 产品详情（契约 F08） -->
    <el-dialog v-model="profileVisible" :title="activeProfile?.name ?? '产品档案'" width="640px">
      <div v-if="activeProfile" class="dm-profile">
        <div class="dm-profile__meta">
          <span v-if="activeProfile.category" class="dm-material__category">
            {{ activeProfile.category }}
          </span>
          <span class="dm-profile__desc">{{ activeProfile.description || '暂无简介' }}</span>
        </div>
        <div v-if="activeProfile.customFields?.length" class="dm-profile__fields">
          <div
            v-for="field in activeProfile.customFields"
            :key="field.key ?? ''"
            class="dm-profile__field"
          >
            <span class="dm-profile__field-key">{{ field.key }}</span>
            <span class="dm-profile__field-value">{{ field.value }}</span>
          </div>
        </div>
        <div
          v-if="activeProfile.detailMarkdown"
          class="dm-profile__markdown md-body"
          v-html="renderMarkdown(activeProfile.detailMarkdown)"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 主题详情（契约 F07/F08 + 04 §API-S04）：页头 → 场景列表 + 右栏四段。
// DOM 结构按原平台视觉契约（visual/contracts/drillmate-theme-detail.json）自绘，
// 不用 el-card/el-tag：Element Plus 的 padding/radius 挂在内部 wrapper 上，量不到也对不齐。
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getStudentThemeDetail,
  type StudentMaterial,
  type StudentThemeProductProfile,
  type StudentScenario,
  type StudentThemeDetail,
  type StudentThemeRecord,
} from '@/api/actStudent'
import { renderMarkdown } from '@/views/admin/AICombat/ActualTraining/Assistant/utils/markdown'
import ScenarioPrepareDialog from './components/ScenarioPrepareDialog.vue'
import { Box } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const detail = ref<StudentThemeDetail | null>(null)

const themeId = computed(() => String(route.params.themeId))

/** 页头：优先用新接口的分组结构，旧数据回落到扁平字段（避免白屏） */
const head = computed(() => {
  const group = detail.value?.theme
  if (group) {
    return group
  }
  const flat = detail.value
  const list = flat?.scenarios ?? []
  return {
    id: flat?.themeId ?? '',
    name: flat?.name ?? '',
    description: flat?.description ?? null,
    mode: 0,
    modeText: '主题详情',
    difficulty: flat?.difficulty ?? null,
    difficultyText: null,
    scenarioCount: list.length,
    passedScenarioCount: list.filter((item) => item.myTrainingPassed).length,
    progress: 0,
    examUnlocked: false,
    planStartTime: flat?.planStartTime ?? null,
    planEndTime: flat?.planEndTime ?? null,
    publishedVersionNo: flat?.publishedVersionNo ?? 0,
    startable: true,
    stopReason: null,
  }
})

const scenarios = computed<StudentScenario[]>(() => detail.value?.scenarios ?? [])
const productProfiles = computed<StudentThemeProductProfile[]>(() => detail.value?.productProfiles ?? [])
const records = computed<StudentThemeRecord[]>(() => detail.value?.recentRecords ?? [])

/** 评估标准：通过分 + 维度（右栏第一段，空则展示占位文案，不造假数据） */
const criteria = computed(() => {
  const first = detail.value?.evaluationCriteria?.[0]
  return {
    passScore: first?.passScore ?? null,
    dimensions: first?.dimensions ?? [],
  }
})

const seq = (order?: number) => String(order ?? 0).padStart(2, '0')

const audienceText = (scenario: StudentScenario) =>
  scenario.audience?.length ? scenario.audience.join(' / ') : '不限'

const scoreText = (scenario: StudentScenario) => {
  const value = scenario.myHighestScore ?? scenario.myHighestExamScore
  return value == null ? '—' : String(value)
}

/** 主按钮文案：契约 F07「开始练习 / 继续练习 / 再练一次」 */
const primaryActionText = (scenario: StudentScenario) => {
  if (scenario.trainingAction?.enabled === false) {
    return scenario.examAction?.enabled ? '开始考核' : '暂不可练'
  }
  return scenario.nextActionText || '开始练习'
}

const examAvailable = (scenario: StudentScenario) => Boolean(scenario.examAction?.enabled)

const materialMeta = (material: StudentMaterial) =>
  material.typeText ?? (material.sourceType === 'online_classroom' ? '在线课堂' : '文档')

const formatTime = (value: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '—')

const recordText = (record: StudentThemeRecord) => {
  if (record.passed === 1) {
    return '已通过'
  }
  if (record.passed === 0) {
    return '未通过'
  }
  return record.status === 'completed' ? '已结束' : '进行中'
}

const recordClass = (record: StudentThemeRecord) => {
  if (record.passed === 1) {
    return 'is-passed'
  }
  if (record.passed === 0) {
    return 'is-failed'
  }
  return 'is-running'
}

const prepareVisible = ref(false)
const prepare = ref({
  scenarioId: '',
  studyMode: 1 as 1 | 2,
  practiceType: 'case' as 'case' | 'random' | 'custom',
})

function openPrepare(scenario: StudentScenario) {
  // 训练关闭、考核开启（通关考核主题）时，主入口直接走考核
  const trainingOn = scenario.trainingAction?.enabled
  prepare.value = {
    scenarioId: scenario.scenarioId,
    studyMode: trainingOn === false && scenario.examAction?.enabled ? 2 : 1,
    practiceType: 'case',
  }
  prepareVisible.value = true
}

function openExam(scenario: StudentScenario) {
  prepare.value = { scenarioId: scenario.scenarioId, studyMode: 2, practiceType: 'case' }
  prepareVisible.value = true
}

const goAttempt = (attemptId: string) => router.push(`/sparring/web/drillmate/attempt/${attemptId}`)
const goBack = () => router.push('/sparring/web/drillmate')
const openMaterial = (materialId: string) =>
  router.push(`/sparring/web/drillmate/files/${materialId}`)
const openHistory = () =>
  router.push({ path: '/sparring/web/drillmate/history', query: { themeId: themeId.value } })

const openRecord = (record: StudentThemeRecord) => {
  const done = record.status === 'completed' || record.status === 'failed'
  router.push(
    `/sparring/web/drillmate/${done ? 'report' : 'attempt'}/${record.attemptId}`,
  )
}

const profileVisible = ref(false)
const activeProfile = ref<StudentThemeProductProfile | null>(null)

function openProfile(profile: StudentThemeProductProfile) {
  activeProfile.value = profile
  profileVisible.value = true
}

onMounted(async () => {
  try {
    detail.value = await getStudentThemeDetail(themeId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
// 全部数值来自原平台实测：front-end/visual/measured/drillmate-theme-detail.json
$primary: var(--color-accent);
$text-1: var(--color-ink);
$text-2: var(--color-muted);
$text-3: var(--color-muted);
$border: var(--color-rule);

.dm-detail {
  padding: 0 0 24px;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', Arial, sans-serif;
  color: $text-1;
}

.dm-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.dm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 1200px;
  height: 36px;
  margin: 0 auto;
  padding: 0 0 14px;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 22px;

  &__link {
    color: $text-3;
    cursor: pointer;
  }
  &__sep {
    color: var(--color-muted);
  }
  &__current {
    color: var(--color-graphite);
  }
}

.dm-banner {
  border-radius: 12px;
  overflow: hidden;
  background:
    radial-gradient(120% 140% at 88% 12%, color-mix(in oklab, var(--color-accent) 30%, transparent) 0%, transparent 58%),
    linear-gradient(150deg, var(--color-accent-wash) 0%, var(--color-accent-wash) 55%, var(--color-paper-2) 100%);

  &__pad {
    padding: 24px;
  }
  &__row {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  &__info {
    flex: 1;
    min-width: 0;
  }
  &__tags {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  &__stats {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 14px;
    font-size: 13px;
    line-height: 22px;
    color: $text-3;
  }
  &__sep {
    color: var(--color-rule-2);
  }
  h1 {
    margin: 0 0 6px;
    font-size: 28px;
    font-weight: 750;
    line-height: 1.5;
    color: $text-1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-muted);
  }
}

.dm-mode-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: $primary;
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-paper);
  white-space: nowrap;
}

.dm-difficulty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  color: $primary;
}

.dm-stop {
  margin: 16px 0 0;
}

.dm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
  margin-top: 16px;
}

.dm-left,
.dm-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.dm-grid section {
  padding: 24px;
  border-radius: 12px;
  background: var(--color-paper);
}

.dm-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;

  &--records {
    margin-bottom: 8px;
  }
}

.dm-grid section h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 22px;
  color: $text-1;

  svg {
    flex-shrink: 0;
    color: $primary;
  }
}

.dm-section__hint {
  font-size: 13px;
  line-height: 22px;
  color: $text-3;
}

// ---------- 场景卡 ----------
.dm-scene-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dm-scene {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-paper-2);
  border-radius: 8px;
  background: var(--color-paper-2);
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--color-accent-wash);
  }

  &__index {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid $border;
    border-radius: 10px;
    background: var(--color-paper);
    font-size: 13px;
    font-weight: 750;
    line-height: 22px;
    color: var(--color-muted);
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 500;
    line-height: 22px;
    color: $text-1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 22px;

    &.is-not_started {
      color: $text-3;
      background: var(--color-paper-2);
    }
    &.is-in_progress {
      color: var(--color-warning);
      background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
    }
    &.is-passed {
      color: var(--color-success);
      background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper));
    }
  }

  &__meta {
    font-size: 13px;
    line-height: 20px;
    color: $text-2;
  }

  &__audience {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  &__count {
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: flex-end;
    gap: 24px;
    width: 186px;
    align-self: stretch;
  }

  &__score {
    flex-shrink: 0;
    text-align: center;
  }

  &__score-label {
    font-size: 13px;
    line-height: 22px;
    color: $text-2;
  }

  &__score-value {
    font-size: 18px;
    font-weight: 750;
    line-height: 22px;
    color: $text-1;
  }

  &__exam-link {
    display: inline-block;
    font-size: 12px;
    line-height: 18px;
    color: $primary;
    cursor: pointer;
  }

  &__btn {
    flex-shrink: 0;
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: $primary;
    font-size: 13px;
    line-height: 32px;
    color: var(--color-paper);
    cursor: pointer;
    /* 批注（2026-11-20）：开始练习按钮加悬停/按下反馈——
     * 悬停底色加深 + 抬 1px + 投影，按下回落下沉去影；过渡走 token。 */
    transition:
      translate var(--dur-short) var(--ease-out),
      background-color var(--dur-short) var(--ease-out),
      box-shadow var(--dur-short) var(--ease-out);

    &:hover:not(:disabled) {
      translate: 0 -1px;
      background: color-mix(in oklab, #{$primary} 86%, var(--color-graphite));
      box-shadow: 0 4px 12px color-mix(in oklab, var(--color-graphite) 18%, transparent);
    }

    &:active:not(:disabled) {
      translate: 0 1px;
      box-shadow: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    &:disabled {
      background: var(--color-rule-2);
      cursor: not-allowed;
    }
  }
}

// ---------- 评估标准 ----------
.dm-eval {
  &__score {
    margin-bottom: 8px;
    font-size: 14px;
    line-height: 28px;
    color: $text-2;

    strong {
      font-size: 28px;
      font-weight: 700;
      color: $primary;
    }
  }

  &__desc {
    margin-bottom: 8px;
    font-size: 14px;
    line-height: 24px;
    color: $text-2;
  }

  &__dims {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__dim {
    font-size: 14px;
    line-height: 22px;
    color: $text-1;

    &--empty {
      color: $text-3;
    }
  }
}

// ---------- 学习资料 / 产品档案 ----------
.dm-material-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dm-material {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  cursor: pointer;

  &__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--color-paper-2);
    color: var(--color-error);

    &--profile {
      font-size: 18px;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    font-size: 15px;
    font-weight: 500;
    line-height: 22px;
    color: $text-1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: -webkit-box;
    overflow: hidden;
    font-size: 13px;
    line-height: 20px;
    color: $text-3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  &__category {
    align-self: flex-start;
    margin-top: 4px;
    padding: 0 4px;
    border-radius: 4px;
    background: var(--color-paper-2);
    font-size: 12px;
    font-weight: 500;
    line-height: 22px;
    color: var(--color-muted);
  }
}

// ---------- 我的训练记录 ----------
.dm-records {
  display: flex;
  flex-direction: column;

  &__count {
    font-size: 16px;
    font-weight: 800;
    color: $primary;
  }

  &__more {
    padding-top: 14px;
    border-top: 1px dashed var(--color-rule);
    text-align: center;

    span {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 14px;
      font-weight: 500;
      color: $primary;
      cursor: pointer;
    }
  }
}

.dm-record {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  cursor: pointer;

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    font-size: 15px;
    line-height: 22px;
    color: $text-1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    font-size: 13px;
    line-height: 20px;
    color: $text-3;
  }

  &__score {
    flex-shrink: 0;
    font-size: 16px;
    line-height: 22px;
    color: $text-1;
  }

  &__status {
    flex-shrink: 0;
    font-size: 12px;
    line-height: 20px;

    &.is-passed {
      color: var(--color-success);
    }
    &.is-failed {
      color: var(--color-error);
    }
    &.is-running {
      color: $primary;
    }
  }
}

.dm-empty-line {
  padding: 8px 0;
  font-size: 13px;
  line-height: 20px;
  color: $text-3;
}

// ---------- 产品档案弹窗 ----------
.dm-profile {
  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__desc {
    font-size: 14px;
    line-height: 22px;
    color: $text-2;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  &__field {
    display: flex;
    gap: 12px;
    font-size: 14px;
    line-height: 22px;
  }

  &__field-key {
    min-width: 96px;
    color: $text-3;
  }

  &__field-value {
    flex: 1;
    color: $text-1;
  }

  &__markdown {
    font-size: 14px;
    line-height: 1.7;
    color: $text-1;
  }
}

@media (max-width: 1240px) {
  .dm-inner,
  .dm-breadcrumb {
    padding-right: 16px;
    padding-left: 16px;
  }

  .dm-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .dm-banner h1 {
    font-size: 22px;
    white-space: normal;
  }

  .dm-scene {
    flex-wrap: wrap;

    &__actions {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>

<style lang="scss">
// 弹窗内 markdown 用 v-html 注入，scoped 命中不到，单独用全局块限定在 .md-body
.md-body {
  h1,
  h2,
  h3 {
    margin: 16px 0 8px;
    font-weight: 700;
  }
  p {
    margin: 0 0 10px;
  }
  ul,
  ol {
    margin: 0 0 10px;
    padding-left: 20px;
  }
  code {
    padding: 1px 4px;
    border-radius: 4px;
    background: var(--color-paper-2);
    font-size: 13px;
  }
  pre {
    overflow: auto;
    padding: 12px;
    border-radius: 8px;
    background: var(--color-paper-2);
  }
  table {
    width: 100%;
    margin-bottom: 12px;
    border-collapse: collapse;

    th,
    td {
      padding: 6px 8px;
      border: 1px solid var(--color-rule);
      font-size: 13px;
      text-align: left;
    }
  }
  blockquote {
    margin: 0 0 10px;
    padding: 8px 12px;
    border-left: 3px solid var(--color-rule);
    color: var(--color-muted);
  }
}
</style>
