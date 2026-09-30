<template>
  <div class="setting-page">
    <SettingSection
      title="学分策略设置"
      :expanded="isExpanded('score')"
      :loading="savingKey === 'score'"
      @toggle="toggleSection('score')"
      @apply="applyScore"
    >
      <div class="score-rules">
        <div class="score-rule">
          <div class="rule-formula">
            <span class="rule-label">视频/音频：</span>
            <span>每</span>
            <input v-model.number="form.scoreConf.videoAudio.standardMinutes" class="score-num" type="number" min="1" max="1440" />
            <span>分钟计</span>
            <input v-model.number="form.scoreConf.videoAudio.score" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分（视频和音频上传时会自动获取时长）</span>
          </div>
          <div class="rule-scope">
            <label>
              <input v-model="form.scoreConf.videoAudio.applyToAll" type="radio" :value="false" />
              应用于新的视频/音频
            </label>
            <label>
              <input v-model="form.scoreConf.videoAudio.applyToAll" type="radio" :value="true" />
              应用于所有跟随学分策略设置的视频/音频
            </label>
          </div>
        </div>

        <div class="score-rule">
          <div class="rule-formula">
            <span class="rule-label">文档：</span>
            <span>每</span>
            <input v-model.number="form.scoreConf.document.pagesPerScore" class="score-num" type="number" min="1" max="1440" />
            <span>页，计</span>
            <input v-model.number="form.scoreConf.document.score" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分</span>
            <span>标准学习时长</span>
            <input v-model.number="form.scoreConf.document.standardMinutes" class="score-num" type="number" min="1" max="1440" />
            <span>分钟</span>
            <span>每个文档最高学分不超过</span>
            <input v-model.number="form.scoreConf.document.maxScore" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分</span>
          </div>
          <div class="rule-scope">
            <label>
              <input v-model="form.scoreConf.document.applyToAll" type="radio" :value="false" />
              应用于新的文档
            </label>
            <label>
              <input v-model="form.scoreConf.document.applyToAll" type="radio" :value="true" />
              应用于所有跟随学分策略设置的文档
            </label>
          </div>
        </div>

        <div class="score-rule">
          <div class="rule-formula">
            <span class="rule-label">微课：</span>
            <span>每</span>
            <input v-model.number="form.scoreConf.microcourse.standardMinutes" class="score-num" type="number" min="1" max="1440" />
            <span>分钟计</span>
            <input v-model.number="form.scoreConf.microcourse.score" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分，每个微课最高学分不超过</span>
            <input v-model.number="form.scoreConf.microcourse.maxScore" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分</span>
          </div>
          <div class="rule-scope">
            <label>
              <input v-model="form.scoreConf.microcourse.applyToAll" type="radio" :value="false" />
              应用于新的微课
            </label>
            <label>
              <input v-model="form.scoreConf.microcourse.applyToAll" type="radio" :value="true" />
              应用于所有跟随学分策略设置的微课
            </label>
          </div>
        </div>

        <div class="score-rule">
          <div class="rule-formula">
            <span class="rule-label">Scorm：</span>
            <span>每</span>
            <input v-model.number="form.scoreConf.scorm.standardMinutes" class="score-num" type="number" min="1" max="1440" />
            <span>分钟计</span>
            <input v-model.number="form.scoreConf.scorm.score" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分</span>
          </div>
          <div class="rule-scope">
            <label>
              <input v-model="form.scoreConf.scorm.applyToAll" type="radio" :value="false" />
              应用于新的 Scorm
            </label>
            <label>
              <input v-model="form.scoreConf.scorm.applyToAll" type="radio" :value="true" />
              应用于所有跟随学分策略设置的 Scorm
            </label>
          </div>
        </div>

        <div class="score-rule">
          <div class="rule-formula">
            <span class="rule-label">HTML：</span>
            <span>每</span>
            <input v-model.number="form.scoreConf.html.standardMinutes" class="score-num" type="number" min="1" max="1440" />
            <span>分钟计</span>
            <input v-model.number="form.scoreConf.html.score" class="score-num" type="number" min="0.1" step="0.1" />
            <span>个学分</span>
          </div>
          <div class="rule-scope">
            <label>
              <input v-model="form.scoreConf.html.applyToAll" type="radio" :value="false" />
              应用于新的 HTML
            </label>
            <label>
              <input v-model="form.scoreConf.html.applyToAll" type="radio" :value="true" />
              应用于所有跟随学分策略设置的 HTML
            </label>
          </div>
        </div>

        <div class="course-summary">
          <span class="course-label">课程：</span>
          <span>课程学分为课件学分相加</span>
        </div>

        <div class="reward-settings">
          <div class="reward-label">学分发放时间</div>
          <div class="reward-options">
            <label>
              <input v-model.number="form.scoreConf.rewardType" type="radio" :value="0" />
              每学完一个课件任务就会获得课件的学分
            </label>
            <label class="reward-secondary">
              <input v-model.number="form.scoreConf.rewardType" type="radio" :value="1" />
              学完课程时发放所有课件的学分
            </label>
          </div>
        </div>

        <div class="score-notes">
          <p>注：</p>
          <p>1. 如学员已学过这个课件并获得课件的学分，那么在课程包中学习该课件不会重复获得该课件的学分。</p>
          <p>2. 修改后已经学习课程的学员不受影响，仅针对新课程、或未学习过课程的学员生效。</p>
        </div>
      </div>
    </SettingSection>

    <SettingSection
      title="防挂机设置"
      :expanded="isExpanded('cheat')"
      :loading="savingKey === 'cheat'"
      @toggle="toggleSection('cheat')"
      @apply="applyCheat"
    >
      <div class="switch-row">
        <label class="switch-line">
          <input v-model="form.cheatConf.antiIdleEnabled" type="checkbox" />
          <span class="switch-control"></span>
          <span>开启防挂机功能</span>
        </label>
        <button type="button" class="text-link" @click="specialVisible = true">特殊设置</button>
      </div>

      <p class="inline-note">
        系统检测到学员疑似挂机后，会弹出是否在线的弹框，让学员确认是否在学习，可配合人脸识别功能使用，开启人脸识别后，学员触发防挂机时，需要进行人脸识别。
      </p>

      <label class="mode-line">
        <input v-model.number="form.cheatConf.mode" type="radio" :value="1" :disabled="!form.cheatConf.antiIdleEnabled" />
        <span>学员在学习过程时，系统在</span>
        <input v-model.number="form.cheatConf.checkMinutes" type="number" min="1" max="60" :disabled="!form.cheatConf.antiIdleEnabled" />
        <span>分钟确认学员是否在线，如不在线则停止播放</span>
      </label>

      <label class="mode-line">
        <input v-model.number="form.cheatConf.mode" type="radio" :value="2" :disabled="!form.cheatConf.antiIdleEnabled" />
        <span>学员在学习课程时，系统在</span>
        <input v-model.number="form.cheatConf.checkMinutes" type="number" min="1" max="60" :disabled="!form.cheatConf.antiIdleEnabled" />
        <span>分钟确认学员是否在线，学员需要在</span>
        <input
          v-model.number="form.cheatConf.confirmSeconds"
          type="number"
          min="30"
          max="600"
          :disabled="!form.cheatConf.antiIdleEnabled || form.cheatConf.mode !== 2"
        />
        <span>秒内点击确认，如未确认本次学习无效（已学完的课程不存在回退学习进度，触发防挂机时系统会暂停播放）</span>
      </label>

      <label class="prompt-field">
        <span>确认学员是否在线提示语</span>
        <textarea
          v-model="form.cheatConf.promptText"
          maxlength="250"
          rows="3"
          :disabled="!form.cheatConf.antiIdleEnabled"
          placeholder="请输入提示语"
        ></textarea>
        <small>{{ form.cheatConf.promptText.length }}/250</small>
      </label>

      <div class="switch-block">
        <label class="switch-line">
          <input v-model="form.cheatConf.multiCourseEnabled" type="checkbox" />
          <span class="switch-control"></span>
          <span>开启防多课程同时学习功能</span>
        </label>
        <p>同一时间只对一个课程记录学习进度及学分，防止学习者同时打开多个课程学习而获得学习进度及学分。</p>
      </div>

      <div class="switch-block">
        <label class="switch-line">
          <input v-model="form.cheatConf.forbidDragEnabled" type="checkbox" />
          <span class="switch-control"></span>
          <span>禁止拖拽学习</span>
        </label>
        <p>1. 仅对视频、音频生效；</p>
        <p>2. 开启后，学员可以在已经看过的内容区拖拽进度条（举例：视频有 60 分钟，学员看到了 40 分钟，那么可以在 1-40 分钟间拖拽进度）。</p>
      </div>
    </SettingSection>

    <SettingSection
      title="课程播放设置"
      :expanded="isExpanded('play')"
      :loading="savingKey === 'play'"
      @toggle="toggleSection('play')"
      @apply="applyPlay"
    >
      <div class="switch-row">
        <label class="switch-line">
          <input v-model="form.playConf.speedEnabled" type="checkbox" />
          <span class="switch-control"></span>
          <span>开启倍速播放功能</span>
        </label>
      </div>

      <div class="play-scope">
        <strong>使用范围</strong>
        <label>
          <input v-model.number="form.playConf.speedScope" type="radio" :value="1" />
          所有课件、课程都支持倍速播放
        </label>
        <label>
          <input v-model.number="form.playConf.speedScope" type="radio" :value="2" />
          跟随课件或课程各自的功能设置
        </label>
      </div>
    </SettingSection>

    <SettingSection
      title="人脸识别设置"
      :expanded="isExpanded('face')"
      :loading="faceSaving"
      :show-apply="false"
      @toggle="toggleSection('face')"
    >
      <label class="switch-line">
        <input v-model="form.faceConf.enabled" type="checkbox" :disabled="faceSaving" @change="applyFace" />
        <span class="switch-control"></span>
        <span>开启人脸识别功能（仅 App 端支持人脸识别）</span>
      </label>
    </SettingSection>

    <SpecialSettingDrawer
      :visible="specialVisible"
      :audio-background-play="form.cheatConf.audioBackgroundPlay"
      :saving="specialSaving"
      @close="specialVisible = false"
      @save="saveSpecial"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import SettingSection from './components/SettingSection.vue'
import SpecialSettingDrawer from './components/SpecialSettingDrawer.vue'
import {
  getKngSetting,
  saveKngCheatConf,
  saveKngFaceConf,
  saveKngPlayConf,
  saveKngScoreConf,
  saveKngSpecialSetting,
  type KngSetting
} from '@/api/kng'
import { toast } from '@/utils/toast'

type SectionKey = 'score' | 'cheat' | 'play' | 'face'

const createDefaultSetting = (): KngSetting => ({
  scoreConf: {
    videoAudio: { standardMinutes: 10, score: 1, applyToAll: false },
    document: { pagesPerScore: 1, score: 0.1, standardMinutes: 1, maxScore: 6, applyToAll: false },
    microcourse: { standardMinutes: 10, score: 1, maxScore: 10, applyToAll: false },
    scorm: { standardMinutes: 10, score: 1, applyToAll: false },
    html: { standardMinutes: 10, score: 1, applyToAll: false },
    rewardType: 0
  },
  cheatConf: {
    antiIdleEnabled: true,
    mode: 1,
    checkMinutes: 3,
    confirmSeconds: 120,
    promptText: '已触发防挂机验证，请点击"继续学习"，否则学习将被停止',
    multiCourseEnabled: true,
    forbidDragEnabled: true,
    audioBackgroundPlay: false
  },
  playConf: { speedEnabled: true, speedScope: 2 },
  faceConf: { enabled: false }
})

const form = reactive<KngSetting>(createDefaultSetting())
const expandedSections = ref(new Set<SectionKey>())
const savingKey = ref('')
const faceSaving = ref(false)
const specialVisible = ref(false)
const specialSaving = ref(false)

const isExpanded = (key: SectionKey) => expandedSections.value.has(key)

const toggleSection = (key: SectionKey) => {
  const next = new Set(expandedSections.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedSections.value = next
}

const load = async () => {
  const data = await getKngSetting()
  if (data) Object.assign(form, data)
}

const validateMinutes = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 1 || value > 1440) {
    throw new Error(`${label}需在 1~1440 之间`)
  }
}

const validateScore = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error('学分需为正数')
  if (Math.round(value * 10) !== value * 10) throw new Error('学分最多保留一位小数')
}

const validateScoreConf = () => {
  validateMinutes(form.scoreConf.videoAudio.standardMinutes, '视频/音频标准时长')
  validateScore(form.scoreConf.videoAudio.score)
  if (form.scoreConf.document.pagesPerScore < 1) throw new Error('文档页数需为正整数')
  validateScore(form.scoreConf.document.score)
  validateMinutes(form.scoreConf.document.standardMinutes, '文档标准学习时长')
  validateScore(form.scoreConf.document.maxScore)
  if (form.scoreConf.document.maxScore < form.scoreConf.document.score) {
    throw new Error('文档最高学分不能低于每页学分')
  }
  validateMinutes(form.scoreConf.microcourse.standardMinutes, '微课标准时长')
  validateScore(form.scoreConf.microcourse.score)
  validateScore(form.scoreConf.microcourse.maxScore)
  if (form.scoreConf.microcourse.maxScore < form.scoreConf.microcourse.score) {
    throw new Error('微课最高学分不能低于单次学分')
  }
  validateMinutes(form.scoreConf.scorm.standardMinutes, 'Scorm 标准时长')
  validateScore(form.scoreConf.scorm.score)
  validateMinutes(form.scoreConf.html.standardMinutes, 'HTML 标准时长')
  validateScore(form.scoreConf.html.score)
}

const applyScore = async () => {
  try {
    validateScoreConf()
  } catch (error) {
    if (error instanceof Error) toast.error(error.message)
    return
  }
  savingKey.value = 'score'
  try {
    await saveKngScoreConf(form.scoreConf)
    toast.info('已保存')
  } finally {
    savingKey.value = ''
  }
}

const applyCheat = async () => {
  if (form.cheatConf.checkMinutes < 1 || form.cheatConf.checkMinutes > 60) {
    toast.error('确认在线间隔需在 1~60 分钟之间')
    return
  }
  if (form.cheatConf.mode === 2 && (form.cheatConf.confirmSeconds < 30 || form.cheatConf.confirmSeconds > 600)) {
    toast.error('确认时限需在 30~600 秒之间')
    return
  }
  if (form.cheatConf.antiIdleEnabled && !form.cheatConf.promptText.trim()) {
    toast.error('请输入提示语')
    return
  }
  savingKey.value = 'cheat'
  try {
    await saveKngCheatConf({
      antiIdleEnabled: form.cheatConf.antiIdleEnabled,
      mode: form.cheatConf.mode,
      checkMinutes: form.cheatConf.checkMinutes,
      confirmSeconds: form.cheatConf.confirmSeconds,
      promptText: form.cheatConf.promptText,
      multiCourseEnabled: form.cheatConf.multiCourseEnabled,
      forbidDragEnabled: form.cheatConf.forbidDragEnabled
    })
    toast.info('已保存')
  } finally {
    savingKey.value = ''
  }
}

const applyPlay = async () => {
  savingKey.value = 'play'
  try {
    await saveKngPlayConf(form.playConf)
    toast.info('已保存')
  } finally {
    savingKey.value = ''
  }
}

const applyFace = async () => {
  const next = form.faceConf.enabled
  faceSaving.value = true
  try {
    await saveKngFaceConf({ enabled: next })
    toast.info('已保存')
  } catch {
    form.faceConf.enabled = !next
  } finally {
    faceSaving.value = false
  }
}

const saveSpecial = async (value: boolean) => {
  specialSaving.value = true
  try {
    await saveKngSpecialSetting({ audioBackgroundPlay: value })
    form.cheatConf.audioBackgroundPlay = value
    specialVisible.value = false
    toast.info('已保存')
  } finally {
    specialSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.setting-page {
  max-width: 1080px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.score-rules {
  padding-top: 10px;
  color: #4d5568;
  font-size: 12px;
}

.score-rule {
  padding: 10px 0 12px;
  border-bottom: 1px solid #eef1f6;
}

.rule-formula {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  line-height: 26px;
}

.rule-label {
  min-width: 58px;
  color: #253047;
  font-weight: 600;
}

.score-num {
  width: 48px;
  height: 24px;
  padding: 0 4px;
  border-radius: 4px;
  text-align: center;
}

input[type='number'],
textarea {
  height: 26px;
  padding: 0 6px;
  border: 1px solid #d9deea;
  border-radius: 4px;
  outline: none;
  font-size: 12px;
  color: #253047;

  &:focus {
    border-color: #2e7cf6;
  }

  &:disabled {
    background: #f5f7fb;
    color: #98a1b2;
  }
}

.rule-scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px 28px;
  margin: 7px 0 0 62px;
  color: #526071;
  font-size: 12px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
}

.course-summary {
  display: flex;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid #eef1f6;
  color: #4d5568;
  font-size: 12px;
}

.course-label {
  color: #2e7cf6;
  font-weight: 600;
}

.reward-settings {
  padding: 12px 0 8px;
  border-bottom: 1px solid #eef1f6;
}

.reward-label {
  margin-bottom: 7px;
  color: #253047;
  font-size: 12px;
  font-weight: 600;
}

.reward-options {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-left: 62px;
  color: #4d5568;
  font-size: 12px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }
}

.reward-secondary {
  margin-left: 38px;
}

.score-notes {
  padding-top: 12px;
  color: #98a1b2;
  font-size: 12px;
  line-height: 1.8;
}

.inline-note,
.switch-block p {
  color: #8a92a5;
  font-size: 12px;
  line-height: 1.7;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
}

.text-link {
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;
}

.inline-note {
  margin: 6px 0 14px;
  padding: 0;
  background: transparent;
}

.mode-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  color: #4d5568;
  font-size: 12px;
  line-height: 1.7;

  > input[type='number'] {
    width: 58px;
  }
}

.prompt-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  color: #4d5568;
  font-size: 12px;

  textarea {
    width: 100%;
    height: auto;
    min-height: 66px;
    padding: 7px 8px;
    resize: vertical;
    font-family: inherit;
  }

  small {
    align-self: flex-end;
    color: #98a1b2;
    font-size: 12px;
  }
}

.switch-block {
  margin-top: 14px;
}

.switch-line {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #4d5568;
  font-size: 12px;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
}

.switch-control {
  position: relative;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 9px;
  background: #c9d0dc;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    transition: transform 0.2s;
  }
}

.switch-line input:checked + .switch-control {
  background: #2e7cf6;
}

.switch-line input:checked + .switch-control::after {
  transform: translateX(16px);
}

.play-scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 14px;
  padding: 0;
  color: #4d5568;
  font-size: 12px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }
}

@media (max-width: 900px) {
  .rule-scope,
  .reward-options {
    margin-left: 0;
  }

  .rule-label {
    min-width: auto;
  }
}
</style>
