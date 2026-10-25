<template>
  <!-- 轻量富文本编辑器：contentEditable + execCommand，不引第三方依赖。
       支持加粗/斜体/下划线/列表 + 图片/视频/音频插入（媒体经 /api/exam/file/upload 落盘）。 -->
  <div class="rich-editor" :class="{ compact }">
    <div class="toolbar">
      <el-button title="加粗" aria-label="加粗" @mousedown.prevent @click="exec('bold')"><b>B</b></el-button>
      <el-button title="斜体" aria-label="斜体" @mousedown.prevent @click="exec('italic')"><i>I</i></el-button>
      <el-button title="下划线" aria-label="下划线" @mousedown.prevent @click="exec('underline')"><u>U</u></el-button>
      <el-button title="无序列表" aria-label="无序列表" @mousedown.prevent @click="exec('insertUnorderedList')">•</el-button>
      <el-button title="有序列表" aria-label="有序列表" @mousedown.prevent @click="exec('insertOrderedList')">1.</el-button>
      <span class="sep" aria-hidden="true"></span>
      <el-button title="插入图片" @mousedown.prevent @click="pick('image/*')">图片</el-button>
      <el-button title="插入视频" @mousedown.prevent @click="pick('video/*')">视频</el-button>
      <el-button title="插入音频" @mousedown.prevent @click="pick('audio/*')">音频</el-button>
      <span class="sep" aria-hidden="true"></span>
      <el-button title="清除格式" @mousedown.prevent @click="exec('removeFormat')">清格式</el-button>
      <span v-if="uploading" class="upload-tip">上传中 {{ percent }}%</span>
    </div>

    <div
      ref="editorRef"
      class="editor"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="placeholder"
      :data-placeholder="placeholder"
      @input="syncOut"
      @blur="syncOut"
    ></div>

    <input ref="fileRef" type="file" class="hidden-file" @change="onFilePicked" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { toast } from '@/utils/toast'
import { uploadExamFile } from '@/api/exam'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  compact?: boolean
}>(), {
  placeholder: '请输入内容',
  compact: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editorRef = ref<HTMLDivElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
const accept = ref('image/*')
const uploading = ref(false)
const percent = ref(0)

/** 只回写 DOM 里的 HTML；插入媒体时也走同一条路。 */
const syncOut = () => {
  emit('update:modelValue', editorRef.value?.innerHTML ?? '')
}

const exec = (command: string) => {
  editorRef.value?.focus()
  document.execCommand(command, false)
  syncOut()
}

const pick = (acceptType: string) => {
  accept.value = acceptType
  fileRef.value?.click()
}

const onFilePicked = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  percent.value = 0
  try {
    const info = await uploadExamFile(file, (p) => { percent.value = p })
    const url = info.fileUrl
    const html = info.fileType === 'video'
      ? `<video src="${url}" controls style="max-width:100%"></video>`
      : info.fileType === 'audio'
        ? `<audio src="${url}" controls></audio>`
        : `<img src="${url}" style="max-width:100%" alt="" />`
    editorRef.value?.focus()
    // execCommand('insertHTML') 在光标处插入；IE 早已不在支持范围
    document.execCommand('insertHTML', false, html)
    syncOut()
  } catch {
    // 拦截器已提示
  } finally {
    uploading.value = false
  }
}

// 编辑态回填：只在外部值与 DOM 不一致时写回，避免打字时丢光标
watch(() => props.modelValue, (value) => {
  if (editorRef.value && editorRef.value.innerHTML !== (value || '')) {
    editorRef.value.innerHTML = value || ''
  }
})

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || ''
  }
})
</script>

<style scoped lang="scss">
.rich-editor {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;

  &:focus-within { border-color: #1890ff; }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: #fafbfd;
  border-bottom: 1px solid #eef1f6;

  button {
    min-width: 26px;
    height: 24px;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font-size: 12px;
    color: #4a5368;
    cursor: pointer;

    &:hover { background: #eef4ff; border-color: #d6e4ff; color: #1890ff; }
  }

  .sep { width: 1px; height: 16px; background: #e6eaf1; margin: 0 4px; }
  .upload-tip { margin-left: auto; font-size: 11px; color: #1890ff; }
}

.editor {
  min-height: 96px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.7;
  outline: none;
  overflow-y: auto;
  word-break: break-word;

  &:empty::before {
    content: attr(data-placeholder);
    color: #b0b7c3;
  }

  :deep(img), :deep(video) { max-width: 100%; }
  :deep(ul), :deep(ol) { padding-left: 22px; }
}

.rich-editor.compact {
  .toolbar { padding: 2px 4px; }
  .editor { min-height: 38px; padding: 5px 8px; }
}

.hidden-file { display: none; }
</style>