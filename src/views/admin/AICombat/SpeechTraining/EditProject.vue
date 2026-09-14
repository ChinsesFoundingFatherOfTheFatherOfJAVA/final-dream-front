<template>
  <div class="edit-project">
    <!-- 顶部导航 -->
    <div class="header">
      <div class="header-left">
        <span class="back-btn" @click="goBack">← 返回</span>
        <h1 class="page-title">{{ isTrain ? '创建日常训练' : '创建通关考试' }}</h1>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧步骤 -->
      <div class="steps-sidebar">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }" @click="currentStep = 1">
          <span class="step-dot"></span>
          <span class="step-text">基本信息</span>
        </div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }" @click="currentStep = 2">
          <span class="step-dot"></span>
          <span class="step-text">评分维度</span>
        </div>
        <div class="step" :class="{ active: currentStep === 3 }" @click="currentStep = 3">
          <span class="step-dot"></span>
          <span class="step-text">虚拟陪练者设置</span>
        </div>
      </div>

      <!-- 中间表单区域 -->
      <div class="form-area">
        <!-- 步骤1: 基本信息 -->
        <div v-if="currentStep === 1" class="form-section">
          <h2 class="section-title">基本信息</h2>

          <div class="form-item">
            <label class="form-label required">名称</label>
            <input type="text" class="form-input" v-model="form.name" placeholder="请输入" maxlength="200" />
            <span class="char-count">{{ form.name.length }}/200</span>
          </div>

          <div class="form-item">
            <label class="form-label">编号</label>
            <input type="text" class="form-input" v-model="form.code" placeholder="请输入" maxlength="50" />
            <span class="char-count">{{ form.code.length }}/50</span>
          </div>

          <div class="form-item">
            <label class="form-label required">起止时间</label>
            <div class="date-range">
              <DatePicker v-model="form.startTime" placeholder="开始时间" />
              <span class="date-separator">~</span>
              <DatePicker v-model="form.endTime" placeholder="结束时间" />
            </div>
          </div>

          <div class="form-item">
            <label class="form-label required">说明信息</label>
            <textarea class="form-textarea" v-model="form.description" placeholder="请输入" maxlength="1000" rows="4"></textarea>
            <span class="char-count">{{ form.description.length }}/1000</span>
          </div>

          <div class="form-item">
            <label class="form-label">上传封面</label>
            <div class="cover-uploader">
              <input
                ref="coverInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleCoverUpload"
              />
              <div class="cover-preview" v-if="form.coverImage">
                <img :src="form.coverImage" alt="cover" />
                <button type="button" class="cover-remove" @click="removeCover">×</button>
              </div>
              <div class="cover-placeholder" v-else @click="triggerCoverUpload">
                <span class="placeholder-icon">+</span>
                <span class="placeholder-text">点击上传封面<br/><span class="placeholder-hint">不上传则使用默认封面</span></span>
              </div>
              <div class="cover-actions" v-if="!form.coverImage">
                <button type="button" class="btn-link" @click="triggerCoverUpload">📁 上传图片</button>
                <span class="action-sep">|</span>
                <button type="button" class="btn-link" @click="generateCoverByAI">✨ AI生成</button>
              </div>
            </div>
          </div>

          <div class="form-item" v-if="isTrain">
            <label class="form-label required">完成标准</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" v-model="form.completionStandard" min="1" />
              <span class="unit">次训练</span>
            </div>
          </div>

          <div class="form-item" v-else>
            <label class="form-label required">达标分数</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" v-model="form.passScore" min="0" max="100" />
              <span class="unit">分</span>
            </div>
          </div>

          <div class="form-item" v-if="!isTrain">
            <label class="form-label required">通关策略</label>
            <div class="radio-group">
              <label class="radio-item" v-for="option in passStrategies" :key="option.value">
                <input type="radio" v-model="form.passStrategy" :value="option.value" />
                <span class="radio-label">{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label required">对话方式</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="form.dialogueMode" value="voice" />
                <span class="radio-label">语音对话</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="form.dialogueMode" value="text" />
                <span class="radio-label">文字对话</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 步骤2: 评分维度 -->
        <div v-if="currentStep === 2" class="form-section">
          <h2 class="section-title">评分维度</h2>

          <div class="scoring-table">
            <div class="table-header">
              <div class="col-checkbox"></div>
              <div class="col-name">维度名称</div>
              <div class="col-rule">评分规则</div>
              <div class="col-weight">权重</div>
            </div>
            <div class="table-row" v-for="dim in dimensions" :key="dim.id">
              <div class="col-checkbox">
                <input type="checkbox" v-model="dim.enabled" />
              </div>
              <div class="col-name">
                <input v-if="dim.isCustom" type="text" class="dim-edit" v-model="dim.name" placeholder="请输入维度名称" maxlength="20" />
                <span v-else>{{ dim.name }}</span>
              </div>
              <div class="col-rule">
                <input v-if="dim.isCustom" type="text" class="dim-edit" v-model="dim.scoringRule" placeholder="请输入评分规则" maxlength="200" />
                <span v-else>{{ dim.scoringRule }}</span>
              </div>
              <div class="col-weight">
                <input type="number" class="weight-input" v-model.number="dim.weight" min="0" max="100" :disabled="!dim.enabled" />
                <span>%</span>
              </div>
            </div>
          </div>

          <div class="weight-total" :class="{ valid: totalWeight === 100 }">
            权重 {{ totalWeight === 100 ? '✓' : '' }} {{ totalWeight }}%
          </div>

          <button class="btn btn-link" @click="addCustomDimension">+ 添加自定义维度</button>

          <!-- 话术一致性详细规则 -->
          <div class="consistency-section" v-if="isDimensionEnabled('话术一致性')">
            <h3 class="sub-title">话术一致性评分规则</h3>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="form.consistencyRule" value="exact" />
                <span class="radio-label">与标准话术精准逐字匹配</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="form.consistencyRule" value="keypoints" />
                <span class="radio-label">按照标准话术的要点表达即可</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="form.consistencyRule" value="mixed" />
                <span class="radio-label">部分话术需要精准逐字匹配，其他按照要点表达即可</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 步骤3: 虚拟陪练者设置 -->
        <div v-if="currentStep === 3" class="form-section">
          <h2 class="section-title">虚拟陪练者设置</h2>

          <div class="form-item">
            <label class="form-label">陪练者名称</label>
            <input type="text" class="form-input" v-model="form.trainer.name" placeholder="请输入" maxlength="20" />
          </div>

          <div class="form-item">
            <label class="form-label">陪练者朗读语言及声音</label>
            <div class="trainer-voice">
              <select class="form-select" v-model="form.trainer.language">
                <option value="普通话">普通话</option>
                <option value="粤语">粤语</option>
              </select>
              <select class="form-select" v-model="form.trainer.voiceId">
                <option value="voice1">温柔女声</option>
                <option value="voice2">成熟男声</option>
                <option value="voice3">活力女声</option>
              </select>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">学员录入语言</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" v-model="form.trainer.inputLanguage" value="普通话" />
                <span class="checkbox-label">普通话</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="form.trainer.inputLanguage" value="粤语" />
                <span class="checkbox-label">粤语</span>
              </label>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">语速</label>
            <div class="slider-wrapper">
              <input type="range" class="form-slider" v-model.number="form.trainer.speed" min="0" max="60" />
              <span class="slider-value">{{ form.trainer.speed }}</span>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">违禁词</label>
            <input type="text" class="form-input" v-model="form.trainer.forbiddenWords" placeholder="以逗号隔开，最多200字" maxlength="200" />
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="form-actions">
          <button class="btn btn-default" @click="goBack">取消</button>
          <button class="btn btn-primary" @click="handleSubmit">创建并进入控制台</button>
        </div>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-area">
        <div class="preview-card">
          <div class="preview-cover">
            <span class="preview-icon">📚</span>
          </div>
          <div class="preview-content">
            <h3 class="preview-title">{{ form.name || '项目名称' }}</h3>
            <p class="preview-desc">{{ form.description || '项目说明信息' }}</p>
            <div class="preview-rules">
              <div class="rule-item" v-if="isTrain">
                <span class="rule-label">完成标准:</span>
                <span class="rule-value">{{ form.completionStandard || 0 }}次训练</span>
              </div>
              <div class="rule-item" v-else>
                <span class="rule-label">达标分数:</span>
                <span class="rule-value">{{ form.passScore || 0 }}分</span>
              </div>
              <div class="rule-item">
                <span class="rule-label">对话方式:</span>
                <span class="rule-value">{{ form.dialogueMode === 'voice' ? '语音对话' : '文字对话' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DatePicker from '@/components/common/DatePicker.vue'
import { createProject, createProjectWithFile, updateProject, updateProjectWithFile, getProjectDetail } from '@/api/project'
import { toProjectForm } from '@/utils/convert'

const router = useRouter()
const route = useRoute()
const isTrain = computed(() => route.query.type === 'train')
const editId = computed(() => route.query.edit ? Number(route.query.edit) : null)
const currentStep = ref(1)
const saving = ref(false)

const form = ref({
  name: '',
  code: '',
  startTime: '',
  endTime: '',
  description: '',
  completionStandard: 1,
  passScore: 60,
  passStrategy: 'single',
  dialogueMode: 'voice',
  consistencyRule: 'keypoints',
  coverImage: '',
  trainer: {
    name: 'AI陪练师',
    language: '普通话',
    voiceId: 'voice1',
    speed: 30,
    inputLanguage: ['普通话'],
    forbiddenWords: ''
  }
})

const coverInputRef = ref<HTMLInputElement>()
const coverFile = ref<File | null>(null)

// 默认封面：渐进色 + 对话气泡 SVG
const buildDefaultCover = () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1890ff"/>
      <stop offset="100%" stop-color="#40a9ff"/>
    </linearGradient>
  </defs>
  <rect width="240" height="160" fill="url(#g)"/>
  <g transform="translate(40,30)" fill="#fff" opacity="0.95">
    <rect x="0" y="0" width="100" height="70" rx="10"/>
    <polygon points="22,70 32,82 38,70"/>
    <rect x="70" y="22" width="100" height="60" rx="10"/>
    <polygon points="138,82 148,68 154,82"/>
  </g>
  <circle cx="60" cy="50" r="4" fill="#1890ff"/>
  <circle cx="80" cy="50" r="4" fill="#1890ff"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const triggerCoverUpload = () => {
  coverInputRef.value?.click()
}

const handleCoverUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverFile.value = file
  // 本地预览用 blob URL（不传 base64）
  if (form.value.coverImage?.startsWith('blob:')) URL.revokeObjectURL(form.value.coverImage)
  form.value.coverImage = URL.createObjectURL(file)
}

const removeCover = () => {
  if (coverFile.value && form.value.coverImage?.startsWith('blob:')) {
    URL.revokeObjectURL(form.value.coverImage)
  }
  coverFile.value = null
  form.value.coverImage = ''
}

const generateCoverByAI = () => {
  // AI 生成走默认占位图（也是 data URL，不上传服务器）
  if (form.value.coverImage?.startsWith('blob:')) URL.revokeObjectURL(form.value.coverImage)
  coverFile.value = null
  form.value.coverImage = buildDefaultCover()
}

onMounted(() => {
  if (editId.value) loadProject(editId.value)
})

const passStrategies = [
  { value: 'single', label: '单次达标即通关' },
  { value: 'cumulative', label: '累计达标n次' },
  { value: 'consecutive', label: '连续达标n次' }
]

const dimensions = ref([
  { id: '1', name: '话术一致性', weight: 40, enabled: true, ruleType: 'keypoints', scoringRule: '按照要点表达即可', isCustom: false },
  { id: '2', name: '表达流利', weight: 10, enabled: true, ruleType: 'grade', scoringRule: '分级评分(0/40/60/80/100)', isCustom: false },
  { id: '3', name: '语速适中', weight: 10, enabled: true, ruleType: 'formula', scoringRule: '公式计算(150-250字/分钟为满分)', isCustom: false },
  { id: '4', name: '礼貌用语', weight: 10, enabled: true, ruleType: 'grade', scoringRule: '分级评分(0/40/60/80/100)', isCustom: false },
  { id: '5', name: '态度积极', weight: 10, enabled: true, ruleType: 'grade', scoringRule: '分级评分(0/40/60/80/100)', isCustom: false },
  { id: '6', name: '表述清晰', weight: 10, enabled: true, ruleType: 'grade', scoringRule: '分级评分(0/40/60/80/100)', isCustom: false },
  { id: '7', name: '违禁词', weight: 10, enabled: true, ruleType: 'deduction', scoringRule: '扣分制(每出现一次扣N分)', isCustom: false }
])

const totalWeight = computed(() => {
  return dimensions.value.filter(d => d.enabled).reduce((sum, d) => sum + d.weight, 0)
})

const isDimensionEnabled = (name: string) => {
  return dimensions.value.find(d => d.name === name)?.enabled
}

const addCustomDimension = () => {
  dimensions.value.push({
    id: Date.now().toString(),
    name: '自定义维度',
    weight: 0,
    enabled: true,
    ruleType: 'grade',
    scoringRule: '分级评分',
    isCustom: true
  })
}

const goBack = () => {
  router.push('/sparring/newmanage')
}

const loadProject = async (id: number) => {
  try {
    const res: any = await getProjectDetail(id)
    const data = toProjectForm(res)
    form.value.name = data.name
    form.value.code = data.code
    form.value.startTime = data.startTime
    form.value.endTime = data.endTime
    form.value.description = data.description
    form.value.completionStandard = data.completionStandard
    form.value.passScore = data.passScore
    form.value.passStrategy = data.passStrategy
    form.value.dialogueMode = data.dialogueMode
  } catch { /* handled */ }
}

const handleSubmit = async () => {
  if (!form.value.name) { alert('请输入名称'); return }
  if (!form.value.startTime || !form.value.endTime) { alert('请选择起止时间'); return }
  if (!form.value.description) { alert('请输入说明信息'); return }
  if (totalWeight.value !== 100) { alert('权重之和必须等于100%'); return }

  saving.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.value.name)
    fd.append('code', form.value.code || '')
    fd.append('description', form.value.description)
    fd.append('startTime', form.value.startTime + ':00')
    fd.append('endTime', form.value.endTime + ':00')
    fd.append('projectType', String(isTrain.value ? 0 : 1))
    if (isTrain.value) fd.append('completionStandard', String(form.value.completionStandard))
    if (!isTrain.value) {
      fd.append('passScore', String(form.value.passScore))
      const ps = form.value.passStrategy === 'cumulative' ? 2 : form.value.passStrategy === 'consecutive' ? 3 : 1
      fd.append('passStrategy', String(ps))
      if (form.value.passStrategy !== 'single') {
        fd.append('passStrategyN', String(form.value.passStrategyN || 0))
      }
    }
    fd.append('dialogueMode', form.value.dialogueMode === 'voice' ? '0' : '1')

    // 评分维度
    fd.append('scoringDimensions', JSON.stringify(
      dimensions.value.filter((d) => d.enabled).map((d) => ({
        dimensionName: d.name,
        weight: d.weight,
        enabled: 1,
        ruleType: d.ruleType,
        scoringRule: d.scoringRule,
        isCustom: d.isCustom ? 1 : 0
      }))
    ))

    // 虚拟陪练者
    fd.append('virtualTrainer', JSON.stringify({
      trainerName: form.value.trainer.name,
      language: form.value.trainer.language,
      voiceId: form.value.trainer.voiceId,
      speed: form.value.trainer.speed,
      inputLanguage: form.value.trainer.inputLanguage.join(','),
      forbiddenWords: form.value.trainer.forbiddenWords
    }))

    // 封面：用户真实上传的图片作为文件上传；否则不传字段，让后端使用占位图
    if (coverFile.value) {
      fd.append('coverImage', coverFile.value, coverFile.value.name || 'cover.png')
    }

    let id = editId.value
    if (id) {
      await updateProjectWithFile(id, fd)
    } else {
      id = await createProjectWithFile(fd)
    }
    router.push(`/sparring/newmanage/console/${id}`)
  } catch { /* handled */ }
  finally { saving.value = false }
}

</script>

<style scoped lang="scss">
.edit-project {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    font-size: 16px;
    color: #1890ff;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.steps-sidebar {
  width: 200px;
  background: #fff;
  padding: 24px;
  border-right: 1px solid #e8e8e8;

  .step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    cursor: pointer;
    color: #999;

    &.active {
      color: #1890ff;
      font-weight: 500;
    }

    &.completed {
      color: #52c41a;
    }

    .step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d9d9d9;
    }

    &.active .step-dot { background: #1890ff; }
    &.completed .step-dot { background: #52c41a; }
  }
}

.form-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 24px 0;
    padding-left: 12px;
    border-left: 3px solid #1890ff;
  }
}

.form-item {
  margin-bottom: 20px;

  .form-label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;

    &.required::after {
      content: ' *';
      color: #f5222d;
    }
  }
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  outline: none;

  &:focus { border-color: #1890ff; }
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 12px;

  > * { flex: 1; }
  .date-separator { color: #999; flex: 0 0 auto; }
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;

  .form-input { width: 100px; }
  .unit { color: #666; }
}

.cover-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-preview {
  position: relative;
  width: 200px;
  height: 130px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.cover-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 18px;
  &:hover { background: rgba(255, 0, 0, 0.65); }
}

.cover-placeholder {
  width: 200px;
  height: 130px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover { border-color: #1890ff; }

  .placeholder-icon {
    font-size: 24px;
    color: #999;
    line-height: 1;
  }

  .placeholder-text {
    font-size: 12px;
    color: #666;
    text-align: center;
    line-height: 1.5;
  }

  .placeholder-hint {
    color: #bbb;
    font-size: 11px;
  }
}

.cover-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  .btn-link {
    background: none;
    border: none;
    color: #1890ff;
    cursor: pointer;
    font-size: 13px;
    padding: 4px;
    &:hover { text-decoration: underline; }
  }

  .action-sep { color: #d9d9d9; }
}

.radio-group, .checkbox-group {
  display: flex;
  gap: 24px;

  .radio-item, .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
}

// 评分维度表格
.scoring-table {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  margin-bottom: 16px;

  .table-header {
    display: flex;
    background: #fafafa;
    padding: 12px;
    font-weight: 500;
    font-size: 14px;
    border-bottom: 1px solid #e8e8e8;
  }

  .table-row {
    display: flex;
    padding: 12px;
    border-bottom: 1px solid #e8e8e8;
    align-items: center;

    &:last-child { border-bottom: none; }
  }

  .col-checkbox { width: 50px; }
  .col-name { width: 120px; }
  .col-rule { flex: 1; }
  .col-weight { width: 100px; display: flex; align-items: center; gap: 4px; }
}

.weight-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  text-align: center;}

.dim-edit {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  &:focus { border-color: #1890ff; }
}

.weight-total {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;

  &.valid { color: #52c41a; }
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &.btn-link { background: none; border: none; color: #1890ff; padding: 0; }
  &:hover { opacity: 0.85; }
}

.consistency-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e8e8e8;

  .sub-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin: 0 0 16px 0;
  }
}

.trainer-voice {
  display: flex;
  gap: 12px;

  .form-select { flex: 1; }
}

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;

  .form-slider { flex: 1; }
  .slider-value { color: #666; }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #e8e8e8;
  margin-top: 24px;
}

.preview-area {
  width: 300px;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  padding: 24px;
}

.preview-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;

  .preview-cover {
    height: 150px;
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-icon { font-size: 48px; }
  }

  .preview-content {
    padding: 16px;

    .preview-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin: 0 0 8px 0;
    }

    .preview-desc {
      font-size: 12px;
      color: #999;
      margin: 0 0 12px 0;
      line-height: 1.6;
    }

    .preview-rules {
      .rule-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 4px;

        .rule-label { color: #999; }
        .rule-value { color: #333; }
      }
    }
  }
}
</style>
