<template>
  <div class="materials-tab">
    <p class="tab-desc">
      培训材料由你上传后自动解析，解析出要点会进入助手上下文。「学员可见」开启后，学员可在训练中查看该材料。
    </p>

    <div v-if="materials.length === 0" class="empty-state">
      <div class="empty-icon">📎</div>
      <p class="empty-text">暂无培训材料，可在左侧对话中上传</p>
    </div>

    <div v-for="m in materials" :key="m.id" class="material-card">
      <span class="file-icon">{{ fileIcon(m.fileType) }}</span>
      <div class="material-meta">
        <div class="material-name">{{ m.name }}</div>
        <div class="material-sub">{{ (m.fileType || '').toUpperCase() }} · {{ sizeText(m) }}</div>
      </div>
      <label class="visibility-switch">
        <input
          type="checkbox"
          :checked="Number(m.visibility) === 1"
          :disabled="disabled"
          @change="onToggle(m, ($event.target as HTMLInputElement).checked)"
        />
        <span class="switch-track"><span class="switch-thumb"></span></span>
        <span class="switch-text">{{ Number(m.visibility) === 1 ? '学员可见' : '内部可见' }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssistantStore } from '../../composables/useAssistantStore'
import type { ArtifactMaterial } from '@/types/assistant'

const props = defineProps<{ disabled?: boolean }>()

const store = useAssistantStore()
const materials = computed<ArtifactMaterial[]>(() => store.artifactContent?.materials ?? [])
const disabled = computed(() => props.disabled === true)

const FILE_ICON: Record<string, string> = {
  ppt: '📊',
  pptx: '📊',
  doc: '📝',
  docx: '📝',
  pdf: '📕',
  txt: '📄',
  md: '📄'
}
const fileIcon = (type: string) => FILE_ICON[(type || '').toLowerCase()] ?? '📎'

/**
 * 文件大小展示：后端 artifact 里 fileSize 为字节数、fileSizeUnit 为 "B"（保留精度），
 * 因此统一按字节换算为易读单位；若后端给了非字节单位则按原值展示。
 */
function sizeText(m: ArtifactMaterial): string {
  const size = Number(m.fileSize ?? 0)
  if (!size) return '--'
  const unit = (m.fileSizeUnit || '').toUpperCase()
  if (unit === 'B' || (!unit && size >= 1024)) {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  return `${size} ${m.fileSizeUnit || 'B'}`
}

/** 学员可见开关：发 WS action biz-side-manage-update-material（经用户确认的写入通道），后端同步进 artifact */
function onToggle(m: ArtifactMaterial, checked: boolean) {
  if (disabled.value) return
  store.toggleMaterialVisibility(m.id, checked ? 1 : 0)
}
</script>

<style scoped lang="scss">
.tab-desc {
  font-size: 13px;
  color: #8a8f98;
  line-height: 1.7;
  margin: 0 0 14px;
}

.empty-state {
  padding: 50px 0;
  text-align: center;

  .empty-icon { font-size: 34px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; color: #999; margin: 0; }
}

.material-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #fff;

  .file-icon { font-size: 24px; flex-shrink: 0; }

  .material-meta {
    flex: 1;
    min-width: 0;

    .material-name {
      font-size: 14px;
      font-weight: 500;
      color: #1f2329;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .material-sub { font-size: 12px; color: #a5a9b0; margin-top: 3px; }
  }
}

.visibility-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .switch-track {
    width: 38px;
    height: 20px;
    border-radius: 10px;
    background: #dcdfe6;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;

    .switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  input:checked + .switch-track {
    background: #1890ff;

    .switch-thumb { transform: translateX(18px); }
  }

  input:disabled + .switch-track { opacity: 0.5; }

  .switch-text {
    font-size: 13px;
    color: #4e5969;
    white-space: nowrap;
  }
}
</style>