<template>
  <el-dialog
    v-model="visible"
    width="480px"
    class="dm-check-dialog dm-check-dialog--mode"
    :close-on-click-modal="false"
  >
    <!--
      F10 模式选择弹窗（契约 01 §F10 / AC-06）：**三种练习方式的公共步骤**。
      原平台实测（visual/reference/drillmate-scenario-prepare.original.png）：随机练习点"开始随机练习"、
      自定义练习点"开始练习"后同样进入本弹窗，所以它是独立公共组件，不塞在 case 分支里。
    -->
    <template #header>
      <div class="dm-mode-head">
        <span class="dm-mode-head__clock" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <div class="dm-mode-head__title">{{ scenarioName || '练习准备' }}</div>
        <div class="dm-mode-head__sub">限时 {{ durationMinutes }} 分钟</div>
      </div>
    </template>

    <div class="dm-mode-body">
      <div
        v-for="option in options"
        :key="option.mode"
        class="dm-mode-card"
        :class="[
          `is-${option.mode === 1 ? 'training' : 'exam'}`,
          { 'is-active': selected === option.mode, 'is-disabled': !option.enabled },
        ]"
        role="button"
        :tabindex="option.enabled ? 0 : -1"
        :aria-disabled="!option.enabled"
        :title="option.enabled ? '' : option.reason || ''"
        @click="select(option)"
        @keydown.enter.prevent="select(option)"
      >
        <div class="dm-mode-card__head">
          <span class="dm-mode-card__title">{{ option.title }}</span>
          <svg
            v-if="selected === option.mode"
            class="dm-mode-card__check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="2.4"
            aria-hidden="true"
          >
            <polyline points="5 13 10 18 19 7" />
          </svg>
        </div>
        <template v-if="option.enabled">
          <div v-for="row in option.rows" :key="row.text" class="dm-mode-card__row">
            <span class="dm-mode-card__icon" :class="`is-${row.tone}`" aria-hidden="true">
              <svg
                v-if="row.tone === 'ok'"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="7 12 11 16 17 9" />
              </svg>
              <svg
                v-else-if="row.tone === 'danger'"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 8l8 8M16 8l-8 8" />
              </svg>
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <div class="dm-mode-card__text">
              <div class="dm-mode-card__label">{{ row.text }}</div>
              <div v-if="row.desc" class="dm-mode-card__desc">{{ row.desc }}</div>
            </div>
          </div>
        </template>
        <!-- 不可用时只展示服务端的阻断原因，不再罗列该模式的说明行，避免误导成"可选" -->
        <div v-else class="dm-mode-card__reason">{{ option.reason }}</div>
      </div>
      <p v-if="!options.length" class="dm-mode-empty">当前场景暂不可开始练习，请稍后重试。</p>
    </div>

    <template #footer>
      <div class="dm-mode-actions">
        <el-button
          v-if="trainingEnabled"
          class="dm-mode-btn dm-mode-btn--training"
          type="primary"
          :loading="submitting && selected === 1"
          :disabled="!trainingEnabled || submitting"
          @click="emit('select', 1)"
        >
          开始训练
        </el-button>
        <el-button
          v-if="examEnabled"
          class="dm-mode-btn dm-mode-btn--exam"
          :loading="submitting && selected === 2"
          :disabled="submitting"
          @click="emit('select', 2)"
        >
          开始考核
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * F10 模式选择弹窗（公共组件）。
 * <p>
 * 契约 01 §F10：点击"开始练习"后执行资格检查，再打开确认弹窗，展示限时、训练/考核说明、
 * AI 辅助与成绩是否计入；混合模式同时启用训练和考核时，先选择本次要进入的模式。
 * 三个练习方式（案例 / 随机 / 自定义）都复用本组件，因此它不读取 practiceType。
 * <p>
 * 可用性判定不在前端推导：调用方把 `trainingAction/examAction`（契约 API-S05 的
 * `enabled + 中文 reason`）直接透传，组件只负责展示与选择，避免两处口径漂移。
 */
import { computed, ref, watch } from 'vue'
import type { StudyMode } from '@/api/actStudent'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    scenarioName: string
    maxDurationSeconds: number | null
    trainingEnabled: boolean
    trainingReason?: string | null
    examEnabled: boolean
    examReason?: string | null
    /** 入口带入的默认模式（详情页"考核"链接直接进考核），不可用时自动回落 */
    defaultMode?: StudyMode
    submitting?: boolean
  }>(),
  { trainingReason: null, examReason: null, defaultMode: 1, submitting: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 用户确认进入某个模式；由调用方执行 preflight + createAttempt（本组件不碰业务提交） */
  select: [mode: StudyMode]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

/** 默认选中：入口指定的模式（考核入口直接选考核），该模式不可用时回落到另一个可用的 */
const selected = ref<StudyMode>(1)
watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    const preferred = props.defaultMode
    const preferredEnabled = preferred === 2 ? props.examEnabled : props.trainingEnabled
    if (preferredEnabled) {
      selected.value = preferred
    } else {
      selected.value = props.trainingEnabled ? 1 : 2
    }
  },
  // immediate：父级先置 true 再挂载本组件（含 HMR 重挂）时没有 false→true 跳变，
  // 否则默认选中态会停在上一次的值
  { immediate: true },
)

const durationMinutes = computed(() => Math.round((props.maxDurationSeconds || 900) / 60))

const options = computed(() =>
  [
    {
      mode: 1 as StudyMode,
      title: '日常训练',
      enabled: props.trainingEnabled,
      reason: props.trainingReason,
      rows: [
        {
          tone: 'ok',
          text: '教练点评',
          desc: '对话中 AI 实时分析你的回答，在表现突出、应对欠佳或触碰禁忌等关键时刻即时表扬或纠偏',
        },
        { tone: 'danger', text: '不计入成绩，可随时退出', desc: '' },
      ],
    },
    {
      mode: 2 as StudyMode,
      title: '通关考核',
      enabled: props.examEnabled,
      reason: props.examReason,
      rows: [
        { tone: 'danger', text: '考核全程无 AI 辅助', desc: '' },
        { tone: 'warn', text: '成绩计入记录', desc: '' },
      ],
    },
  ].filter((option) => option.enabled || option.reason),
)

function select(option: { mode: StudyMode; enabled: boolean }) {
  if (!option.enabled) {
    return
  }
  selected.value = option.mode
}
</script>

<style scoped lang="scss">
.dm-mode-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px 0 0;

  &__clock {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--color-accent-wash);
  }

  &__title {
    margin-top: 14px;
    color: var(--color-ink);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
  }

  &__sub {
    margin-top: 6px;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 20px;
  }
}

.dm-mode-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 20px 24px 8px;
  box-sizing: border-box;
}

.dm-mode-card {
  position: relative;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  background: var(--color-paper);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  // 未选中时保持白底：原平台只有选中的考核卡带浅暖底，未被选中的训练卡为白底
  &.is-active.is-training {
    border-color: var(--color-accent);
    background: var(--color-paper);
  }

  &.is-active.is-exam {
    border-color: var(--color-warning);
    background: color-mix(in oklab, var(--color-warning) 8%, var(--color-paper));
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    color: var(--color-ink);
    font-size: 14px;
    font-weight: 700;
    line-height: 21px;
  }

  &__row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 10px;
  }

  &__icon {
    display: inline-flex;
    flex: none;
    margin-top: 2px;

    &.is-ok {
      color: var(--color-success);
    }

    &.is-danger {
      color: var(--color-error);
    }

    &.is-warn {
      color: var(--color-warning);
    }
  }

  &__label {
    color: var(--color-ink);
    font-size: 13px;
    line-height: 20px;
  }

  &__desc {
    margin-top: 2px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 20px;
  }

  &__reason {
    margin-top: 10px;
    color: var(--color-warning);
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-mode-empty {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
}

.dm-mode-actions {
  display: flex;
  gap: 16px;
  width: 100%;
  padding: 0 24px 24px;
  box-sizing: border-box;
}

.dm-mode-btn {
  flex: 1;
  height: 40px;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;

  &--training {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
  }

  &--exam {
    border-color: var(--color-warning);
    background: var(--color-warning);
    color: var(--color-paper);
  }
}
</style>

<!--
  弹窗根节点由 Element Plus teleport 到 body，scoped 选择器匹配不到它；
  这里沿用 ScenarioPrepareDialog 的 `.dm-check-dialog` 非 scoped 块约定（同一族弹窗共享尺寸/圆角）。
-->
<style lang="scss">
.dm-check-dialog.dm-check-dialog--mode {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 571px;
  margin: calc((100vh - 571px) / 2) auto 0;
  padding: 0;
  border-radius: 16px;
  background: var(--color-paper);

  .el-dialog__header {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    height: 142px;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
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
    padding: 0;
    box-sizing: border-box;
  }
}
</style>
