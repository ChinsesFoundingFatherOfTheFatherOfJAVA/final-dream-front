<template>
  <el-dialog
    v-model="visible"
    width="800px"
    class="dm-check-dialog dm-check-dialog--prepare"
    :close-on-click-modal="false"
    @closed="reset"
  >
    <!--
      F09 场景准备弹窗（契约 01 §F09 / 04 §API-S05）。
      尺寸与分区按原平台实测：800px，头部左对齐是"场景名+状态徽章+人群标签"+右侧"练习次数/最高分数"，
      主体依次是 实战案例卡 → 涉及产品档案 → 业务目标/业务影响/失败代价/核心冲突 →
      常见失败模式/困难挑战/禁止行为 → 评估标准；底部左侧限时、右侧按 practiceMethods 动态出按钮。
      数据唯一来源是 API-S05（getStudentScenarioDetail），本组件不拼装、不造占位数据。
    -->
    <template #header>
      <div class="dm-prep-head">
        <div class="dm-prep-head__main">
          <div class="dm-prep-title-row">
            <h2 class="dm-prep-title">{{ detail?.name || title }}</h2>
            <span v-if="detail?.statusText" class="dm-prep-status" :class="`is-${detail.status}`">
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
              {{ detail.statusText }}
            </span>
          </div>
          <div v-if="audienceTags.length" class="dm-prep-audience">
            <span v-for="tag in audienceTags" :key="tag" class="dm-prep-tag">{{ tag }}</span>
          </div>
        </div>
        <div class="dm-prep-head__stats">
          <div class="dm-prep-stat">
            <div class="dm-prep-stat__label">练习次数</div>
            <div class="dm-prep-stat__value">{{ detail ? detail.attemptCount : '—' }}</div>
          </div>
          <div class="dm-prep-stat">
            <div class="dm-prep-stat__label">最高分数</div>
            <div class="dm-prep-stat__value">{{ highestScoreText }}</div>
          </div>
        </div>
      </div>
    </template>

    <div v-loading="loading" class="dm-prep-body">
      <el-alert v-if="loadError" type="error" :title="loadError" :closable="false" show-icon />

      <el-alert
        v-else-if="blockReason"
        class="dm-prep-alert"
        type="warning"
        :title="blockReason"
        :closable="false"
        show-icon
      />

      <template v-if="detail">
        <!-- 实战案例：每案例一张卡（契约 02 §8「每案例一行」），无案例就空态，不造数据 -->
        <section class="dm-prep-block">
          <div class="dm-prep-block__head">
            <span class="dm-prep-block__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                <path d="M17 8h4M19 6v4" />
              </svg>
            </span>
            <span class="dm-prep-block__title">实战案例</span>
            <span class="dm-prep-block__count">{{ detail.cases.length }}个</span>
          </div>

          <el-empty
            v-if="!detail.cases.length"
            description="该场景还没有已发布的实战案例"
            :image-size="64"
          />

          <div v-for="item in detail.cases" :key="item.caseId" class="dm-case-card">
            <div class="dm-case-card__top">
              <div class="dm-case-card__difficulty">
                <span class="dm-case-card__stars" aria-hidden="true">
                  <svg
                    v-for="star in 3"
                    :key="star"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    :fill="star <= (item.difficultyStars ?? 0) ? 'var(--color-warning)' : 'var(--color-rule-2)'"
                  >
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    />
                  </svg>
                </span>
                <span class="dm-case-card__level">{{ levelText(item.difficulty) }}</span>
              </div>
              <button
                type="button"
                class="dm-case-card__start"
                :disabled="!detail.startable || !methodEnabled('case')"
                :title="caseBlockReason"
                @click="startCase(item)"
              >
                开始练习
              </button>
            </div>

            <div class="dm-case-card__actor">
              <div class="dm-case-card__avatar" aria-hidden="true">
                {{ initialOf(item.actorName) }}
              </div>
              <div class="dm-case-card__actor-text">
                <div class="dm-case-card__actor-name">{{ item.actorName || 'AI 角色' }}</div>
                <div v-if="actorLine(item)" class="dm-case-card__actor-role">
                  {{ actorLine(item) }}
                </div>
              </div>
            </div>

            <h3 v-if="item.scriptName" class="dm-case-card__title">{{ item.scriptName }}</h3>
            <p v-if="item.scriptBackground" class="dm-case-card__desc">
              {{ item.scriptBackground }}
            </p>
            <!-- 开场白原话：原平台逐字展示，前端不做任何截断或改写 -->
            <p v-if="item.scriptOpening" class="dm-case-card__opening">{{ item.scriptOpening }}</p>
          </div>
        </section>

        <!-- 涉及产品档案：空关联不渲染该分区（原平台无档案时整块不出现） -->
        <section v-if="detail.productProfiles.length" class="dm-prep-block dm-prep-block--fill">
          <div class="dm-prep-block__head">
            <span class="dm-prep-block__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
                <path d="M4 7.5L12 12l8-4.5M12 12v9" />
              </svg>
            </span>
            <span class="dm-prep-block__title">涉及产品档案</span>
          </div>
          <div class="dm-prep-tags">
            <span
              v-for="profile in detail.productProfiles"
              :key="profile.profileId"
              class="dm-prep-profile"
              :title="profile.description || profile.category || profile.name"
            >
              {{ profile.name }}
            </span>
          </div>
        </section>

        <!-- 场景描述四段（业务目标/业务影响/失败代价/核心冲突） -->
        <section
          v-for="section in textSections"
          :key="section.key"
          class="dm-prep-block dm-prep-block--fill"
        >
          <div class="dm-prep-block__head">
            <span class="dm-prep-block__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
              </svg>
            </span>
            <span class="dm-prep-block__title">{{ section.label }}</span>
          </div>
          <p class="dm-prep-text">{{ section.value }}</p>
        </section>

        <!-- 常见失败模式 / 困难挑战 / 禁止行为 / 行为目标 / 冰山要素：列表型分区 -->
        <section
          v-for="section in listSections"
          :key="section.key"
          class="dm-prep-block dm-prep-block--fill"
        >
          <div class="dm-prep-block__head">
            <span class="dm-prep-block__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            <span class="dm-prep-block__title">{{ section.label }}</span>
          </div>
          <ul class="dm-prep-list">
            <li v-for="(row, index) in section.items" :key="index">{{ row }}</li>
          </ul>
        </section>

        <!-- 评估标准：权重直接来自服务端，前端不重算 -->
        <section v-if="detail.dimensions.length" class="dm-prep-block dm-prep-block--fill">
          <div class="dm-prep-block__head">
            <span class="dm-prep-block__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span class="dm-prep-block__title">评估标准</span>
            <span v-if="detail.passScore != null" class="dm-prep-block__count">
              通过分 {{ detail.passScore }}
            </span>
          </div>
          <div class="dm-prep-dims">
            <div v-for="dim in detail.dimensions" :key="dim.id" class="dm-prep-dim">
              <span class="dm-prep-dim__name">{{ dim.name }}</span>
              <span class="dm-prep-dim__weight">{{ weightText(dim.weight) }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>

    <template #footer>
      <div class="dm-prep-actions">
        <div class="dm-prep-actions__left">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-muted)"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          限时 {{ durationText }}
        </div>
        <div class="dm-prep-actions__right">
          <el-button class="dm-prep-btn dm-prep-btn--cancel" @click="visible = false"
            >取消</el-button
          >
          <!-- 按钮按主题 practiceMethods 动态渲染（说明书 170 行），不写死 case -->
          <el-button
            v-if="methodEnabled('random')"
            class="dm-prep-btn dm-prep-btn--ghost"
            :disabled="!canStart"
            :title="canStart ? '' : blockReason || '当前不可开始练习'"
            @click="openRandom"
          >
            随机练习
          </el-button>
          <el-button
            v-if="methodEnabled('custom')"
            class="dm-prep-btn dm-prep-btn--primary"
            type="primary"
            :disabled="!canStart"
            :title="canStart ? '' : blockReason || '当前不可开始练习'"
            @click="openCustom"
          >
            + 自定义练习
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <!-- F11 随机练习：先选难度，再进模式选择（原平台实测顺序） -->
  <RandomPracticeDialog
    v-model="randomVisible"
    :scenario-name="detail?.name ?? ''"
    :max-duration-seconds="detail?.maxDurationSeconds ?? null"
    :difficulty="detail?.difficulty ?? defaultDifficulty"
    :allow-custom-difficulty="allowCustomDifficulty"
    @confirm="onRandomConfirm"
  />

  <!-- F12 自定义练习：动态步骤向导（requiredSteps 由后端给） -->
  <CustomPracticeWizard
    v-model="customVisible"
    :theme-id="themeId"
    :scenario-id="scenarioId"
    :scenario-name="detail?.name ?? ''"
    :study-mode="studyMode"
    :default-difficulty="detail?.difficulty ?? defaultDifficulty"
    :allow-custom-difficulty="allowCustomDifficulty"
    :product-profiles="detail?.productProfiles ?? []"
    @confirm="onCustomConfirm"
  />

  <!-- F10 模式选择：三种练习方式共用的确认步骤 -->
  <PracticeModeChooser
    v-model="modeVisible"
    :scenario-name="detail?.name ?? ''"
    :max-duration-seconds="detail?.maxDurationSeconds ?? null"
    :training-enabled="Boolean(detail?.trainingAction?.enabled)"
    :training-reason="detail?.trainingAction?.reason ?? null"
    :exam-enabled="Boolean(detail?.examAction?.enabled)"
    :exam-reason="detail?.examAction?.reason ?? null"
    :default-mode="entryMode"
    :submitting="submitting"
    @select="onModeSelect"
  />
</template>

<script setup lang="ts">
// 场景准备弹窗（契约 01 §F09 / 04 §API-S05）：九类信息一次读全；三个练习方式入口按 practiceMethods 渲染。
// 任何方式最终都走同一个 preflight → createAttempt（业务提交逻辑保持原样，不在此新增分支）。
import { computed, ref, watch } from 'vue'
import {
  createAttempt,
  getStudentScenarioDetail,
  preflightAttempt,
  type PracticeType,
  type StudentScenarioCase,
  type StudentScenarioDetail,
  type StudyMode,
} from '@/api/actStudent'
import PracticeModeChooser from './PracticeModeChooser.vue'
import RandomPracticeDialog from './RandomPracticeDialog.vue'
import CustomPracticeWizard from './CustomPracticeWizard.vue'

const props = defineProps<{
  modelValue: boolean
  themeId: string
  scenarioId: string
  /** 入口意图（详情页传 case）；弹窗内部仍以 practiceMethods 为准 */
  practiceType: PracticeType
  studyMode: StudyMode
  defaultDifficulty: number
  allowCustomDifficulty: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [attemptId: string]
  resume: [attemptId: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const blockReason = ref('')
const detail = ref<StudentScenarioDetail | null>(null)

const randomVisible = ref(false)
const customVisible = ref(false)
const modeVisible = ref(false)

/** 本次待提交的练习参数：模式由 F10 选，其余由各入口先收集 */
interface PendingLaunch {
  practiceType: PracticeType
  /** 点击的是哪张案例卡（仅展示定位；创建请求按契约 04 API-A02 不传 caseId） */
  caseId?: string
  difficulty?: number
  customConfigJson?: string
}
const pending = ref<PendingLaunch>({ practiceType: 'case' })

const title = computed(() => '场景准备')
// 头部与场景卡一致只显示前两个人群标签（后端返回全量切分，弹窗按原平台只取前两个，避免挤掉右侧统计）
const audienceTags = computed(() => (detail.value?.audience ?? []).slice(0, 2))

const highestScoreText = computed(() => {
  const training = detail.value?.myHighestScore
  const exam = detail.value?.myHighestExamScore
  const values = [training, exam].filter((value): value is number => value != null)
  if (!values.length) {
    return '—'
  }
  return String(Math.max(...values))
})

const durationText = computed(() => {
  const seconds = detail.value?.maxDurationSeconds ?? 900
  return `${Math.round(seconds / 60)} 分钟`
})

const canStart = computed(() => Boolean(detail.value?.startable) && !blockReason.value)

/** 入口带入的默认模式：详情页点"考核"链接时为 2，普通场景卡为 1 */
const entryMode = computed<StudyMode>(() => props.studyMode)

const methodEnabled = (method: PracticeType) =>
  Boolean(detail.value?.practiceMethods?.includes(method))

/** 案例卡按钮不可用的原因：先按主题动作可用性，再按练习方式开关（都由服务端判定给文案） */
const caseBlockReason = computed(() => {
  if (!detail.value) {
    return '场景准备信息未加载'
  }
  if (!detail.value.startable) {
    return detail.value.stopReason || '当前不可开始练习'
  }
  if (!methodEnabled('case')) {
    return '该主题未开启案例练习'
  }
  return ''
})

const levelText = (level: number | null) => ({ 1: '简单', 2: '中等', 3: '困难' })[level ?? 0] ?? ''

const weightText = (weight: number | null) => (weight == null ? '—' : `${Number(weight)}%`)

const initialOf = (name: string | null) => (name ? name.slice(0, 1) : 'AI')

/** 角色副标题：身份 · 公司 · 类型 · 性格 · 沟通风格（有值才出现，用顿号连接） */
function actorLine(item: StudentScenarioCase) {
  return [
    item.actorPosition,
    item.actorCompany,
    item.actorType,
    item.actorPersonality,
    item.actorCommunicationStyle,
  ]
    .filter((value) => Boolean(value && value.trim()))
    .join('，')
}

const textSections = computed(() => {
  const source = detail.value
  if (!source) {
    return []
  }
  return [
    { key: 'businessGoal', label: '业务目标', value: source.businessGoal },
    { key: 'businessImpact', label: '业务影响', value: source.businessImpact },
    { key: 'failureCost', label: '失败代价', value: source.failureCost },
    { key: 'coreConflict', label: '核心冲突', value: source.coreConflict },
  ].filter((section): section is { key: string; label: string; value: string } =>
    Boolean(section.value && section.value.trim()),
  )
})

const listSections = computed(() => {
  const source = detail.value
  if (!source) {
    return []
  }
  return [
    { key: 'commonFailureModes', label: '常见失败模式', items: source.commonFailureModes ?? [] },
    { key: 'difficulties', label: '困难挑战', items: source.difficulties ?? [] },
    { key: 'forbiddenBehaviors', label: '禁止行为', items: source.forbiddenBehaviors ?? [] },
    { key: 'behaviorGoals', label: '行为目标', items: source.behaviorGoals ?? [] },
    { key: 'icebergElements', label: '冰山模型要素', items: source.icebergElements ?? [] },
  ].filter((section) => section.items.length > 0)
})

async function load() {
  loading.value = true
  loadError.value = ''
  blockReason.value = ''
  try {
    detail.value = await getStudentScenarioDetail(props.themeId, props.scenarioId)
    // 服务端判定三种方式全不可用时给出中文原因，前端直接展示，不自己编理由
    blockReason.value = detail.value.unavailableReason ?? ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '场景准备信息加载失败'
  } finally {
    loading.value = false
  }
}

/** 案例卡"开始练习" → 先进 F10 模式选择（原平台同款：先选训练/考核） */
function startCase(item: StudentScenarioCase) {
  if (!detail.value?.startable || !methodEnabled('case')) {
    return
  }
  // 契约 04 API-A02 的创建请求只有 themeId/scenarioId/practiceType：服务端按场景取发布快照里的案例脚本，
  // 所以这里记 caseId 只用于展示定位，不进请求体（示例场景可有多案例，取脚本仍由服务端裁决）。
  pending.value = { practiceType: 'case', caseId: item.caseId }
  modeVisible.value = true
}

function openRandom() {
  pending.value = { practiceType: 'random' }
  randomVisible.value = true
}

function openCustom() {
  pending.value = { practiceType: 'custom' }
  customVisible.value = true
}

function onRandomConfirm(payload: { difficulty: number }) {
  pending.value = { practiceType: 'random', difficulty: payload.difficulty }
  randomVisible.value = false
  modeVisible.value = true
}

function onCustomConfirm(payload: { customConfigJson: string; difficulty: number }) {
  pending.value = {
    practiceType: 'custom',
    difficulty: payload.difficulty,
    customConfigJson: payload.customConfigJson,
  }
  customVisible.value = false
  modeVisible.value = true
}

/**
 * 模式选定后执行 preflight + createAttempt（契约 04 API-A01/A02）。
 * preflight 不通过时把服务端中文原因回填到弹窗顶部，不创建 attempt、不扣次数。
 */
async function onModeSelect(mode: StudyMode) {
  submitting.value = true
  blockReason.value = ''
  try {
    const preflight = await preflightAttempt({
      themeId: props.themeId,
      scenarioId: props.scenarioId,
      studyMode: mode,
      practiceType: pending.value.practiceType,
    })
    if (preflight.activeAttemptId) {
      modeVisible.value = false
      emit('resume', preflight.activeAttemptId)
      return
    }
    if (!preflight.allowed) {
      blockReason.value =
        preflight.checks.find((check) => !check.passed)?.message || '当前不可开始练习'
      modeVisible.value = false
      return
    }
    const attempt = await createAttempt({
      themeId: props.themeId,
      scenarioId: props.scenarioId,
      studyMode: mode,
      practiceType: pending.value.practiceType,
      difficulty: Number(pending.value.difficulty ?? props.defaultDifficulty ?? 2),
      customConfigJson: pending.value.customConfigJson,
    })
    modeVisible.value = false
    emit('created', attempt.id)
    visible.value = false
  } catch (e) {
    blockReason.value = e instanceof Error ? e.message : '创建练习失败'
    modeVisible.value = false
  } finally {
    submitting.value = false
  }
}

function reset() {
  detail.value = null
  loadError.value = ''
  blockReason.value = ''
  randomVisible.value = false
  customVisible.value = false
  modeVisible.value = false
  pending.value = { practiceType: 'case' }
}

watch(
  () => props.modelValue,
  (open) => {
    // 只在打开时请求：immediate 会在弹窗未挂载时先发一次旧数据。
    // immediate 是必需的：父级先置 true 再挂载本组件（以及 HMR 重挂）时不会再有 false→true 跳变，
    // 没有它弹窗会停在空白 + 限时回退值。
    if (open) {
      void load()
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
// 数值来自原平台实测：弹窗 800×629、头部左对齐、区块浅灰底 #f7f8fa、主色 #436bff
.dm-prep-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  padding: 20px 56px 16px 24px;
  box-sizing: border-box;

  &__main {
    min-width: 0;
  }

  &__stats {
    display: flex;
    flex: none;
    gap: 24px;
    padding-top: 4px;
  }
}

.dm-prep-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dm-prep-title {
  margin: 0;
  overflow: hidden;
  /* 原平台实测：14px / 400 / #595959（视觉契约 measured 的 title 探针）。
     此前按"弹窗大标题"写成 20px/700/var(--color-ink)，属偏差，已按基准修正。 */
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-prep-status {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  color: var(--color-accent);
  background: var(--color-accent-wash);
  font-size: 12px;
  line-height: 22px;

  &.is-in_progress {
    color: var(--color-warning);
    background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  }

  &.is-passed {
    color: var(--color-success);
    background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper));
  }
}

.dm-prep-audience {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.dm-prep-tag {
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--color-muted);
  background: var(--color-paper-2);
  font-size: 12px;
  line-height: 18px;
}

.dm-prep-stat {
  min-width: 64px;
  text-align: right;

  &__label {
    color: var(--color-muted);
    font-size: 13px;
    line-height: 20px;
  }

  &__value {
    margin-top: 4px;
    color: var(--color-ink);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
  }
}

.dm-prep-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 0 24px 16px;
  box-sizing: border-box;
}

.dm-prep-alert {
  margin-bottom: 4px;
}

.dm-prep-block {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &--fill {
    padding: 16px;
    border-radius: 8px;
    background: var(--color-paper-2);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__icon {
    display: inline-flex;
    color: var(--color-accent);
  }

  &__title {
    color: var(--color-accent);
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }

  &__count {
    margin-left: 4px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-case-card {
  padding: 16px;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  background: var(--color-paper);

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  &__difficulty {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__stars {
    display: inline-flex;
    gap: 3px;
  }

  &__level {
    color: var(--color-success);
    font-size: 12px;
    line-height: 18px;
  }

  &__start {
    flex: none;
    height: 32px;
    padding: 0 16px;
    border: 1px solid var(--color-accent);
    border-radius: 6px;
    background: var(--color-accent);
    color: var(--color-paper);
    font-size: 13px;
    line-height: 30px;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
      background: var(--color-accent);
    }

    &:disabled {
      border-color: var(--color-rule-2);
      background: var(--color-rule-2);
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  &__actor {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }

  &__avatar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-paper);
    font-size: 15px;
    font-weight: 600;
  }

  &__actor-name {
    color: var(--color-ink);
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
  }

  &__actor-role {
    margin-top: 2px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 18px;
  }

  &__title {
    margin: 14px 0 0;
    color: var(--color-ink);
    font-size: 15px;
    font-weight: 700;
    line-height: 23px;
  }

  &__desc {
    margin: 10px 0 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 22px;
  }

  &__opening {
    margin: 12px 0 0;
    color: var(--color-accent);
    font-size: 13px;
    line-height: 22px;
  }
}

.dm-prep-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dm-prep-profile {
  padding: 4px 12px;
  border-radius: 14px;
  color: var(--color-muted);
  background: var(--color-paper);
  box-shadow: inset 0 0 0 1px var(--color-rule);
  font-size: 13px;
  line-height: 20px;
}

.dm-prep-text {
  margin: 0;
  color: var(--color-ink);
  font-size: 13px;
  line-height: 22px;
}

.dm-prep-list {
  margin: 0;
  padding-left: 18px;
  color: var(--color-ink);
  font-size: 13px;
  line-height: 22px;

  li + li {
    margin-top: 4px;
  }
}

.dm-prep-dims {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.dm-prep-dim {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-paper);

  &__name {
    overflow: hidden;
    color: var(--color-ink);
    font-size: 13px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__weight {
    flex: none;
    color: var(--color-accent);
    font-size: 13px;
    font-weight: 500;
    line-height: 20px;
  }
}

.dm-prep-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 24px 24px;
  box-sizing: border-box;

  &__left {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 20px;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.dm-prep-btn {
  /* 原平台实测 32 高 / r4（视觉契约 measured 的 action-cancel 探针），此前 36/r6 属偏差 */
  height: 32px;
  margin: 0;
  padding: 0 18px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;

  &--cancel {
    border-color: var(--color-rule-2);
    background: var(--color-paper);
    color: var(--color-muted);
  }

  &--ghost {
    border-color: var(--color-accent-wash);
    background: var(--color-paper);
    color: var(--color-accent);
  }

  &--primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
  }
}
</style>

<!--
  弹窗根节点由 Element Plus teleport 到 body，scoped 块里的 `.dm-check-dialog` 永远匹配不到它；
  这里用非 scoped 块统一接管（与既有 dm-check-dialog 约定同族，只限定这个专属类名）。
-->
<style lang="scss">
.dm-check-dialog.dm-check-dialog--prepare {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 627px;
  margin: calc((100vh - 627px) / 2) auto 0;
  padding: 0;
  /* 原平台实测 r14（measured dialog.radius），此前 16 属偏差 */
  border-radius: 14px;
  background: var(--color-paper);

  .el-dialog__header {
    display: flex;
    align-items: stretch;
    flex: none;
    margin: 0;
    padding: 0;
  }

  .el-dialog__body {
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .el-dialog__footer {
    flex: none;
    margin: 0;
    padding: 16px 0 0;
    border-top: 1px solid var(--color-paper-2);
    box-sizing: border-box;
  }
}
</style>
