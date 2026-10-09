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
              <div class="col-evidence">评分依据 / 评分方式</div>
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
                <!-- 话术一致性：规则内嵌为单选（对齐原平台；v1.2 拍板砍 mixed——无逐节点标记数据支撑） -->
                <div v-if="dim.name === '话术一致性'" class="consistency-picker">
                  <label class="consistency-option" :class="{ active: dim.ruleType === 'keypoints' }">
                    <input type="radio" value="keypoints" v-model="dim.ruleType" :disabled="!dim.enabled" />
                    <span>按照标准话术的要点表达即可</span>
                  </label>
                  <label class="consistency-option" :class="{ active: dim.ruleType === 'exact' }">
                    <input type="radio" value="exact" v-model="dim.ruleType" :disabled="!dim.enabled" />
                    <span>与标准话术精准逐字匹配</span>
                  </label>
                  <p class="consistency-tip">
                    {{ dim.ruleType === 'exact'
                      ? '学员回答须与各轮标准话术高度吻合，逐字一致性是本维度主要评分依据。'
                      : '学员回答覆盖标准话术要点即可，不要求逐字一致。' }}
                  </p>
                </div>
                <textarea
                  v-else-if="dim.isCustom"
                  class="rule-input"
                  v-model="dim.scoringRule"
                  :placeholder="rulePlaceholder"
                  rows="6"
                  maxlength="1000"
                ></textarea>
                <div v-else class="rule-lines">
                  <div v-for="(line, index) in splitRuleLines(dim.scoringRule)" :key="index" class="rule-line">
                    <strong v-if="line.level" class="rule-level">{{ line.level }}</strong>
                    <span class="rule-text">{{ line.text }}</span>
                  </div>
                </div>
              </div>
              <div class="col-evidence">
                <div class="metric-picker">
                  <select class="dim-select" v-model.number="dim.evidenceType" :disabled="!dim.enabled">
                    <option :value="1">看文字</option>
                    <option :value="2">看语音</option>
                    <option :value="3">文字+语音</option>
                  </select>
                  <select class="dim-select" v-model="dim.metricKey" :disabled="!dim.enabled" @change="handleMetricKeyChange(dim)">
                    <option value="">AI 评分</option>
                    <option value="speech_speed">语速规则算分</option>
                    <option value="forbidden_words">违禁词规则算分</option>
                    <option value="tone">音频模型评语气</option>
                  </select>
                </div>
                <div v-if="dim.metricKey === 'speech_speed'" class="metric-params">
                  <input
                    type="number"
                    class="metric-param-input"
                    v-model.number="dim.metricParams.bestMin"
                    placeholder="150"
                    :disabled="!dim.enabled"
                  />
                  <span>~</span>
                  <input
                    type="number"
                    class="metric-param-input"
                    v-model.number="dim.metricParams.bestMax"
                    placeholder="250"
                    :disabled="!dim.enabled"
                  />
                  <span>字/分</span>
                </div>
                <div v-else-if="dim.metricKey === 'forbidden_words'" class="metric-params">
                  <input
                    type="number"
                    class="metric-param-input"
                    v-model.number="dim.metricParams.deductPerHit"
                    placeholder="20"
                    :disabled="!dim.enabled"
                  />
                  <span>分/次</span>
                </div>
                <div v-else-if="dim.metricKey === 'tone'" class="metric-params">
                  <span>评什么角度</span>
                  <input
                    type="text"
                    class="metric-aspect-input"
                    v-model="dim.metricAspect"
                    placeholder="热情"
                    maxlength="6"
                    :disabled="!dim.enabled"
                  />
                </div>
              </div>
              <div class="col-weight">
                <input type="number" class="weight-input" v-model.number="dim.weight" min="0" max="100" :disabled="!dim.enabled" />
                <span>%</span>
              </div>
            </div>
          </div>

          <p class="table-hint">
            评分依据决定该维度能不能在本次训练里评分：学员全程用文字作答时，"看语音"的维度不计入该维度自身得分，但权重照占并按 0 分计入总分。<br />
            评分方式决定分数从哪来：选"规则算分"时分数由后端按公式判定，AI 只负责写评语；选"AI 评分"时分数完全交给大模型。
          </p>

          <div class="weight-total" :class="{ valid: totalWeight === 100 }">
            权重 {{ totalWeight === 100 ? '✓' : '' }} {{ totalWeight }}%
          </div>

          <button class="btn btn-link" @click="addCustomDimension">+ 添加自定义维度</button>

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

          <!-- FP-26 陪练者形象（v1.1 新增） -->
          <div class="form-item">
            <label class="form-label">陪练者形象</label>
            <AvatarGenField
              ref="avatarFieldRef"
              v-model="form.trainer.avatarImage"
              @file-change="onAvatarFileChange"
            />
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
import AvatarGenField from '@/components/business/AvatarGenField.vue'
import { createProject, createProjectWithFile, updateProject, updateProjectWithFile, getProjectDetail } from '@/api/project'
import { toProjectForm } from '@/utils/convert'
import { resolveAssetUrl } from '@/api/request'
import { toast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const isTrain = computed(() => route.query.type === 'train')
const editId = computed(() => route.query.edit ? Number(route.query.edit) : null)
const currentStep = ref(1)
const saving = ref(false)

type MetricParams = {
  bestMin: number | null
  bestMax: number | null
  deductPerHit: number | null
}

type DimensionForm = {
  id: string
  name: string
  weight: number
  enabled: boolean
  ruleType: string
  scoringRule: string
  evidenceType: number
  metricKey: string
  metricAspect: string
  metricParams: MetricParams
  isCustom: boolean
}

const emptyMetricParams = (): MetricParams => ({
  bestMin: null,
  bestMax: null,
  deductPerHit: null
})

const rulePlaceholder = '100分：…\n80分：…\n60分：…\n40分：…\n0分：…'

const splitRuleLines = (rule: string) => (rule || '').split(/\r?\n/).map((line) => {
  const match = line.match(/^((?:100|80|60|40|0)分：)(.*)$/)
  return match ? { level: match[1], text: match[2] } : { level: '', text: line }
})

const ruleText = (...lines: string[]) => lines.join('\n')

const form = ref({
  name: '',
  code: '',
  startTime: '',
  endTime: '',
  description: '',
  completionStandard: 1,
  passScore: 60,
  passStrategy: 'single',
  passStrategyN: 0,
  dialogueMode: 'voice',
  coverImage: '',
  trainer: {
    name: 'AI陪练师',
    language: '普通话',
    voiceId: 'voice1',
    speed: 30,
    inputLanguage: ['普通话'],
    forbiddenWords: '',
    /** FP-26 陪练者形象图片 URL（v1.1：AI 生成或本地替换；空=学员端显示默认占位图） */
    avatarImage: ''
  }
})

/** FP-26 本地选择的形象图片文件（保存时以文件字段上传，替代 URL） */
const avatarFieldRef = ref<InstanceType<typeof AvatarGenField>>()
const avatarFile = ref<File | null>(null)
const onAvatarFileChange = (file: File | null) => {
  avatarFile.value = file
}

const coverInputRef = ref<HTMLInputElement>()
const coverFile = ref<File | null>(null)

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

onMounted(() => {
  if (editId.value) loadProject(editId.value)
})

const passStrategies = [
  { value: 'single', label: '单次达标即通关' },
  { value: 'cumulative', label: '累计达标n次' },
  { value: 'consecutive', label: '连续达标n次' }
]

/**
 * 默认评分维度。evidenceType：1=看文字，2=看语音，3=文字+语音
 * （语音依据维度在无语音数据时 score=null，但权重仍按 0 分计入总分）
 * metricKey：非空表示分数由后端规则算、AI 只写评语，空表示完全交给 AI 评分
 */
const dimensions = ref<DimensionForm[]>([
  {
    id: '1',
    name: '话术一致性',
    weight: 40,
    enabled: true,
    ruleType: 'keypoints',
    scoringRule: ruleText(
      '按照标准话术的要点表达即可。',
      '无需与标准话术完全一致，仅需表达出对应的要点即可。按照要点命中比例得分。'
    ),
    evidenceType: 1,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '2',
    name: '表达流利',
    weight: 10,
    enabled: true,
    ruleType: 'grade',
    scoringRule: ruleText(
      '100分：表达如行云流水，几乎未出现口头禅。',
      '80分：表述整体流畅，有极少量卡顿或口头禅，但不影响沟通节奏和理解。',
      '60分：表述存在少量卡顿或重复，口头禅出现频率稍高，但能完成基本沟通。',
      '40分：表达不连贯，卡顿和重复较多，频繁使用口头禅，显得紧张或准备不足，影响沟通效率。',
      '0分：表述非常困难，长时间停顿，句子破碎，几乎无法顺畅传递信息，沟通难以进行。'
    ),
    evidenceType: 3,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '3',
    name: '语速适中',
    weight: 10,
    enabled: true,
    ruleType: 'formula',
    scoringRule: ruleText(
      '以学员录音的净发声时长折算语速（字/分钟）：150-250字/分钟为满分，每偏离区间10字/分钟扣5分，扣完为止。该维度由系统按录音自动计算。',
      '参考分档——100分：语速处于150-250字/分钟的理想区间；80分：偏离区间约40字/分钟以内；60分：偏离约80字/分钟以内；40分：偏离约120字/分钟以内；更低：语速明显过快或过慢，已影响信息接收。'
    ),
    evidenceType: 2,
    metricKey: 'speech_speed',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '4',
    name: '礼貌用语',
    weight: 10,
    enabled: true,
    ruleType: 'grade',
    scoringRule: ruleText(
      '100分：用词得体周到，敬语与礼貌表达贯穿全程（如"您好""请""感谢"），语气令人舒适。',
      '80分：整体礼貌规范，偶有直白表述但不失分寸。',
      '60分：基本使用文明用语，但礼貌表达时有时无，个别语句生硬。',
      '40分：多处用语生硬直白，缺少基本敬语，给人冷淡感。',
      '0分：出现不礼貌甚至冒犯性表达。'
    ),
    evidenceType: 1,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '5',
    name: '态度积极',
    weight: 10,
    enabled: true,
    ruleType: 'grade',
    scoringRule: ruleText(
      '100分：全程保持高度热情和耐心，能主动挖掘需求，积极提供解决方案。面对抱怨或拒绝时，能保持积极心态并有效引导。',
      '80分：态度友好、有耐心，能积极响应需求。但在面对极端挑战时，积极性或耐心可能略有下降。',
      '60分：态度中立、平和，能完成问答，但缺乏主动意识，多为被动响应，热情不足。',
      '40分：态度略显消极或不耐烦，对问题反应被动，甚至出现辩解或推诿的倾向。',
      '0分：态度消极、冷漠，甚至带有抵触情绪。'
    ),
    evidenceType: 1,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '6',
    name: '表述清晰',
    weight: 10,
    enabled: true,
    ruleType: 'grade',
    scoringRule: ruleText(
      '100分：表述逻辑性极强，善用结构词（如"首先、其次"），重点突出，用词精准，毫无歧义。',
      '80分：表述基本清晰，逻辑通顺，但偶尔信息组织不够完美，重点不够突出。',
      '60分：能表达清楚基本意思，但逻辑性稍弱，有时会绕圈子或信息点混乱，需要费力理解。',
      '40分：表述混乱，逻辑不清，前后矛盾，或使用过多专业术语，导致较难理解。',
      '0分：表述完全无法理解，语言混乱。'
    ),
    evidenceType: 1,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  },
  {
    id: '7',
    name: '违禁词',
    weight: 10,
    enabled: true,
    ruleType: 'deduction',
    scoringRule: ruleText('命中项目配置的违禁词即扣分，每次命中扣20分，扣完为止；未命中任何违禁词得100分。该维度由系统按识别文本自动判定。'),
    evidenceType: 1,
    metricKey: 'forbidden_words',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: false
  }
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
    evidenceType: 1,
    metricKey: '',
    metricAspect: '',
    metricParams: emptyMetricParams(),
    isCustom: true
  })
}

const goBack = () => {
  router.push('/sparring/newmanage')
}

/** 后端 scoring_dimension.rule_type 数字码 → 表单内的字符串标识 */
const RULE_TYPE_BY_CODE: Record<number, string> = {
  1: 'exact',
  2: 'keypoints',
  3: 'keypoints', // v1.2 砍 mixed：历史 ruleType=3 回显降级为要点表达
  4: 'grade',
  5: 'formula',
  6: 'deduction'
}

const metricParamInt = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

/** 回显优先取后端反解后的 metricParams，兼容详情只返回原始 metricConfig JSON 的情况。 */
const parseMetricParams = (dim: any): MetricParams => {
  let raw = dim?.metricParams
  if ((!raw || typeof raw !== 'object') && typeof dim?.metricConfig === 'string') {
    try {
      raw = JSON.parse(dim.metricConfig)?.params
    } catch {
      raw = null
    }
  }
  return {
    bestMin: metricParamInt(raw?.bestMin),
    bestMax: metricParamInt(raw?.bestMax),
    deductPerHit: metricParamInt(raw?.deductPerHit)
  }
}

/** 只提交当前规则支持的参数，空值由 JSON.stringify 自动省略，后端再按白名单兜底。 */
const cleanMetricParams = (dim: DimensionForm) => {
  if (dim.metricKey === 'speech_speed') {
    return {
      bestMin: metricParamInt(dim.metricParams.bestMin) ?? undefined,
      bestMax: metricParamInt(dim.metricParams.bestMax) ?? undefined
    }
  }
  if (dim.metricKey === 'forbidden_words') {
    return { deductPerHit: metricParamInt(dim.metricParams.deductPerHit) ?? undefined }
  }
  return undefined
}

/** tone 角度优先取独立字段；兼容详情只返回 metricConfig JSON 的情况。 */
const parseMetricAspect = (dim: any): string => {
  let value = typeof dim?.metricAspect === 'string' ? dim.metricAspect.trim() : ''
  if (!value && typeof dim?.metricConfig === 'string') {
    try {
      const aspect = JSON.parse(dim.metricConfig)?.params?.aspect
      value = typeof aspect === 'string' ? aspect.trim() : ''
    } catch {
      value = ''
    }
  }
  return value
}

const isValidToneAspect = (value: string) => {
  const length = (value || '').trim().length
  return length >= 2 && length <= 6
}

const handleMetricKeyChange = (dim: DimensionForm) => {
  if (dim.metricKey === 'tone' && !dim.metricAspect.trim()) {
    dim.metricAspect = '热情'
  }
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
    form.value.passStrategyN = data.passStrategyN
    form.value.dialogueMode = data.dialogueMode
    form.value.coverImage = data.coverImage
    // FP-26 编辑回显：陪练者形象（后端详情返回 virtualTrainer.avatarImage）
    if (res.virtualTrainer?.avatarImage) {
      form.value.trainer.avatarImage = resolveAssetUrl(res.virtualTrainer.avatarImage)
    }
    // 评分维度回显：以库中已保存的配置为准（含禁用行与自定义维度）。
    // 之前不回填，任何一次编辑保存都会把维度静默重置成上面 7 条默认值
    const savedDims: any[] | undefined = res.scoringDimensions
    if (Array.isArray(savedDims) && savedDims.length) {
      dimensions.value = savedDims.map((d, i) => ({
        id: d.id != null ? String(d.id) : `saved_${i}`,
        name: d.dimensionName || '',
        weight: d.weight ?? 0,
        enabled: d.enabled !== 0,
        ruleType: RULE_TYPE_BY_CODE[Number(d.ruleType)] ?? 'grade',
        scoringRule: d.scoringRule || '',
        evidenceType: Number(d.evidenceType ?? 1),
        metricKey: d.metricKey || '',
        metricAspect: parseMetricAspect(d),
        metricParams: parseMetricParams(d),
        isCustom: d.isCustom === 1
      }))
    }
  } catch {
    toast.error('项目加载失败，请重试')
  }
}

const handleSubmit = async () => {
  if (!form.value.name) { toast.warn('请输入名称'); return }
  if (!form.value.startTime || !form.value.endTime) { toast.warn('请选择起止时间'); return }
  if (!form.value.description) { toast.warn('请输入说明信息'); return }
  if (totalWeight.value !== 100) { toast.warn('权重之和必须等于100%'); return }
  const invalidTone = dimensions.value.find((d) => d.metricKey === 'tone' && !isValidToneAspect(d.metricAspect))
  if (invalidTone) { toast.warn('评什么角度需为2~6个字'); return }

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

    // 评分维度：未勾选的维度同样提交（enabled=0）。后端保存是删表重建，
    // 只上传启用行会让被禁用的默认维度永久消失（下次编辑连重新勾选的机会都没有）
    fd.append('scoringDimensions', JSON.stringify(
      dimensions.value.map((d, i) => ({
        id: /^\d+$/.test(d.id) ? Number(d.id) : undefined,
        dimensionName: d.name,
        weight: d.weight,
        enabled: d.enabled ? 1 : 0,
        // 话术一致性规则在维度行内单选（v1.2：砍 mixed，只留 exact/keypoints）
        ruleType: d.ruleType,
        scoringRule: d.scoringRule,
        // 评分依据与评分方式：evidenceType=2 的维度在纯文字场次不参与评分；metricKey 非空时分数由后端规则算
        evidenceType: d.evidenceType,
        metricKey: d.metricKey,
        metricAspect: d.metricKey === 'tone' ? d.metricAspect.trim() : undefined,
        metricParams: cleanMetricParams(d),
        isCustom: d.isCustom ? 1 : 0,
        sortOrder: i
      }))
    ))

    // 虚拟陪练者（FP-26：avatarImage 为服务端 URL；本地文件另行以文件字段上传）
    fd.append('virtualTrainer', JSON.stringify({
      trainerName: form.value.trainer.name,
      language: form.value.trainer.language,
      voiceId: form.value.trainer.voiceId,
      speed: form.value.trainer.speed,
      inputLanguage: form.value.trainer.inputLanguage.join(','),
      forbiddenWords: form.value.trainer.forbiddenWords,
      avatarImage: form.value.trainer.avatarImage?.startsWith('blob:') ? '' : (form.value.trainer.avatarImage || '')
    }))

    // FP-26 本地替换的形象图片：以文件字段上传
    if (avatarFile.value) {
      fd.append('avatarImage', avatarFile.value, avatarFile.value.name || 'avatar.png')
    }

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
    align-items: flex-start;

    &:last-child { border-bottom: none; }
  }

  .col-checkbox { width: 50px; }
  .col-name { width: 120px; }
  .col-rule { flex: 1; min-width: 0; }
  .col-evidence { width: 260px; display: flex; flex-direction: column; gap: 6px; }
  .col-weight { width: 100px; display: flex; align-items: center; gap: 4px; }
}

.consistency-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .consistency-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #555;
    cursor: pointer;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 4px;

    input { margin: 0; cursor: pointer; }

    &.active {
      border-color: #1890ff;
      background: #f0f8ff;
      color: #1890ff;
    }
  }

  .consistency-tip {
    margin: 2px 0 0;
    font-size: 11px;
    color: #999;
    line-height: 1.6;
  }
}

.rule-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rule-line {
  display: flex;
  gap: 2px;
  font-size: 13px;
  line-height: 1.55;
  color: #666;
  word-break: break-word;
}

.rule-level {
  flex-shrink: 0;
  color: #1890ff;
  font-weight: 600;
}

.rule-input {
  width: 100%;
  min-height: 120px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  outline: none;
  resize: vertical;

  &:focus { border-color: #1890ff; }
}

.dim-select {
  width: 110px;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  outline: none;
  &:focus { border-color: #1890ff; }
  &:disabled { background: #f5f5f5; color: #bfbfbf; }
}

.metric-picker,
.metric-params {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-params {
  font-size: 12px;
  color: #666;
}

.metric-param-input {
  width: 62px;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;

  &:focus { border-color: #1890ff; }
  &:disabled { background: #f5f5f5; color: #bfbfbf; }
}

.metric-aspect-input {
  width: 88px;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;

  &:focus { border-color: #1890ff; }
  &:disabled { background: #f5f5f5; color: #bfbfbf; }
}

.table-hint {
  font-size: 12px;
  color: #999;
  line-height: 1.7;
  margin: -6px 0 14px;
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
