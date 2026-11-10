<template>
  <el-dialog
    v-model="visible"
    width="800px"
    class="dm-check-dialog dm-check-dialog--custom"
    :close-on-click-modal="false"
  >
    <!--
      F12 自定义练习（契约 01 §F12 / 02 §5.4）。
      原平台实测（页面素材/场景准备-自定义练习弹窗.png）：800px，左侧步骤栏 + 右侧内容 + 底部常驻按钮。
      步骤**由后端 requiredSteps 决定**（设置关闭产品档案或自定义难度时对应步骤跳过），
      前端只按顺序渲染，不写死五步。
    -->
    <template #header>
      <div class="dm-cust-head">
        <div class="dm-cust-head__row">
          <span class="dm-cust-head__badge">自定义练习</span>
          <span class="dm-cust-head__title">{{ scenarioName }}</span>
        </div>
        <p class="dm-cust-head__sub">学员基于场景单元自定义具体情境</p>
      </div>
    </template>

    <div class="dm-cust-body">
      <aside class="dm-cust-steps">
        <div
          v-for="(step, index) in steps"
          :key="step.value"
          class="dm-cust-step"
          :class="{ 'is-active': index === stepIndex, 'is-done': index < stepIndex }"
        >
          <span class="dm-cust-step__index">{{ index + 1 }}</span>
          <div class="dm-cust-step__text">
            <div class="dm-cust-step__title">{{ step.title }}</div>
            <div class="dm-cust-step__desc">{{ step.desc }}</div>
          </div>
        </div>
      </aside>

      <div class="dm-cust-content">
        <!-- 步骤：关联产品档案（主题允许多个档案时出现，可多选） -->
        <template v-if="current === 'product_profiles'">
          <h3 class="dm-cust-content__title">
            第{{ stepIndex + 1 }}步：关联产品档案<span class="dm-cust-content__optional"
              >（可多选）</span
            >
          </h3>
          <div v-if="productProfiles.length" class="dm-cust-profiles">
            <div
              v-for="profile in productProfiles"
              :key="profile.profileId"
              class="dm-cust-profile"
              :class="{ 'is-active': selectedProfiles.includes(profile.profileId) }"
              role="button"
              tabindex="0"
              :aria-pressed="selectedProfiles.includes(profile.profileId)"
              @click="toggleProfile(profile.profileId)"
              @keydown.enter.prevent="toggleProfile(profile.profileId)"
            >
              <span class="dm-cust-profile__icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fa8c16"
                  stroke-width="2"
                >
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
                  <path d="M4 7.5L12 12l8-4.5M12 12v9" />
                </svg>
              </span>
              <div class="dm-cust-profile__text">
                <div class="dm-cust-profile__name">{{ profile.name }}</div>
                <div v-if="profile.description" class="dm-cust-profile__desc">
                  {{ profile.description }}
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="该主题暂无关联产品档案" :image-size="64" />
        </template>

        <!-- 步骤：还原场景（发生时间、地点、现场情况、事情起因，契约 F12 全部必填） -->
        <template v-else-if="current === 'scene_background'">
          <h3 class="dm-cust-content__title">还原场景</h3>
          <el-form label-position="top" class="dm-cust-form">
            <el-form-item label="发生时间" required>
              <el-date-picker
                v-model="scene.time"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                format="YYYY-MM-DD HH:mm"
                placeholder="选择发生时间"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="发生地点" required>
              <el-input v-model="scene.location" maxlength="60" placeholder="如：客户会议室" />
            </el-form-item>
            <el-form-item label="现场情况" required>
              <el-input
                v-model="scene.situation"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit
                placeholder="如：客户刚结束生产例会，只有 15 分钟"
              />
            </el-form-item>
            <el-form-item label="事情起因" required>
              <el-input
                v-model="scene.cause"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="如：客户此前对数字化改造有过失败经历"
              />
            </el-form-item>
          </el-form>
        </template>

        <!-- 步骤：丰富角色（快捷类型 + 必填角色名 + 身份 + 性格多选 + 背景） -->
        <template v-else-if="current === 'actor'">
          <h3 class="dm-cust-content__title">丰富角色</h3>
          <el-form label-position="top" class="dm-cust-form">
            <el-form-item label="快捷角色类型">
              <div class="dm-cust-shortcuts">
                <button
                  v-for="preset in actorPresets"
                  :key="preset.type"
                  type="button"
                  class="dm-cust-shortcut"
                  :class="{ 'is-active': actor.type === preset.type }"
                  @click="applyPreset(preset)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </el-form-item>
            <el-form-item label="角色名" required>
              <el-input v-model="actor.name" maxlength="20" placeholder="如：王总" />
            </el-form-item>
            <el-form-item label="身份">
              <el-input v-model="actor.identity" maxlength="30" placeholder="如：生产总监" />
            </el-form-item>
            <el-form-item label="性格">
              <el-select
                v-model="actor.personalities"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="可多选，也可输入自定义性格"
                style="width: 100%"
              >
                <el-option v-for="trait in traits" :key="trait" :label="trait" :value="trait" />
              </el-select>
            </el-form-item>
            <el-form-item label="人物背景">
              <el-input
                v-model="actor.background"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit
                placeholder="如：务实、谨慎，对数据敏感，经历过一次失败的数字化改造"
              />
            </el-form-item>
          </el-form>
        </template>

        <!-- 步骤：选择难度（允许自定义难度时才出现） -->
        <template v-else-if="current === 'difficulty'">
          <h3 class="dm-cust-content__title">选择难度</h3>
          <div class="dm-cust-levels">
            <div
              v-for="level in levels"
              :key="level.value"
              class="dm-cust-level"
              :class="{ 'is-active': difficulty === level.value }"
              role="button"
              tabindex="0"
              :aria-pressed="difficulty === level.value"
              @click="difficulty = level.value"
              @keydown.enter.prevent="difficulty = level.value"
            >
              <div class="dm-cust-level__head">
                <span class="dm-cust-level__stars" :aria-label="`${level.value} 星`">
                  <el-icon v-for="star in 3" :key="star" :size="14">
                    <StarFilled :color="star <= level.value ? '#fa8c16' : '#d9d9d9'" />
                  </el-icon>
                </span>
                <span class="dm-cust-level__label">{{ level.label }}</span>
              </div>
              <div class="dm-cust-level__desc">{{ level.desc }}</div>
            </div>
          </div>
        </template>

        <!-- 步骤：预览确认（全部输入回显） -->
        <template v-else>
          <h3 class="dm-cust-content__title">预览确认</h3>
          <div class="dm-cust-preview">
            <p><strong>关联产品档案：</strong>{{ selectedProfileNames || '—' }}</p>
            <p><strong>发生时间：</strong>{{ scene.time || '—' }}</p>
            <p><strong>发生地点：</strong>{{ scene.location || '—' }}</p>
            <p><strong>现场情况：</strong>{{ scene.situation || '—' }}</p>
            <p><strong>事情起因：</strong>{{ scene.cause || '—' }}</p>
            <p>
              <strong>AI 角色：</strong>{{ actor.name || '—' }}
              <span v-if="actor.identity">（{{ actor.identity }}）</span>
              <span v-if="actor.personalities.length">· {{ actor.personalities.join('、') }}</span>
            </p>
            <p><strong>人物背景：</strong>{{ actor.background || '—' }}</p>
            <p><strong>难度：</strong>{{ difficultyLabel }}</p>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="dm-cust-actions">
        <span class="dm-cust-actions__progress"
          >第 {{ stepIndex + 1 }} / {{ steps.length }} 步</span
        >
        <div class="dm-cust-actions__right">
          <el-button class="dm-cust-btn dm-cust-btn--cancel" @click="visible = false"
            >取消</el-button
          >
          <el-button
            v-if="!isLastStep"
            class="dm-cust-btn dm-cust-btn--primary"
            type="primary"
            :disabled="!canNext"
            @click="nextStep"
          >
            下一步
          </el-button>
          <el-button
            v-else
            class="dm-cust-btn dm-cust-btn--primary"
            type="primary"
            :disabled="!canSubmit"
            @click="submit"
          >
            开始练习
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 自定义练习向导（F12）。
 * <p>
 * 步骤来自服务端 `preflight.requiredSteps`（契约 04 API-A01），设置关掉产品档案/自定义难度时
 * 对应步骤自然缺席，所以这里不写死五步；服务端不可用时退回到"按设置推导"的本地口径，
 * 只用于渲染步骤，不用于判定资格（资格仍由 preflight + createAttempt 决定）。
 * <p>
 * 取消不创建 attempt（本组件只在点"开始练习"时把参数交给父组件）。
 */
import { computed, reactive, ref, watch } from 'vue'
import { StarFilled } from '@element-plus/icons-vue'
import {
  preflightAttempt,
  type StudentScenarioProductProfile,
  type StudyMode,
} from '@/api/actStudent'

const props = defineProps<{
  modelValue: boolean
  themeId: string
  scenarioId: string
  scenarioName: string
  studyMode: StudyMode
  defaultDifficulty: number
  allowCustomDifficulty: boolean
  /** 服务端返回的关联产品档案（F09 详情里的同一份数据） */
  productProfiles: StudentScenarioProductProfile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { customConfigJson: string; difficulty: number }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const stepIndex = ref(0)
const difficulty = ref(props.defaultDifficulty || 2)

const scene = reactive({ time: '', location: '', situation: '', cause: '' })
const actor = reactive({
  type: '',
  name: '',
  identity: '',
  personalities: [] as string[],
  background: '',
})
const selectedProfiles = ref<string[]>([])

const traits = ['严谨', '强势', '务实', '犹豫', '急躁', '温和']
const actorPresets = [
  { type: 'manager', label: '企业中层管理者', identity: '部门经理' },
  { type: 'executive', label: '企业高管', identity: '总经理' },
  { type: 'frontline', label: '一线业务骨干', identity: '业务主管' },
]
const levels = [
  { value: 1, label: '简单', desc: '适合新手，角色配合度高' },
  { value: 2, label: '中等', desc: '有一定挑战，需要策略' },
  { value: 3, label: '困难', desc: '高难度，角色抵触强硬' },
]

/** 步骤定义：label/desc 与后端 requiredSteps 的机器码一一对应 */
const STEP_DEFS: Record<string, { title: string; desc: string }> = {
  product_profiles: { title: '关联产品档案', desc: '绑定场景可关联产品档案' },
  scene_background: { title: '还原场景', desc: '交代当时的真实情况' },
  actor: { title: '丰富角色', desc: '让 AI 演得更像' },
  difficulty: { title: '选择难度', desc: '确认挑战强度' },
  preview: { title: '预览确认', desc: '核对信息后开练' },
}

const requiredSteps = ref<string[]>([])
/**
 * 步骤渲染：服务端 requiredSteps 是顺序来源，但"关联产品档案"只在场景真有可关联档案时出现
 * （契约 F12「主题允许多个档案时出现」）。后端统一返回五步，所以这一步在前端按数据裁剪，
 * 否则会出现"整页空白 + 该主题暂无关联产品档案"的空步骤。
 */
const steps = computed(() =>
  requiredSteps.value
    .filter((step) => STEP_DEFS[step])
    .filter((step) => step !== 'product_profiles' || props.productProfiles.length > 0)
    .map((step) => ({ value: step, ...STEP_DEFS[step] })),
)
const current = computed(() => steps.value[stepIndex.value]?.value ?? 'preview')
const isLastStep = computed(() => stepIndex.value >= steps.value.length - 1)
const difficultyLabel = computed(
  () => levels.find((level) => level.value === difficulty.value)?.label ?? '中等',
)
const selectedProfileNames = computed(() =>
  props.productProfiles
    .filter((profile) => selectedProfiles.value.includes(profile.profileId))
    .map((profile) => profile.name)
    .join('、'),
)

/** 当前步骤的必填校验（契约 F12：场景四项必填、角色名必填） */
const canNext = computed(() => {
  if (current.value === 'scene_background') {
    return Boolean(
      scene.time.trim() && scene.location.trim() && scene.situation.trim() && scene.cause.trim(),
    )
  }
  if (current.value === 'actor') {
    return Boolean(actor.name.trim())
  }
  return true
})
const canSubmit = computed(() => canNext.value)

function toggleProfile(profileId: string) {
  selectedProfiles.value = selectedProfiles.value.includes(profileId)
    ? selectedProfiles.value.filter((id) => id !== profileId)
    : [...selectedProfiles.value, profileId]
}

function applyPreset(preset: { type: string; label: string; identity: string }) {
  actor.type = preset.type
  if (!actor.identity) {
    actor.identity = preset.identity
  }
}

function nextStep() {
  if (canNext.value && !isLastStep.value) {
    stepIndex.value++
  }
}

/** 按设置推导步骤（仅当服务端 requiredSteps 拿不到时兜底，保证向导不会空） */
function fallbackSteps() {
  const list: string[] = []
  if (props.productProfiles.length) {
    list.push('product_profiles')
  }
  list.push('scene_background', 'actor')
  if (props.allowCustomDifficulty) {
    list.push('difficulty')
  }
  list.push('preview')
  return list
}

async function loadSteps() {
  stepIndex.value = 0
  try {
    const preflight = await preflightAttempt({
      themeId: props.themeId,
      scenarioId: props.scenarioId,
      studyMode: props.studyMode,
      practiceType: 'custom',
    })
    requiredSteps.value = preflight.requiredSteps?.length
      ? preflight.requiredSteps
      : fallbackSteps()
  } catch {
    // 步骤列表只是渲染用；preflight 失败留给父组件的模式选择阶段统一提示
    requiredSteps.value = fallbackSteps()
  }
}

/**
 * 提交自定义配置：字段名对齐契约 08 §4.1 的 custom_config_json
 * （sceneBackground / actor{name,identity,personalities,background} / productProfileKeys）。
 */
function submit() {
  if (!canSubmit.value) {
    return
  }
  const customConfig = {
    sceneBackground: {
      time: scene.time,
      location: scene.location,
      situation: scene.situation,
      cause: scene.cause,
    },
    actor: {
      name: actor.name,
      identity: actor.identity,
      type: actor.type,
      personalities: actor.personalities,
      background: actor.background,
    },
    difficulty: difficulty.value,
    productProfileKeys: props.productProfiles
      .filter((profile) => selectedProfiles.value.includes(profile.profileId))
      .map((profile) => profile.profileKey)
      .filter((key): key is string => Boolean(key)),
  }
  emit('confirm', { customConfigJson: JSON.stringify(customConfig), difficulty: difficulty.value })
}

function reset() {
  stepIndex.value = 0
  difficulty.value = props.defaultDifficulty || 2
  scene.time = ''
  scene.location = ''
  scene.situation = ''
  scene.cause = ''
  actor.type = ''
  actor.name = ''
  actor.identity = ''
  actor.personalities = []
  actor.background = ''
  selectedProfiles.value = []
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reset()
      void loadSteps()
    }
  },
)
</script>

<style scoped lang="scss">
.dm-cust-head {
  width: 100%;
  padding: 20px 56px 0 24px;
  box-sizing: border-box;

  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__badge {
    flex: none;
    padding: 2px 8px;
    border-radius: 4px;
    color: #fa8c16;
    background: #fff7e6;
    font-size: 12px;
    line-height: 20px;
  }

  &__title {
    overflow: hidden;
    color: #262626;
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    margin: 8px 0 0;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-cust-body {
  display: flex;
  gap: 0;
  width: 100%;
  min-height: 100%;
}

.dm-cust-steps {
  flex: none;
  width: 160px;
  padding: 16px 8px 16px 24px;
  border-right: 1px solid #f0f0f0;
  box-sizing: border-box;
}

.dm-cust-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;

  &__index {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f0f0f0;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 22px;
  }

  &__title {
    color: #8c8c8c;
    font-size: 13px;
    font-weight: 500;
    line-height: 18px;
  }

  &__desc {
    margin-top: 2px;
    color: #bfbfbf;
    font-size: 11px;
    line-height: 16px;
  }

  &.is-active &__index,
  &.is-done &__index {
    background: #436bff;
    color: #ffffff;
  }

  &.is-active &__title,
  &.is-done &__title {
    color: #262626;
  }

  &.is-active &__desc {
    color: #8c8c8c;
  }
}

.dm-cust-content {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
  box-sizing: border-box;

  &__title {
    margin: 0 0 16px;
    color: #262626;
    font-size: 15px;
    font-weight: 700;
    line-height: 23px;
  }

  &__optional {
    color: #8c8c8c;
    font-size: 12px;
    font-weight: 400;
  }
}

.dm-cust-profiles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dm-cust-profile {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #e9e9e9;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &.is-active {
    border-color: #436bff;
    background: #f7f9ff;
  }

  &:focus-visible {
    outline: 2px solid #436bff;
    outline-offset: 2px;
  }

  &__name {
    color: #262626;
    font-size: 13px;
    font-weight: 500;
    line-height: 20px;
  }

  &__desc {
    margin-top: 4px;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 19px;
  }
}

.dm-cust-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    color: #595959;
    font-size: 13px;
  }
}

.dm-cust-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dm-cust-shortcut {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 14px;
  background: #ffffff;
  color: #595959;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;

  &.is-active {
    border-color: #436bff;
    color: #436bff;
  }

  &:focus-visible {
    outline: 2px solid #436bff;
    outline-offset: 2px;
  }
}

.dm-cust-levels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dm-cust-level {
  padding: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &.is-active {
    border-color: #436bff;
    background: #f7f9ff;
  }

  &:focus-visible {
    outline: 2px solid #436bff;
    outline-offset: 2px;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__stars {
    display: inline-flex;
    gap: 2px;
  }

  &__label {
    color: #262626;
    font-size: 14px;
    font-weight: 700;
    line-height: 21px;
  }

  &__desc {
    margin-top: 6px;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-cust-preview {
  p {
    margin: 0 0 8px;
    color: #595959;
    font-size: 13px;
    line-height: 21px;

    strong {
      color: #262626;
    }
  }
}

.dm-cust-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
  box-sizing: border-box;

  &__progress {
    color: #8c8c8c;
    font-size: 13px;
    line-height: 20px;
  }

  &__right {
    display: flex;
    gap: 12px;
  }
}

.dm-cust-btn {
  height: 36px;
  margin: 0;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;

  &--cancel {
    border-color: #d9d9d9;
    background: #ffffff;
    color: #595959;
  }

  &--primary {
    border-color: #436bff;
    background: #436bff;
    color: #ffffff;
  }
}
</style>

<!-- 同族弹窗共用非 scoped 的 .dm-check-dialog 根节点样式（teleport 到 body） -->
<style lang="scss">
.dm-check-dialog.dm-check-dialog--custom {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 760px;
  margin: calc((100vh - 760px) / 2) auto 0;
  padding: 0;
  border-radius: 16px;
  background: #ffffff;

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
    padding: 0;
    box-sizing: border-box;
  }
}
</style>
