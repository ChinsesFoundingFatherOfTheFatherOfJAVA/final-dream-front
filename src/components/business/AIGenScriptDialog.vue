<template>
  <!-- SG-01 三步向导全屏弹窗：淡紫底、左右分栏（左表单40%右预览60%）、顶部步骤条 -->
  <div class="wizard-overlay">
    <div class="wizard">
      <div class="wizard-header">
        <span class="wizard-title">AI生成话术</span>
        <div class="steps">
          <template v-for="(label, i) in stepLabels" :key="i">
            <div class="step" :class="stepClass(i)">
              <span class="step-circle">
                <span v-if="step > i">✓</span>
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="step-label">{{ label }}</span>
            </div>
            <span v-if="i < stepLabels.length - 1" class="step-arrow">›</span>
          </template>
        </div>
        <span class="close-btn" :class="{ disabled: generating }" @click="handleClose">×</span>
      </div>

      <div class="wizard-body">
        <!-- 第一步：基本信息（左表单+右场景表单） -->
        <div v-if="step === 1" class="step-pane">
          <div class="pane-left">
            <Step1BasicInfo
              ref="step1Ref"
              v-model:description="description"
              v-model:first-speaker="firstSpeaker"
              v-model:materials="materials"
              :generating="generating"
              :has-scene="!!scene"
              @generate="handleGenScene"
            />
          </div>
          <div class="pane-right">
            <SceneForm
              v-if="scene"
              v-model:scene="scene"
              :generating="generating"
              @next="gotoStep(2)"
            />
            <div v-else-if="sceneFailed" class="empty-state failed">
              <div class="failed-icon">⚠</div>
              <p class="failed-title">生成失败</p>
              <p class="failed-sub">这里信息量太大，再给我点时间准备下嘛</p>
              <button class="btn-outline" @click="handleGenScene">再试一次</button>
            </div>
            <div v-else class="empty-state">
              <div class="quill-icon">✒</div>
              <p>请在左侧填写基本信息，AI可一键生成对话场景~</p>
            </div>
          </div>
        </div>

        <!-- 第二步：对话大纲 -->
        <div v-else-if="step === 2" class="step-pane">
          <div class="pane-full">
            <Step2Outline
              v-model:outlines="outlines"
              :generating="generating"
              @back="gotoStep(1)"
              @generate="handleGenScript"
            />
          </div>
        </div>

        <!-- 第三步：话术预览 -->
        <div v-else class="step-pane">
          <div class="pane-full">
            <Step3Preview
              :rounds="rounds"
              :narration="narration"
              :language="language"
              :first-speaker="firstSpeaker"
              :session-id="sessionId"
              :generating="generating"
              @back="gotoStep(2)"
              @imported="handleImported"
            />
          </div>
        </div>
      </div>

      <!-- SG-06 生成中全屏遮罩：进度模拟（预估时长线性至90%，返回后跳100%） -->
      <div v-if="generating" class="gen-mask">
        <div class="gen-icon">Ai</div>
        <p class="gen-text">AI正在生成中... {{ progress }}%</p>
        <p class="gen-warning">生成中请勿关闭页面，否则会中断！</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import Step1BasicInfo from './aiGen/Step1BasicInfo.vue'
import SceneForm from './aiGen/SceneForm.vue'
import Step2Outline from './aiGen/Step2Outline.vue'
import Step3Preview from './aiGen/Step3Preview.vue'
import { toast } from '@/utils/toast'
import {
  genScene,
  genOutline,
  genScriptV2,
  sha256OfScene,
  type MaterialItem,
  type OutlineItem,
  type RoundItem,
  type SceneData
} from '@/api/aiGen'

/**
 * AI生成话术三步向导（v2.0 SG-01~08）：
 * 1 基本信息(素材+开启者) → 场景表单（可编辑）→ 2 大纲（增删移改）→ 3 话术预览（勾选导入）。
 * sessionId 三步共用；sceneHash=场景 SHA-256 供后端一致性校验。
 */
const emit = defineEmits<{ close: []; imported: [nodes: any[], edges: any[]] }>()

const stepLabels = ['填写基本信息', '生成对话大纲', '生成话术']
const step = ref(1)
const sessionId = crypto.randomUUID()

const description = ref('')
const firstSpeaker = ref<'student' | 'trainer'>('trainer')
const materials = ref<MaterialItem[]>([])
const scene = ref<SceneData | null>(null)
const sceneHash = ref('')
const sceneFailed = ref(false)
const outlines = ref<OutlineItem[]>([])
const rounds = ref<RoundItem[]>([])
const narration = ref('')
const language = ref<'zh' | 'en'>('zh')

const step1Ref = ref<InstanceType<typeof Step1BasicInfo>>()

const generating = ref(false)
const progress = ref(0)
let progressTimer: number | undefined

const stepClass = (i: number) => (step.value > i ? 'done' : step.value === i ? 'active' : 'todo')

/** SG-06 进度模拟：预估时长=轮数×8s，每秒线性递增压 90% 封顶；展示取整（小数无意义）。 */
const startProgress = (estimatedSeconds: number) => {
  progress.value = 0
  let raw = 0
  const perTick = 100 / (estimatedSeconds * 1.1)
  progressTimer = window.setInterval(() => {
    raw = Math.min(90, raw + perTick)
    progress.value = Math.round(raw)
  }, 1000)
}

const stopProgress = () => {
  if (progressTimer) window.clearInterval(progressTimer)
  progressTimer = undefined
  progress.value = 100
}

onBeforeUnmount(stopProgress)

/** 工作流①场景生成（重新生成复用同入口）。 */
const handleGenScene = async () => {
  if (generating.value) return
  if (!description.value.trim()) {
    toast.error('请描述想要生成的话术内容')
    return
  }
  generating.value = true
  sceneFailed.value = false
  startProgress(10)
  try {
    const res: any = await genScene({
      sessionId,
      description: description.value,
      firstSpeaker: firstSpeaker.value,
      materials: materials.value
    })
    scene.value = {
      scene: res.scene || '',
      trainerRole: res.trainerRole || '',
      trainerProfile: res.trainerProfile || '',
      studentRole: res.studentRole || '',
      goal: res.goal || ''
    }
    sceneHash.value = await sha256OfScene(scene.value)
    stopProgress()
  } catch (e: any) {
    sceneFailed.value = true
    stopProgress()
    toast.error(e?.message || '生成失败')
  } finally {
    generating.value = false
    stopProgress()
  }
}

/** 工作流②大纲生成。 */
const handleGenOutline = async () => {
  generating.value = true
  startProgress(15)
  try {
    const res: any = await genOutline({
      sessionId,
      sceneHash: sceneHash.value,
      scene: scene.value!,
      materials: materials.value
    })
    outlines.value = (res.outlines || []).map((o: any) => ({
      name: o.name || '',
      assessmentPoints: o.assessmentPoints || '',
      strategy: o.strategy || ''
    }))
    stopProgress()
  } finally {
    generating.value = false
    stopProgress()
  }
}

const gotoStep = (target: number) => {
  if (generating.value) return
  // 首次进入第二步：自动生成大纲；返回第一步不重置已生成内容
  if (target === 2 && !outlines.value.length && scene.value) {
    step.value = target
    handleGenOutline()
    return
  }
  step.value = target
}

/** 工作流③话术生成（普通话/英语由 Step2 下拉选择）。 */
const handleGenScript = async (lang: 'zh' | 'en') => {
  language.value = lang
  generating.value = true
  startProgress(outlines.value.length * 8)
  try {
    const res: any = await genScriptV2({
      sessionId,
      sceneHash: sceneHash.value,
      scene: scene.value!,
      outlines: outlines.value,
      language: lang,
      firstSpeaker: firstSpeaker.value
    })
    rounds.value = res.rounds || []
    narration.value = res.narration || ''
    stopProgress()
    step.value = 3
  } catch (e: any) {
    toast.error(e?.message || '生成失败')
  } finally {
    generating.value = false
    stopProgress()
  }
}

/** 导入完成：透传 nodes/edges 给流程设计器（沿用旧导入链路）。 */
const handleImported = (nodes: any[], edges: any[]) => {
  emit('imported', nodes, edges)
}

const handleClose = () => {
  if (generating.value) return // SG-06：生成中 × 禁用
  emit('close')
}
</script>

<style scoped lang="scss">
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: #e8e6f5; // 截图：弹窗淡紫底
}

.wizard {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.wizard-header {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  gap: 24px;

  .wizard-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    min-width: 100px;
  }

  .steps {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .close-btn {
    font-size: 24px;
    color: #999;
    cursor: pointer;
    line-height: 1;

    &:hover { color: #333; }
    &.disabled { opacity: 0.4; cursor: not-allowed; }
  }
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;

  .step-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    border: 1px solid #d9d9d9;
    color: #999;
    background: #fff;
  }

  .step-label { font-size: 13px; color: #999; }

  &.active .step-circle {
    background: #1e6fff;
    border-color: #1e6fff;
    color: #fff;
  }
  &.active .step-label { color: #1e6fff; font-weight: 500; }

  &.done .step-circle {
    background: #1e6fff;
    border-color: #1e6fff;
    color: #fff;
  }
  &.done .step-label { color: #333; }
}

.step-arrow { color: #c0c4cc; font-size: 14px; }

.wizard-body {
  flex: 1;
  min-height: 0;
  padding: 0 24px 24px;
}

.step-pane {
  height: 100%;
  display: flex;
  gap: 16px;

  .pane-left {
    width: 40%;
    min-width: 380px;
    background: #fff;
    border-radius: 10px;
    overflow-y: auto;
    padding: 20px;
  }

  .pane-right {
    flex: 1;
    background: #fff;
    border-radius: 10px;
    overflow-y: auto;
    padding: 20px;
  }

  .pane-full {
    flex: 1;
    background: #fff;
    border-radius: 10px;
    overflow-y: auto;
    padding: 20px;
  }
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
  gap: 12px;

  .quill-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #eef3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #7aa7ff;
  }

  &.failed {
    .failed-icon { font-size: 40px; color: #faad14; }
    .failed-title { font-size: 15px; font-weight: 600; color: #333; margin: 0; }
    .failed-sub { font-size: 13px; color: #999; margin: 0 0 8px; }
  }
}

.btn-outline {
  padding: 7px 20px;
  border: 1px solid #6b5ce7;
  border-radius: 6px;
  background: #fff;
  color: #6b5ce7;
  font-size: 14px;
  cursor: pointer;

  &:hover { opacity: 0.85; }
}

// SG-06 生成中遮罩
.gen-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 10px;
  z-index: 10;

  .gen-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #ff9a56, #6b5ce7);
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gen-text { font-size: 16px; color: #333; font-weight: 500; margin: 0; }
  .gen-warning { font-size: 13px; color: #f5222d; margin: 0; }
}
</style>
