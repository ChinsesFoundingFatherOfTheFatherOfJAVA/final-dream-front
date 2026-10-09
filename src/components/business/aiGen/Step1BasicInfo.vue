<template>
  <!-- SG-02/03 第一步左栏：描述 + 素材三入口 + 对话开启者 -->
  <div class="step1">
    <div class="form-item">
      <label class="form-label required">请描述想要生成的话术内容</label>
      <textarea
        class="form-textarea"
        v-model="localDescription"
        maxlength="500"
        rows="4"
        placeholder="请描述想要生成的话术内容"
        :disabled="generating"
      ></textarea>
      <div class="char-count">{{ localDescription.length }}/500</div>
      <div class="suggest-box">
        <p>建议：包含对话场景，2个人物，对话目标。</p>
        <p>示例：帮我生成一段保险销售话术，具体场景是一位宝妈想要给2岁的宝宝选购一款重疾险，<b>公司保险经纪人需要探询客户的详细需求并针对性推荐对应的保险产品，引导客户购买。</b></p>
      </div>
    </div>

    <div class="form-item">
      <label class="form-label required">对话素材</label>
      <p class="material-tip">例如产品介绍材料、品牌介绍信息、FAQ等，帮助系统生成相关话术。</p>
      <p class="material-tip">支持格式：.doc、.docx、.ppt、.pptx、.pps，pdf，单个文档小于100M，最多上传3个文档</p>

      <div class="entry-row">
        <button class="entry-btn" :disabled="generating || extracting" @click="showKngDrawer = true">
          <span class="entry-icon">📘</span>从在线课堂选择
        </button>
        <button class="entry-btn disabled" disabled title="功能建设中">
          <span class="entry-icon">📚</span>从知识空间选择
        </button>
        <button class="entry-btn" :disabled="generating || extracting" @click="fileInput?.click()">
          <span class="entry-icon">📁</span>点击上传
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.docx,.doc,.ppt,.pptx,.pps"
          multiple
          hidden
          @change="handleFileChange"
        />
      </div>

      <div v-for="name in extractingNames" :key="'ing-' + name" class="file-item extracting">
        <span class="file-icon doc">…</span>
        <span class="file-name">{{ name }}</span>
        <span class="extracting-tip">解析中...</span>
      </div>

      <div v-for="(m, i) in materials" :key="i" class="file-item">
        <span class="file-icon" :class="extClass(m.fileName)">{{ extGlyph(m.fileName) }}</span>
        <span class="file-name" :title="m.fileName">{{ m.fileName }}</span>
        <span v-if="m.truncated" class="file-truncated" title="素材文本已截断至3万字">已截断</span>
        <span class="file-op" title="预览" @click="previewIndex = i">👁</span>
        <span class="file-op" title="删除" @click="removeMaterial(i)">🗑</span>
      </div>
    </div>

    <div class="form-item">
      <label class="form-label required">对话开启者</label>
      <div class="radio-group">
        <label class="radio-item" :class="{ active: localFirstSpeaker === 'student' }">
          <input type="radio" value="student" v-model="localFirstSpeaker" :disabled="generating" />
          <span>学员</span>
        </label>
        <label class="radio-item" :class="{ active: localFirstSpeaker === 'trainer' }">
          <input type="radio" value="trainer" v-model="localFirstSpeaker" :disabled="generating" />
          <span>陪练者</span>
        </label>
      </div>
    </div>

    <div class="footer-btns">
      <button
        v-if="!hasScene"
        class="btn-ai-outline"
        :disabled="generating || !localDescription.trim()"
        @click="emit('generate')"
      >✨ AI生成对话场景</button>
      <button
        v-else
        class="btn-ai-outline"
        :disabled="generating || !localDescription.trim()"
        @click="emit('generate')"
      >✨ AI重新生成对话场景</button>
    </div>

    <!-- 素材文本预览（眼睛） -->
    <div v-if="previewIndex !== null" class="preview-mask" @click.self="previewIndex = null">
      <div class="preview-box">
        <div class="preview-header">
          <span>{{ materials[previewIndex]?.fileName }}</span>
          <span class="close-btn" @click="previewIndex = null">×</span>
        </div>
        <pre class="preview-text">{{ materials[previewIndex]?.text }}</pre>
      </div>
    </div>

    <!-- SG-03 从在线课堂选择：960px 抽屉（复用课程设计器选课件抽屉骨架，数据源=文档类课件接口） -->
    <KngMaterialDrawer
      v-if="showKngDrawer"
      :z-index="3100"
      :exclude-ids="selectedKngIds"
      @close="showKngDrawer = false"
      @confirm="handleKngConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import KngMaterialDrawer from './KngMaterialDrawer.vue'
import { toast } from '@/utils/toast'
import { extractMaterial, extractKngMaterial, type MaterialItem } from '@/api/aiGen'

/**
 * 第一步基本信息表单（SG-02/03）。
 * 素材上限：本地+在线课堂合计 3 个（超限 toast）；本地文件上传后即时调后端抽取文本，
 * 前端只持有 materialText（服务端不留存素材本体）。
 */
const props = defineProps<{
  description: string
  firstSpeaker: string
  materials: MaterialItem[]
  generating: boolean
  hasScene: boolean
}>()

const emit = defineEmits<{
  'update:description': [value: string]
  'update:firstSpeaker': [value: string]
  generate: []
  'update:materials': [value: MaterialItem[]]
}>()

const localDescription = computed({
  get: () => props.description,
  set: (v) => emit('update:description', v)
})
const localFirstSpeaker = computed({
  get: () => props.firstSpeaker,
  set: (v) => emit('update:firstSpeaker', v)
})

const fileInput = ref<HTMLInputElement>()
const showKngDrawer = ref(false)
const previewIndex = ref<number | null>(null)
const selectedKngIds = ref<string[]>([])

const setMaterials = (list: MaterialItem[]) => emit('update:materials', list)

/** 素材抽取中（上传/在线课堂）：按钮禁用 + 列表区显示进行中条目，给用户即时反馈 */
const extracting = ref(false)
const extractingNames = ref<string[]>([])

/** 本地上传：逐个抽取（单个失败不阻塞其余），合计 ≤3。
 *  用本地数组累积（连续 await 中 props.materials 是 stale 快照，直接展开会丢前一个文件）。 */
const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  if (props.materials.length + files.length > 3) {
    toast.error('最多上传3个文档')
    return
  }
  const added: MaterialItem[] = []
  extracting.value = true
  extractingNames.value = files.map((f) => f.name)
  try {
    for (const file of files) {
      extractingNames.value = [file.name]
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name} 超过100M`)
        continue
      }
      try {
        const res: any = await extractMaterial(file)
        added.push({
          fileName: res.fileName || file.name,
          text: res.text || '',
          truncated: !!res.truncated
        })
      } catch (e: any) {
        toast.error(`${file.name}: ${e?.message || '抽取失败'}`)
      }
    }
    if (added.length) {
      setMaterials([...props.materials, ...added])
      toast.info(`已添加 ${added.length} 个素材`)
    }
  } finally {
    extracting.value = false
    extractingNames.value = []
  }
}

/** 在线课堂确认：逐个课件抽取其第一个文档类源文件。 */
const handleKngConfirm = async (items: { id: string; title: string }[]) => {
  showKngDrawer.value = false
  if (!items.length) return
  if (props.materials.length + items.length > 3) {
    toast.error('最多上传3个文档')
    return
  }
  const added: MaterialItem[] = []
  extracting.value = true
  try {
    for (const item of items) {
      extractingNames.value = [item.title]
      try {
        const res: any = await extractKngMaterial(item.id)
        added.push({
          fileName: res.fileName || item.title,
          text: res.text || '',
          truncated: !!res.truncated
        })
        selectedKngIds.value.push(item.id)
      } catch (e: any) {
        toast.error(`${item.title}: ${e?.message || '抽取失败'}`)
      }
    }
    if (added.length) {
      setMaterials([...props.materials, ...added])
      toast.info(`已添加 ${added.length} 个素材`)
    }
  } finally {
    extracting.value = false
    extractingNames.value = []
  }
}

const removeMaterial = (index: number) => {
  const next = [...props.materials]
  next.splice(index, 1)
  setMaterials(next)
}

const extOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase()
const extClass = (name: string) => {
  const ext = extOf(name)
  return { pdf: 'pdf', ppt: 'ppt', pptx: 'ppt', pps: 'ppt' }[ext] || 'doc'
}
const extGlyph = (name: string) => {
  const ext = extOf(name)
  return { pdf: 'PDF', ppt: 'PPT', pptx: 'PPT', pps: 'PPT' }[ext] || 'DOC'
}
</script>

<style scoped lang="scss">
.step1 { display: flex; flex-direction: column; gap: 18px; }

.form-label {
  display: block;
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;

  &.required::after { content: ' *'; color: #f5222d; }
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 88px;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: #6b5ce7; }
}

.char-count { text-align: right; font-size: 12px; color: #999; margin-top: 4px; }

.suggest-box {
  background: #f5f5f7;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.8;
  margin-top: 8px;

  p { margin: 0; }
  b { color: #595959; }
}

.material-tip { font-size: 12px; color: #999; margin: 0 0 4px; }

.entry-row { display: flex; gap: 10px; margin-top: 8px; }

.entry-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #333;
  cursor: pointer;

  .entry-icon { font-size: 15px; }
  &:hover { border-color: #6b5ce7; color: #6b5ce7; }
  &.disabled, &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.file-item.extracting {
  .file-name { color: #999; }
  .extracting-tip { font-size: 12px; color: #6b5ce7; }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 13px;

  .file-icon {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.pdf { background: #f5222d; }
    &.ppt { background: #d4380d; }
    &.doc { background: #1e6fff; }
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
  }

  .file-truncated {
    font-size: 11px;
    color: #faad14;
    border: 1px solid #faad14;
    border-radius: 3px;
    padding: 0 4px;
  }

  .file-op { cursor: pointer; color: #999; &:hover { color: #333; } }
}

.radio-group { display: flex; gap: 10px; }

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  cursor: pointer;

  input { margin: 0; cursor: pointer; }
  &.active { border-color: #6b5ce7; background: #f0edff; color: #6b5ce7; }
}

.footer-btns { margin-top: auto; padding-top: 8px; }

.btn-ai-outline {
  width: 100%;
  padding: 10px 0;
  border: 1px solid #6b5ce7;
  border-radius: 8px;
  background: #fff;
  color: #6b5ce7;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: #f0edff; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3200;
}

.preview-box {
  width: 640px;
  max-height: 70vh;
  background: #fff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
    font-weight: 500;

    .close-btn { font-size: 20px; color: #999; cursor: pointer; }
  }

  .preview-text {
    margin: 0;
    padding: 16px;
    overflow-y: auto;
    font-size: 13px;
    color: #555;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
