<template>
  <div class="course-form-page">
    <header class="form-header">
      <el-button class="back-btn" aria-label="返回课程列表" @click="goBack">‹</el-button>
      <h1>{{ mode === 'edit' ? '编辑课程' : '创建课程' }}</h1>
    </header>

    <div v-if="formLoading" class="form-loading">加载中...</div>

    <div v-else class="form-body">
      <aside class="anchor-nav">
        <el-button
          v-for="item in anchors"
          :key="item.key"
         
          :class="{ active: activeAnchor === item.key }"
          @click="scrollTo(item.key)"
        >
          {{ item.label }}
        </el-button>
      </aside>

      <main ref="formScroll" class="form-scroll">
        <!-- CS-07：表单=课件编辑表单精简（去掉"上传文件"段），字段/校验/减法清单与课件模块一致 -->
        <section ref="basicSection" class="form-section" data-anchor="basic">
          <h2><i aria-hidden="true"></i>基本信息</h2>
          <div class="form-grid">
            <label class="field span-2">
              <span>名称<em>*</em></span>
              <div class="input-wrap">
                <el-input
                  v-model.trim="form.title"
                  maxlength="200"
                  show-word-limit
                  placeholder="请输入课程名称"
                />
              </div>
              <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
            </label>

            <label class="field span-2">
              <span>分类<em>*</em></span>
              <div class="inline-control">
                <el-tree-select
                  v-model="form.catalogId"
                  class="catalog-tree-select"
                  :data="catalogs"
                  node-key="id"
                  :props="{ label: 'name', children: 'children' }"
                  check-strictly
                  clearable
                  :render-after-expand="false"
                  placeholder="请选择分类"
                />
                <el-button class="ghost-small" @click="openCatalogWindow">新增分类</el-button>
              </div>
              <p v-if="errors.catalogId" class="field-error">{{ errors.catalogId }}</p>
            </label>

            <div class="field span-2">
              <span>封面</span>
              <label class="cover-upload" :class="{ 'has-cover': Boolean(form.coverUrl) }">
                <input type="file" accept=".jpg,.jpeg,.png" @change="onCoverSelected" />
                <img v-if="coverPreview" :src="coverPreview" alt="课程封面" />
                <template v-else>
                  <strong>＋</strong>
                  <small>设置封面</small>
                </template>
              </label>
              <small class="field-help">支持 jpg/png，不超过 5MB，推荐 16:9</small>
            </div>

            <div class="field span-2">
              <span>标准时长</span>
              <el-radio-group v-model="durationMode" class="radio-stack">
                <el-radio value="follow">跟随学分策略（课程设置-学分策略设置）</el-radio>
                <el-radio value="custom">单独设置时长</el-radio>
              </el-radio-group>
              <div class="duration-input" :class="{ disabled: durationMode === 'follow' }">
                <el-input-number
                  v-model="form.standardMinutes"
                  :min="0"
                  :max="1440"
                  :controls="false"
                  :disabled="durationMode === 'follow'"
                />
                <span>分</span>
                <el-input-number
                  v-model="form.standardSeconds"
                  :min="0"
                  :max="59"
                  :controls="false"
                  :disabled="durationMode === 'follow'"
                />
                <span>秒</span>
                <small>（无任务时展示的手填值；有任务时详情展示任务时长和）</small>
              </div>
            </div>

            <div class="field span-2">
              <span>学分<em>*</em></span>
              <el-radio-group v-model="scoreMode" class="radio-stack">
                <el-radio value="follow">
                  跟随学分策略（课程跟随时=任务学分和，而非策略折算）
                  <strong>{{ scoreFollowValue }} 学分</strong>
                </el-radio>
                <el-radio value="custom">单独设置学分</el-radio>
                <div v-if="scoreMode === 'custom'" class="inline-control compact">
                  <el-input-number v-model="form.studyScore" :min="0.1" :step="0.1" :controls="false" />
                  <span>学分</span>
                </div>
              </el-radio-group>
            </div>

            <div class="field span-2">
              <span>完课标准</span>
              <div class="finish-standard">
                <el-select v-model="form.finishStandardPercent">
                  <el-option v-for="value in finishOptions" :key="value" :label="`${value}%`" :value="value" />
                </el-select>
                <span>完成标准时长的</span>
                <strong>{{ form.finishStandardPercent }}%</strong>
                <span>获得学分</span>
              </div>
            </div>

            <label class="field span-2">
              <span>简介</span>
              <div class="textarea-wrap">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  maxlength="2000"
                  show-word-limit
                  :rows="4"
                  placeholder="请输入课程简介"
                />
              </div>
            </label>

            <div class="field span-2">
              <span>附件</span>
              <label class="ghost-small upload-attachment">
                <input type="file" multiple @change="onAttachmentsSelected" />
                <el-icon aria-hidden="true" style="vertical-align: -2px; margin-right: 4px;"><UploadFilled /></el-icon>上传附件
              </label>
              <small class="field-help">最多上传 50 个，学员可下载附件</small>
              <div v-if="form.attachments.length" class="attachment-list">
                <div v-for="(attachment, index) in form.attachments" :key="attachment.storagePath">
                  <span>{{ attachment.fileName }}</span>
                  <el-button @click="form.attachments.splice(index, 1)">删除</el-button>
                </div>
              </div>
            </div>

            <label class="field">
              <span>编码</span>
              <el-input v-model.trim="form.code" maxlength="100" placeholder="请输入编码" />
            </label>
            <label class="field">
              <span>版本</span>
              <el-input v-model.trim="form.versionStr" maxlength="100" placeholder="请输入版本" />
            </label>
          </div>
        </section>

        <section ref="contributorSection" class="form-section" data-anchor="contributor">
          <h2><i aria-hidden="true"></i>相关方信息</h2>
          <div class="field span-2">
            <span>贡献者<em>*</em></span>
            <div class="contributor-tag">
              <span>{{ contributorText }}</span>
              <el-button aria-label="移除贡献者" @click="contributorRemoved = true">×</el-button>
              <i aria-hidden="true">...</i>
            </div>
          </div>
        </section>

        <section ref="permissionSection" class="form-section" data-anchor="permission">
          <h2><i aria-hidden="true"></i>权限设置</h2>
          <div class="permission-form">
            <div class="permission-line">
              <span>浏览权限</span>
              <el-radio-group v-model="form.viewPermission" class="radio-stack">
                <el-radio :value="1">跟随分类浏览权限</el-radio>
                <el-radio :value="2">单独设置允许浏览</el-radio>
              </el-radio-group>
            </div>
          </div>
        </section>

        <section ref="functionSection" class="form-section" data-anchor="function">
          <h2><i aria-hidden="true"></i>功能设置</h2>
          <div class="switch-stack">
            <div class="switch-line" :class="{ disabled: speedLocked }">
              <el-switch v-model="form.speedEnabled" :disabled="speedLocked" />
              <span>开启倍速播放（开启后，学员可以按1.25/1.5/1.75/2倍速播放视频）</span>
            </div>
            <div class="switch-line" :class="{ disabled: hoursLocked }">
              <el-switch v-model="form.speedHoursCalc" :disabled="hoursLocked" />
              <span>倍速播放时学习时长也倍速计算（举例：学员2倍速学习5分钟，学习时长算10分钟）</span>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- CS-07 底部按钮：暂存关闭（保存表单+保持当前状态返回列表）/ 下一步（保存后进入设计器） -->
    <footer v-if="!formLoading" class="form-footer">
      <span v-if="errors.form" class="form-error">{{ errors.form }}</span>
      <el-button class="ghost-btn" :disabled="saving" @click="submit(false)">
        {{ saving ? '处理中...' : '暂存关闭' }}
      </el-button>
      <el-button class="primary-btn" :disabled="saving" @click="submit(true)">
        {{ saving ? '处理中...' : '下一步' }}
      </el-button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getKngCatalogTree, getKngSetting, type KngSetting, type KngTreeNode } from '@/api/kng'
import {
  createCourse,
  getCourseDetail,
  updateCourseBasic,
  type CourseBasicReq
} from '@/api/course'
import { resolveAssetUrl } from '@/api/request'
import { UploadFilled } from '@element-plus/icons-vue'
import { uploadFile } from '@/utils/chunkUploader'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
}>(), {
  mode: 'create'
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const formScroll = ref<HTMLElement | null>(null)
const basicSection = ref<HTMLElement | null>(null)
const contributorSection = ref<HTMLElement | null>(null)
const permissionSection = ref<HTMLElement | null>(null)
const functionSection = ref<HTMLElement | null>(null)
const saving = ref(false)
const formLoading = ref(false)
const activeAnchor = ref('basic')
const settings = ref<KngSetting | null>(null)
const catalogs = ref<KngTreeNode[]>([])
const contributorRemoved = ref(false)
const contributorName = ref('')
const contributorAccount = ref('')
const durationMode = ref<'follow' | 'custom'>('custom')
const scoreMode = ref<'follow' | 'custom'>('follow')
/** 编辑态回显的"跟随"学分计算值（=任务学分和，由详情接口聚合） */
const editScoreCalc = ref(0)

const form = reactive<{
  title: string
  catalogId: string
  standardMinutes: number
  standardSeconds: number
  studyScore: number | null
  finishStandardPercent: number
  description: string
  coverUrl: string | null
  code: string
  versionStr: string
  viewPermission: number
  speedEnabled: boolean
  speedHoursCalc: boolean
  attachments: Array<{ storagePath: string; fileName: string; fileSize: number }>
}>({
  title: '未命名课程',
  catalogId: '',
  standardMinutes: 0,
  standardSeconds: 0,
  studyScore: null,
  finishStandardPercent: 100,
  description: '',
  coverUrl: null,
  code: '',
  versionStr: '',
  viewPermission: 1,
  speedEnabled: true,
  speedHoursCalc: true,
  attachments: []
})

const errors = reactive<{ title?: string; catalogId?: string; form?: string }>({})
const anchors = [
  { key: 'basic', label: '基本信息' },
  { key: 'contributor', label: '相关方信息' },
  { key: 'permission', label: '权限设置' },
  { key: 'function', label: '功能设置' }
]
const finishOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 10)
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
const coverPreview = computed(() => resolveAssetUrl(form.coverUrl))
const speedLocked = computed(() => {
  const play = settings.value?.playConf
  if (!play) return false
  return !play.speedEnabled || play.speedScope === 1
})
const hoursLocked = computed(() => {
  const play = settings.value?.playConf
  return !play || !play.speedHoursCalc || !form.speedEnabled
})
const contributorText = computed(() =>
  contributorRemoved.value ? '--' : `${contributorName.value}(${contributorAccount.value})`
)
/** 学分"跟随"展示值：编辑=详情聚合的任务学分和；创建=尚无任务，显示 0.00 */
const scoreFollowValue = computed(() => (props.mode === 'edit' ? editScoreCalc.value.toFixed(2) : '0.00'))

function scrollTo(key: string) {
  const targets: Record<string, HTMLElement | null> = {
    basic: basicSection.value,
    contributor: contributorSection.value,
    permission: permissionSection.value,
    function: functionSection.value
  }
  activeAnchor.value = key
  targets[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goBack() {
  router.push('/kng/course')
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
  form.coverUrl = result.storagePath
}

async function onAttachmentsSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])]
  input.value = ''
  if (form.attachments.length + files.length > 50) {
    toast.warn('附件最多上传 50 个')
    return
  }
  for (const file of files) {
    const result = await uploadFile(file)
    form.attachments.push({
      storagePath: result.storagePath,
      fileName: result.fileName,
      fileSize: result.fileSize
    })
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

async function load() {
  catalogs.value = await getKngCatalogTree()
  settings.value = await getKngSetting()
  contributorName.value = auth.user?.name || auth.displayName
  contributorAccount.value = auth.user?.account || '--'
  applyGlobalPlaySettings()

  // 增补B 同款：创建路由带 query.catalogId 时继承左树选中分类
  const presetCatalogId = route.query.catalogId ? String(route.query.catalogId) : ''
  if (props.mode === 'create') {
    if (presetCatalogId && flatCatalogs.value.some(node => node.id === presetCatalogId)) {
      form.catalogId = presetCatalogId
    }
    return
  }

  formLoading.value = true
  try {
    const detail = await getCourseDetail(String(route.params.id))
    Object.assign(form, {
      title: detail.title,
      catalogId: detail.catalogId,
      standardMinutes: detail.standardMinutes,
      standardSeconds: detail.standardSeconds,
      studyScore: detail.studyScore,
      finishStandardPercent: detail.finishStandardPercent,
      description: detail.description || '',
      coverUrl: detail.coverUrl,
      code: detail.code || '',
      versionStr: detail.versionStr || '',
      viewPermission: detail.viewPermission,
      speedEnabled: detail.speedEnabled,
      speedHoursCalc: detail.speedHoursCalc,
      attachments: detail.attachments.map(item => ({
        storagePath: item.storagePath || '',
        fileName: item.fileName,
        fileSize: item.fileSize
      }))
    })
    editScoreCalc.value = Number(detail.studyScoreCalc || 0)
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

/**
 * 统一保存：校验 → 组装 PUT basic 载荷。
 * 创建模式先 POST /api/kng/admin/course 创建未发布记录拿到 id，再 PUT basic 补全表单字段。
 * goNext=true（下一步）跳设计器；false（暂存关闭）返回列表，状态保持不变。
 */
async function submit(goNext: boolean) {
  errors.title = undefined
  errors.catalogId = undefined
  errors.form = undefined
  if (!form.title.trim()) errors.title = '请输入课程名称'
  if (!form.catalogId) errors.catalogId = '请选择所属分类'
  if (errors.title || errors.catalogId) return

  const payload: CourseBasicReq = {
    title: form.title,
    catalogId: form.catalogId,
    standardDurationFollow: durationMode.value === 'follow',
    standardMinutes: Number(form.standardMinutes || 0),
    standardSeconds: Number(form.standardSeconds || 0),
    studyScore: scoreMode.value === 'follow' ? null : Number(form.studyScore || 0),
    finishStandardPercent: form.finishStandardPercent,
    description: form.description,
    coverUrl: form.coverUrl,
    code: form.code,
    versionStr: form.versionStr,
    viewPermission: form.viewPermission,
    speedEnabled: form.speedEnabled,
    speedHoursCalc: form.speedHoursCalc,
    // 贡献者暂不提供选择器：null=沿用创建人（后端兜底）
    contributorId: null,
    attachments: form.attachments
  }

  saving.value = true
  try {
    let courseId = String(route.params.id || '')
    // 无路由 id = 创建流程（CS-08），首次进设计器需弹结构选择弹窗
    const isCreate = !courseId
    if (props.mode === 'create') {
      // CS-08：创建即入库 status=未发布，未发布课程在列表可见可持续编辑
      const created = await createCourse({
        title: form.title,
        catalogId: form.catalogId,
        finishStandardPercent: form.finishStandardPercent,
        viewPermission: form.viewPermission,
        structureType: 0
      })
      courseId = created.id
    }
    await updateCourseBasic(courseId, payload)
    if (goNext) {
      // 创建流程首次进入设计器需弹"选择课程结构"弹窗（CS-08），编辑流程不弹
      const chooseQuery = isCreate ? { choose: '1' } : undefined
      router.push({ path: `/kng/course/edit/${courseId}/designer`, query: chooseQuery })
    } else {
      toast.info('已暂存')
      router.push('/kng/course')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.course-form-page {
  min-height: calc(100vh - 104px);
  display: flex;
  flex-direction: column;
  background: var(--color-paper);
}

.form-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border-bottom: var(--rule-hair) solid var(--color-rule);

  h1 {
    margin: 0;
    color: var(--color-ink);
    font-size: 18px;
  }
}

.back-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-ink-2);
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.form-loading {
  min-height: 420px;
  display: grid;
  place-items: center;
  color: var(--color-muted);
  font-size: 14px;
}

.form-body {
  min-height: 0;
  flex: 1;
  display: flex;
  background: var(--color-paper-2);
}

.anchor-nav {
  width: 160px;
  flex-shrink: 0;
  padding: 22px 12px;
  border-right: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper);

  button {
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--color-muted);
    text-align: left;
    font-size: 13px;
    cursor: pointer;

    &.el-button {
      justify-content: flex-start;
      text-align: left;
      margin-left: 0;
    }

    &.active {
      background: var(--color-accent-wash);
      color: var(--color-accent);
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
  background: var(--color-paper);

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 22px;
    color: var(--color-ink);
    font-size: 15px;

    i {
      width: 3px;
      height: 16px;
      background: var(--color-accent);
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
    color: var(--color-ink-2);
    font-size: 13px;

    em {
      margin-left: 3px;
      color: var(--color-error);
      font-style: normal;
    }
  }

  > input,
  .input-wrap input,
  select,
  textarea {
    width: 100%;
    border: 1px solid var(--color-rule-2);
    border-radius: 5px;
    background: var(--color-paper);
    color: var(--color-ink-2);
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: var(--color-accent);
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
    color: var(--color-muted);
    font-size: 11px;
  }
}

.inline-control {
  display: flex;
  align-items: center;
  gap: 10px;

  .el-tree-select {
    flex: 1;
    min-width: 0;
  }

  select,
  input {
    min-width: 0;
    flex: 1;
    height: 38px;
    padding: 0 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: 5px;
    background: var(--color-paper);
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
  border: 1px solid var(--color-rule-2);
  border-radius: 5px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-size: 13px;
  cursor: pointer;
}

.field-error {
  margin: 0;
  color: var(--color-error);
  font-size: 12px;
}

.field-help {
  margin: 0;
  color: var(--color-muted);
  font-size: 12px;
}

.cover-upload {
  position: relative;
  width: 150px;
  height: 90px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--color-rule-2);
  border-radius: 5px;
  background: var(--color-paper-2);
  color: var(--color-muted);
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
  color: var(--color-muted);
  font-size: 13px;

  &.disabled {
    color: var(--color-muted);
  }

  input {
    width: 88px;
    height: 38px;
    padding: 0 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: 5px;

    &:disabled {
      background: var(--color-paper-2);
      color: var(--color-muted);
    }
  }
}

.radio-stack,
.switch-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  gap: 12px;

  :deep(.el-radio) {
    margin-right: 0;
  }

  label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--color-ink-2);
    font-size: 13px;
    cursor: pointer;

    &.disabled {
      color: var(--color-muted);
      cursor: not-allowed;
    }
  }

  input {
    accent-color: var(--color-accent);
  }

  span {
    line-height: 1.5;
  }

  strong {
    color: var(--color-accent);
    font-weight: 500;
  }
}

.switch-line {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: var(--color-ink-2);
  font-size: 13px;
  line-height: 1.5;

  &.disabled {
    color: var(--color-muted);
  }
}

.finish-standard {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-muted);
  font-size: 13px;

  select {
    width: 90px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid var(--color-rule-2);
    border-radius: 5px;
  }

  strong {
    color: var(--color-ink-2);
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
    background: var(--color-paper-2);
    color: var(--color-ink-2);
    font-size: 12px;
  }

  button {
    border: none;
    background: transparent;
    color: var(--color-accent);
    cursor: pointer;
  }
}

.upload-attachment {
  width: 130px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    opacity: 0;
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
  border: 1px solid var(--color-rule-2);
  border-radius: 5px;
  color: var(--color-ink-2);
  font-size: 13px;

  button {
    border: none;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
  }

  i {
    margin-left: auto;
    color: var(--color-muted);
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
  color: var(--color-ink-2);
  font-size: 13px;
}

.form-footer {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-top: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper);
}

.ghost-btn,
.primary-btn {
  height: 36px;
  min-width: 96px;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid var(--color-rule-2);
  background: var(--color-paper);
  color: var(--color-ink-2);
}

.primary-btn {
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-ink);

  &:disabled {
    background: color-mix(in oklab, var(--color-accent) 45%, var(--color-paper));
    cursor: not-allowed;
  }
}

.form-error {
  color: var(--color-error);
  font-size: 12px;
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
