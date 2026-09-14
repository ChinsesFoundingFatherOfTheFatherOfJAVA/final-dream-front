<template>
  <div class="project-basic">
    <!-- 基本信息板块 -->
    <section class="form-section">
      <h3 class="section-title">基本信息</h3>

      <div class="info-grid">
        <div class="info-item">
          <label class="info-label">类型</label>
          <div class="info-value">{{ project.projectType ? '通关考核' : '日常训练' }}</div>
        </div>

        <div class="info-item" v-if="project.projectType === 1">
          <label class="info-label">名称</label>
          <div class="info-value info-name">{{ project.name || '—' }}</div>
        </div>

        <div class="info-item">
          <label class="info-label">分类</label>
          <div class="info-value">—</div>
        </div>

        <div class="info-item">
          <label class="info-label">编号</label>
          <div class="info-value">{{ project.code || '—' }}</div>
        </div>

        <div class="info-item info-item-wide">
          <label class="info-label">起止时间</label>
          <div class="info-value">{{ project.startTime }} ~ {{ project.endTime }}</div>
        </div>

        <div class="info-item info-item-wide">
          <label class="info-label">说明信息</label>
          <div class="info-value info-description">{{ project.description || '—' }}</div>
        </div>

        <div class="info-item" v-if="project.projectType === 1">
          <label class="info-label">达标分数</label>
          <div class="info-value">{{ project.passScore ?? '—' }} 分</div>
        </div>

        <div class="info-item" v-if="project.projectType === 1">
          <label class="info-label">通关策略</label>
          <div class="info-value">{{ project.passStrategyText || '—' }}</div>
        </div>

        <div class="info-item">
          <label class="info-label">负责人</label>
          <div class="info-value">{{ project.responsiblePersonText || '—' }}</div>
        </div>

        <div class="info-item">
          <label class="info-label">上传封面</label>
          <div class="info-value">
            <div class="cover-preview" v-if="project.coverImage">
              <img :src="project.coverImage" alt="cover" />
            </div>
            <div v-else class="cover-placeholder">📘 默认封面</div>
          </div>
        </div>

        <div class="info-item">
          <label class="info-label">对话方式</label>
          <div class="info-value">{{ project.dialogueMode === 0 ? '语音对话' : '文字对话' }}</div>
        </div>
      </div>
    </section>

    <!-- 评分维度板块 -->
    <section class="form-section">
      <h3 class="section-title">评分维度</h3>

      <div class="dims-table">
        <div class="dims-header">
          <div class="dim-label-col">维度名称</div>
          <div class="dim-rule-col">评分规则</div>
          <div class="dim-weight-col">权重</div>
        </div>
        <div class="dims-row" v-for="d in dimensions" :key="d.id">
          <div class="dim-label-col">{{ d.name }}</div>
          <div class="dim-rule-col">
            <div class="rule-title">{{ d.scoringRule }}</div>
            <div class="rule-detail" v-if="d.detail">{{ d.detail }}</div>
          </div>
          <div class="dim-weight-col">{{ d.weight }}%</div>
        </div>
      </div>
    </section>

    <!-- 虚拟陪练者设置板块 -->
    <section class="form-section">
      <h3 class="section-title">虚拟陪练者设置</h3>

      <div class="info-grid">
        <div class="info-item">
          <label class="info-label">
            陪练者名称
            <span class="required">*</span>
          </label>
          <div class="info-value">{{ project.trainer?.name || '—' }}</div>
        </div>

        <div class="info-item">
          <label class="info-label">
            陪练者朗读语音及声音
            <span class="required">*</span>
          </label>
          <div class="info-value">
            {{ project.trainer?.language || '—' }} / {{ project.trainer?.voiceName || '—' }}
          </div>
        </div>

        <div class="info-item">
          <label class="info-label">
            学员录入语言
            <span class="required">*</span>
          </label>
          <div class="info-value">{{ project.trainer?.inputLanguage || '—' }}</div>
        </div>

        <div class="info-item">
          <label class="info-label">语速</label>
          <div class="info-value">{{ project.trainer?.speed ?? 0 }}</div>
        </div>

        <div class="info-item info-item-wide">
          <label class="info-label">违禁词</label>
          <div class="info-value">{{ project.trainer?.forbiddenWords || '—' }}</div>
        </div>

        <div class="info-item info-item-wide">
          <label class="info-label">预览效果</label>
          <div class="info-value">
            <div class="cover-preview-large">
              <span class="preview-icon">👤</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getProjectDetail } from '@/api/project'

const route = useRoute()
const projectId = Number(route.params.id)

interface Project {
  id?: number
  name: string
  projectType: number
  code: string
  description: string
  startTime: string
  endTime: string
  passScore: number | null
  passStrategy: number | null
  passStrategyN: number | null
  passStrategyText: string
  responsiblePersonText: string
  coverImage: string | null
  dialogueMode: number
  trainer?: {
    name: string
    language: string
    voiceName: string
    speed: number
    inputLanguage: string
    forbiddenWords: string
  }
}

interface Dimension {
  id: number
  name: string
  scoringRule: string
  detail: string
  weight: number
}

const project = ref<Project>({
  name: '',
  projectType: 0,
  code: '',
  description: '',
  startTime: '',
  endTime: '',
  passScore: null,
  passStrategy: null,
  passStrategyN: null,
  passStrategyText: '',
  responsiblePersonText: '',
  coverImage: null,
  dialogueMode: 0
})

const dimensions = ref<Dimension[]>([])

// 后端 ruleType 数字 → 文案
const RULE_TYPE_TEXT: Record<number, string> = {
  1: '精准逐字匹配',
  2: '按照要点表达即可',
  3: '混合模式',
  4: '分级评分',
  5: '公式计算',
  6: '扣分制'
}

const PASS_STRATEGY_TEXT: Record<number, string> = {
  1: '单次达标即通关',
  2: '累计达标n次',
  3: '连续达标n次'
}

const loadDetail = async () => {
  try {
    const res: any = await getProjectDetail(projectId)
    project.value = {
      ...project.value,
      name: res.name || '',
      projectType: res.projectType ?? 0,
      code: res.code || '',
      description: res.description || '',
      startTime: (res.startTime || '').replace('T', ' ').slice(0, 16),
      endTime: (res.endTime || '').replace('T', ' ').slice(0, 16),
      passScore: res.passScore ?? null,
      passStrategy: res.passStrategy ?? null,
      passStrategyN: res.passStrategyN ?? null,
      passStrategyText: PASS_STRATEGY_TEXT[res.passStrategy] || '',
      responsiblePersonText: res.responsiblePersonName
        ? `${res.responsiblePersonName}(${res.responsiblePerson || ''})`
        : '',
      coverImage: res.coverImage || null,
      dialogueMode: res.dialogueMode ?? 0,
      trainer: res.virtualTrainer ? {
        name: res.virtualTrainer.trainerName || '',
        language: res.virtualTrainer.language || '',
        voiceName: res.virtualTrainer.voiceId || '',
        speed: res.virtualTrainer.speed ?? 30,
        inputLanguage: res.virtualTrainer.inputLanguage || '',
        forbiddenWords: res.virtualTrainer.forbiddenWords || ''
      } : undefined
    }
    dimensions.value = (res.scoringDimensions || []).map((d: any) => ({
      id: d.id,
      name: d.dimensionName,
      scoringRule: RULE_TYPE_TEXT[d.ruleType] || d.scoringRule,
      detail: d.scoringRule || '',
      weight: d.weight
    }))
  } catch { /* handled */ }
}

onMounted(loadDetail)
</script>

<style scoped lang="scss">
.project-basic {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .section-title {
    font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  padding-left: 12px;
  border-left: 3px solid #1890ff;
}
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 60px;
}

.info-item-wide {
  grid-column: span 2;
}

.info-label {
  font-size: 14px;
  color: #666;

  .required {
    color: #f5222d;
    margin-left: 4px;
  }
}

.info-value {
  font-size: 14px;
  color: #333;
  word-break: break-all;
}

.info-name { font-size: 16px; font-weight: 500; }

.info-description {
  background: #fafafa;
  border-radius: 4px;
  padding: 12px;
  line-height: 1.6;
  min-height: 60px;
}

.cover-preview {
  width: 80px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.cover-placeholder {
  width: 80px;
  height: 60px;
  border-radius: 4px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
}

.cover-preview-large {
  width: 200px;
  height: 280px;
  border-radius: 4px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  .preview-icon {
    font-size: 80px;
    color: #999;
  }
}

// 评分维度表格
.dims-table {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.dims-header {
  display: flex;
  background: #fafafa;
  padding: 12px 16px;
  font-weight: 500;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
}

.dims-row {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  align-items: flex-start;

  &:last-child { border-bottom: none; }
}

.dim-label-col { width: 120px; flex-shrink: 0; color: #333; font-size: 14px; }
.dim-rule-col { flex: 1; padding: 0 16px; }
.dim-weight-col { width: 100px; text-align: right; color: #1890ff; font-weight: 500; flex-shrink: 0; }

.rule-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.rule-detail {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}
</style>
