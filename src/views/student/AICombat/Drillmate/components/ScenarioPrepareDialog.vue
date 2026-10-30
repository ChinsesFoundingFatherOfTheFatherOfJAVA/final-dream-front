<template>
  <el-dialog
    v-model="visible"
    width="480px"
    class="dm-check-dialog"
    :class="{ 'dm-check-dialog--case': practiceType === 'case' }"
    :close-on-click-modal="false"
    @closed="reset"
  >
    <template #header>
      <div class="dm-check-heading">
        <div class="dm-check-title__text">{{ title }}</div>
        <div v-if="preflight" class="dm-check-duration">
          限时 {{ Math.round((preflight.maxDurationSeconds || 900) / 60) }} 分钟
        </div>
      </div>
    </template>

    <div v-loading="loading" class="dm-modal">
      <!-- 阻断态：按 checks 展示原因（契约 04：allowed=false 返回第一个阻断码） -->
      <el-alert
        v-if="preflight && !preflight.allowed"
        type="warning"
        :title="blockReason"
        :closable="false"
        class="block-alert"
      />

      <template v-if="preflight && preflight.allowed">
        <!-- 案例练习：原平台双模式说明卡；模式仍由现有入口传入，不在此新增业务切换。 -->
        <div v-if="practiceType === 'case'" class="dm-mode-list">
          <div class="dm-mode-card" :class="{ 'is-active': studyMode === 1 }">
            <div class="dm-mode-card__title">日常训练</div>
            <div class="dm-mode-card__desc">进入场景进行对话练习，完成后查看训练报告</div>
          </div>
          <div class="dm-mode-card" :class="{ 'is-active': studyMode === 2 }">
            <div class="dm-mode-card__title">通关考核</div>
            <div class="dm-mode-card__desc">按主题考核要求完成场景，检验学习成果</div>
          </div>
        </div>

        <!-- 随机练习：难度选择（契约 02 §5.4；主题允许自定义难度才可选） -->
        <el-form v-if="practiceType === 'random'" label-width="90px">
          <el-form-item label="难度">
            <el-radio-group v-model="difficulty" :disabled="!allowCustomDifficulty">
              <el-radio-button :value="1">简单</el-radio-button>
              <el-radio-button :value="2">中等</el-radio-button>
              <el-radio-button :value="3">困难</el-radio-button>
            </el-radio-group>
            <div v-if="!allowCustomDifficulty" class="hint">该主题已锁定难度</div>
          </el-form-item>
        </el-form>

        <!-- 自定义练习：按后端 requiredSteps 顺序渲染（契约 02 §5.4） -->
        <el-steps v-if="practiceType === 'custom'" :active="stepIndex" align-center class="steps">
          <el-step v-for="step in preflight.requiredSteps" :key="step" :title="stepLabel(step)" />
        </el-steps>

        <template v-if="practiceType === 'custom'">
          <!-- 步骤 2：场景背景 -->
          <el-form v-if="currentStep === 'scene_background'" label-width="90px">
            <el-form-item label="地点">
              <el-input v-model="custom.sceneBackground.location" maxlength="60" />
            </el-form-item>
            <el-form-item label="情境">
              <el-input
                v-model="custom.sceneBackground.situation"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>
          </el-form>

          <!-- 步骤 3：AI 演员 -->
          <el-form v-else-if="currentStep === 'actor'" label-width="90px">
            <el-form-item label="称呼">
              <el-input v-model="custom.actor.name" maxlength="20" placeholder="如：王总" />
            </el-form-item>
            <el-form-item label="身份">
              <el-input v-model="custom.actor.identity" maxlength="30" placeholder="如：生产总监" />
            </el-form-item>
            <el-form-item label="性格">
              <el-select
                v-model="custom.actor.personalities"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="可输入自定义性格"
                style="width: 100%"
              >
                <el-option label="严谨" value="严谨" />
                <el-option label="强势" value="强势" />
                <el-option label="务实" value="务实" />
                <el-option label="犹豫" value="犹豫" />
                <el-option label="急躁" value="急躁" />
              </el-select>
            </el-form-item>
            <el-form-item label="背景">
              <el-input
                v-model="custom.actor.background"
                type="textarea"
                :rows="2"
                maxlength="300"
              />
            </el-form-item>
          </el-form>

          <!-- 步骤 4：难度 -->
          <el-form v-else-if="currentStep === 'difficulty'" label-width="90px">
            <el-form-item label="难度">
              <el-radio-group v-model="difficulty">
                <el-radio-button :value="1">简单</el-radio-button>
                <el-radio-button :value="2">中等</el-radio-button>
                <el-radio-button :value="3">困难</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>

          <!-- 步骤 5：预览确认 -->
          <div v-else-if="currentStep === 'preview'" class="preview">
            <p><strong>地点：</strong>{{ custom.sceneBackground.location || '—' }}</p>
            <p><strong>情境：</strong>{{ custom.sceneBackground.situation || '—' }}</p>
            <p>
              <strong>AI 客户：</strong>{{ custom.actor.name || '—' }}（{{
                custom.actor.identity || '—'
              }}）
              <span v-if="custom.actor.personalities.length">
                · {{ custom.actor.personalities.join('、') }}
              </span>
            </p>
            <p><strong>难度：</strong>{{ difficultyLabel }}</p>
            <p class="hint">
              限时约 {{ Math.round((preflight.maxDurationSeconds || 900) / 60) }} 分钟
            </p>
          </div>
        </template>

        <!-- 非自定义：展示余量信息 -->
        <div v-if="practiceType !== 'custom'" class="quota-hint">
          <span v-if="preflight.remainingSceneAttempts != null">
            该场景剩余 {{ preflight.remainingSceneAttempts }} 次
          </span>
          <span v-if="preflight.remainingExamAttempts != null">
            · 剩余考核 {{ preflight.remainingExamAttempts }} 次
          </span>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dm-check-actions">
        <el-button
          v-if="practiceType === 'custom' && !isLastStep"
          class="dm-check-btn"
          @click="nextStep"
          :disabled="!preflight?.allowed"
        >
          下一步
        </el-button>
        <el-button
          v-else
          class="dm-check-btn"
          type="primary"
          :loading="submitting"
          :disabled="!preflight?.allowed"
          @click="submit"
        >
          {{ practiceType === 'case' ? '开始训练' : '开始练习' }}
        </el-button>
        <el-button
          v-if="preflight?.activeAttemptId"
          type="warning"
          @click="emit('resume', preflight.activeAttemptId!)"
        >
          继续未完成的练习
        </el-button>
        <el-button class="dm-check-btn" @click="visible = false">取消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// 场景准备弹窗（契约 02 §5.4 / 04 API-A01）：三类入口统一走 preflight，
// 随机练习选难度、自定义练习按后端 requiredSteps 顺序渲染步骤。
import { computed, reactive, ref, watch } from 'vue'
import {
  createAttempt,
  preflightAttempt,
  type PreflightResp,
  type StudyMode,
} from '@/api/actStudent'

const props = defineProps<{
  modelValue: boolean
  themeId: string
  scenarioId: string
  practiceType: 'case' | 'random' | 'custom'
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
const preflight = ref<PreflightResp | null>(null)
const difficulty = ref(props.defaultDifficulty || 2)

const custom = reactive({
  sceneBackground: { location: '', situation: '' },
  actor: { name: '', identity: '', personalities: [] as string[], background: '' },
})

const title = computed(() => {
  const map = { case: '开始练习', random: '随机练习', custom: '自定义练习' }
  return `${map[props.practiceType]}${props.studyMode === 2 ? '（考核）' : ''}`
})

const steps = computed(() => preflight.value?.requiredSteps ?? [])
const stepIndex = ref(0)
const currentStep = computed(() => steps.value[stepIndex.value] ?? 'preview')
const isLastStep = computed(() => stepIndex.value >= steps.value.length - 1)

const difficultyLabel = computed(
  () => ({ 1: '简单', 2: '中等', 3: '困难' })[difficulty.value] ?? '中等',
)

const stepLabel = (step: string) =>
  ({
    product_profiles: '产品档案',
    scene_background: '场景背景',
    actor: 'AI 客户',
    difficulty: '难度',
    preview: '确认',
  })[step] ?? step

const blockReason = computed(() => {
  const failed = preflight.value?.checks?.find((check) => !check.passed)
  return failed?.message || '当前不可开始练习'
})

async function load() {
  loading.value = true
  try {
    preflight.value = await preflightAttempt({
      themeId: props.themeId,
      scenarioId: props.scenarioId,
      studyMode: props.studyMode,
      practiceType: props.practiceType,
    })
    stepIndex.value = 0
  } finally {
    loading.value = false
  }
}

function nextStep() {
  if (!isLastStep.value) stepIndex.value++
}

function reset() {
  stepIndex.value = 0
  custom.sceneBackground.location = ''
  custom.sceneBackground.situation = ''
  custom.actor.name = ''
  custom.actor.identity = ''
  custom.actor.personalities = []
  custom.actor.background = ''
}

async function submit() {
  submitting.value = true
  try {
    // 契约 04 API-A02：custom 传 customConfig（服务端会校验后转给 AIGentService）
    const customConfig =
      props.practiceType === 'custom'
        ? {
            sceneBackground: { ...custom.sceneBackground },
            actor: { ...custom.actor },
            difficulty: difficulty.value,
          }
        : undefined
    const attempt = await createAttempt({
      themeId: props.themeId,
      scenarioId: props.scenarioId,
      studyMode: props.studyMode,
      practiceType: props.practiceType,
      difficulty: Number(difficulty.value),
      customConfigJson: customConfig ? JSON.stringify(customConfig) : undefined,
    })
    emit('created', attempt.id)
    visible.value = false
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    // 只在打开时请求：immediate 会在弹窗未挂载时先发一次，拿到的是上一次的旧数据
    if (open) {
      preflight.value = null
      void load()
    }
  },
)
</script>

<style scoped lang="scss">
.dm-check-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dm-check-title__text {
  height: 24px;
  margin-top: 14px;
  color: #262626;
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
}

.dm-check-duration {
  height: 20px;
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 20px;
}

.dm-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
}

.dm-check-dialog--case .dm-modal {
  flex: none;
  height: 366px;
}

.dm-mode-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dm-mode-card {
  width: 100%;
  padding: 16px;
  border: 1px solid #e9e9e9;
  border-radius: 8px;
  background: #fafafa;
  box-sizing: border-box;
}

.dm-mode-card__title {
  color: #262626;
  font-size: 14px;
  font-weight: 700;
  line-height: 21px;
}

.dm-mode-card__desc {
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 20px;
}

.dm-check-actions {
  display: flex;
  gap: 16px;
  width: 480px;
  height: 64px;
  padding: 0 24px 24px;
  box-sizing: border-box;
}

.dm-check-btn {
  flex: 1;
  width: 208px;
  height: 40px;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;

  &.el-button--primary {
    border-color: #436bff;
    background: #436bff;
    color: #ffffff;
  }
}

.block-alert {
  margin-bottom: 12px;
}
.steps {
  margin-bottom: 16px;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.quota-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 8px;
}
.preview {
  p {
    margin: 6px 0;
    font-size: 13px;
  }
}
</style>

<!--
  弹窗根节点由 Element Plus teleport 到 body，拿不到本组件的 scoped id，
  scoped 块里的 .dm-check-dialog 规则永远匹配不到它（宽度被 16px padding 吃掉、
  圆角与三段高度失效）。这里用非 scoped 块统一接管，只用 .dm-check-dialog 这个专属类名限定范围。
-->
<style lang="scss">
.dm-check-dialog {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  border-radius: 16px;
  background: #ffffff;

  .el-dialog__header {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 480px;
    height: 142px;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .el-dialog__body {
    flex: none;
    width: 480px;
    height: 366px;
    padding: 0;
    box-sizing: border-box;
  }

  .el-dialog__footer {
    flex: none;
    width: 480px;
    height: 64px;
    padding: 0;
    box-sizing: border-box;
  }
}

.dm-check-dialog.dm-check-dialog--case {
  height: 571px;
  margin: calc((100vh - 571px) / 2) auto 0;
}
</style>

