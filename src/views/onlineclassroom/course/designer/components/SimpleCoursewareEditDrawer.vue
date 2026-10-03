<template>
  <!-- 截图17：嵌套"编辑课件"抽屉（课件编辑精简表单：名称/分类/学分/标准时长） -->
  <KngDrawer
    :visible="visible"
    title="编辑课件"
    :width="560"
    :z-index="zIndex"
    @close="emit('close')"
  >
    <div v-if="loading" class="loading-box">加载课件信息中...</div>
    <div v-else class="simple-form">
      <label class="field">
        <span class="label">课件名称<em>*</em></span>
        <input v-model.trim="title" type="text" maxlength="200" />
      </label>

      <label class="field">
        <span class="label">所属分类<em>*</em></span>
        <select v-model="catalogId" class="catalog-select">
          <option v-for="node in catalogOptions" :key="node.id" :value="node.id">
            {{ '　'.repeat(node.depth) }}{{ node.name }}
          </option>
        </select>
      </label>

      <div class="field">
        <span class="label">学分</span>
        <label class="inline-radio">
          <input v-model="scoreMode" type="radio" value="follow" />
          <span>跟随学分策略</span>
        </label>
        <label class="inline-radio">
          <input v-model="scoreMode" type="radio" value="custom" />
          <span>单独设置学分</span>
        </label>
        <div v-if="scoreMode === 'custom'" class="inline-control">
          <input v-model.number="studyScore" type="number" min="0.1" step="0.1" />
          <span>学分</span>
        </div>
      </div>

      <div class="field">
        <span class="label">标准时长</span>
        <div class="inline-control">
          <input v-model.number="standardMinutes" type="number" min="0" />
          <span>分</span>
          <input v-model.number="standardSeconds" type="number" min="0" max="59" />
          <span>秒</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="loading || saving" @click="save">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import KngDrawer from '../../../components/KngDrawer.vue'
import {
  getCoursewareDetail,
  updateCourseware,
  type CoursewareDetail,
  type CoursewareSaveReq
} from '@/api/courseware'
import { getKngCatalogTree } from '@/api/kng'
import { toast } from '@/utils/toast'
import { flattenCatalogTree, type CatalogFlatNode } from '../model'

/**
 * 嵌套编辑课件抽屉（CS-07a"编辑课件"链接 / 截图17）。
 * 课件编辑**精简表单**（名称/分类/学分/标准时长等基础字段），完整表单见课件模块
 * CoursewareForm.vue——此处不便内嵌 1500 行大表单，故按需求降级为精简版。
 * 保存走 api/courseware.ts 的 updateCourseware（整体保存请求，从详情回填未改字段）。
 */
const props = withDefaults(defineProps<{
  visible: boolean
  /** 要编辑的课件 id；空=不打开 */
  coursewareId: string
  /** 抽屉层叠起点 z-index（嵌套层级 +100/层） */
  zIndex?: number
}>(), {
  zIndex: 3200
})

const emit = defineEmits<{
  close: []
  /** 保存成功：把详情最新值上抛（主页同步任务行快照与任务名） */
  saved: [detail: CoursewareDetail]
}>()

const loading = ref(false)
const saving = ref(false)
const detail = ref<CoursewareDetail | null>(null)
const catalogOptions = ref<CatalogFlatNode[]>([])

const title = ref('')
const catalogId = ref('')
const scoreMode = ref<'follow' | 'custom'>('follow')
const studyScore = ref<number>(1)
const standardMinutes = ref(0)
const standardSeconds = ref(0)

// 打开时拉详情回显；分类树懒加载一次
watch(
  () => props.visible,
  async visible => {
    if (!visible || !props.coursewareId) return
    loading.value = true
    try {
      const [loaded] = await Promise.all([
        getCoursewareDetail(props.coursewareId),
        catalogOptions.value.length
          ? Promise.resolve()
          : getKngCatalogTree().then(tree => {
              catalogOptions.value = flattenCatalogTree(tree)
            })
      ])
      detail.value = loaded
      title.value = loaded.title
      catalogId.value = loaded.catalogId
      scoreMode.value = loaded.studyScore === null ? 'follow' : 'custom'
      studyScore.value = loaded.studyScore ?? 1
      standardMinutes.value = loaded.standardMinutes
      standardSeconds.value = loaded.standardSeconds
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

/** 保存精简表单：整体 CoursewareSaveReq（未修改字段按详情回填，cover 用 coverUrl 兜底，对齐 CoursewareForm 编辑态做法） */
async function save() {
  const current = detail.value
  if (!current) return
  if (!title.value) {
    toast.warn('请输入课件名称')
    return
  }
  if (!catalogId.value) {
    toast.warn('请选择所属分类')
    return
  }
  const payload: CoursewareSaveReq = {
    title: title.value,
    type: current.type,
    catalogId: catalogId.value,
    standardMinutes: Number(standardMinutes.value) || 0,
    standardSeconds: Number(standardSeconds.value) || 0,
    // 精简表单不提供"跟随标准时长"开关，维持原值
    standardDurationFollow: current.standardDurationFollow,
    studyScore: scoreMode.value === 'follow' ? null : Number(studyScore.value) || 0,
    finishStandardPercent: current.finishStandardPercent,
    description: current.description || '',
    coverStoragePath: current.coverUrl,
    code: current.code || '',
    versionStr: current.versionStr || '',
    viewPermission: current.viewPermission,
    downloadEnabled: current.downloadEnabled,
    downloadPermission: current.downloadPermission,
    appSaveEnabled: current.appSaveEnabled,
    appSavePermission: current.appSavePermission,
    speedEnabled: current.speedEnabled,
    speedHoursCalc: current.speedHoursCalc,
    aiSubtitleEnabled: current.aiSubtitleEnabled,
    files: current.files.map(file => ({ ...file })),
    links: current.type === 8 ? current.files.map(file => ({ ...file })) : [],
    attachmentPaths: current.attachments.map(item => ({
      storagePath: item.storagePath || '',
      fileName: item.fileName,
      fileSize: item.fileSize
    }))
  }
  saving.value = true
  try {
    await updateCourseware(current.id, payload)
    // 用保存后的本地合并值构造"最新详情"上抛（接口仅回 id，避免二次查询）
    const latest: CoursewareDetail = {
      ...current,
      title: payload.title,
      catalogId: payload.catalogId,
      studyScore: payload.studyScore,
      standardMinutes: payload.standardMinutes,
      standardSeconds: payload.standardSeconds
    }
    detail.value = latest
    toast.info('课件已保存')
    emit('saved', latest)
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.loading-box {
  padding: 40px 0;
  color: #98a1b2;
  font-size: 13px;
  text-align: center;
}

.field {
  display: block;
  margin-bottom: 18px;

  .label {
    display: block;
    margin-bottom: 7px;
    color: #4d5568;
    font-size: 13px;

    em {
      margin-left: 2px;
      color: #f45b69;
      font-style: normal;
    }
  }

  input[type='text'],
  select {
    box-sizing: border-box;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #30384a;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }

  input[type='text'] {
    height: auto;
    padding: 8px 10px;
  }
}

.inline-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 18px;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  input {
    accent-color: #2e7cf6;
  }
}

.inline-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #4d5568;
  font-size: 13px;

  input[type='number'] {
    box-sizing: border-box;
    width: 110px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #30384a;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }
}

.btn {
  height: 34px;
  padding: 0 18px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  cursor: pointer;

  &:disabled {
    color: #b3bac7;
    cursor: not-allowed;
  }

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;
  }
}
</style>
