<template>
  <div class="template-console">
    <div class="project-header">
      <div class="project-info">
        <div class="project-cover">
          <span class="cover-icon">📚</span>
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
          <button class="btn btn-default">预览</button>
          <button class="btn btn-danger" @click="handleDelete">删除</button>
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
import { useRoute, useRouter } from 'vue-router'
import { getTemplateDetail } from '@/api/template'
import { deleteTemplate } from '@/api/template'
import { toTemplateCard } from '@/utils/convert'
import TemplateFlowDesign from './TemplateFlowDesign.vue'

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
  if (!confirm('确定要删除这个模板吗？')) return
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
  background: #f5f5f5;
}

.project-header {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.project-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.project-cover {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
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
    color: #333;
    margin: 0 0 8px 0;
  }

  .project-tags { display: flex; gap: 8px; margin-bottom: 8px; }
  .project-meta {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #666;
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.tag-published { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
  &.tag-draft { background: #f5f5f5; color: #999; border: 1px solid #d9d9d9; }
}

.type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.project-actions { display: flex; gap: 8px; }

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #d9d9d9;

  &.btn-default { background: #fff; color: #333; }
  &.btn-danger { background: #fff; color: #f5222d; border-color: #ffa39e; }
  &:hover { opacity: 0.85; }
}

.console-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.console-menu {
  width: 160px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  padding: 16px 0;

  .menu-item {
    display: block;
    padding: 12px 24px;
    font-size: 14px;
    color: #666;
    text-decoration: none;

    &:hover { background: #f5f5f5; color: #1890ff; }
    &.active { color: #1890ff; border-right: 3px solid #1890ff; background: #e6f7ff; }
  }
}

.console-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
