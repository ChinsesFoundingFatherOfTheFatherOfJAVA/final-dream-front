<template>
  <el-dialog
    :model-value="true"
    title="选择话术模板"
    width="540px"
    append-to-body
    @close="$emit('close')"
  >
    <div class="dialog-toolbar">
      <el-input
        v-model="keyword"
        clearable
        class="search-input"
        placeholder="请输入名称搜索"
        @input="fetchTemplates"
      />
    </div>
    <div class="dialog-body">
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="!templates.length" class="status">暂无模板</div>
      <div v-else class="template-list">
        <div
          v-for="t in templates"
          :key="t.id"
          class="template-item"
          :class="{ active: selectedId === t.id }"
          @click="selectedId = t.id"
        >
          <span class="template-dot" />
          <div class="template-info">
            <div class="template-name">{{ t.name }}</div>
            <div class="template-desc">{{ t.description || '（无说明）' }}</div>
          </div>
          <div class="template-meta">
            <span class="status-tag" :class="statusClass(t.status)">{{ statusText(t.status) }}</span>
            <span class="template-time">{{ t.createdAt }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" :disabled="selectedId === null || loading" @click="handleConfirm">
        导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTemplateList, getTemplateFlow } from '@/api/template'
import { toTemplateCard } from '@/utils/convert'
import type { TemplateCard } from '@/utils/convert'

const emit = defineEmits<{
  close: []
  confirm: [templateId: number, nodes: any[], edges: any[]]
}>()

const templates = ref<TemplateCard[]>([])
const loading = ref(false)
const selectedId = ref<number | null>(null)
const keyword = ref('')

const fetchTemplates = async () => {
  loading.value = true
  try {
    const res: any = await getTemplateList({ page: 1, pageSize: 100, keyword: keyword.value.trim() || undefined })
    templates.value = (res.records || []).map(toTemplateCard)
  } catch { /* handled */ }
  finally { loading.value = false }
}

const statusText = (s: string) =>
  ({ published: '已发布', draft: '未发布', withdrawn: '已撤回' } as any)[s] || s

const statusClass = (s: string) =>
  ({ published: 'tag-published', withdrawn: 'tag-withdrawn' } as any)[s] || 'tag-draft'

const handleConfirm = async () => {
  if (selectedId.value === null) return
  try {
    const res: any = await getTemplateFlow(selectedId.value)
    emit('confirm', selectedId.value, res.nodes || [], res.edges || [])
  } catch { /* handled */ }
}

onMounted(fetchTemplates)
</script>

<style scoped lang="scss">
.dialog-toolbar {
  padding: 0 0 12px;
  border-bottom: 1px solid #f0f0f0;

  .search-input {
    width: 100%;
  }
}

.dialog-body {
  padding: 12px 0;
  overflow-y: auto;
  flex: 1;
  min-height: 200px;
}

.status {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: #91d5ff; background: #f0f9ff; }
  &.active { border-color: #1890ff; background: #e6f7ff; }

  .template-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1890ff;
    flex-shrink: 0;
  }

  .template-info { flex: 1; min-width: 0; }

  .template-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .template-desc {
    font-size: 12px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .template-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    font-size: 12px;
  }

  .template-time { color: #999; }
}

.status-tag {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;

  &.tag-published { background: #f6ffed; color: #52c41a; }
  &.tag-draft { background: #f5f5f5; color: #999; }
  &.tag-withdrawn { background: #fffbe6; color: #faad14; }
}

</style>
