<template>
  <el-dialog
    v-model="visible"
    width="800px"
    class="dm-check-dialog dm-check-dialog--random"
    :close-on-click-modal="false"
  >
    <!--
      F11 随机练习（契约 01 §F11 / 02 §5.4）。
      原平台实测（页面素材/场景准备-随机练习弹窗.png）：800px 弹窗，头部左侧"随机练习"标签+场景名，
      副标题"系统基于当前场景单元随机生成具体情境"，三档难度卡（简单/中等/困难，含说明与荣誉分），
      底部"取消"/"开始随机练习"。难度只影响 AI 角色抵触强度，不改变场景范围。
    -->
    <template #header>
      <div class="dm-rand-head">
        <div class="dm-rand-head__row">
          <span class="dm-rand-head__badge">随机练习</span>
          <span class="dm-rand-head__title">{{ scenarioName }}</span>
        </div>
        <p class="dm-rand-head__sub">系统基于当前场景单元随机生成具体情境</p>
      </div>
    </template>

    <div class="dm-rand-body">
      <h3 class="dm-rand-body__title">选择难度等级</h3>
      <p class="dm-rand-body__hint">难度只影响 AI 角色的抵触强度，不改变场景范围。</p>

      <div v-if="allowCustomDifficulty" class="dm-rand-cards">
        <div
          v-for="level in levels"
          :key="level.value"
          class="dm-rand-card"
          :class="{ 'is-active': selected === level.value }"
          role="button"
          tabindex="0"
          :aria-pressed="selected === level.value"
          @click="selected = level.value"
          @keydown.enter.prevent="selected = level.value"
        >
          <div class="dm-rand-card__head">
            <span class="dm-rand-card__stars" aria-hidden="true">
              <svg
                v-for="star in 3"
                :key="star"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                :fill="star <= level.value ? 'var(--color-warning)' : 'var(--color-rule-2)'"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </span>
            <span class="dm-rand-card__label">{{ level.label }}</span>
            <svg
              v-if="selected === level.value"
              class="dm-rand-card__check"
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
          <p class="dm-rand-card__desc">{{ level.desc }}</p>
          <p class="dm-rand-card__honor">通过 +{{ level.honor }} 荣誉分</p>
        </div>
      </div>

      <!-- 主题锁定难度时只给说明（契约 F11 第三条），不允许选档 -->
      <div v-else class="dm-rand-locked">
        <span class="dm-rand-card__label">{{ currentLevelLabel }}</span>
        <p class="dm-rand-card__desc">
          该主题已锁定难度（{{ currentLevelLabel }}），难度由管理员统一设置，学员端不可调整。
        </p>
      </div>
    </div>

    <template #footer>
      <div class="dm-rand-actions">
        <el-button class="dm-rand-btn dm-rand-btn--cancel" @click="visible = false">取消</el-button>
        <el-button class="dm-rand-btn dm-rand-btn--primary" type="primary" @click="confirm">
          开始随机练习
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 随机练习难度选择（F11）。
 * <p>
 * 只在主题允许自定义难度时渲染三档卡；主题锁定难度时按契约只给说明。
 * 选档结果回到 F09 弹窗，由它再打开 F10 模式选择——本组件不发请求、不建 attempt。
 */
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  scenarioName: string
  maxDurationSeconds: number | null
  /** 主题难度（1/2/3），作为默认选中档与锁定时的说明 */
  difficulty: number
  allowCustomDifficulty: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { difficulty: number }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const levels = [
  { value: 1, label: '简单', desc: '适合新手，角色配合度高', honor: 30 },
  { value: 2, label: '中等', desc: '有一定挑战，需要策略', honor: 50 },
  { value: 3, label: '困难', desc: '高难度，角色抵触强硬', honor: 80 },
]

const selected = ref(props.difficulty || 2)
const currentLevelLabel = computed(
  () => levels.find((level) => level.value === (props.difficulty || 2))?.label ?? '中等',
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // 每次打开都回到主题默认档：避免上一次的选择被误当成这次的决定
      selected.value = props.difficulty || 2
    }
  },
)

function confirm() {
  emit('confirm', { difficulty: selected.value })
}
</script>

<style scoped lang="scss">
.dm-rand-head {
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
    color: var(--color-accent);
    background: var(--color-accent-wash);
    font-size: 12px;
    line-height: 20px;
  }

  &__title {
    overflow: hidden;
    color: var(--color-ink);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    margin: 8px 0 0;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-rand-body {
  width: 100%;
  padding: 20px 24px 24px;
  box-sizing: border-box;

  &__title {
    margin: 0;
    color: var(--color-ink);
    font-size: 14px;
    font-weight: 700;
    line-height: 21px;
  }

  &__hint {
    margin: 6px 0 16px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-rand-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.dm-rand-card {
  padding: 14px 16px;
  border: 1px solid var(--color-rule-2);
  border-radius: 8px;
  background: var(--color-paper);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &.is-active {
    border-color: var(--color-accent);
    background: var(--color-paper-2);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__stars {
    display: inline-flex;
    gap: 3px;
  }

  &__label {
    color: var(--color-ink);
    font-size: 14px;
    font-weight: 700;
    line-height: 21px;
  }

  &__check {
    margin-left: auto;
  }

  &__desc {
    margin: 10px 0 0;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 20px;
  }

  &__honor {
    margin: 8px 0 0;
    color: var(--color-warning);
    font-size: 12px;
    line-height: 20px;
  }
}

.dm-rand-locked {
  padding: 16px;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  background: var(--color-paper-2);
}

.dm-rand-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  padding: 0 24px 24px;
  box-sizing: border-box;
}

.dm-rand-btn {
  height: 36px;
  margin: 0;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;

  &--cancel {
    border-color: var(--color-rule-2);
    background: var(--color-paper);
    color: var(--color-muted);
  }

  &--primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper);
  }
}
</style>

<!-- 同族弹窗共用非 scoped 的 .dm-check-dialog 根节点样式（teleport 到 body，scoped 匹配不到） -->
<style lang="scss">
.dm-check-dialog.dm-check-dialog--random {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 624px;
  margin: calc((100vh - 624px) / 2) auto 0;
  padding: 0;
  border-radius: 16px;
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
    padding: 0;
    box-sizing: border-box;
  }
}
</style>
