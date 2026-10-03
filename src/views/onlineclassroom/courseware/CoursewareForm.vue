<template>
  <div class="courseware-form-page">
    <header class="form-header">
      <button type="button" class="back-btn" @click="goBack">‹</button>
      <h1>{{ pageTitle }}</h1>
    </header>

    <div v-if="stage === 'upload'" class="upload-stage">
      <label
        class="drop-zone"
        :class="{ dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input
          ref="uploadInput"
          type="file"
          :accept="accept"
          :multiple="variant === 'file'"
          @change="onFilesSelected"
        />
        <span class="upload-cloud">⇧</span>
        <strong>拖拽或点击此处选择文件</strong>
        <small>{{ uploadHint }}</small>
      </label>

      <div v-if="uploadRows.length" class="upload-list">
        <div v-for="row in uploadRows" :key="row.key" class="upload-row">
          <div class="upload-file">
            <span>{{ fileGlyph(row.fileName) }}</span>
            <strong>{{ row.fileName }}</strong>
          </div>
          <div class="progress-track">
            <i :style="{ width: `${row.progress}%` }"></i>
          </div>
          <em>{{ row.progress }}%</em>
          <button v-if="row.error" type="button" @click="retryRow(row)">重试</button>
        </div>
      </div>

      <section class="upload-notes">
        <div>
          <h3>上传须知：</h3>
          <p>1.一次最多同时上传10个文件，文件夹不支持上传</p>
          <p>2.请勿上传已设置加密或者只读的文档，否则系统将无法转换而报错</p>

          <h3>支持的格式大小：</h3>
          <template v-if="variant === 'file'">
            <p>1.文档：.doc、.docx、.ppt、.pptx、.xls、.xlsx、.pps、.pdf；单个文档小于200MB</p>
            <p>2.图片：.jpg、.jpeg、.gif、.png、.bmp；单个图片小于100MB，且图片长和宽不大于10000px</p>
            <p>3.视频：.wmv、.mp4、.flv、.avi、.rmvb、.mpg、.mkv、.mov、.mts；单个视频小于5GB</p>
            <p>4.音频：.m4a、.wma、.wav、.mp3、.amr；单个音频小于1GB</p>
            <p>5.压缩文件：.rar、.zip；单个压缩文件小于2GB</p>
          </template>
          <p v-else>压缩文件：.zip；单个压缩文件小于3GB</p>
        </div>
      </section>
    </div>

    <div v-if="formLoading" class="form-loading">加载中...</div>

    <div v-else-if="stage !== 'upload'" class="form-body">
      <aside class="anchor-nav">
        <button
          v-for="item in anchors"
          :key="item.key"
          type="button"
          :class="{ active: activeAnchor === item.key }"
          @click="scrollTo(item.key)"
        >
          {{ item.label }}
        </button>
      </aside>

      <main ref="formScroll" class="form-scroll">
        <section ref="fileSection" class="form-section" data-anchor="file">
          <h2><i></i>{{ variant === 'link' ? '课件链接' : '上传文件' }}</h2>
          <template v-if="variant === 'link'">
            <div class="table-shell link-table">
              <div class="table-head">
                <span>课件链接</span>
                <span>所属语种</span>
                <span>操作</span>
              </div>
              <div v-for="(link, index) in form.links" :key="index" class="table-row">
                <span class="drag-handle">⋮⋮</span>
                <input v-model.trim="link.storagePath" maxlength="500" placeholder="请输入课件网址，建议使用https格式的网址" />
                <span>{{ languageLabel(link.language) }}</span>
                <div class="row-actions">
                  <button type="button" @click="openLanguage(link)">设置语种</button>
                  <button type="button" @click="removeLink(index)">删除</button>
                </div>
              </div>
            </div>
            <button type="button" class="text-btn" @click="addLink">+ 添加外链</button>
          </template>
          <template v-else>
            <input
              ref="additionalInput"
              class="hidden-file-input"
              type="file"
              multiple
              :accept="accept"
              @change="onAdditionalSelected"
            />
            <div class="table-shell file-table">
              <div class="table-head">
                <span>文件名称</span>
                <span>状态</span>
                <span>所属语种</span>
                <span>操作</span>
              </div>
              <div v-for="(file, index) in form.files" :key="file.storagePath" class="table-row">
                <span class="file-name"><i>☷</i>{{ file.fileName }}</span>
                <span>--</span>
                <span>{{ languageLabel(file.language) }}</span>
                <div class="row-actions">
                  <button type="button" @click="openLanguage(file)">设置语种</button>
                  <button type="button" @click="removeFile(index)">删除</button>
                </div>
              </div>
            </div>
            <button type="button" class="text-btn" @click="appendFiles">+ 上传文件</button>
          </template>
        </section>

        <section ref="basicSection" class="form-section" data-anchor="basic">
          <h2><i></i>基本信息</h2>
          <div class="form-grid">
            <label class="field span-2">
              <span>名称<em>*</em></span>
              <div class="input-wrap">
                <input v-model.trim="form.title" maxlength="200" placeholder="请输入课件名称" />
                <small>{{ form.title.length }}/200</small>
              </div>
              <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
            </label>

            <label class="field span-2">
              <span>分类<em>*</em></span>
              <div class="inline-control">
                <select v-model="form.catalogId">
                  <option value="">请选择分类</option>
                  <option v-for="node in flatCatalogs" :key="node.id" :value="node.id">
                    {{ '　'.repeat(Math.max(0, node.level - 1)) }}{{ node.name }}
                  </option>
                </select>
                <button type="button" class="ghost-small" @click="openCatalogWindow">新增分类</button>
              </div>
              <p v-if="errors.catalogId" class="field-error">{{ errors.catalogId }}</p>
            </label>

            <div class="field span-2">
              <span>封面</span>
              <label class="cover-upload" :class="{ 'has-cover': Boolean(form.coverStoragePath) }">
                <input type="file" accept=".jpg,.jpeg,.png" @change="onCoverSelected" />
                <img v-if="coverPreview" :src="coverPreview" alt="课件封面" />
                <template v-else>
                  <strong>＋</strong>
                  <small>设置封面</small>
                </template>
              </label>
              <small class="field-help">支持 jpg/png，不超过 5MB，推荐 16:9</small>
            </div>

            <div v-if="form.type !== 8" class="field span-2">
              <span>{{ durationRequired ? '标准时长' : '标准时长' }}<em v-if="durationRequired">*</em></span>
              <template v-if="showDurationMode">
                <div class="radio-stack">
                  <label :class="{ disabled: true }">
                    <input type="radio" :checked="false" disabled />
                    <span>跟随学分策略（课程设置-学分策略设置）</span>
                    <i title="文档解析功能建设中，请单独设置">!</i>
                  </label>
                  <label>
                    <input v-model="durationMode" type="radio" value="custom" />
                    <span>单独设置时长</span>
                  </label>
                </div>
              </template>
              <div class="duration-input">
                <input v-model.number="form.standardMinutes" type="number" min="0" max="1440" />
                <span>分</span>
                <input v-model.number="form.standardSeconds" type="number" min="0" max="59" />
                <span>秒</span>
                <small>（获得学分所需的学习时长）</small>
              </div>
            </div>

            <div v-if="form.type !== 8" class="field span-2">
              <span>学分<em>*</em></span>
              <div class="radio-stack">
                <label>
                  <input v-model="scoreMode" type="radio" value="follow" />
                  <span>跟随学分策略（课程设置-学分策略设置）</span>
                  <strong>{{ calculatedScore }} 学分</strong>
                </label>
                <label>
                  <input v-model="scoreMode" type="radio" value="custom" />
                  <span>单独设置学分</span>
                </label>
                <div v-if="scoreMode === 'custom'" class="inline-control compact">
                  <input v-model.number="form.studyScore" type="number" min="0.1" step="0.1" />
                  <span>学分</span>
                </div>
              </div>
            </div>

            <div class="field span-2">
              <span>完课标准</span>
              <template v-if="variant === 'link'">
                <p class="plain-note">外链课件无法记录学习进度，学员打开课件即算完成</p>
              </template>
              <template v-else>
                <div class="finish-standard">
                  <select v-model.number="form.finishStandardPercent" :disabled="isPublished">
                    <option v-for="value in finishOptions" :key="value" :value="value">{{ value }}%</option>
                  </select>
                  <span>完成标准时长的</span>
                  <strong>{{ form.finishStandardPercent }}%</strong>
                  <span>获得学分</span>
                </div>
                <p v-if="isPublished" class="orange-tip">课件发布之后，完课标准无法再次编辑</p>
              </template>
            </div>

            <label class="field span-2">
              <span>简介</span>
              <div class="textarea-wrap">
                <textarea v-model="form.description" maxlength="2000" placeholder="请输入课件简介"></textarea>
                <small>{{ form.description.length }}/2000</small>
              </div>
            </label>

            <div class="field span-2">
              <span>附件</span>
              <label class="ghost-small upload-attachment">
                <input
                  type="file"
                  multiple
                  :accept="attachmentAccept"
                  @change="onAttachmentsSelected"
                />
                ⇧ 上传附件
              </label>
              <small class="field-help">最多上传 50 个，学员可下载附件，支持类型：视频/音频/文档/图片/压缩包</small>
              <div v-if="form.attachmentPaths.length" class="attachment-list">
                <div v-for="(attachment, index) in form.attachmentPaths" :key="attachment.storagePath">
                  <span>{{ attachment.fileName }}</span>
                  <button type="button" @click="form.attachmentPaths.splice(index, 1)">删除</button>
                </div>
              </div>
            </div>

            <label class="field">
              <span>编码</span>
              <input v-model.trim="form.code" maxlength="100" placeholder="请输入编码" />
            </label>
            <label class="field">
              <span>版本</span>
              <input v-model.trim="form.versionStr" maxlength="100" placeholder="请输入版本" />
            </label>
          </div>
        </section>

        <section ref="contributorSection" class="form-section" data-anchor="contributor">
          <h2><i></i>相关方信息</h2>
          <div class="field span-2">
            <span>贡献者<em>*</em></span>
            <div class="contributor-tag">
              <span>{{ contributorText }}</span>
              <button type="button" aria-label="移除贡献者" @click="removeContributor">×</button>
              <i>...</i>
            </div>
          </div>
        </section>

        <section ref="permissionSection" class="form-section" data-anchor="permission">
          <h2><i></i>权限设置</h2>
          <div class="permission-form">
            <div class="permission-line">
              <span>浏览权限</span>
              <div class="radio-stack">
                <label><input v-model.number="form.viewPermission" type="radio" :value="1" /><span>跟随分类浏览权限</span></label>
                <label><input v-model.number="form.viewPermission" type="radio" :value="2" /><span>单独设置允许浏览</span></label>
              </div>
            </div>

            <div class="permission-line">
              <span>下载权限</span>
              <div class="radio-stack">
                <label>
                  <input v-model="form.downloadEnabled" type="checkbox" />
                  <span>允许下载（控制PC端、App端是否允许下载）</span>
                </label>
                <label :class="{ disabled: !form.downloadEnabled }">
                  <input v-model.number="form.downloadPermission" type="radio" :value="1" :disabled="!form.downloadEnabled" />
                  <span>跟随分类中的「允许下载课件」权限</span>
                </label>
                <label :class="{ disabled: !form.downloadEnabled }">
                  <input v-model.number="form.downloadPermission" type="radio" :value="2" :disabled="!form.downloadEnabled" />
                  <span>单独设置允许下载</span>
                </label>
              </div>
            </div>

            <div class="permission-line">
              <span>下载文件</span>
              <p>学员下载的文件为源文件</p>
            </div>

            <div class="permission-line">
              <span>App保存课件权限</span>
              <div class="radio-stack">
                <label>
                  <input v-model="form.appSaveEnabled" type="checkbox" />
                  <span>允许保存（保存后，学员在App内无需流量即可查看，但不能分享、转发）</span>
                </label>
                <label :class="{ disabled: !form.appSaveEnabled }">
                  <input v-model.number="form.appSavePermission" type="radio" :value="1" :disabled="!form.appSaveEnabled" />
                  <span>跟随分类中的「App保存课件」权限</span>
                </label>
                <label :class="{ disabled: !form.appSaveEnabled }">
                  <input v-model.number="form.appSavePermission" type="radio" :value="2" :disabled="!form.appSaveEnabled" />
                  <span>单独设置允许保存</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section ref="functionSection" class="form-section" data-anchor="function">
          <h2><i></i>功能设置</h2>
          <div class="switch-stack">
            <label :class="{ disabled: speedLocked }">
              <input v-model="form.speedEnabled" type="checkbox" :disabled="speedLocked" />
              <span>开启倍速播放（开启后，学员可以按1.25/1.5/1.75/2倍速播放视频）</span>
            </label>
            <label :class="{ disabled: hoursLocked }">
              <input v-model="form.speedHoursCalc" type="checkbox" :disabled="hoursLocked" />
              <span>倍速播放时学习时长也倍速计算（举例：学员2倍速学习5分钟，学习时长算10分钟）</span>
            </label>
            <label>
              <input v-model="form.aiSubtitleEnabled" type="checkbox" />
              <span>开启AI字幕（开启后，该课件会生成字幕文稿，生成能力待专项上线）</span>
            </label>
          </div>
        </section>
      </main>
    </div>

    <footer v-if="stage !== 'upload'" class="form-footer">
      <span v-if="errors.form" class="form-error">{{ errors.form }}</span>
      <button type="button" class="publish-btn" :disabled="saving" @click="submit">
        {{ saving ? '处理中...' : mode === 'edit' ? '保存' : '发布' }}
      </button>
    </footer>

    <teleport to="body">
      <div v-if="languageVisible" class="language-mask" @click.self="languageVisible = false">
        <section class="language-dialog">
          <h3>设置语种</h3>
          <label v-for="item in languages" :key="item.value">
            <input v-model="selectedLanguage" type="radio" :value="item.value" />
            <span>{{ item.label }}</span>
          </label>
          <footer>
            <button type="button" @click="languageVisible = false">取消</button>
            <button type="button" class="primary" @click="saveLanguage">确定</button>
          </footer>
        </section>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getKngCatalogTree, getKngSetting, type KngSetting, type KngTreeNode } from '@/api/kng'
import {
  createCourseware,
  getCoursewareDetail,
  updateCourseware,
  type CoursewareFile,
  type CoursewareSaveReq
} from '@/api/courseware'
import { resolveAssetUrl } from '@/api/request'
import { uploadFile } from '@/utils/chunkUploader'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

type Variant = 'file' | 'scorm' | 'html' | 'link'
type EditableFile = CoursewareFile & { storagePath: string }

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  variant: Variant
}>(), {
  mode: 'create',
  variant: 'file'
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const formScroll = ref<HTMLElement | null>(null)
const fileSection = ref<HTMLElement | null>(null)
const basicSection = ref<HTMLElement | null>(null)
const contributorSection = ref<HTMLElement | null>(null)
const permissionSection = ref<HTMLElement | null>(null)
const functionSection = ref<HTMLElement | null>(null)
const uploadInput = ref<HTMLInputElement | null>(null)
const additionalInput = ref<HTMLInputElement | null>(null)
const stage = ref<'upload' | 'form'>(props.mode === 'edit' || props.variant === 'link' ? 'form' : 'upload')
const dragging = ref(false)
const saving = ref(false)
const formLoading = ref(false)
const activeAnchor = ref('file')
const languageVisible = ref(false)
const selectedLanguage = ref('zh')
let languageTarget: EditableFile | null = null
const settings = ref<KngSetting | null>(null)
const settingsLoaded = ref(false)
const catalogs = ref<KngTreeNode[]>([])
const detailStatus = ref(0)
const contributorRemoved = ref(false)
const contributorName = ref('')
const contributorAccount = ref('')
const durationMode = ref<'custom' | 'follow'>('custom')
const scoreMode = ref<'follow' | 'custom'>('follow')

const uploadRows = ref<Array<{
  key: string
  file: File | null
  fileName: string
  progress: number
  error: boolean
}>>([])

const form = reactive<CoursewareSaveReq>({
  title: '',
  type: props.variant === 'scorm' ? 6 : props.variant === 'html' ? 7 : props.variant === 'link' ? 8 : 1,
  catalogId: '',
  standardMinutes: 0,
  standardSeconds: 0,
  standardDurationFollow: false,
  studyScore: null,
  finishStandardPercent: 100,
  description: '',
  coverStoragePath: null,
  code: '',
  versionStr: '',
  viewPermission: 1,
  downloadEnabled: true,
  downloadPermission: 1,
  appSaveEnabled: true,
  appSavePermission: 1,
  speedEnabled: true,
  speedHoursCalc: true,
  aiSubtitleEnabled: false,
  files: [],
  links: [{ fileName: '外链课', fileSize: 0, language: 'zh', storagePath: '' }],
  attachmentPaths: []
})

const errors = reactive<{ title?: string; catalogId?: string; form?: string }>({})
const anchors = [
  { key: 'file', label: props.variant === 'link' ? '课件链接' : '上传文件' },
  { key: 'basic', label: '基本信息' },
  { key: 'contributor', label: '相关方信息' },
  { key: 'permission', label: '权限设置' },
  { key: 'function', label: '功能设置' }
]
const languages = [
  { value: 'zh', label: '简体中文' },
  { value: 'tw', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' }
]
const finishOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 10)
const pageTitle = computed(() => {
  if (props.mode === 'edit') return '编辑课件'
  return props.variant === 'link' ? '发布课件-外部链接' : '发布课件'
})
const isPublished = computed(() => props.mode === 'edit' && [2, 3].includes(detailStatus.value))
const durationRequired = computed(() => [2, 3, 4, 6].includes(form.type))
const showDurationMode = computed(() => [1, 4, 7].includes(form.type))
const accept = computed(() => {
  if (props.variant === 'scorm' || props.variant === 'html') return '.zip'
  return '.doc,.docx,.ppt,.pptx,.xls,.xlsx,.pps,.pdf,.jpg,.jpeg,.gif,.png,.bmp,.wmv,.mp4,.flv,.avi,.rmvb,.mpg,.mkv,.mov,.mts,.m4a,.wma,.wav,.mp3,.amr,.rar,.zip'
})
const attachmentAccept = computed(() => accept.value)
const uploadHint = computed(() =>
  props.variant === 'file'
    ? '支持：文档、图片、视频、音频、压缩文件'
    : '支持：压缩文件，大小限制3GB内'
)
const contributorText = computed(() =>
  contributorRemoved.value ? '--' : `${contributorName.value}(${contributorAccount.value})`
)
const flatCatalogs = computed(() => {
  const result: Array<KngTreeNode & { level: number }> = []
  const walk = (nodes: KngTreeNode[], level: number) => {
    for (const node of nodes) {
      result.push({ ...node, level })
      walk(node.children ?? [], level + 1)
    }
  }
  walk(catalogs.value, 1)
  return result
})
const coverPreview = computed(() => resolveAssetUrl(form.coverStoragePath))
const speedLocked = computed(() => {
  const play = settings.value?.playConf
  if (!play) return false
  return !play.speedEnabled || play.speedScope === 1
})
const hoursLocked = computed(() => {
  const play = settings.value?.playConf
  return !play || !play.speedHoursCalc || !form.speedEnabled
})
const calculatedScore = computed(() => {
  const score = settings.value?.scoreConf
  if (!score || form.type === 8) return '0.00'
  const totalMinutes = Number(form.standardMinutes || 0) + Number(form.standardSeconds || 0) / 60
  if (form.type === 2 || form.type === 3) {
    return calculate(totalMinutes, score.videoAudio.standardMinutes, score.videoAudio.score)
  }
  if (form.type === 6) return calculate(totalMinutes, score.scorm.standardMinutes, score.scorm.score)
  if (form.type === 7) return calculate(totalMinutes, score.html.standardMinutes, score.html.score)
  if (form.type === 5) return calculate(totalMinutes, score.microcourse.standardMinutes, score.microcourse.score)
  return calculate(totalMinutes, score.document.standardMinutes, score.document.score)
})

function calculate(minutes: number, standardMinutes: number, score: number) {
  if (!standardMinutes || !score) return '0.00'
  return (minutes / standardMinutes * score).toFixed(2)
}

function languageLabel(language: string | null) {
  return languages.find(item => item.value === language)?.label || '--'
}

function fileGlyph(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return '▶'
  if (['mp3', 'wav', 'm4a'].includes(ext || '')) return '♫'
  if (['zip', 'rar'].includes(ext || '')) return '▣'
  return 'P'
}

function inferType(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['mp4', 'wmv', 'flv', 'avi', 'rmvb', 'mpg', 'mkv', 'mov', 'mts'].includes(ext)) return 2
  if (['m4a', 'wma', 'wav', 'mp3', 'amr'].includes(ext)) return 3
  if (['rar', 'zip'].includes(ext)) return 4
  return 1
}

function goBack() {
  if (stage.value === 'form' && props.mode === 'create' && props.variant !== 'link') {
    stage.value = 'upload'
    return
  }
  router.push('/kng/courseware')
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const files = [...(event.dataTransfer?.files || [])]
  void handleFiles(files)
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  void handleFiles([...(input.files || [])])
  input.value = ''
}

async function handleFiles(files: File[]) {
  const selected = props.variant === 'file' ? files.slice(0, 10) : files.slice(0, 1)
  if (!selected.length) return
  if (props.variant === 'scorm' || props.variant === 'html') {
    const invalid = selected.find(file => !file.name.toLowerCase().endsWith('.zip'))
    if (invalid) {
      toast.warn('仅支持 zip 文件')
      return
    }
  }
  uploadRows.value = selected.map(file => ({
    key: crypto.randomUUID(),
    file,
    fileName: file.name,
    progress: 0,
    error: false
  }))
  for (const row of uploadRows.value) {
    await uploadRow(row)
  }
  if (uploadRows.value.every(row => row.progress === 100)) {
    stage.value = 'form'
    if (!form.title) form.title = selected[0]!.name.replace(/\.[^.]+$/, '')
    if (!form.files.length && props.variant === 'file') form.type = inferType(selected[0]!.name)
    await nextTick()
  }
}

async function uploadRow(row: typeof uploadRows.value[number]) {
  if (!row.file) return
  try {
    const result = await uploadFile(row.file, progress => {
      row.progress = progress
    })
    row.progress = 100
    row.error = false
    const file: EditableFile = {
      fileName: result.fileName,
      fileSize: result.fileSize,
      language: null,
      storagePath: result.storagePath
    }
    form.files.push(file)
  } catch {
    row.error = true
  }
}

function retryRow(row: typeof uploadRows.value[number]) {
  row.error = false
  void uploadRow(row)
}

function appendFiles() {
  additionalInput.value?.click()
}

function onAdditionalSelected(event: Event) {
  const input = event.target as HTMLInputElement
  void handleFiles([...(input.files || [])])
  input.value = ''
}

function removeFile(index: number) {
  form.files.splice(index, 1)
}

function addLink() {
  form.links.push({ fileName: '外链课', fileSize: 0, language: 'zh', storagePath: '' })
}

function removeLink(index: number) {
  if (form.links.length === 1) return
  form.links.splice(index, 1)
}

function openLanguage(target: EditableFile) {
  languageTarget = target
  selectedLanguage.value = target.language || 'zh'
  languageVisible.value = true
}

function saveLanguage() {
  if (languageTarget) languageTarget.language = selectedLanguage.value
  languageVisible.value = false
}

function removeContributor() {
  contributorRemoved.value = true
}

function openCatalogWindow() {
  window.open(`${window.location.origin}${window.location.pathname}#/kng/catalog`, '_blank')
}

async function onCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.warn('封面不能超过 5MB')
    return
  }
  const result = await uploadFile(file)
  form.coverStoragePath = result.storagePath
}

async function onAttachmentsSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])]
  input.value = ''
  if (form.attachmentPaths.length + files.length > 50) {
    toast.warn('附件最多上传 50 个')
    return
  }
  for (const file of files) {
    const result = await uploadFile(file)
    form.attachmentPaths.push({
      storagePath: result.storagePath,
      fileName: result.fileName,
      fileSize: result.fileSize
    })
  }
}

function scrollTo(key: string) {
  const targets: Record<string, HTMLElement | null> = {
    file: fileSection.value,
    basic: basicSection.value,
    contributor: contributorSection.value,
    permission: permissionSection.value,
    function: functionSection.value
  }
  activeAnchor.value = key
  targets[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function load() {
  catalogs.value = await getKngCatalogTree()
  settings.value = await getKngSetting()
  settingsLoaded.value = true
  contributorName.value = auth.user?.name || auth.displayName
  contributorAccount.value = auth.user?.account || '--'
  applyGlobalPlaySettings()

  // 增补B：列表页左树有选中分类时，创建表单通过 query.catalogId 继承预选（四种发布途径共用）
  const presetCatalogId = route.query.catalogId ? String(route.query.catalogId) : ''
  if (props.mode === 'create' && presetCatalogId && flatCatalogs.value.some(node => node.id === presetCatalogId)) {
    form.catalogId = presetCatalogId
  }

  if (props.mode === 'edit') {
    formLoading.value = true
    try {
      const detail = await getCoursewareDetail(String(route.params.id))
      Object.assign(form, {
        title: detail.title,
        type: detail.type,
        catalogId: detail.catalogId,
        standardMinutes: detail.standardMinutes,
        standardSeconds: detail.standardSeconds,
        standardDurationFollow: detail.standardDurationFollow,
        studyScore: detail.studyScore,
        finishStandardPercent: detail.finishStandardPercent,
        description: detail.description || '',
        coverStoragePath: detail.coverUrl,
        code: detail.code || '',
        versionStr: detail.versionStr || '',
        viewPermission: detail.viewPermission,
        downloadEnabled: detail.downloadEnabled,
        downloadPermission: detail.downloadPermission,
        appSaveEnabled: detail.appSaveEnabled,
        appSavePermission: detail.appSavePermission,
        speedEnabled: detail.speedEnabled,
        speedHoursCalc: detail.speedHoursCalc,
        aiSubtitleEnabled: detail.aiSubtitleEnabled,
        files: detail.files.map(file => ({ ...file })),
        links: detail.type === 8 ? detail.files.map(file => ({ ...file })) : [],
        attachmentPaths: detail.attachments.map(item => ({
          storagePath: item.storagePath || '',
          fileName: item.fileName,
          fileSize: item.fileSize
        }))
      })
      detailStatus.value = detail.status
      durationMode.value = detail.standardDurationFollow ? 'follow' : 'custom'
      scoreMode.value = detail.studyScore === null ? 'follow' : 'custom'
      contributorRemoved.value = !detail.contributor
      contributorName.value = detail.contributor?.name || contributorName.value
      contributorAccount.value = detail.contributor?.account || contributorAccount.value
      applyGlobalPlaySettings()
    } finally {
      formLoading.value = false
    }
  }
}

function applyGlobalPlaySettings() {
  const play = settings.value?.playConf
  if (!play) return
  if (!play.speedEnabled) {
    form.speedEnabled = false
    form.speedHoursCalc = false
  } else if (play.speedScope === 1) {
    form.speedEnabled = true
  }
  if (!play.speedHoursCalc) {
    form.speedHoursCalc = false
  }
}

async function submit() {
  errors.title = undefined
  errors.catalogId = undefined
  errors.form = undefined
  if (!form.title.trim()) errors.title = '请输入课件名称'
  if (!form.catalogId) errors.catalogId = '请选择所属分类'
  if (props.variant !== 'link' && !form.files.length) errors.form = '请上传课件文件'
  if (props.variant === 'link' && !form.links.some(item => item.storagePath.trim())) errors.form = '请添加课件链接'
  if (errors.title || errors.catalogId || errors.form) return

  const payload: CoursewareSaveReq = {
    ...form,
    studyScore: scoreMode.value === 'follow' ? null : Number(form.studyScore || 0),
    standardDurationFollow: durationMode.value === 'follow',
    files: props.variant === 'link' ? [] : form.files,
    links: props.variant === 'link'
      ? form.links.map((item, index) => ({
          ...item,
          fileName: item.fileName || `外链${index + 1}`,
          fileSize: 0
        }))
      : []
  }
  saving.value = true
  try {
    if (props.mode === 'edit') {
      await updateCourseware(String(route.params.id), payload)
      toast.info('保存成功')
      router.push(`/kng/courseware/info/${route.params.id}`)
    } else {
      const result = await createCourseware(payload)
      toast.info('正在解析中，解析完成后自动完成发布')
      router.push(`/kng/courseware/info/${result.id}`)
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.courseware-form-page {
  min-height: calc(100vh - 104px);
  display: flex;
  flex-direction: column;
  background: #fff;
}

.form-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid #e8ecf2;

  h1 {
    margin: 0;
    color: #30384a;
    font-size: 18px;
  }
}

.back-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #4d5568;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.upload-stage {
  min-height: 620px;
  display: flex;
  flex-direction: column;
  padding: 54px 24px 30px;
  background: #f7f9fc;
}

.drop-zone {
  width: min(450px, 90%);
  height: 235px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  margin: 0 auto;
  border: 1px dashed #d4d9e2;
  border-radius: 2px;
  background: #f9fbfd;
  color: #6d7687;
  cursor: pointer;

  &.dragging {
    border-color: #2e7cf6;
    background: #f2f7ff;
  }

  input {
    display: none;
  }

  strong {
    color: #596274;
    font-size: 16px;
  }

  small {
    color: #98a1b2;
    font-size: 13px;
  }
}

.upload-cloud {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #7c8799;
  color: #fff;
  font-size: 24px;
}

.upload-list {
  width: min(900px, 100%);
  margin: 28px auto 0;
}

.upload-row {
  min-height: 52px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px 50px 60px;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-bottom: 1px solid #eef1f6;
  background: #fff;
  font-size: 13px;
}

.upload-file {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: 4px;
  background: #e8edf5;

  i {
    display: block;
    height: 100%;
    background: #2e7cf6;
    transition: width 0.2s ease;
  }
}

.upload-row em {
  color: #667085;
  font-style: normal;
}

.upload-row button {
  border: none;
  background: transparent;
  color: #2e7cf6;
  cursor: pointer;
}

.upload-notes {
  width: min(900px, 100%);
  margin: 34px auto 0;

  h3 {
    margin: 20px 0 8px;
    color: #30384a;
    font-size: 15px;
  }

  p {
    margin: 7px 0;
    color: #667085;
    font-size: 13px;
  }
}

.form-body {
  min-height: 0;
  flex: 1;
  display: flex;
  background: #f5f7fb;
}

.form-loading {
  min-height: 420px;
  display: grid;
  place-items: center;
  color: #7b8496;
  font-size: 14px;
}

.anchor-nav {
  width: 160px;
  flex-shrink: 0;
  padding: 22px 12px;
  border-right: 1px solid #e7ebf2;
  background: #fff;

  button {
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #667085;
    text-align: left;
    font-size: 13px;
    cursor: pointer;

    &.active {
      background: #f2f7ff;
      color: #2e7cf6;
    }
  }
}

.form-scroll {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
  scroll-padding-top: 20px;
}

.form-section {
  margin: 12px;
  padding: 20px 24px 26px;
  border-radius: 3px;
  background: #fff;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 22px;
    color: #30384a;
    font-size: 15px;

    i {
      width: 3px;
      height: 16px;
      background: #2e7cf6;
    }
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 34px;
}

.span-2 {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  > span {
    color: #4d5568;
    font-size: 13px;

    em {
      margin-left: 3px;
      color: #f04438;
      font-style: normal;
    }
  }

  > input,
  .input-wrap input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #d9deea;
    border-radius: 5px;
    background: #fff;
    color: #394253;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }

  > input,
  .input-wrap input,
  select {
    height: 38px;
    padding: 0 10px;
  }

  textarea {
    min-height: 120px;
    resize: vertical;
    padding: 10px;
  }
}

.input-wrap,
.textarea-wrap {
  position: relative;

  small {
    position: absolute;
    right: 10px;
    bottom: 8px;
    color: #98a1b2;
    font-size: 11px;
  }
}

.inline-control {
  display: flex;
  align-items: center;
  gap: 10px;

  select,
  input {
    min-width: 0;
    flex: 1;
    height: 38px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 5px;
    background: #fff;
  }
}

.inline-control.compact {
  width: 190px;
  margin-left: 26px;
}

.ghost-small {
  height: 36px;
  flex-shrink: 0;
  padding: 0 14px;
  border: 1px solid #d9deea;
  border-radius: 5px;
  background: #fff;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;
}

.field-error,
.orange-tip {
  margin: 0;
  color: #f04438;
  font-size: 12px;
}

.orange-tip {
  color: #f2994a;
}

.field-help,
.plain-note {
  margin: 0;
  color: #98a1b2;
  font-size: 12px;
}

.cover-upload {
  position: relative;
  width: 150px;
  height: 90px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #d9deea;
  border-radius: 5px;
  background: #f8fafc;
  color: #667085;
  cursor: pointer;

  input {
    display: none;
  }

  strong {
    display: block;
    text-align: center;
    font-size: 22px;
  }

  small {
    display: block;
    margin-top: 3px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.duration-input {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 13px;

  input {
    width: 88px;
    height: 38px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 5px;
  }
}

.radio-stack,
.switch-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;

  label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #4d5568;
    font-size: 13px;
    cursor: pointer;

    &.disabled {
      color: #a7aeba;
      cursor: not-allowed;
    }
  }

  input {
    accent-color: #2e7cf6;
  }

  span {
    line-height: 1.5;
  }
}

.finish-standard {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #667085;
  font-size: 13px;

  select {
    width: 90px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid #d9deea;
    border-radius: 5px;
  }

  strong {
    color: #4d5568;
  }
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 5px;
    background: #f8fafc;
    color: #4d5568;
    font-size: 12px;
  }

  button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    cursor: pointer;
  }
}

.contributor-tag {
  width: min(520px, 100%);
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #d9deea;
  border-radius: 5px;
  color: #4d5568;
  font-size: 13px;

  button {
    border: none;
    background: transparent;
    color: #98a1b2;
    cursor: pointer;
  }

  i {
    margin-left: auto;
    color: #98a1b2;
    font-style: normal;
  }
}

.permission-form {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.permission-line {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  color: #4d5568;
  font-size: 13px;

  > p {
    margin: 0;
    color: #98a1b2;
  }
}

.table-shell {
  border-radius: 5px;
}

.hidden-file-input {
  display: none;
}

.table-head,
.table-row {
  display: grid;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border-bottom: 1px solid #edf0f5;
  color: #4d5568;
  font-size: 13px;
}

.file-table .table-head,
.file-table .table-row {
  grid-template-columns: minmax(280px, 1fr) 140px 150px 160px;
}

.link-table .table-head,
.link-table .table-row {
  grid-template-columns: 28px minmax(320px, 1fr) 120px 150px;
}

.table-head {
  min-height: 38px;
  background: #f5f7fb;
  color: #667085;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  i {
    color: #98a1b2;
    font-style: normal;
  }
}

.drag-handle {
  color: #98a1b2;
}

.table-row input {
  min-width: 0;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #d9deea;
  border-radius: 5px;
}

.row-actions {
  display: flex;
  gap: 10px;

  button {
    border: none;
    background: transparent;
    color: #2e7cf6;
    cursor: pointer;
  }
}

.text-btn {
  margin-top: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;
}

.form-footer {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-top: 1px solid #e7ebf2;
  background: #fff;
}

.publish-btn {
  height: 36px;
  min-width: 84px;
  border: none;
  border-radius: 5px;
  background: #2e7cf6;
  color: #fff;
  cursor: pointer;

  &:disabled {
    background: #a8c5f8;
    cursor: not-allowed;
  }
}

.form-error {
  color: #f04438;
  font-size: 12px;
}

.language-mask {
  position: fixed;
  inset: 0;
  z-index: 5200;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.35);
}

.language-dialog {
  width: 360px;
  padding: 22px;
  border-radius: 6px;
  background: #fff;

  h3 {
    margin: 0 0 18px;
    color: #30384a;
    font-size: 16px;
  }

  > label {
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4d5568;
    font-size: 13px;
  }

  input {
    accent-color: #2e7cf6;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;

    button {
      height: 34px;
      padding: 0 16px;
      border: 1px solid #d9deea;
      border-radius: 5px;
      background: #fff;
      color: #4d5568;
      cursor: pointer;

      &.primary {
        border-color: #2e7cf6;
        background: #2e7cf6;
        color: #fff;
      }
    }
  }
}

@media (max-width: 900px) {
  .anchor-nav {
    display: none;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}
</style>
