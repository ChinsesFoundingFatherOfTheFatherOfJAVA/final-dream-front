<template>
  <div class="avatar-gen-field">
    <div class="gen-row">
      <el-input
        v-model="prompt"
        class="prompt-input"
        placeholder="中年男性医生，白大褂，专业亲切"
        maxlength="200"
        :disabled="generating"
        @keyup.enter="onGenerate"
      />
      <el-button type="primary" class="gen-btn" :disabled="generating || !prompt.trim()" @click="onGenerate">
        {{ generating ? '生成中...' : 'AI生成' }}
      </el-button>
    </div>
    <p v-if="generating" class="gen-hint">形象生成最长约需 5 分钟，请耐心等待</p>

    <!-- 形象预览：统一按 3:4 展示，生图原图保留不裁掉画质 -->
    <div v-if="modelValue" class="preview-wrap">
      <div class="preview-card">
        <img :src="resolveAssetUrl(modelValue)" alt="陪练者形象预览" class="preview-img" />
        <div class="preview-mask">
          <span
            class="mask-btn"
            role="button"
            tabindex="0"
            title="重新生成"
            @click="onGenerate"
            @keydown.enter.prevent="onGenerate"
          >重新生成</span>
          <span
            class="mask-btn"
            role="button"
            tabindex="0"
            title="上传本地图片"
            @click="triggerUpload"
            @keydown.enter.prevent="triggerUpload"
          >本地上传</span>
        </div>
      </div>
      <span
        class="remove-link"
        role="button"
        tabindex="0"
        title="清除形象"
        @click="onRemove"
        @keydown.enter.prevent="onRemove"
      >移除</span>
    </div>
    <!-- 无形象时的本地上传入口 -->
    <el-button v-else class="upload-link" :disabled="generating" @click="triggerUpload">
      上传本地图片
    </el-button>

    <!-- 本地文件选择（隐藏） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/webp"
      class="hidden-input"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@/utils/toast'
import { generateAvatar } from '@/api/ai'
import { resolveAssetUrl } from '@/api/request'

/**
 * FP-26 管理端陪练者形象生成字段（v1.1）
 * v-model：绑定 form.virtualTrainer.avatarImage（预览 URL：AI 生成的服务端 URL 或本地 blob URL）
 * file-change：本地选择了文件时通知父组件（父组件随 FormData 以文件字段上传）
 */
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'file-change': [file: File | null]
}>()

const prompt = ref('')
const generating = ref(false)
const fileInputRef = ref<HTMLInputElement>()
/** 最近一次本地选择的文件（保存时由父组件上传） */
let localFile: File | null = null

/** AI 生成（首次/重新生成共用）：调生图接口拿服务端 URL */
const onGenerate = async () => {
  const p = prompt.value.trim()
  if (!p || generating.value) return
  if (p.length < 2) {
    toast.warn('请输入形象提示词（2~200字）')
    return
  }
  generating.value = true
  try {
    const res = await generateAvatar({ prompt: p })
    // AI 生成结果为服务端 URL，本地文件不再参与提交
    setLocalFile(null)
    emit('update:modelValue', res.imageUrl)
  } catch {
    /* 拦截器已 alert（生成失败可重试或上传本地图片） */
  } finally {
    generating.value = false
  }
}

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选择同一文件
  if (!file) return
  if (!/^image\//.test(file.type)) {
    toast.warn('请选择图片文件')
    return
  }
  // 清理旧 blob 预览
  if (props.modelValue?.startsWith('blob:')) URL.revokeObjectURL(props.modelValue)
  setLocalFile(file)
  emit('update:modelValue', URL.createObjectURL(file))
}

const onRemove = () => {
  if (props.modelValue?.startsWith('blob:')) URL.revokeObjectURL(props.modelValue)
  setLocalFile(null)
  emit('update:modelValue', '')
}

const setLocalFile = (file: File | null) => {
  localFile = file
  emit('file-change', file)
}

/** 供父组件取回待上传的本地文件（非响应式，避免多余 re-render） */
defineExpose({
  getLocalFile: () => localFile
})
</script>

<style scoped lang="scss">
$primary: #1890ff;

.avatar-gen-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gen-row {
  display: flex;
  gap: 10px;

  .prompt-input {
    flex: 1;
    height: 36px;
    border-radius: 6px;
    font-size: 14px;
    color: #333;

    &::placeholder {
      color: #999;
    }

    &:focus {
      border-color: $primary;
    }

    &:disabled {
      background: #f5f7fa;
    }
  }

  .gen-btn {
    height: 36px;
    padding: 0 20px;
    border: none;
    border-radius: 6px;
    background: $primary;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
}

.gen-hint {
  margin: 0;
  font-size: 12px;
  color: #999;
}

/* 预览卡统一 3:4：与详情页使用同一展示口径 */
.preview-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.preview-card {
  position: relative;
  width: 160px;
  aspect-ratio: 3 / 4;
  box-sizing: border-box;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .preview-mask {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    background: rgba(0, 0, 0, 0.45);
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .preview-mask {
    opacity: 1;
  }

  // 遮罩按钮键盘可达时也显示，否则 Tab 聚焦的是透明按钮
  &:focus-within .preview-mask {
    opacity: 1;
  }

  .mask-btn {
    flex: 1;
    padding: 8px 0;
    text-align: center;
    color: #fff;
    font-size: 12px;
    cursor: pointer;

    & + .mask-btn {
      border-left: 1px solid rgba(255, 255, 255, 0.25);
    }

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: -2px;
    }
  }
}

.remove-link {
  font-size: 12px;
  color: #999;
  cursor: pointer;

  &:hover {
    color: #e54545;
  }

  &:focus-visible {
    outline: 2px solid #e54545;
    outline-offset: 2px;
  }
}

.upload-link {
  align-self: flex-start;
  border: 1px dashed #c0c6d2;
  background: #fafbfc;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;

  &:hover:not(:disabled) {
    color: $primary;
    border-color: $primary;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.hidden-input {
  display: none;
}
</style>
