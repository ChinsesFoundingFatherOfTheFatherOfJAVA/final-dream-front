<template>
  <el-dialog
    v-model="visible"
    title="换形象"
    width="560px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <!-- 当前/待保存的形象：与学员端同一解析口径（相对路径 → /api 前缀） -->
    <div class="ca-dialog">
      <p class="ca-tip">
        <template v-if="dirty">待保存：</template>
        <template v-else>当前形象：</template>
        <span class="ca-target">{{ scenarioName }} / {{ scriptName }}</span>
      </p>

      <div class="ca-current">
        <div class="ca-thumb" :class="{ empty: !previewUrl }">
          <img v-if="previewUrl" :src="previewUrl" :alt="`${scriptName} 的角色形象`" />
          <span v-else aria-hidden="true">?</span>
        </div>
        <div class="ca-current-meta">
          <span v-if="previewUrl" class="ca-file">{{ storedUrl || '（临时预览）' }}</span>
          <span v-else class="ca-empty-hint">未设置形象：发布时按角色属性自动定图</span>
        </div>
      </div>

      <!--
        AI 生成 / 本地上传 / 移除三个能力复用既有组件（SpeechTraining 的 AvatarGenField），
        不重写一遍上传交互；该组件在 560px 弹窗内预览卡 160×213，不影响外层案例卡密度。
      -->
      <AvatarGenField ref="avatarFieldRef" v-model="draft" />
      <p class="ca-hint">
        本地上传的图片会在保存时先转存到服务器再落库；「AI生成」结果已是服务器地址，可直接保存。
      </p>
    </div>

    <template #footer>
      <el-button v-if="currentUrl" class="ca-clear" :disabled="saving" @click="onClear">
        清除形象
      </el-button>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AvatarGenField from '@/components/business/AvatarGenField.vue'
import { avatarPreviewUrl, caseAvatarBody, toStoredAvatarUrl } from './caseAvatar'
import { saveCaseAvatar, uploadAvatarImage } from './caseAvatarApi'

/**
 * 案例「换形象」弹窗（L0 上传覆盖的写入侧 UI，2026-11-05）。
 *
 * 为什么不直接把 AvatarGenField 摊在案例卡里：它带 160×213 的预览卡与一排操作，
 * 展开会让案例卡高度翻倍（任务约束「不改变案例卡现有布局密度」）。放进弹窗后，
 * 案例卡只多一个 24px 缩略图 + 一个文字按钮。
 */
const props = defineProps<{
  modelValue: boolean
  themeId: string
  /** 持久定位键：artifact 里的案例标题（行 ID 每次确认都会重建，不能用它定位） */
  scriptName: string
  /** 同名多例时消歧用 */
  scenarioName: string
  /** 当前已生效的形象（artifact 里的相对路径，空 = 未设置） */
  currentUrl: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 保存成功（父组件据此刷新 artifact） */
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const avatarFieldRef = ref<InstanceType<typeof AvatarGenField> | null>(null)
/** 弹窗内编辑值：可能是服务器相对路径，也可能是本地 blob:（保存时先上传） */
const draft = ref('')
const saving = ref(false)

const storedUrl = computed(() => toStoredAvatarUrl(props.currentUrl))
/**
 * 弹窗缩略图：draft 可能是本地 blob:（还没上传），此时直接拿它预览——否则用户选完图
 * 看不到缩略图（toStoredAvatarUrl 故意把 blob 归零以禁止落库）。服务器地址才走 resolveAssetUrl。
 */
const previewUrl = computed(() =>
  draft.value.startsWith('blob:') ? draft.value : avatarPreviewUrl(draft.value),
)
const dirty = computed(() => toStoredAvatarUrl(draft.value) !== storedUrl.value)

/** 每次打开都从当前值重新开始，避免上一次取消留下的草稿串到下一个案例 */
watch(
  () => props.modelValue,
  (open) => {
    if (open) draft.value = props.currentUrl || ''
  },
)

function onClosed() {
  // 关闭时释放本地预览的 objectURL（AvatarGenField 内部在替换/移除时释放，这里兜底）
  if (draft.value.startsWith('blob:')) URL.revokeObjectURL(draft.value)
  draft.value = ''
}

async function onSave() {
  if (saving.value) return
  saving.value = true
  try {
    // 1. 本地选图：先转存成服务器 URL（blob 地址不能落库，换台机器即失效）
    let avatarUrl = toStoredAvatarUrl(draft.value)
    const localFile = avatarFieldRef.value?.getLocalFile?.() ?? null
    if (localFile) {
      const uploaded = await uploadAvatarImage(localFile)
      avatarUrl = toStoredAvatarUrl(uploaded.fileUrl)
    }
    // 2. 落库（scriptName 持久定位键；空值 = 清除覆盖）
    await saveCaseAvatar(
      props.themeId,
      caseAvatarBody({
        scriptName: props.scriptName,
        scenarioName: props.scenarioName,
        avatarUrl,
      }),
    )
    ElMessage.success(avatarUrl ? '形象已保存' : '已清除形象')
    emit('saved')
    visible.value = false
  } catch {
    // 拦截器已提示；保留弹窗让用户重试，不静默吞掉
  } finally {
    saving.value = false
  }
}

async function onClear() {
  try {
    await ElMessageBox.confirm('清除后发布时按角色属性自动定图，确定清除？', '清除形象', {
      confirmButtonText: '清除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 取消
  }
  saving.value = true
  try {
    await saveCaseAvatar(
      props.themeId,
      caseAvatarBody({
        scriptName: props.scriptName,
        scenarioName: props.scenarioName,
        avatarUrl: '',
      }),
    )
    ElMessage.success('已清除形象')
    emit('saved')
    visible.value = false
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.ca-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ca-tip {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-2);

  .ca-target {
    color: var(--color-ink);
    font-weight: 600;
  }
}

.ca-current {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 圆形缩略图：与学员端形象卡同一「圆形裁切」口径，方图 cover 不拉伸 */
.ca-thumb {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-paper-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  font-size: 22px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.ca-current-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .ca-file {
    font-size: 12px;
    color: var(--color-muted);
    word-break: break-all;
  }

  .ca-empty-hint {
    font-size: 12px;
    color: var(--color-muted);
  }
}

.ca-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.6;
}
</style>
