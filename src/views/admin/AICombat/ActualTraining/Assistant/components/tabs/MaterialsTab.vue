<template>
  <div class="materials-tab">
    <p class="tab-desc">
      培训材料由你上传后自动解析，解析出要点会进入助手上下文。「学员可见」开启后，学员可在训练中查看该材料。
    </p>

    <div v-if="materials.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true"><el-icon><Paperclip /></el-icon></div>
      <p class="empty-text">暂无培训材料，可在左侧对话中上传</p>
    </div>

    <div v-for="m in materials" :key="m.id" class="material-card">
      <span class="file-icon" aria-hidden="true"><el-icon><component :is="fileIcon(m.fileType)" /></el-icon></span>
      <div class="material-meta">
        <div class="material-name">
          {{ m.name }}
          <!-- 来源标识：在线课堂导入的材料与本地文件语义不同，必须让用户看得出 -->
          <span v-if="Number(m.fileSource) === 3" class="source-tag">在线课堂</span>
          <span v-else-if="Number(m.fileSource) === 2" class="source-tag local">本地</span>
        </div>
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
import { Paperclip, DocumentCopy, Notebook } from '@element-plus/icons-vue'

const props = defineProps<{ disabled?: boolean }>()

const store = useAssistantStore()
const materials = computed<ArtifactMaterial[]>(() => store.artifactContent?.materials ?? [])
const disabled = computed(() => props.disabled === true)

const FILE_ICON: Record<string, any> = {
  ppt: DocumentCopy,
  pptx: DocumentCopy,
  doc: Notebook,
  docx: Notebook,
  pdf: Document,
  txt: Document,
  md: Document,
}
const fileIcon = (type: string) => FILE_ICON[(type || '').toLowerCase()] ?? Paperclip

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
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 14px;
}

.empty-state {
  padding: 50px 0;
  text-align: center;

  .empty-icon {
    font-size: 34px;
    margin-bottom: 10px;
  }
  .empty-text {
    font-size: 14px;
    color: var(--color-muted);
    margin: 0;
  }
}

.material-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  margin-bottom: 10px;
  background: var(--color-paper);

  .file-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .material-meta {
    flex: 1;
    min-width: 0;

    .material-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .source-tag {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.6;
      color: var(--color-accent);
      background: var(--color-accent-wash);
      border: 1px solid var(--color-accent-2);

      &.local {
        color: var(--color-muted);
        background: var(--color-paper-2);
        border-color: var(--color-rule);
      }
    }

    .material-sub {
      font-size: 12px;
      color: var(--color-muted);
      margin-top: 3px;
    }
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
    background: var(--color-rule);
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
      background: var(--color-paper);
      transition: transform 0.2s;
      box-shadow: 0 1px 3px color-mix(in oklab, var(--color-graphite) 20%, transparent);
    }
  }

  input:checked + .switch-track {
    background: var(--color-accent);

    .switch-thumb {
      transform: translateX(18px);
    }
  }

  input:disabled + .switch-track {
    opacity: 0.5;
  }

  /* 视觉隐藏的原生 checkbox：键盘聚焦时在轨道上显示焦点环 */
  input:focus-visible + .switch-track {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-accent) 45%, transparent);
  }

  .switch-text {
    font-size: 13px;
    color: var(--color-ink-2);
    white-space: nowrap;
  }
}
</style>
