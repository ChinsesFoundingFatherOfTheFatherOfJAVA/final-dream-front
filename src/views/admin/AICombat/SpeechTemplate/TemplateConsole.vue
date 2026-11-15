<template>
  <div class="template-console">
    <div class="project-header">
      <div class="project-info">
        <div class="project-cover">
          <span class="cover-icon" aria-hidden="true"><el-icon><Collection /></el-icon></span>
        </div>
        <div class="project-details">
          <h1 class="project-name">{{ template.name || '话术模板' }}</h1>
          <div class="project-tags">
            <span class="status-tag" :class="template.status === 'published' ? 'tag-published' : 'tag-draft'">
              {{ template.status === 'published' ? '已发布' : template.status === 'withdrawn' ? '已撤回' : '未发布' }}
            </span>
            <span class="type-tag">模板</span>
          </div>
          <div class="project-meta">
            <span class="meta-item">创建人: {{ template.createdBy }}</span>
            <span class="meta-item">创建时间: {{ template.createdAt }}</span>
          </div>
        </div>
        <div class="project-actions">
          <el-button class="btn btn-default">预览</el-button>
          <el-button class="btn btn-danger" @click="handleDelete">删除</el-button>
        </div>
      </div>
    </div>

    <div class="console-content">
      <aside class="console-menu">
        <div class="menu-item active">流程设计</div>
      </aside>
      <main class="console-main">
        <TemplateFlowDesign />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRoute, useRouter } from 'vue-router'
import { getTemplateDetail } from '@/api/template'
import { deleteTemplate } from '@/api/template'
import { toTemplateCard } from '@/utils/convert'
import TemplateFlowDesign from './TemplateFlowDesign.vue'
import { Collection } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const templateId = Number(route.params.id)

const currentMenu = computed(() => {
  const p = route.path
  if (p.includes('flow')) return 'flow'
  return 'flow'
})

const template = ref({
  id: 0,
  name: '',
  description: '',
  permission: 'private',
  status: 'draft',
  createdBy: '',
  createdAt: ''
})

const load = async () => {
  try {
    const res: any = await getTemplateDetail(templateId)
    template.value = {
      ...template.value,
      ...toTemplateCard(res)
    }
  } catch { /* handled */ }
}

const handleDelete = async () => {
  if (!(await confirmDialog({ message: '确定要删除这个模板吗？', danger: true }))) return
  try {
    await deleteTemplate(templateId)
    router.push('/sparring/newtemplate')
  } catch { /* handled */ }
}

onMounted(load)
</script>

<style scoped lang="scss">
.template-console {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper-2);
}

.project-header {
  background: var(--color-paper);
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-rule);
}

.project-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.project-cover {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .cover-icon { font-size: 28px; }
}

.project-details {
  flex: 1;

  .project-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 8px 0;
  }

  .project-tags { display: flex; gap: 8px; margin-bottom: 8px; }
  .project-meta {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: var(--color-muted);
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.tag-published { background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); color: var(--color-success); border: 1px solid color-mix(in oklab, var(--color-success) 35%, var(--color-paper)); }
  &.tag-draft { background: var(--color-paper-2); color: var(--color-muted); border: 1px solid var(--color-rule-2); }
}

.type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--color-accent-wash);
  color: var(--color-accent);
  border: 1px solid var(--color-accent-2);
}

.project-actions { display: flex; gap: 8px; }

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--color-rule-2);

  &.btn-default { background: var(--color-paper); color: var(--color-ink); }
  &.btn-danger { background: var(--color-paper); color: var(--color-error); border-color: color-mix(in oklab, var(--color-error) 30%, var(--color-paper)); }
  &:hover { opacity: 0.85; }
}

.console-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.console-menu {
  width: 160px;
  background: var(--color-paper);
  border-right: 1px solid var(--color-rule);
  padding: 16px 0;

  .menu-item {
    display: block;
    padding: 12px 24px;
    font-size: 14px;
    color: var(--color-muted);
    text-decoration: none;

    &:hover { background: var(--color-paper-2); color: var(--color-accent); }
    &.active { color: var(--color-accent); border-right: 3px solid var(--color-accent); background: var(--color-accent-wash); }
  }
}

.console-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
